/**
 * 日周月报 · 管理驾驶舱（Cockpit）
 * 定位：把「日周月报」模块的日报质量 / 周报进度 / 月报达成 / 闭环预警，
 *       在一屏内以 KPI 卡片 + 部门红绿灯矩阵 + 模块摘要 + 预警熔断条集中呈现。
 * 明细下钻仍由日报/周报/月报/闭环管控四个页签承接。
 * 数据源：window.MONTHLY_REPORTS(人×月聚合) / DAILY_REPORTS / WEEKLY_REPORTS / OGSM_GOALS / REPORT_META
 *       全部为 sync_feishu_reports.py 已物料化数据，本模块只做前端聚合，不拉飞书。
 * v2（2026-10-26）：① 红绿灯阈值改为达标导向，避免全员飘红；② 新增月度环比趋势；
 *       ③ 新增个人填报 TOP 榜（按有效填报天数）；④ 新增沉默字段部门排行（条形）。
 */
(function () {
  'use strict';
  var U = global.U;
  function esc(s) { return U && U.escapeHtml ? U.escapeHtml(s) : String(s == null ? '' : s); }
  function num(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); return d != null ? n.toFixed(d) : String(Math.round(n)); }
  function pct(v) { return num(v, 1) + '%'; }

  var M = global.MONTHLY_REPORTS || [];
  var D = global.DAILY_REPORTS || [];
  var W = global.WEEKLY_REPORTS || [];
  var O = global.OGSM_GOALS || [];
  var META = global.REPORT_META || {};
  var TARGET_MONTH = '2026年10月';

  /* 红绿灯阈值（百分比口径；completeness 为 0-1，内部 ×100）
   * v2 调整为「达标导向」：压低红线，使正常波动不至于全员飘红，黄区为关注、绿区为达标。 */
  var TH = {
    att:   { good: 85, warn: 70 },   // 出勤率
    link:  { good: 50, warn: 30 },   // 关联目标率
    comp:  { good: 60, warn: 40 },   // 字段完整率
    ontime:{ good: 90, warn: 70 },   // 按时率
    align: { good: 70, warn: 40 }    // OGSM 已对齐(有评分)率
  };
  function light(v, th) {
    if (v == null || isNaN(v)) return 'gray';
    v = Math.min(100, Math.max(0, v));
    if (v >= th.good) return 'green';
    if (v >= th.warn) return 'amber';
    return 'red';
  }
  var LABEL = { green: '达标', amber: '关注', red: '预警', gray: '无数据' };

  /* 周报承诺核销 —— 数据源：门户本地 data/weekly_promises.csv（bake_promises.js 烘焙为 window.WEEKLY_PROMISES）。
   * 飞书周报表无核销状态字段、9/10 月为空，故改由门户侧 CSV 维护、可手工刷新。兜底值保留旧定稿。 */
  var PROMISES = global.WEEKLY_PROMISES || { total: 18, full: 2, partial: 7, none: 9,
    breakdown: [['消失（无下文）', 4], ['顺延', 2], ['降级', 1], ['明确失败', 2]] };

  function avg(arr) { return arr.length ? arr.reduce(function (x, y) { return x + y; }, 0) / arr.length : null; }

  /* 月份有序列表（按字符串排即可，形如 2026年8月） */
  function monthsSorted() {
    var ms = {}; M.forEach(function (r) { if (r.month) ms[r.month] = 1; });
    return Object.keys(ms).sort();
  }
  /* 某月某指标（公司均值） */
  function monthMetric(month, metric) {
    var vals = [];
    M.filter(function (r) { return r.month === month; }).forEach(function (r) {
      var v = null;
      if (metric === 'att') v = r.attendance_rate_to_date;
      else if (metric === 'link') v = r.ogsm_link_rate;
      else if (metric === 'comp') v = r.completeness != null ? r.completeness * 100 : null;
      else if (metric === 'ontime') v = r.ontime_rate_a;
      if (v != null) vals.push(v);
    });
    return avg(vals);
  }
  function arrow(cur, prev) {
    if (cur == null || prev == null) return '<span style="color:#9ca3af">▬</span>';
    if (cur > prev + 0.05) return '<span style="color:#16a34a">▲</span>';
    if (cur < prev - 0.05) return '<span style="color:#dc2626">▼</span>';
    return '<span style="color:#9ca3af">▬</span>';
  }

  /* 按部门聚合 10 月 MONTHLY */
  function deptAgg() {
    var map = {};
    M.filter(function (r) { return r.month === TARGET_MONTH; }).forEach(function (r) {
      var d = r.dept && r.dept.trim() ? r.dept : '（未填部门）';
      if (!map[d]) map[d] = { dept: d, n: 0, att: [], link: [], comp: [], ontime: [], cross: 0, names: [] };
      var a = map[d]; a.n++;
      if (r.attendance_rate_to_date != null) a.att.push(r.attendance_rate_to_date);
      if (r.ogsm_link_rate != null) a.link.push(r.ogsm_link_rate);
      if (r.completeness != null) a.comp.push(r.completeness * 100);
      if (r.ontime_rate_a != null) a.ontime.push(r.ontime_rate_a);
      a.cross += (r.cross_cycle_cnt || 0);
      a.names.push(r.reporter_name);
    });
    return map;
  }

  /* 全公司字段完整率（10 月，按人在 MONTHLY.field_fill 聚合） */
  function fieldFillCompany() {
    var acc = { key_actions: [], tomorrow_plan: [], daily_work: [], problem_strategy: [], ai_efficiency: [], emergency: [] };
    var cnt = 0;
    M.filter(function (r) { return r.month === TARGET_MONTH && r.field_fill; }).forEach(function (r) {
      cnt++;
      var f = r.field_fill;
      Object.keys(acc).forEach(function (k) { if (f[k] != null) acc[k].push(f[k]); });
    });
    var out = {};
    Object.keys(acc).forEach(function (k) { out[k] = avg(acc[k]); });
    return { n: cnt, fill: out };
  }

  /* 沉默字段部门排行（10 月，按难题策略填写率聚合） */
  function deptFieldFill() {
    var map = {};
    M.filter(function (r) { return r.month === TARGET_MONTH && r.field_fill; }).forEach(function (r) {
      var d = r.dept && r.dept.trim() ? r.dept : '（未填部门）';
      if (!map[d]) map[d] = { dept: d, ps: [], ai: [] };
      var f = r.field_fill;
      if (f.problem_strategy != null) map[d].ps.push(f.problem_strategy);
      if (f.ai_efficiency != null) map[d].ai.push(f.ai_efficiency);
    });
    return Object.keys(map).map(function (d) {
      return { dept: d, ps: avg(map[d].ps), ai: avg(map[d].ai) };
    });
  }

  function injectStyle() {
    if (document.getElementById('ck-style')) return;
    var s = document.createElement('style'); s.id = 'ck-style';
    s.textContent = [
      '.ck-wrap{max-width:1180px;margin:0 auto;padding:8px 4px}',
      '.ck-h1{font-size:22px;font-weight:800;color:var(--rb-ink);margin:6px 0 2px}',
      '.ck-sub{color:var(--rb-muted);font-size:13px;margin-bottom:14px}',
      '.ck-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin-bottom:18px}',
      '.ck-kpi{background:var(--rb-card);border:1px solid var(--rb-line);border-radius:14px;padding:14px 16px;box-shadow:0 2px 8px rgba(20,30,50,.04)}',
      '.ck-kpi .v{font-size:26px;font-weight:800;color:var(--rb-ink);line-height:1.1}',
      '.ck-kpi .l{font-size:12.5px;color:var(--rb-muted);margin-top:4px}',
      '.ck-kpi .v.green{color:#16a34a}.ck-kpi .v.amber{color:#d97706}.ck-kpi .v.red{color:#dc2626}',
      '.ck-sec-t{font-size:15px;font-weight:700;color:var(--rb-ink);margin:18px 0 10px;display:flex;align-items:center;gap:8px}',
      '.ck-sec-t .bar{width:4px;height:16px;background:linear-gradient(var(--rb-accent),var(--rb-accent2));border-radius:3px}',
      '.ck-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}',
      '.ck-card{background:var(--rb-card);border:1px solid var(--rb-line);border-radius:14px;padding:14px 16px}',
      '.ck-card .dn{font-weight:700;color:var(--rb-ink);font-size:15px;display:flex;justify-content:space-between;align-items:center}',
      '.ck-card .dn .cnt{font-size:12px;color:var(--rb-muted);font-weight:500}',
      '.ck-lights{display:flex;gap:14px;margin-top:12px;flex-wrap:wrap}',
      '.ck-li{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;color:var(--rb-muted)}',
      '.ck-dot{width:18px;height:18px;border-radius:50%;box-shadow:0 0 0 3px rgba(0,0,0,.04)}',
      '.ck-dot.green{background:#16a34a}.ck-dot.amber{background:#d97706}.ck-dot.red{background:#dc2626}.ck-dot.gray{background:#c3c9d4}',
      '.ck-li .lv{font-weight:700;color:var(--rb-ink)}',
      '.ck-li .nm{font-size:11px}',
      '.ck-mods{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:6px}',
      '.ck-mod{background:var(--rb-card);border:1px solid var(--rb-line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column}',
      '.ck-mod .mt{font-weight:700;font-size:15px;color:var(--rb-ink)}',
      '.ck-mod .md{font-size:13px;color:var(--rb-muted);margin:6px 0 10px;flex:1}',
      '.ck-mod .mv{font-size:20px;font-weight:800;color:var(--rb-accent)}',
      '.ck-drill{margin-top:8px;align-self:flex-start;border:1px solid var(--rb-accent);background:transparent;color:var(--rb-accent);border-radius:9px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer}',
      '.ck-drill:hover{background:var(--rb-accent);color:#fff}',
      '.ck-alerts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:6px}',
      '.ck-alert{border-radius:12px;padding:12px 14px;font-size:13px;display:flex;gap:10px;align-items:flex-start}',
      '.ck-alert.red{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}',
      '.ck-alert.amber{background:#fffbeb;border:1px solid #fde68a;color:#92400e}',
      '.ck-alert .ico{font-size:18px;line-height:1.2}',
      '.ck-note{font-size:11.5px;color:var(--rb-muted);margin-top:16px;line-height:1.6}',
      '.ck-tag{display:inline-block;padding:1px 7px;border-radius:6px;font-size:11px;font-weight:700;margin-left:6px}',
      '.ck-tag.green{background:#dcfce7;color:#15803d}.ck-tag.amber{background:#fef3c7;color:#b45309}.ck-tag.red{background:#fee2e2;color:#b91c1c}',
      /* v2 新增：环比 / TOP 榜 / 条形 */
      '.ck-trend{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:6px}',
      '.ck-tr{background:var(--rb-card);border:1px solid var(--rb-line);border-radius:12px;padding:12px 14px}',
      '.ck-tr .nm{font-size:12.5px;color:var(--rb-muted)}',
      '.ck-tr .cur{font-size:22px;font-weight:800;color:var(--rb-ink);margin:2px 0}',
      '.ck-tr .prev{font-size:12px;color:var(--rb-muted)}',
      '.ck-tr .prev b{color:var(--rb-ink)}',
      '.ck-top{display:flex;flex-direction:column;gap:8px;margin-top:10px}',
      '.ck-top-item{display:flex;align-items:center;justify-content:space-between;font-size:13px;padding:6px 10px;border:1px solid var(--rb-line);border-radius:9px;background:var(--rb-card)}',
      '.ck-top-item .rn{color:var(--rb-ink);font-weight:600}',
      '.ck-top-item .rd{font-weight:800;color:var(--rb-accent)}',
      '.ck-top-item.low .rd{color:#dc2626}',
      '.ck-bars{display:flex;flex-direction:column;gap:10px;margin-top:4px}',
      '.ck-bar-row{display:flex;align-items:center;gap:10px;font-size:13px}',
      '.ck-bar-row .bn{width:130px;color:var(--rb-ink);flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ck-bar-track{flex:1;background:var(--rb-line);border-radius:6px;height:16px;position:relative;overflow:hidden}',
      '.ck-bar-fill{height:100%;border-radius:6px}',
      '.ck-bar-row .bv{width:46px;text-align:right;font-weight:700;color:var(--rb-ink)}'
    ].join('');
    document.head.appendChild(s);
  }

  function kpiCard(v, l, cls) {
    return '<div class="ck-kpi"><div class="v ' + (cls || '') + '">' + v + '</div><div class="l">' + l + '</div></div>';
  }
  function lightItem(v, th, nm) {
    var c = light(v, th);
    return '<div class="ck-li"><span class="ck-dot ' + c + '"></span>' +
      '<span class="lv">' + (v == null ? '—' : num(v, 0) + '%') + '</span>' +
      '<span class="nm">' + nm + ' · ' + LABEL[c] + '</span></div>';
  }

  function renderBody() {
    injectStyle();
    var meta = META || {};
    var synced = meta.synced_at || '—';
    var agg = deptAgg();
    var depts = Object.keys(agg).sort(function (a, b) { return agg[b].n - agg[a].n; });

    // 全公司 KPI
    var monthly10 = M.filter(function (r) { return r.month === TARGET_MONTH; });
    var people = {}; monthly10.forEach(function (r) { if (r.reporter_name) people[r.reporter_name] = 1; });
    var attAvg = avg(depts.map(function (d) { return agg[d].att; }).reduce(function (x, y) { return x.concat(y); }, []));
    var linkAvg = avg(depts.map(function (d) { return agg[d].link; }).reduce(function (x, y) { return x.concat(y); }, []));
    var compAvg = avg(depts.map(function (d) { return agg[d].comp; }).reduce(function (x, y) { return x.concat(y); }, []));
    var daily10 = D.filter(function (r) { return r.month === TARGET_MONTH; });
    var fill = fieldFillCompany();
    var verifyRate = PROMISES.total ? Math.round(100 * (PROMISES.full + PROMISES.partial) / PROMISES.total) : null;
    var crossTotal = depts.reduce(function (s, d) { return s + agg[d].cross; }, 0);

    var html = '<div class="ck-wrap">';
    html += '<div class="ck-h1">日周月报 · 管理驾驶舱</div>';
    html += '<div class="ck-sub">一屏总览日报质量 / 周报进度 / 月报达成 / 闭环预警　|　统计月：<b>' + TARGET_MONTH +
      '</b>　|　数据更新：<b>' + esc(synced) + '</b>　|　红绿灯阈值 v2（达标导向）</div>';

    // KPI 行
    html += '<div class="ck-kpis">';
    html += kpiCard(Object.keys(people).length + '<span style="font-size:14px;color:var(--rb-muted)"> 人</span>', '本月填报覆盖（' + monthly10.length + ' 条月报记录）');
    html += kpiCard(pct(attAvg), '平均日报填报率（截至数据日）', light(attAvg, TH.att));
    html += kpiCard(pct(linkAvg), '平均关联目标率', light(linkAvg, TH.link));
    html += kpiCard(pct(compAvg), '平均字段完整率', light(compAvg, TH.comp));
    html += kpiCard((verifyRate != null ? verifyRate : '—') + '%', '闭环承诺核销率（' + PROMISES.full + '/' + PROMISES.total + ' 完全核销）');
    html += kpiCard(daily10.length + '<span style="font-size:14px;color:var(--rb-muted)"> 条</span>', '本月日报总量');
    html += '</div>';

    // 部门健康度红绿灯矩阵
    html += '<div class="ck-sec-t"><span class="bar"></span>部门健康度 · 红绿灯矩阵</div>';
    html += '<div class="ck-grid">';
    depts.forEach(function (dn) {
      var a = agg[dn];
      var att = avg(a.att), link = avg(a.link), comp = avg(a.comp), ontime = avg(a.ontime);
      var hi = (dn === '人事行政部') ? ' style="border-color:var(--rb-accent);box-shadow:0 0 0 2px rgba(74,158,255,.12)"' : '';
      html += '<div class="ck-card"' + hi + '><div class="dn"><span>' + esc(dn) +
        (dn === '人事行政部' ? '<span class="ck-tag green">本部</span>' : '') + '</span><span class="cnt">' + a.n + ' 人</span></div>';
      html += '<div class="ck-lights">';
      html += lightItem(att, TH.att, '填报');
      html += lightItem(link, TH.link, '关联');
      html += lightItem(comp, TH.comp, '完整');
      html += lightItem(ontime, TH.ontime, '按时');
      html += '</div>';
      if (a.cross > 0) html += '<div style="margin-top:8px;font-size:11.5px;color:#b91c1c">⚠️ 跨周期错挂 ' + a.cross + ' 条</div>';
      html += '</div>';
    });
    html += '</div>';

    // v2 新增：月度环比趋势
    var ms = monthsSorted();
    var two = ms.slice(-2);
    if (two.length >= 2) {
      var curM = two[1], prevM = two[0];
      var metrics = [['att', '日报填报率'], ['link', '关联目标率'], ['comp', '字段完整率'], ['ontime', '按时率']];
      html += '<div class="ck-sec-t"><span class="bar"></span>月度环比趋势（' + esc(prevM) + ' → ' + esc(curM) + '）</div>';
      html += '<div class="ck-trend">';
      metrics.forEach(function (m) {
        var cur = monthMetric(curM, m[0]);
        var prev = monthMetric(prevM, m[0]);
        html += '<div class="ck-tr"><div class="nm">' + m[1] + '</div>' +
          '<div class="cur">' + (cur != null ? pct(cur) : '—') + ' ' + arrow(cur, prev) + '</div>' +
          '<div class="prev">上月 <b>' + (prev != null ? pct(prev) : '—') + '</b></div></div>';
      });
      html += '</div>';
    }

    // 四模块摘要（带下钻）
    html += '<div class="ck-sec-t"><span class="bar"></span>模块状态 · 一键下钻</div>';
    html += '<div class="ck-mods">';
    // 日报
    var silentPS = fill.fill.problem_strategy, silentAI = fill.fill.ai_efficiency;
    html += '<div class="ck-mod"><div class="mt">📋 日报</div>' +
      '<div class="mv">' + daily10.length + ' 条</div>' +
      '<div class="md">本月日报填报 ' + Object.keys(people).length + ' 人。沉默字段：难题与策略填写率 <b>' +
      (silentPS != null ? num(silentPS, 0) : '—') + '%</b>、AI 提效填写率 <b>' +
      (silentAI != null ? num(silentAI, 0) : '—') + '%</b>。</div>' +
      '<button class="ck-drill" data-drill="daily">查看日报明细 →</button></div>';
    // 周报
    var wkCycles = W.map(function (w) { return w.cycle || ''; }).filter(Boolean).sort();
    var latestWk = wkCycles.length ? wkCycles[wkCycles.length - 1] : '—';
    html += '<div class="ck-mod"><div class="mt">🗓️ 周报</div>' +
      '<div class="mv">' + W.length + ' 条</div>' +
      '<div class="md">最新周期：<b>' + esc(latestWk) + '</b>（飞书周报表最新有数据月份为 8 月、9/10 月为空且无核销状态字段；承诺核销已改由门户 <b>data/weekly_promises.csv</b> 维护，编辑 CSV 重跑烘焙即刷新）。' +
      '承诺核销：完全 ' + PROMISES.full + ' / 部分 ' + PROMISES.partial + ' / 未核销 ' + PROMISES.none + '。</div>' +
      '<button class="ck-drill" data-drill="weekly">查看周报明细 →</button></div>';
    // 月报
    var months = {}; M.forEach(function (r) { months[r.month] = 1; });
    html += '<div class="ck-mod"><div class="mt">📆 月报</div>' +
      '<div class="mv">' + monthly10.length + ' 份</div>' +
      '<div class="md">本月（' + TARGET_MONTH + '）已聚合 ' + depts.length + ' 个部门 / ' +
      Object.keys(people).length + ' 人。历史月报月份：' + Object.keys(months).length + ' 个月。</div>' +
      '<button class="ck-drill" data-drill="monthly">查看月报明细 →</button></div>';
    // 闭环
    var nbMap2 = {}; PROMISES.breakdown.forEach(function (x) { nbMap2[x[0]] = x[1]; });
    var nD2 = nbMap2['消失（无下文）'] || 0, nF2 = nbMap2['顺延'] || 0, nX2 = nbMap2['降级'] || 0, nL2 = nbMap2['明确失败'] || 0;
    html += '<div class="ck-mod"><div class="mt">🔄 闭环管控</div>' +
      '<div class="mv">' + PROMISES.full + '/' + PROMISES.total + '</div>' +
      '<div class="md">本周报承诺核销墙：完全核销 ' + PROMISES.full + '、部分 ' + PROMISES.partial + '、未核销 ' +
      PROMISES.none + '（消失 ' + nD2 + ' / 顺延 ' + nF2 +
      ' / 降级 ' + nX2 + ' / 失败 ' + nL2 + '）。</div>' +
      '<button class="ck-drill" data-drill="loop">查看闭环管控 →</button></div>';
    html += '</div>';

    // 预警熔断条
    html += '<div class="ck-sec-t"><span class="bar"></span>预警 · 熔断条</div>';
    html += '<div class="ck-alerts">';
    html += '<div class="ck-alert red"><span class="ico">🚨</span><div><b>沉默字段熔断</b><br>难题与策略填写率仅 <b>' +
      (silentPS != null ? num(silentPS, 0) : '—') + '%</b>、AI 提效填写率仅 <b>' +
      (silentAI != null ? num(silentAI, 0) : '—') + '%</b>。三反思字段近乎全空，部门字段完整率被系统性压低。</div></div>';
    html += '<div class="ck-alert amber"><span class="ico">⚠️</span><div><b>跨周期错挂</b><br>全公司 10 月日报中，' +
      crossTotal + ' 条「日报月份 ≠ OGSM 考核周期」。目标归属口径错乱，关联目标率统计失真。</div></div>';
    var nbMap = {}; PROMISES.breakdown.forEach(function (x) { nbMap[x[0]] = x[1]; });
    var nDisappear = nbMap['消失（无下文）'] || 0, nDefer = nbMap['顺延'] || 0,
        nDown = nbMap['降级'] || 0, nFail = nbMap['明确失败'] || 0;
    html += '<div class="ck-alert amber"><span class="ico">⚠️</span><div><b>承诺未核销</b><br>' + PROMISES.total + ' 条周报「下一步」中，' +
      PROMISES.none + ' 条（' + Math.round(100 * PROMISES.none / PROMISES.total) +
      '%）无下文：消失 ' + nDisappear + ' / 顺延 ' + nDefer +
      ' / 降级 ' + nDown + ' / 明确失败 ' + nFail + '。</div></div>';
    html += '</div>';

    // OGSM 目标健康度（各部门目标数 + 已对齐率）
    var ogByDept = {};
    O.forEach(function (g) {
      var d = g.dept && g.dept.trim() ? g.dept : '（未填部门）';
      if (!ogByDept[d]) ogByDept[d] = { total: 0, aligned: 0 };
      ogByDept[d].total++;
      if (g.score != null || (g.linked_daily_ids && g.linked_daily_ids.length)) ogByDept[d].aligned++;
    });
    var ogDepts = Object.keys(ogByDept).sort(function (a, b) { return ogByDept[b].total - ogByDept[a].total; });
    if (ogDepts.length) {
      html += '<div class="ck-sec-t"><span class="bar"></span>OGSM 目标健康度（全周期）</div>';
      html += '<div class="ck-grid">';
      ogDepts.forEach(function (dn) {
        var o = ogByDept[dn];
        var rate = o.total ? Math.round(100 * o.aligned / o.total) : null;
        html += '<div class="ck-card"><div class="dn"><span>' + esc(dn) + '</span><span class="cnt">' + o.total + ' 目标</span></div>';
        html += '<div class="ck-lights">' + lightItem(rate, TH.align, '已对齐') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // v2 新增：个人填报 TOP 榜
    var personRows = monthly10.slice().sort(function (a, b) { return (b.distinct_days || 0) - (a.distinct_days || 0); });
    if (personRows.length) {
      var topList = personRows.slice(0, 5);
      var lowList = personRows.slice(-3).reverse();
      html += '<div class="ck-sec-t"><span class="bar"></span>个人填报 TOP 榜（按本月有效填报天数）</div>';
      html += '<div class="ck-grid">';
      html += '<div class="ck-card"><div class="dn"><span>🏆 填报最活跃 TOP 5</span><span class="cnt">' + topList.length + ' 人</span></div><div class="ck-top">';
      topList.forEach(function (r, i) {
        html += '<div class="ck-top-item"><span class="rn">' + (i + 1) + '. ' + esc(r.reporter_name || '—') +
          ' <span style="color:var(--rb-muted);font-weight:500">' + esc(r.dept || '') + '</span></span><span class="rd">' +
          (r.distinct_days || 0) + ' 天</span></div>';
      });
      html += '</div></div>';
      html += '<div class="ck-card"><div class="dn"><span>⚠️ 填报偏低 末位 3</span><span class="cnt">需关注</span></div><div class="ck-top">';
      lowList.forEach(function (r) {
        html += '<div class="ck-top-item low"><span class="rn">' + esc(r.reporter_name || '—') +
          ' <span style="color:var(--rb-muted);font-weight:500">' + esc(r.dept || '') + '</span></span><span class="rd">' +
          (r.distinct_days || 0) + ' 天</span></div>';
      });
      html += '</div></div>';
      html += '</div>';
    }

    // v2 新增：沉默字段部门排行（条形，难题策略填写率升序）
    var dff = deptFieldFill().sort(function (a, b) { return (a.ps || 0) - (b.ps || 0); });
    if (dff.length) {
      var maxPs = Math.max.apply(null, dff.map(function (d) { return d.ps || 0; }).concat([1]));
      html += '<div class="ck-sec-t"><span class="bar"></span>沉默字段 · 部门排行（难题策略填写率，升序 = 越差越靠前）</div>';
      html += '<div class="ck-card"><div class="ck-bars">';
      dff.forEach(function (d) {
        var v = d.ps || 0;
        var c = light(v, TH.comp);
        var col = c === 'green' ? '#16a34a' : c === 'amber' ? '#d97706' : c === 'red' ? '#dc2626' : '#c3c9d4';
        var w = Math.round(100 * v / maxPs);
        html += '<div class="ck-bar-row"><span class="bn">' + esc(d.dept) + '</span>' +
          '<span class="ck-bar-track"><span class="ck-bar-fill" style="width:' + w + '%;background:' + col + '"></span></span>' +
          '<span class="bv">' + num(v, 0) + '%</span></div>';
      });
      html += '</div>';
      var dffAi = dff.slice().sort(function (a, b) { return (a.ai || 0) - (b.ai || 0); });
      html += '<div style="margin-top:10px;font-size:12px;color:var(--rb-muted)">AI 提效填写率（升序）：' +
        dffAi.map(function (d) { return esc(d.dept) + ' ' + num(d.ai, 0) + '%'; }).join('　·　') + '</div>';
      html += '</div>';
    }

    html += '<div class="ck-note">说明：① 驾驶舱与四个明细页签共用同源数据（飞书日报/周报/月报 + OGSM 目标），仅做前端聚合，不拉飞书。其中「日报填报率」为日报填报口径（截至数据日应出勤天数的填报覆盖），非 HR 真实出勤。' +
      '② 红绿灯阈值 v2（达标导向）：出勤≥85/关联≥50/完整≥60/按时≥90/已对齐≥70 为绿，黄为关注，红为预警，可按管理偏好在 cockpit.js 顶部调整。' +
      '③ 月度环比、个人 TOP 榜、沉默字段部门排行均为 v2 新增派生指标，数据源同上；周报承诺核销、跨周期错挂为已定稿/实测值。' +
      '④ 周报表 9/10 月为空且无核销状态字段，核销墙已改由门户 data/weekly_promises.csv 维护、可手工刷新（编辑 CSV → node bake_promises.js → 部署）。' +
      '⑤ 个人绩效分与 ⚠️ 低可信评价按门户脱敏策略不在公网展开，仅在「闭环管控」页签本地可见。</div>';

    html += '</div>';
    return html;
  }

  global.ReportCockpit = { renderBody: renderBody };
})();

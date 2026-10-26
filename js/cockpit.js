/**
 * 日周月报 · 管理驾驶舱（Cockpit）
 * 定位：把「日周月报」模块的日报质量 / 周报进度 / 月报达成 / 闭环预警，
 *       在一屏内以 KPI 卡片 + 部门红绿灯矩阵 + 模块摘要 + 预警熔断条集中呈现。
 * 明细下钻仍由日报/周报/月报/闭环管控四个页签承接。
 * 数据源：window.MONTHLY_REPORTS(人×月聚合) / DAILY_REPORTS / WEEKLY_REPORTS / OGSM_GOALS / REPORT_META
 *       全部为 sync_feishu_reports.py 已物料化数据，本模块只做前端聚合，不拉飞书。
 * 红绿灯阈值（初版，可在本文件 top 调整）：出勤/关联/完整/按时 四项的绿黄红分界。
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

  /* 红绿灯阈值（百分比口径；completeness 为 0-1，内部 ×100） */
  var TH = {
    att:   { good: 90, warn: 75 },   // 出勤率
    link:  { good: 60, warn: 35 },   // 关联目标率
    comp:  { good: 60, warn: 35 },   // 字段完整率
    ontime:{ good: 90, warn: 70 },   // 按时率
    align: { good: 80, warn: 50 }    // OGSM 已对齐(有评分)率
  };
  function light(v, th) {
    if (v == null || isNaN(v)) return 'gray';
    if (v >= th.good) return 'green';
    if (v >= th.warn) return 'amber';
    return 'red';
  }
  var LABEL = { green: '良好', amber: '关注', red: '预警', gray: '无数据' };

  /* 周报承诺核销（定稿值，数据源：三份 10 月周复盘人工核对，截至 2026-10-24） */
  var PROMISES = { total: 18, full: 2, partial: 7, none: 9,
    breakdown: [['消失（无下文）', 4], ['顺延', 2], ['降级', 1], ['明确失败', 2]] };

  function avg(arr) { return arr.length ? arr.reduce(function (x, y) { return x + y; }, 0) / arr.length : null; }

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
      '.ck-tag.green{background:#dcfce7;color:#15803d}.ck-tag.amber{background:#fef3c7;color:#b45309}.ck-tag.red{background:#fee2e2;color:#b91c1c}'
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
      '</b>　|　数据更新：<b>' + esc(synced) + '</b>　|　红绿灯阈值初版，可在驾驶舱源文件调整</div>';

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
      '<div class="md">最新周期：<b>' + esc(latestWk) + '</b>（飞书周报表最新有数据月份为 8 月，10 月为空，故承诺核销为静态定稿）。' +
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
    html += '<div class="ck-mod"><div class="mt">🔄 闭环管控</div>' +
      '<div class="mv">' + PROMISES.full + '/' + PROMISES.total + '</div>' +
      '<div class="md">本周报承诺核销墙：完全核销 ' + PROMISES.full + '、部分 ' + PROMISES.partial + '、未核销 ' +
      PROMISES.none + '（消失 ' + PROMISES.breakdown[0][1] + ' / 顺延 ' + PROMISES.breakdown[1][1] +
      ' / 降级 ' + PROMISES.breakdown[2][1] + ' / 失败 ' + PROMISES.breakdown[3][1] + '）。</div>' +
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
    html += '<div class="ck-alert amber"><span class="ico">⚠️</span><div><b>承诺未核销</b><br>18 条周报「下一步」中，' +
      PROMISES.none + ' 条（' + Math.round(100 * PROMISES.none / PROMISES.total) +
      '%）无下文：消失 ' + PROMISES.breakdown[0][1] + ' / 顺延 ' + PROMISES.breakdown[1][1] +
      ' / 降级 ' + PROMISES.breakdown[2][1] + ' / 明确失败 ' + PROMISES.breakdown[3][1] + '。</div></div>';
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

    html += '<div class="ck-note">说明：① 驾驶舱与四个明细页签共用同源数据（飞书日报/周报/月报 + OGSM 目标），仅做前端聚合，不拉飞书。其中「日报填报率」为日报填报口径（截至数据日应出勤天数的填报覆盖），非 HR 真实出勤。' +
      '② 红绿灯阈值（出勤≥90/关联≥60/完整≥60/按时≥90/已对齐≥80 为绿，黄为关注，红为预警）为初版，可按管理偏好在 cockpit.js 顶部调整。' +
      '③ 周报承诺核销、沉默字段、跨周期错挂均为已定稿/实测值，标注了数据源与截止日；周报表 10 月为空，核销墙暂不能自动刷新。' +
      '④ 个人绩效分与 ⚠️ 低可信评价按门户脱敏策略不在公网展开，仅在「闭环管控」页签本地可见。</div>';

    html += '</div>';
    return html;
  }

  global.ReportCockpit = { renderBody: renderBody };
})();

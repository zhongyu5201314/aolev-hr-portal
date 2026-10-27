/**
 * 日周月报 · 管理驾驶舱（Cockpit）
 * 定位：把「日周月报」模块的日报质量 / 周报进度 / 月报达成 / 闭环预警，
 *       在一屏内以 KPI 卡片 + 部门红绿灯矩阵 + 模块摘要 + 预警熔断条集中呈现，
 *       并以 ECharts 可视化（月度趋势 / 部门健康度 / 沉默字段 / 个人 TOP）。
 * 明细下钻仍由日报/周报/月报/闭环管控四个页签承接。
 * 数据源：window.MONTHLY_REPORTS(人×月聚合) / DAILY_REPORTS / WEEKLY_REPORTS / OGSM_GOALS / REPORT_META
 *       全部为 sync_feishu_reports.py 已物料化数据，本模块只做前端聚合，不拉飞书。
 * v2（2026-10-26）：① 红绿灯阈值改为达标导向；② 月度环比趋势；③ 个人填报 TOP 榜；④ 沉默字段部门排行（条形）。
 * v3（2026-10-27）：引入 ECharts 真图表（折线/柱状），由 renderBody() 产出容器 + PENDING 配置，
 *       report_board.js 在 HTML 注入 DOM 后调用 mount() 初始化；echarts 缺失时优雅降级。
 * v3.1（2026-10-27）：月度趋势线末端加环比 ▲▼ 箭头；沉默字段由双系列柱状细拆为 6 字段小图表网格。
 * v3.2（2026-10-27）：部门健康度柱状按四指标最差项红绿灯分色（对齐 v2 TH，悬停看四指标明细）；
 *       个人 TOP 榜柱状补末位 3 人（红色标"需关注"）与 TOP 8 同图对比。
 * v3.3（2026-10-27）：顶部加全局健康度仪表盘（gauge）；预警"熔断条"改为熔断指标 vs 阈值柱状图（红=已触发），
 *       并保留文字要点兜底（echarts 缺失时仍可见）。
 * v3.4（2026-10-27）：仪表盘支持历史月份切换（顶部按钮组，按各月全局健康度，切换平滑过渡）；部门红绿灯矩阵改为雷达图
 *       （每部门一条系列，四指标 max=100；区域填充色按该部门四指标最差项红绿灯；灰色虚线为达标基准线、金色虚线为全公司均值对比叠加层、青色点线为公司目标线（占位待校准）；
 *       「人事行政部」本部高亮，跨周期错挂进 tooltip + 下方提示；雷达图另提供「仅看本部对比」按钮，一键隐藏其他部门只看本部 vs 全公司均值；
 *       部门健康度柱状图同样提供「仅看本部」切换按钮，并加历史月份按钮（与仪表盘同源）实现历史月份联动）。
 */
(function (global) {
  'use strict';
  var U = global.U;
  function esc(s) { return U && U.escapeHtml ? U.escapeHtml(s) : String(s == null ? '' : s); }
  function num(v, d) { if (v == null || isNaN(v)) return '—'; var n = Number(v); return d != null ? n.toFixed(d) : String(Math.round(n)); }
  function pct(v) { return num(v, 1) + '%'; }
  function pnum(v) { return v == null ? 0 : Number(v); }

  var M = global.MONTHLY_REPORTS || [];
  var D = global.DAILY_REPORTS || [];
  var W = global.WEEKLY_REPORTS || [];
  var O = global.OGSM_GOALS || [];
  var META = global.REPORT_META || {};
  var TARGET_MONTH = '2026年10月';

  /* 暗色图表配色（复用报表页 --rb-* 语义） */
  var C = {
    ink: '#e8e8f0', muted: '#aeb0c0', line: 'rgba(255,255,255,.15)', split: 'rgba(255,255,255,.08)',
    accent: '#4a9eff', accent2: '#8b5cf6', green: '#16a34a', amber: '#d97706', red: '#dc2626'
  };

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

  /* 雷达图「公司目标线」：管理挑战/目标值（四指标 %）。占位参考值、非实测；
   * 上线前请 HR 替换为真实考核目标；设为 null 则该线不显示。 */
  var RADAR_TARGET = { att: 95, link: 65, comp: 75, ontime: 95 };

  /* 周报承诺核销 —— 数据源：门户本地 data/weekly_promises.csv（bake_promises.js 烘焙为 window.WEEKLY_PROMISES）。
   * 飞书周报表无核销状态字段、9/10 月为空，故改由门户侧 CSV 维护、可手工刷新。兜底值保留旧定稿。 */
  var PROMISES = global.WEEKLY_PROMISES || { total: 18, full: 2, partial: 7, none: 9,
    breakdown: [['消失（无下文）', 4], ['顺延', 2], ['降级', 1], ['明确失败', 2]] };

  function avg(arr) { return arr.length ? arr.reduce(function (x, y) { return x + y; }, 0) / arr.length : null; }

  /* 月份有序列表（按年+月数值排序，避免 "10月" 排在 "8月" 之前的字符串排序问题） */
  function monthKey(m) {
    var mm = m && m.match(/(\d{4})年(\d{1,2})月/);
    return mm ? (parseInt(mm[1], 10) * 12 + parseInt(mm[2], 10)) : 0;
  }
  function monthsSorted() {
    var ms = {}; M.forEach(function (r) { if (r.month) ms[r.month] = 1; });
    return Object.keys(ms).sort(function (a, b) { return monthKey(a) - monthKey(b); });
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
  /* 各月全局健康度（公司四指标均值），供仪表盘历史切换 */
  function monthHealthAll() {
    var map = {};
    monthsSorted().forEach(function (m) {
      var v = avg([monthMetric(m, 'att'), monthMetric(m, 'link'), monthMetric(m, 'comp'), monthMetric(m, 'ontime')].filter(function (x) { return x != null; }));
      map[m] = v == null ? 0 : v;
    });
    return map;
  }

  /* 按部门聚合某月 MONTHLY（month 缺省=统计月 TARGET_MONTH） */
  function deptAgg(month) {
    month = month || TARGET_MONTH;
    var map = {};
    M.filter(function (r) { return r.month === month; }).forEach(function (r) {
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

  /* 沉默字段字段清单（与 fieldFillCompany 对齐） */
  var FIELDS = [
    { k: 'key_actions', n: '关键动作' },
    { k: 'tomorrow_plan', n: '明日计划' },
    { k: 'daily_work', n: '日常工作' },
    { k: 'problem_strategy', n: '难题策略' },
    { k: 'ai_efficiency', n: 'AI提效' },
    { k: 'emergency', n: '突发工作' }
  ];
  /* 沉默字段部门排行（10 月，按各字段填写率聚合） */
  function deptFieldFill() {
    var map = {};
    M.filter(function (r) { return r.month === TARGET_MONTH && r.field_fill; }).forEach(function (r) {
      var d = r.dept && r.dept.trim() ? r.dept : '（未填部门）';
      if (!map[d]) { map[d] = { dept: d }; FIELDS.forEach(function (f) { map[d][f.k] = []; }); }
      var ff = r.field_fill;
      FIELDS.forEach(function (f) { if (ff[f.k] != null) map[d][f.k].push(ff[f.k]); });
    });
    return Object.keys(map).map(function (d) {
      var o = { dept: d };
      FIELDS.forEach(function (f) { o[f.k] = avg(map[d][f.k]); });
      return o;
    });
  }

  function injectStyle() {
    if (document.getElementById('ck-style')) return;
    var s = document.createElement('style'); s.id = 'ck-style';
    s.textContent = [
      '.ck-wrap{max-width:1180px;margin:0 auto;padding:8px 4px}',
      '.ck-h1{font-size:22px;font-weight:800;color:var(--rb-ink);margin:6px 0 2px}',
      '.ck-sub{color:var(--rb-muted);font-size:13px;margin-bottom:14px}',
      '.ck-help{display:inline-block;margin:0 0 12px;font-size:13px;font-weight:600;color:var(--rb-accent);text-decoration:none}',
      '.ck-help:hover{text-decoration:underline}',
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
      /* v3 新增：ECharts 图表容器 */
      '.ck-chart{background:var(--rb-card);border:1px solid var(--rb-line);border-radius:14px;padding:6px 8px;margin-bottom:6px}',
      '.ck-chart .ck-cap{font-size:11.5px;color:var(--rb-muted);padding:4px 8px 0}',
      /* v3.1 新增：沉默字段小图表网格 */
      '.ck-minigrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-bottom:6px}',
      /* v3.4 新增：仪表盘月份切换按钮 */
      '.ck-mbtns{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 2px}',
      '.ck-mbtn{padding:4px 12px;border-radius:8px;border:1px solid var(--rb-line);background:var(--rb-card);color:var(--rb-muted);font-size:12px;font-weight:600;cursor:pointer}',
      '.ck-mbtn:hover{color:var(--rb-ink)}',
      '.ck-mbtn.is-active{color:#fff;background:linear-gradient(135deg,var(--rb-accent),var(--rb-accent2));border-color:transparent}'
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
  /* 图表容器：给 id，供 mount() 初始化 */
  function chartBox(id, h, cap) {
    return '<div class="ck-chart"><div id="' + id + '" style="height:' + h + 'px"></div>' +
      (cap ? '<div class="ck-cap">' + esc(cap) + '</div>' : '') + '</div>';
  }

  /* ============ ECharts 配置构建（纯数据 → option，无 echarts 依赖） ============ */
  function buildTrendOption(ms) {
    var defs = [['att', '日报填报率', C.accent], ['link', '关联目标率', C.accent2], ['comp', '字段完整率', C.green], ['ontime', '按时率', C.amber]];
    var series = defs.map(function (d) {
      var data = ms.map(function (m) { var v = monthMetric(m, d[0]); return v == null ? null : Number(v.toFixed(1)); });
      var last = data.length ? data[data.length - 1] : null;
      var prev = data.length > 1 ? data[data.length - 2] : null;
      var arrow = (last == null || prev == null) ? '▬' : (last > prev + 0.05 ? '▲' : (last < prev - 0.05 ? '▼' : '▬'));
      var arrowColor = arrow === '▲' ? '#16a34a' : arrow === '▼' ? '#dc2626' : '#9ca3af';
      return {
        name: d[1], type: 'line', smooth: true, connectNulls: true, symbolSize: 6,
        itemStyle: { color: d[2] }, lineStyle: { width: 2.5, color: d[2] },
        data: data,
        endLabel: {
          show: true, fontSize: 12, fontWeight: 700, color: arrowColor,
          formatter: function (p) { return (p.value == null ? '—' : p.value + '%') + ' ' + arrow; }
        }
      };
    });
    return {
      backgroundColor: 'transparent',
      title: { text: '月度趋势 · 四指标（公司均值 %）', left: 14, top: 8, textStyle: { color: C.ink, fontSize: 14, fontWeight: 700 } },
      textStyle: { color: C.muted },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(22,22,44,.95)', borderColor: 'rgba(74,158,255,.4)', textStyle: { color: C.ink },
        valueFormatter: function (v) { return v == null ? '—' : v + '%'; } },
      legend: { top: 30, left: 14, textStyle: { color: C.muted }, data: defs.map(function (d) { return d[1]; }) },
      grid: { left: 46, right: 20, top: 66, bottom: 34 },
      xAxis: { type: 'category', data: ms, boundaryGap: false, axisLine: { lineStyle: { color: C.line } }, axisLabel: { color: C.muted } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: C.muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: C.split } } },
      series: series
    };
  }

  function buildDeptHealthOption(agg, depts) {
    var rows = depts.map(function (dn) {
      var a = agg[dn];
      var m = { att: avg(a.att), link: avg(a.link), comp: avg(a.comp), ontime: avg(a.ontime) };
      var vals = [m.att, m.link, m.comp, m.ontime].filter(function (v) { return v != null; });
      var score = vals.length ? vals.reduce(function (x, y) { return x + y; }, 0) / vals.length : null;
      // 红绿灯分色：取四指标各自 light 的最差项（绿=全达标 / 黄=有关注 / 红=有预警），对齐 v2 阈值 TH
      var worst = 'green';
      [['att', TH.att], ['link', TH.link], ['comp', TH.comp], ['ontime', TH.ontime]].forEach(function (p) {
        var lv = light(m[p[0]], p[1]);
        if (lv === 'red') worst = 'red';
        else if (lv === 'amber' && worst !== 'red') worst = 'amber';
      });
      return { dn: dn, score: score, m: m, worst: worst };
    }).filter(function (r) { return r.score != null; }).sort(function (a, b) { return b.score - a.score; });
    var cats = rows.map(function (r) { return r.dn; });
    var data = rows.map(function (r) {
      var col = r.worst === 'green' ? C.green : r.worst === 'amber' ? C.amber : C.red;
      return { value: Number(r.score.toFixed(1)), itemStyle: { color: col, borderRadius: [0, 4, 4, 0] }, m: r.m };
    });
    return {
      backgroundColor: 'transparent',
      title: { text: '部门综合健康度（四指标均值 %，按红绿灯分色）', left: 14, top: 8, textStyle: { color: C.ink, fontSize: 14, fontWeight: 700 } },
      textStyle: { color: C.muted },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(22,22,44,.95)', borderColor: 'rgba(74,158,255,.4)', textStyle: { color: C.ink },
        formatter: function (params) {
          var p = params[0]; var m = p.data.m;
          if (!m) return p.name + '：' + p.value + '%';
          var f = function (v) { return v == null ? '—' : Number(v.toFixed(1)) + '%'; };
          return p.name + '　综合 ' + p.value + '%<br>填报 ' + f(m.att) + ' / 关联 ' + f(m.link) +
            '<br>完整 ' + f(m.comp) + ' / 按时 ' + f(m.ontime);
        }
      },
      grid: { left: 130, right: 44, top: 44, bottom: 24 },
      xAxis: { type: 'value', max: 100, axisLabel: { color: C.muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: C.split } } },
      yAxis: { type: 'category', data: cats.slice().reverse(), axisLabel: { color: '#cdd0e0' }, axisLine: { lineStyle: { color: C.line } } },
      series: [{ type: 'bar', data: data.slice().reverse(), barWidth: '58%', label: { show: true, position: 'right', color: C.ink, formatter: '{c}%' } }]
    };
  }

  /* v3.4 新增：部门健康度雷达图 —— 每部门一条系列，四指标 max=100；本部高亮；tooltip 出四指标 + 跨周期错挂 */
  function buildDeptRadarOption(agg, depts) {
    var indicator = [
      { name: '填报', max: 100 }, { name: '关联', max: 100 },
      { name: '完整', max: 100 },       { name: '按时', max: 100 }
    ];
    // 全公司均值（四指标公司均值，跨所有部门所有人员；与 KPI/仪表盘口径一致）作对比叠加层
    var allAtt = [], allLink = [], allComp = [], allOntime = [];
    depts.forEach(function (dn) { var a = agg[dn]; allAtt = allAtt.concat(a.att); allLink = allLink.concat(a.link); allComp = allComp.concat(a.comp); allOntime = allOntime.concat(a.ontime); });
    var compMeans = [avg(allAtt), avg(allLink), avg(allComp), avg(allOntime)].map(function (x) { return x == null ? 0 : Number(x.toFixed(1)); });
    var seriesData = depts.map(function (dn) {
      var a = agg[dn];
      var isHome = dn === '人事行政部';
      var m = { att: avg(a.att), link: avg(a.link), comp: avg(a.comp), ontime: avg(a.ontime) };
      // 红绿灯语义：取四指标最差项判定该部门区域底色（绿=全达标/黄=有关注/红=有预警）
      var worst = 'green';
      [['att', TH.att], ['link', TH.link], ['comp', TH.comp], ['ontime', TH.ontime]].forEach(function (p) {
        var lv = light(m[p[0]], p[1]);
        if (lv === 'red') worst = 'red';
        else if (lv === 'amber' && worst !== 'red') worst = 'amber';
      });
      var col = isHome ? C.accent : (worst === 'green' ? C.green : worst === 'amber' ? C.amber : C.red);
      var fill = isHome ? 'rgba(74,158,255,.28)'
        : (worst === 'green' ? 'rgba(22,163,74,.20)' : worst === 'amber' ? 'rgba(217,119,6,.20)' : 'rgba(220,38,38,.22)');
      return {
        name: dn + (isHome ? '（本部）' : '（' + LABEL[worst] + '）'),
        value: [m.att, m.link, m.comp, m.ontime].map(function (x) { return x == null ? 0 : Number(x.toFixed(1)); }),
        _raw: { att: m.att, link: m.link, comp: m.comp, ontime: m.ontime, cross: a.cross, n: a.n, worst: worst },
        lineStyle: { color: col, width: isHome ? 3 : 2 },
        areaStyle: { color: fill },
        itemStyle: { color: col }
      };
    });
    // 达标基准线（红绿灯 v2 good 阈值）作参考边界：部门多边形落在线内=该指标未达标
    seriesData.unshift({
      name: '达标基准线',
      value: [TH.att.good, TH.link.good, TH.comp.good, TH.ontime.good],
      lineStyle: { color: '#9ca3af', width: 1.5, type: 'dashed' },
      itemStyle: { color: '#9ca3af' },
      areaStyle: { color: 'rgba(156,163,175,.06)' },
      symbol: 'none'
    });
    // 全公司均值对比叠加层（金色虚线）
    seriesData.push({
      name: '全公司均值',
      value: compMeans,
      lineStyle: { color: C.amber, width: 2, type: 'dashed' },
      itemStyle: { color: C.amber },
      areaStyle: { color: 'rgba(217,119,6,.10)' },
      symbol: 'circle'
    });
    // 公司目标线（管理挑战/目标值，青色点线；占位参考、非实测，待 HR 校准）
    if (RADAR_TARGET) {
      seriesData.push({
        name: '公司目标线',
        value: [RADAR_TARGET.att, RADAR_TARGET.link, RADAR_TARGET.comp, RADAR_TARGET.ontime].map(function (x) { return x == null ? 0 : Number(x); }),
        lineStyle: { color: '#06b6d4', width: 2, type: 'dotted' },
        itemStyle: { color: '#06b6d4' },
        areaStyle: { color: 'rgba(6,182,212,.06)' },
        symbol: 'rect'
      });
    }
    return {
      backgroundColor: 'transparent',
      title: { text: '部门健康度雷达（四指标均值 %，区域按红绿灯）', left: 14, top: 8, textStyle: { color: C.ink, fontSize: 14, fontWeight: 700 } },
      textStyle: { color: C.muted },
      tooltip: {
        backgroundColor: 'rgba(22,22,44,.95)', borderColor: 'rgba(74,158,255,.4)', textStyle: { color: C.ink },
        formatter: function (p) {
          if (p.name === '达标基准线') {
            return '达标基准线（红绿灯 v2 good）<br>填报≥' + TH.att.good + '% / 关联≥' + TH.link.good + '%<br>完整≥' + TH.comp.good + '% / 按时≥' + TH.ontime.good + '%';
          }
          if (p.name === '全公司均值') {
            var vv = p.value || [];
            var ff = function (x) { return x == null ? '—' : Number(x).toFixed(1) + '%'; };
            return '全公司均值（四指标公司均值）<br>填报 ' + ff(vv[0]) + ' / 关联 ' + ff(vv[1]) + '<br>完整 ' + ff(vv[2]) + ' / 按时 ' + ff(vv[3]);
          }
          if (p.name === '公司目标线') {
            var tv = p.value || [];
            var tf = function (x) { return x == null ? '—' : Number(x).toFixed(0) + '%'; };
            return '公司目标线（管理目标值，占位待校准）<br>填报 ' + tf(tv[0]) + ' / 关联 ' + tf(tv[1]) + '<br>完整 ' + tf(tv[2]) + ' / 按时 ' + tf(tv[3]);
          }
          var r = p.data && p.data._raw; if (!r) return p.name;
          var f = function (x) { return x == null ? '—' : Number(x.toFixed(1)) + '%'; };
          return p.name + '（' + r.n + ' 人 · ' + LABEL[r.worst] + '）<br>填报 ' + f(r.att) + ' / 关联 ' + f(r.link) +
            '<br>完整 ' + f(r.comp) + ' / 按时 ' + f(r.ontime) +
            (r.cross > 0 ? ('<br>⚠️ 跨周期错挂 ' + r.cross + ' 条') : '');
        }
      },
      legend: { type: 'scroll', bottom: 0, left: 'center', width: '90%', textStyle: { color: C.muted, fontSize: 11 }, data: seriesData.map(function (s) { return s.name; }) },
      radar: {
        indicator: indicator, center: ['50%', '50%'], radius: '62%',
        axisName: { color: C.ink, fontSize: 12 },
        splitLine: { lineStyle: { color: C.split } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,.02)', 'rgba(255,255,255,.05)'] } },
        axisLine: { lineStyle: { color: C.line } }
      },
      series: [{ type: 'radar', data: seriesData }]
    };
  }

  /* 单字段部门横向柱状（小图表用）：越靠上越差（inverse + 升序） */
  function buildFieldOption(dff, key, label) {
    var rows = dff.filter(function (r) { return r[key] != null; })
      .sort(function (a, b) { return pnum(a[key]) - pnum(b[key]); }); // 升序：最短（最差）排后，配合 inverse 置顶
    var cats = rows.map(function (r) { return r.dept; });
    var data = rows.map(function (r) {
      var v = pnum(r[key]);
      var c = light(v, TH.comp);
      var col = c === 'green' ? C.green : c === 'amber' ? C.amber : C.red;
      return { value: v, itemStyle: { color: col, borderRadius: [0, 3, 3, 0] } };
    });
    return {
      backgroundColor: 'transparent',
      title: { text: label + ' 填写率（%）', left: 8, top: 6, textStyle: { color: C.ink, fontSize: 12.5, fontWeight: 700 } },
      textStyle: { color: C.muted },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(22,22,44,.95)', borderColor: 'rgba(74,158,255,.4)', textStyle: { color: C.ink }, valueFormatter: function (v) { return v + '%'; } },
      grid: { left: 110, right: 30, top: 34, bottom: 14 },
      xAxis: { type: 'value', max: 100, axisLabel: { color: C.muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: C.split } } },
      yAxis: { type: 'category', data: cats, inverse: true, axisLabel: { color: '#cdd0e0', fontSize: 11 }, axisLine: { lineStyle: { color: C.line } } },
      series: [{ type: 'bar', data: data, barWidth: '62%', label: { show: true, position: 'right', color: C.ink, fontSize: 11, formatter: '{c}%' } }]
    };
  }

  function buildPersonOption(monthly10) {
    var sorted = monthly10.slice().sort(function (a, b) { return (b.distinct_days || 0) - (a.distinct_days || 0); });
    var top = sorted.slice(0, 8);
    var topNames = {}; top.forEach(function (r) { topNames[r.reporter_name] = 1; });
    var bottom = sorted.slice(-3).reverse();                               // 升序：最低在前
    var bottomOnly = bottom.filter(function (r) { return !topNames[r.reporter_name]; }); // 剔除已进 TOP8 的重叠
    // 显示顺序（底→顶）：末位3（最低在前）→ TOP8（最高在后，使 TOP1 居顶）
    var disp = bottomOnly.concat(top);
    var cats = disp.map(function (r) { return (r.reporter_name || '—'); });
    var data = disp.map(function (r) {
      var isBottom = !topNames[r.reporter_name];
      return { value: (r.distinct_days || 0), isBottom: isBottom, itemStyle: { color: isBottom ? C.red : C.accent2, borderRadius: [0, 4, 4, 0] } };
    });
    return {
      backgroundColor: 'transparent',
      title: { text: '个人本月有效填报天数（TOP 8 + 末位 3）', left: 14, top: 8, textStyle: { color: C.ink, fontSize: 14, fontWeight: 700 } },
      textStyle: { color: C.muted },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(22,22,44,.95)', borderColor: 'rgba(74,158,255,.4)', textStyle: { color: C.ink },
        formatter: function (params) {
          var p = params[0];
          return p.name + '：' + p.value + ' 天' + (p.data.isBottom ? '（末位·需关注）' : '');
        }
      },
      grid: { left: 110, right: 44, top: 44, bottom: 24 },
      xAxis: { type: 'value', axisLabel: { color: C.muted }, splitLine: { lineStyle: { color: C.split } } },
      yAxis: { type: 'category', data: cats, axisLabel: { color: '#cdd0e0' }, axisLine: { lineStyle: { color: C.line } } },
      series: [{ type: 'bar', data: data, barWidth: '56%', label: { show: true, position: 'right', color: C.ink } }]
    };
  }

  /* 全局健康度仪表盘（gauge）：score=四指标公司均值，颜色同红绿灯 */
  function buildGaugeOption(score, label) {
    var lv = light(score, { good: 80, warn: 65 });
    var c = lv === 'green' ? C.green : lv === 'amber' ? C.amber : C.red;
    var gTitle = label ? '全局健康度 · ' + label : '全局健康度（四指标公司均值）';
    return {
      backgroundColor: 'transparent',
      title: { text: gTitle, left: 'center', top: 8, textStyle: { color: C.ink, fontSize: 14, fontWeight: 700 } },
      textStyle: { color: C.muted },
      animationDurationUpdate: 800, animationEasingUpdate: 'cubicOut',
      series: [{
        type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '84%', center: ['50%', '58%'],
        progress: { show: true, width: 16, itemStyle: { color: c } },
        axisLine: { lineStyle: { width: 16, color: [[0.65, '#dc2626'], [0.8, '#d97706'], [1, '#16a34a']] } },
        pointer: { show: true, length: '58%', width: 4, itemStyle: { color: c } },
        anchor: { show: true, size: 8, itemStyle: { color: c } },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { color: '#5a5a72', width: 1 } },
        axisLabel: { color: '#aeb0c0', fontSize: 10, distance: 14 },
        title: { show: false },
        detail: { valueAnimation: true, formatter: function (v) { return Math.round(v) + ' 分'; }, color: C.ink, fontSize: 28, fontWeight: 800, offsetCenter: [0, '38%'] },
        data: [{ value: Math.round(score) }]
      }]
    };
  }

  /* 预警熔断指标柱状：红=已触发（低于达标线）；higher=false 时越低越好 */
  function buildAlertOption(items) {
    var cats = items.map(function (i) { return i.name; });
    var data = items.map(function (i) {
      var lv = i.higher
        ? light(i.value, { good: i.good, warn: i.warn })
        : (i.value <= i.good ? 'green' : (i.value <= i.warn ? 'amber' : 'red'));
      var col = lv === 'green' ? C.green : lv === 'amber' ? C.amber : C.red;
      return { value: Math.round(i.value), itemStyle: { color: col, borderRadius: [0, 4, 4, 0] }, _info: i };
    });
    return {
      backgroundColor: 'transparent',
      title: { text: '预警 · 熔断指标 vs 阈值（红=已触发）', left: 14, top: 8, textStyle: { color: C.ink, fontSize: 14, fontWeight: 700 } },
      textStyle: { color: C.muted },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(22,22,44,.95)', borderColor: 'rgba(74,158,255,.4)', textStyle: { color: C.ink },
        formatter: function (params) {
          var p = params[0]; var i = p.data._info;
          if (!i) return p.name + '：' + p.value + '%';
          return p.name + '　' + p.value + '%' + '<br>阈值：绿≥' + i.good + '% / 黄≥' + i.warn + '%' +
            (i.higher ? '' : '（越低越好）') + '<br>' + (i.detail || '');
        }
      },
      grid: { left: 120, right: 36, top: 44, bottom: 18 },
      xAxis: { type: 'value', max: 100, axisLabel: { color: C.muted, formatter: '{value}%' }, splitLine: { lineStyle: { color: C.split } } },
      yAxis: { type: 'category', data: cats.slice().reverse(), axisLabel: { color: '#cdd0e0', fontSize: 11 }, axisLine: { lineStyle: { color: C.line } } },
      series: [{ type: 'bar', data: data.slice().reverse(), barWidth: '55%', label: { show: true, position: 'right', color: C.ink, formatter: '{c}%' } }]
    };
  }

  /* PENDING：renderBody 计算完即写入图表配置，mount() 在 DOM 就绪后初始化 */
  var PENDING = {};
  var CHARTS = [];   // 已初始化的 echarts 实例（切换页签时统一释放）
  var MONTH_HEALTH = {};   // 各月全局健康度（公司四指标均值），仪表盘历史切换用
  var GAUGE_C = null;      // 仪表盘当前选中月份（null=默认最新月）
  var RADAR_VIEW = 'all';  // 雷达图视图：all=全部部门 / home=仅看本部对比（本部+全公司均值）
  var LAST_RADAR = null;   // 雷达图最近一次渲染的 agg/depts（供视图切换重算）
  var DEPT_VIEW = 'all';   // 部门健康度柱状图视图：all=全部部门 / home=仅看本部
  var DEPT_MONTH = null;   // 部门健康度柱状图当前选中月份（null=默认 TARGET_MONTH）

  function renderBody() {
    injectStyle();
    PENDING = {};
    RADAR_VIEW = 'all';
    DEPT_VIEW = 'all';
    DEPT_MONTH = TARGET_MONTH;
    var ms = monthsSorted();
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
    var ontimeAvg = avg(depts.map(function (d) { return agg[d].ontime; }).reduce(function (x, y) { return x.concat(y); }, []));
    var globalHealth = avg([attAvg, linkAvg, compAvg, ontimeAvg].filter(function (v) { return v != null; }));
    var daily10 = D.filter(function (r) { return r.month === TARGET_MONTH; });
    var fill = fieldFillCompany();
    var verifyRate = PROMISES.total ? Math.round(100 * (PROMISES.full + PROMISES.partial) / PROMISES.total) : null;
    var crossTotal = depts.reduce(function (s, d) { return s + agg[d].cross; }, 0);

    var html = '<div class="ck-wrap">';
    html += '<div class="ck-h1">日周月报 · 管理驾驶舱</div>';
    html += '<div class="ck-sub">一屏总览日报质量 / 周报进度 / 月报达成 / 闭环预警　|　统计月：<b>' + TARGET_MONTH +
      '</b>　|　数据更新：<b>' + esc(synced) + '</b>　|　红绿灯阈值 v2（达标导向）· 可视化 v3.4（ECharts）</div>';
    html += '<a class="ck-help" href="cockpit-help-v34.html" target="_blank" rel="noopener">📖 查看 v3.4 可视化升级说明 →</a>';

    // v3.4 新增：仪表盘 + 历史月份切换
    MONTH_HEALTH = monthHealthAll();
    if (!GAUGE_C || !MONTH_HEALTH[GAUGE_C]) GAUGE_C = ms.length ? ms[ms.length - 1] : null;
    html += '<div class="ck-sec-t"><span class="bar"></span>全局健康度（仪表盘）</div>';
    if (ms.length) {
      html += '<div class="ck-mbtns">';
      ms.forEach(function (m) {
        html += '<button class="ck-mbtn' + (m === GAUGE_C ? ' is-active' : '') + '" data-gm="' + m + '">' + esc(m) + '</button>';
      });
      html += '</div>';
    }
    html += chartBox('ckGauge', 230, '全局 = 四指标公司均值（填报/关联/完整/按时）；颜色同红绿灯（绿≥80/黄≥65/红<65）；点击上方月份切换历史');
    PENDING['ckGauge'] = buildGaugeOption(MONTH_HEALTH[GAUGE_C] == null ? 0 : MONTH_HEALTH[GAUGE_C], GAUGE_C);

    // KPI 行
    html += '<div class="ck-kpis">';
    html += kpiCard(Object.keys(people).length + '<span style="font-size:14px;color:var(--rb-muted)"> 人</span>', '本月填报覆盖（' + monthly10.length + ' 条月报记录）');
    html += kpiCard(pct(attAvg), '平均日报填报率（截至数据日）', light(attAvg, TH.att));
    html += kpiCard(pct(linkAvg), '平均关联目标率', light(linkAvg, TH.link));
    html += kpiCard(pct(compAvg), '平均字段完整率', light(compAvg, TH.comp));
    html += kpiCard((verifyRate != null ? verifyRate : '—') + '%', '闭环承诺核销率（' + PROMISES.full + '/' + PROMISES.total + ' 完全核销）');
    html += kpiCard(daily10.length + '<span style="font-size:14px;color:var(--rb-muted)"> 条</span>', '本月日报总量');
    html += '</div>';

    // v3.4 变更：部门红绿灯矩阵 → 雷达图（每部门一条系列；本部高亮；跨周期错挂进 tooltip + 下方提示）
    var crossDepts = depts.filter(function (d) { return agg[d].cross > 0; });
    LAST_RADAR = { agg: agg, depts: depts };
    html += '<div class="ck-sec-t"><span class="bar"></span>部门健康度 · 雷达图（四指标均值 %）</div>';
    if (depts.length) {
      html += '<div class="ck-mbtns">';
      html += '<button class="ck-mbtn' + (RADAR_VIEW === 'all' ? ' is-active' : '') + '" data-rv="all">全部部门</button>';
      html += '<button class="ck-mbtn' + (RADAR_VIEW === 'home' ? ' is-active' : '') + '" data-rv="home">仅看本部对比</button>';
      html += '</div>';
      html += chartBox('ckChartRadar', Math.max(380, depts.length * 28 + 140), '每部门一条系列，四指标（填报/关联/完整/按时）均值 % 同红绿灯口径；区域填充色按该部门四指标最差项红绿灯（绿=全达标/黄=关注/红=预警）；金色虚线=全公司均值、灰色虚线=达标基准线、青色点线=公司目标线（占位待校准）；多边形落在线内=该指标未达标；「人事行政部」本部高亮（蓝）；点击图例可显隐对应系列');
      PENDING['ckChartRadar'] = buildDeptRadarOption(agg, depts);
    }
    if (crossDepts.length) {
      html += '<div class="ck-cap" style="margin-top:4px">⚠️ 跨周期错挂提示：' +
        crossDepts.map(function (d) { return esc(d) + ' ' + agg[d].cross + ' 条'; }).join(' / ') +
        '（日报月份 ≠ OGSM 考核周期，关联目标率统计失真）。</div>';
    }

    // v3 新增：月度趋势折线图（跨所有历史月份）
    if (ms.length) {
      html += '<div class="ck-sec-t"><span class="bar"></span>月度趋势 · 可视化（折线）</div>';
      html += chartBox('ckChartTrend', Math.max(300, 320), '指标口径同红绿灯：填报/关联/完整/按时（公司均值 %）');
      PENDING['ckChartTrend'] = buildTrendOption(ms);
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

    // v3.3 新增：预警熔断做成图（熔断指标 vs 阈值，红=已触发）
    var crossRate = daily10.length ? Math.round(100 * crossTotal / daily10.length) : 0;
    var alertData = [
      { name: '难题策略填写率', value: silentPS == null ? 0 : silentPS, good: 60, warn: 40, higher: true, detail: '三反思字段近乎全空，系统性压低字段完整率' },
      { name: 'AI提效填写率', value: silentAI == null ? 0 : silentAI, good: 60, warn: 40, higher: true, detail: 'AI 提效字段填写严重不足' },
      { name: '关联目标率', value: linkAvg == null ? 0 : linkAvg, good: 50, warn: 30, higher: true, detail: '目标归属口径错乱，关联目标率统计失真' },
      { name: '承诺核销率', value: verifyRate == null ? 0 : verifyRate, good: 80, warn: 60, higher: true, detail: PROMISES.none + ' 条周报「下一步」无下文（消失/顺延/降级/失败）' },
      { name: '跨周期错挂占比', value: crossRate, good: 2, warn: 5, higher: false, detail: crossTotal + ' 条日报月份 ≠ OGSM 考核周期' }
    ];
    html += '<div class="ck-sec-t"><span class="bar"></span>预警 · 熔断指标（可视化）</div>';
    html += chartBox('ckChartAlert', Math.max(220, alertData.length * 30), '红=该项已触发熔断（低于达标线）；悬停看阈值与明细');
    PENDING['ckChartAlert'] = buildAlertOption(alertData);
    html += '<div class="ck-cap" style="margin-top:4px">熔断要点：① 三反思字段（难题/AI）近乎全空，字段完整率被系统性压低；② 全公司 ' +
      crossTotal + ' 条日报月份≠考核周期，关联目标率失真；③ ' + PROMISES.none + ' 条周报「下一步」无下文。</div>';

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

    // v3 新增：部门综合健康度柱状图（v3.4 复用「仅看本部」切换 + 历史月份联动）
    var dAgg = deptAgg(DEPT_MONTH);
    var dDepts = Object.keys(dAgg).sort(function (a, b) { return dAgg[b].n - dAgg[a].n; });
    if (dDepts.length) {
      html += '<div class="ck-sec-t"><span class="bar"></span>部门健康度 · 可视化（柱状）</div>';
      if (ms.length) {
        html += '<div class="ck-mbtns">';
        ms.forEach(function (m) { html += '<button class="ck-mbtn' + (m === DEPT_MONTH ? ' is-active' : '') + '" data-dm="' + m + '">' + esc(m) + '</button>'; });
        html += '</div>';
      }
      html += '<div class="ck-mbtns">';
      html += '<button class="ck-mbtn' + (DEPT_VIEW === 'all' ? ' is-active' : '') + '" data-dv="all">全部部门</button>';
      html += '<button class="ck-mbtn' + (DEPT_VIEW === 'home' ? ' is-active' : '') + '" data-dv="home">仅看本部</button>';
      html += '</div>';
      html += chartBox('ckChartDept', Math.max(240, dDepts.length * 30), '颜色按四指标最差项红绿灯判定（绿=全达标/黄=有关注/红=有预警，阈值同 v2 TH）；悬停看四指标明细；可点上方「仅看本部」单独看人事行政部，月份按钮切换历史月');
      PENDING['ckChartDept'] = buildDeptHealthOption(dAgg, dDepts);
    }

    // v3 新增：个人填报 TOP 榜柱状图
    if (monthly10.length) {
      html += '<div class="ck-sec-t"><span class="bar"></span>个人填报 TOP 榜 · 可视化（柱状）</div>';
      html += chartBox('ckChartPerson', Math.max(240, 11 * 34), '红=末位 3 人（需关注）；其余为 TOP 8，按本月有效填报天数');
      PENDING['ckChartPerson'] = buildPersonOption(monthly10);
    }

    // v3.1 新增：沉默字段 · 各字段部门排行（小图表，每字段一张横向柱状）
    var dff = deptFieldFill();
    if (dff.length) {
      html += '<div class="ck-sec-t"><span class="bar"></span>沉默字段 · 各字段部门排行（可视化，越靠上越差）</div>';
      var fh = Math.max(160, dff.length * 16 + 50);
      html += '<div class="ck-minigrid">';
      FIELDS.forEach(function (f) {
        var fid = 'ckChartField_' + f.k;
        html += '<div class="ck-chart"><div id="' + fid + '" style="height:' + fh + 'px"></div></div>';
        PENDING[fid] = buildFieldOption(dff, f.k, f.n);
      });
      html += '</div>';
      html += '<div class="ck-cap" style="margin-top:4px">数据来自 MONTHLY.field_fill；每张图按该字段填写率升序，最差（红/最短）置顶。多字段整体偏低即"沉默字段"。</div>';
    }

    html += '<div class="ck-note">说明：① 驾驶舱与四个明细页签共用同源数据（飞书日报/周报/月报 + OGSM 目标），仅做前端聚合，不拉飞书。其中「日报填报率」为日报填报口径（截至数据日应出勤天数的填报覆盖），非 HR 真实出勤。' +
      '② 红绿灯阈值 v2（达标导向）：出勤≥85/关联≥50/完整≥60/按时≥90/已对齐≥70 为绿，黄为关注，红为预警，可按管理偏好在 cockpit.js 顶部调整。' +
      '③ 可视化 v3.4：顶部全局健康度仪表盘(gauge，支持历史月份一键切换) + 月度趋势折线（末端标注环比 ▲▼ 箭头）+ 部门健康度雷达图（每部门一条系列、本部高亮、跨周期错挂进 tooltip）+ 部门健康度柱状（按四指标最差项红绿灯分色、悬停看明细）+ 个人 TOP 柱状（红=末位 3 人需关注）+ 预警熔断指标柱状（红=已触发）+ 沉默字段 6 字段小图表，均由 ECharts 在浏览器端渲染（需 vendor/echarts.min.js）。' +
      '④ 周报表 9/10 月为空且无核销状态字段，核销墙已改由门户 data/weekly_promises.csv 维护、可手工刷新（编辑 CSV → node bake_promises.js → 部署）。' +
      '⑤ 个人绩效分与 ⚠️ 低可信评价按门户脱敏策略不在公网展开，仅在「闭环管控」页签本地可见。</div>';

    html += '</div>';
    return html;
  }

  /* 在 DOM 注入完成后由 report_board.js 调用：初始化（或释放重初始化）图表 */
  function mount() {
    // 释放旧实例（页签来回切换时旧节点已被 innerHTML 替换，避免泄漏/残留）
    CHARTS.forEach(function (c) { try { c.dispose(); } catch (e) {} });
    CHARTS = [];

    var ids = Object.keys(PENDING);
    if (!ids.length) return;

    if (typeof echarts === 'undefined') {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="padding:24px;color:#8888aa;font-size:13px">图表库未加载（echarts）。请在 app.js 报表页依赖中确认 vendor/echarts.min.js 已引入。</div>';
      });
      return;
    }
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      try {
        var c = echarts.init(el, null, { renderer: 'canvas' });
        c.setOption(PENDING[id]);
        CHARTS.push(c);
      } catch (e) {
        el.innerHTML = '<div style="padding:24px;color:#b91c1c;font-size:13px">图表渲染失败：' + (e && e.message ? e.message : e) + '</div>';
      }
    });
    if (!global.__ckResizeBound) {
      global.__ckResizeBound = true;
      global.addEventListener('resize', function () {
        CHARTS.forEach(function (c) { try { c.resize(); } catch (e) {} });
      });
    }
    // v3.4 仪表盘历史月份切换：绑定按钮点击 → 重设 GAUGE_C → 重绘仪表盘
    bindGaugeButtons();
    // v3.4 雷达图视图切换：全部部门 / 仅看本部对比（本部 + 全公司均值）
    bindRadarView();
    // v3.4 部门健康度柱状图视图切换：全部部门 / 仅看本部
    bindDeptView();
  }

  function bindGaugeButtons() {
    var btns = document.querySelectorAll('.ck-mbtn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var gm = btn.getAttribute('data-gm');
        if (!gm || gm === GAUGE_C) return;
        GAUGE_C = gm;
        btns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var el = document.getElementById('ckGauge');
        if (el && typeof echarts !== 'undefined') {
          var opt = buildGaugeOption(MONTH_HEALTH[GAUGE_C] == null ? 0 : MONTH_HEALTH[GAUGE_C], GAUGE_C);
          var inst = echarts.getInstanceByDom(el);
          if (inst) { inst.setOption(opt); }
          else { var n = echarts.init(el); n.setOption(opt); CHARTS.push(n); }
        }
      });
    });
  }

  function bindRadarView() {
    var btns = document.querySelectorAll('.ck-mbtn[data-rv]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-rv');
        if (!v || v === RADAR_VIEW) return;
        RADAR_VIEW = v;
        btns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var el = document.getElementById('ckChartRadar');
        if (el && typeof echarts !== 'undefined' && LAST_RADAR) {
          var full = buildDeptRadarOption(LAST_RADAR.agg, LAST_RADAR.depts);
          var keep = RADAR_VIEW === 'home'
            ? function (n) { return n.indexOf('人事行政部') === 0 || n === '全公司均值' || n === '达标基准线' || n === '公司目标线'; }
            : function () { return true; };
          var filtered = full.series[0].data.filter(function (s) { return keep(s.name); });
          var names = filtered.map(function (s) { return s.name; });
          var inst = echarts.getInstanceByDom(el);
          if (inst) inst.setOption({ series: [{ type: 'radar', data: filtered }], legend: { data: names } }, { replaceMerge: ['series', 'legend'] });
        }
      });
    });
  }

  function bindDeptView() {
    var dvBtns = document.querySelectorAll('.ck-mbtn[data-dv]');
    var dmBtns = document.querySelectorAll('.ck-mbtn[data-dm]');
    var redraw = function () {
      var el = document.getElementById('ckChartDept');
      if (!el || typeof echarts === 'undefined') return;
      var a = deptAgg(DEPT_MONTH);
      var ds = DEPT_VIEW === 'home'
        ? ['人事行政部'].filter(function (d) { return Object.keys(a).indexOf(d) >= 0; })
        : Object.keys(a).sort(function (x, y) { return a[y].n - a[x].n; });
      var opt = buildDeptHealthOption(a, ds);
      var inst = echarts.getInstanceByDom(el);
      if (inst) inst.setOption({ yAxis: { data: opt.yAxis.data }, series: opt.series }, { replaceMerge: ['yAxis', 'series'] });
    };
    dvBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-dv');
        if (!v || v === DEPT_VIEW) return;
        DEPT_VIEW = v;
        dvBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        redraw();
      });
    });
    dmBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = btn.getAttribute('data-dm');
        if (!m || m === DEPT_MONTH) return;
        DEPT_MONTH = m;
        dmBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        redraw();
      });
    });
  }

  global.ReportCockpit = { renderBody: renderBody, mount: mount };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

/* =========================================================================
 * perf_kpi.js — 绩效管理板块 · KPI指标看板（#/perf/kpi）
 *   数据来源：perf_june_data.js / perf_july_data.js（window.JUNE_PERF / JULY_PERF）
 *   来源系统：飞书 OGSM 绩效（6月 tbl6GY9UqUZDIbu4 / 7月 tbl56uoiuIQ9v1Gj，只读快照）
 *   作用域前缀：.pk（镜像 .pf/.pa/.pj，避免冲突）
 *   范式：复用 perf_july.js 的 injectCss + U.registerChart 自动销毁
 *   红线：未打分目标须如实标注「未打分」，绝不臆造分数；
 *        口径（两套 schema 分别适配）：
 *          · 7月 score 为「加权贡献值」，满分=weightPct → 达成率 = Σscore/ΣweightPct×100
 *          · 6月 score 为「百分制得分」（满分100）→ 达成率 = 加权得分 Σ(score×wPct)/ΣwPct
 *        环比：仅 7月 展示 vs 6月（两月口径不同，提示条注明仅参考）；6月为首月无环比。
 *        封顶：达成率 >120% 图表封顶显示为 120%，标签/tooltip 仍显示真实值（避免 outlier 拉爆）。
 *        交互：催办文案一键复制 / 低达成率责任人筛选 / 短板报告导出 / 异常目标(>150%)标注核查。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CAP = 120;        // 达成率图表封顶显示值
  var ANOMALY = 150;    // 达成率异常阈值（>该值疑似录入异常）

  // 问题跟进闭环（localStorage 持久化，守「只拉数不改」边界，不写回飞书）
  var FL_KEY = 'perf_kpi_followups_v1';
  var FL_STATES = ['待跟进', '跟进中', '已规划', '已解决', '已闭环'];
  var FL_Type_LABEL = { anomaly: '⚠️ 数据异常', unsaved: '📝 待打分', low: '📉 低达成率' };
  var PK_ISSUES = [];   // 当前检出的问题列表（模块级，供状态变更时查找原 issue）
  var PK_FL_ITEMS = []; // 面板展示列表（当前检出 + 已闭环历史项），供筛选/导出用
  var PK_PERIOD = '7';

  var CSS = [
    '.pk{--pk:#C9971B;--pk2:#E0B84A;--pk-gold:#E8B400;--pk-bg:#FBF7EC;--pk-card:#fff;--pk-line:#EFE6CF;--pk-ink:#26201A;--pk-muted:#998B73;font-size:14px;color:var(--pk-ink)}',
    '.pk *{box-sizing:border-box}',
    '.pk-head{background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:14px}',
    '.pk-head h1{font-size:18px;margin:0;font-weight:700}',
    '.pk-head .sub{font-size:12px;opacity:.9;margin-top:3px}',
    '.pk-refresh-btn{margin-left:auto;font-family:inherit;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.7);border-radius:20px;padding:7px 16px;cursor:pointer;transition:.15s;white-space:nowrap}',
    '.pk-refresh-btn:hover{background:rgba(255,255,255,.3);transform:translateY(-1px)}',
    '.pk-refresh-btn:disabled{opacity:.6;cursor:default;transform:none}',
    '.pk-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}',
    '.pk-tip{display:flex;gap:10px;align-items:flex-start;background:#FFF8E1;border-left:4px solid #FAAD14;color:#7A5B00;padding:10px 14px;border-radius:10px;margin:14px 0 4px;font-size:13px;line-height:1.6}',
    '.pk-tip b{color:#B8860B}',

    // 月份切换 tab
    '.pk-tabs{display:flex;gap:8px;margin:14px 0 4px;flex-wrap:wrap}',
    '.pk-tab{font-size:13px;font-weight:700;padding:7px 18px;border-radius:20px;border:1.5px solid var(--pk-line);color:var(--pk-muted);text-decoration:none;background:#fff;transition:.15s}',
    '.pk-tab:hover{border-color:var(--pk-gold);color:var(--pk)}',
    '.pk-tab.active{background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;border-color:transparent}',

    '.pk-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0}',
    '@media(max-width:960px){.pk-kpis{grid-template-columns:repeat(2,1fr)}}',
    '@media(max-width:640px){.pk-kpis{grid-template-columns:1fr}}',
    '.pk-kpi{background:#fff;border:1px solid var(--pk-line);border-radius:12px;padding:14px 16px;box-shadow:0 1px 2px rgba(80,60,20,.05)}',
    '.pk-kpi-top{display:flex;align-items:baseline;gap:8px}',
    '.pk-kpi b{font-size:26px;color:var(--pk);line-height:1.1;font-weight:800}',
    '.pk-kpi .unit{font-size:13px;color:var(--pk-muted)}',
    '.pk-kpi .lbl{font-size:12.5px;color:var(--pk-muted);margin-top:4px}',
    '.pk-kpi .delta{font-size:12px;font-weight:700;margin-top:4px;display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:8px}',
    '.pk-kpi .delta.up{color:#18A058;background:#E6F7EE}',
    '.pk-kpi .delta.down{color:#E5484D;background:#FCE8E8}',
    '.pk-kpi .delta.flat{color:#998B73;background:#F4F0E4}',
    '.pk-kpi .note{font-size:11px;color:#B7A888;margin-top:6px}',

    '.pk-charts{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-bottom:16px}',
    '@media(max-width:960px){.pk-charts{grid-template-columns:1fr}}',
    '.pk-box{background:#fff;border:1px solid var(--pk-line);border-radius:12px;padding:14px 16px}',
    '.pk-box h4{margin:0 0 8px;font-size:14px;color:var(--pk);display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.pk-box h4 .cnt{font-size:11px;font-weight:600;color:var(--pk-muted);background:var(--pk-bg);padding:1px 9px;border-radius:10px}',
    '.pk-chart{width:100%;height:280px}',

    // 工具条（按钮 + 筛选）
    '.pk-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0 6px}',
    '.pk-btn{font-family:inherit;font-size:12.5px;font-weight:700;color:#fff;background:linear-gradient(135deg,#C9971B,#E0B84A);border:none;border-radius:9px;padding:7px 14px;cursor:pointer;transition:.15s}',
    '.pk-btn:hover{filter:brightness(1.06);transform:translateY(-1px)}',
    '.pk-btn.ghost{background:#fff;color:var(--pk);border:1.5px solid var(--pk-line)}',
    '.pk-btn.ghost:hover{border-color:var(--pk-gold)}',
    '.pk-filter-sel{font-family:inherit;font-size:13px;padding:6px 10px;border:1px solid var(--pk-line);border-radius:8px;background:#fff;color:var(--pk-ink);cursor:pointer}',

    '.pk-tri{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:14px;margin-bottom:16px}',
    '@media(max-width:960px){.pk-tri{grid-template-columns:1fr}}',
    '.pk-chart-trend{width:100%;height:300px}',

    '.pk-top5{display:flex;flex-direction:column;gap:8px}',
    '.pk-top5 .row{display:flex;align-items:center;gap:10px;background:var(--pk-bg);border:1px solid var(--pk-line);border-radius:10px;padding:10px 12px}',
    '.pk-top5 .rank{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px;flex:none}',
    '.pk-top5 .rank.r1{background:linear-gradient(135deg,#FFD700,#E8B400)}',
    '.pk-top5 .rank.r2{background:linear-gradient(135deg,#C0C0C0,#A8A8A8)}',
    '.pk-top5 .rank.r3{background:linear-gradient(135deg,#CD7F32,#B87333)}',
    '.pk-top5 .info{flex:1;min-width:0}',
    '.pk-top5 .nm{font-size:14px;font-weight:700;color:var(--pk-ink)}',
    '.pk-top5 .meta{font-size:11.5px;color:var(--pk-muted);margin-top:2px}',
    '.pk-top5 .sc{font-size:18px;font-weight:800;color:var(--pk);flex:none}',

    '.pk-sec-title{font-size:15px;font-weight:700;color:var(--pk);margin:6px 0 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.pk-sec-title .cnt{font-size:12px;font-weight:600;color:var(--pk-muted);background:var(--pk-bg);padding:1px 9px;border-radius:10px}',

    // 异常核查条
    '.pk-anomaly{background:#FFF1F0;border-left:4px solid #E5484D;color:#7A1F1F;padding:12px 16px;border-radius:10px;margin:14px 0;font-size:13px;line-height:1.7}',
    '.pk-anomaly b{color:#C0392B}',
    '.pk-anomaly ul{margin:8px 0 0;padding-left:20px}',
    '.pk-anomaly li{margin:3px 0}',

    '.pk-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--pk-line);border-radius:12px;overflow:hidden;margin-top:6px}',
    '.pk th,.pk td{padding:9px 12px;border-bottom:1px solid var(--pk-line);text-align:left;vertical-align:top;font-size:13px}',
    '.pk th{background:#F6EFDD;font-weight:700}',
    '.pk tr:nth-child(even) td{background:#FDFBF4}',
    '.pk .muted{color:#A99B80;font-size:11px;font-weight:400}',
    '.pk-noscore{color:#E5484D;font-weight:700;background:#FCE8E8;padding:1px 8px;border-radius:8px;font-size:12px}',
    '.pk-reached{color:#18A058;font-weight:700;background:#E6F7EE;padding:1px 8px;border-radius:8px;font-size:12px}',
    '.pk-low{color:#E5484D;font-weight:700;background:#FCE8E8;padding:1px 8px;border-radius:8px;font-size:12px}',
    '.pk-mid{color:#FA8C16;font-weight:700;background:#FFF1E6;padding:1px 8px;border-radius:8px;font-size:12px}',

    '.pk-urge{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-top:6px}',
    '.pk-ucard{background:#fff;border:1px solid var(--pk-line);border-left:4px solid #E5484D;border-radius:10px;padding:12px 14px}',
    '.pk-ucard .uh{display:flex;align-items:baseline;justify-content:space-between;gap:8px}',
    '.pk-ucard .un{font-size:14px;font-weight:700}',
    '.pk-ucard .uc{font-size:12px;color:#E5484D;font-weight:700;background:#FCE8E8;padding:1px 8px;border-radius:8px;flex:none}',
    '.pk-ucard .ud{font-size:11.5px;color:var(--pk-muted);margin:2px 0 6px}',
    '.pk-ucard .ug{font-size:12px;color:var(--pk-ink);line-height:1.5}',
    '.pk-ucard .more{font-size:11px;color:var(--pk-muted);margin-top:4px}',

    '.pk-foot{padding:12px 0;color:var(--pk-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:18px;border-top:1px solid var(--pk-line)}',
    '.pk-foot a{color:var(--pk);font-weight:600}',

    // 问题跟进闭环面板
    '.pk-fl-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0 6px}',
    '.pk-fl-cnt{font-size:12.5px;color:var(--pk-muted);font-weight:700}',
    '.pk-fl-list{display:flex;flex-direction:column;gap:10px;margin-top:6px}',
    '.pk-fl-card{background:#fff;border:1px solid var(--pk-line);border-left:4px solid #FA8C16;border-radius:10px;padding:12px 14px}',
    '.pk-fl-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.pk-fl-type{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:8px}',
    '.pk-fl-type.t-anomaly{color:#C0392B;background:#FCE8E8}',
    '.pk-fl-type.t-unsaved{color:#B8860B;background:#FFF8E1}',
    '.pk-fl-type.t-low{color:#FA8C16;background:#FFF1E6}',
    '.pk-fl-person{font-size:14px;font-weight:700}',
    '.pk-fl-dept{font-size:11.5px;color:var(--pk-muted)}',
    '.pk-fl-rate{font-size:13px;font-weight:800;color:var(--pk);margin-left:auto}',
    '.pk-fl-flag{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:8px}',
    '.pk-fl-flag.ok{color:#18A058;background:#E6F7EE}',
    '.pk-fl-flag.ready{color:#2D8CF0;background:#E8F1FE}',
    '.pk-fl-flag.warn{color:#E5484D;background:#FCE8E8}',
    '.pk-fl-goal{font-size:12.5px;color:var(--pk-ink);margin:6px 0 8px;line-height:1.5}',
    '.pk-fl-ctrl{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}',
    '.pk-fl-ctrl label{font-size:11px;color:var(--pk-muted);display:flex;flex-direction:column;gap:3px}',
    '.pk-fl-sel,.pk-fl-in{font-family:inherit;font-size:12.5px;padding:5px 8px;border:1px solid var(--pk-line);border-radius:7px;background:#fff;color:var(--pk-ink)}',
    '.pk-fl-ctrl label:first-child .pk-fl-sel{min-width:96px}',
    '.pk-fl-planl{display:flex;flex-direction:column;gap:3px;margin-top:8px;font-size:11px;color:var(--pk-muted)}',
    '.pk-fl-ta{font-family:inherit;font-size:12.5px;padding:6px 8px;border:1px solid var(--pk-line);border-radius:7px;background:#fff;color:var(--pk-ink);min-height:46px;resize:vertical;width:100%}',
    '.pk-fl-log{margin-top:8px;border-top:1px dashed var(--pk-line);padding-top:8px}',
    '.pk-fl-log-t{font-size:11px;color:var(--pk-muted);font-weight:700;margin-bottom:4px}',
    '.pk-fl-logs{display:flex;flex-direction:column;gap:3px;max-height:120px;overflow:auto}',
    '.pk-fl-log-i{font-size:11.5px;color:var(--pk-ink);line-height:1.5}',
    '.pk-fl-log-i.muted{color:#A99B80}',
    '.pk-fl-ts{color:var(--pk-muted);font-size:10.5px;margin-right:6px}',
    '.pk-fl-log-add{display:flex;gap:8px;margin-top:6px}',
    '.pk-fl-log-add .pk-fl-in{flex:1}'
  ].join('\n');

  var STYLE_ID = 'perfKpiCss';
  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  var NAME_CLEAN = { '李亚楠Danan': '李亚楠', '骆': '骆晓珍' };
  function cleanName(s) {
    if (!s) return s;
    for (var k in NAME_CLEAN) { if (s === k) return NAME_CLEAN[k]; }
    return s;
  }
  function trunc(s, n) {
    s = (s == null ? '' : String(s));
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function capRate(r) { return r == null ? null : Math.min(r, CAP); }

  function rateColor(r) {
    if (r == null) return '#9AA0B5';
    if (r >= 100) return '#18A058';
    if (r >= 90) return '#2D8CF0';
    return '#E5484D';
  }

  /* ---------- 问题跟进闭环（localStorage 持久化，守「只拉数不改」边界，不写回飞书）---------- */
  function sigOf(o, period) { return period + '|' + (o.id || (o.person + '|' + (o.goal || ''))); }
  function loadFL() { try { return JSON.parse(localStorage.getItem(FL_KEY)) || {}; } catch (e) { return {}; } }
  function saveFL(m) { try { localStorage.setItem(FL_KEY, JSON.stringify(m)); } catch (e) {} }
  function nowTs() { var d = new Date(); function p(x) { return (x < 10 ? '0' : '') + x; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  // 当前数据检出的三类问题 → 统一 issue 列表（异常/待打分/低达成率）
  function buildIssues(data, period) {
    var arr = [];
    data.forEach(function (o) {
      var r = goalRate(o, period);
      var type = null;
      if (r != null && r > ANOMALY) type = 'anomaly';
      else if (o.score == null) type = 'unsaved';
      else if (r != null && r < 90) type = 'low';
      if (type) arr.push({ sig: sigOf(o, period), type: type, o: o, period: period, person: cleanName(o.person), dept: o.dept || '未填/跨部门', goal: o.goal, rate: r });
    });
    return arr;
  }
  // 该问题在当前数据下是否已解决（飞书重同步校验用）
  function issueResolved(issue) {
    if (!issue) return true;   // 已不在当前检出 = 问题已消失/修正
    var r = goalRate(issue.o, issue.period);
    if (issue.type === 'unsaved') return issue.o.score != null;
    if (issue.type === 'anomaly') return r == null || r <= ANOMALY;
    if (issue.type === 'low') return r == null || r >= 90;
    return false;
  }
  // 面板展示列表：当前检出问题 ∪ 已闭环且已消失的历史项（保留闭环可见）
  function flDisplayList(data, period, store) {
    var list = [], seen = {};
    buildIssues(data, period).forEach(function (iss) {
      var rec = store[iss.sig] || {};
      rec.status = rec.status || '待跟进';
      rec.log = rec.log || [];
      rec.snap = { person: iss.person, dept: iss.dept, goal: iss.goal, type: iss.type, rate: iss.rate };
      store[iss.sig] = rec;
      list.push({ sig: iss.sig, iss: iss, rec: rec });
      seen[iss.sig] = true;
    });
    Object.keys(store).forEach(function (sig) {
      if (seen[sig]) return;
      var rec = store[sig];
      if (rec && rec.status === '已闭环' && rec.snap) list.push({ sig: sig, iss: null, rec: rec });
    });
    return list;
  }
  function flBadge(item) {
    var rec = item.rec || {}, iss = item.iss;
    if (!rec.status) return '';
    if (!iss) return '<span class="pk-fl-flag ok">✅ 已闭环（数据已修正/消失）</span>';
    var resolved = issueResolved(iss);
    if (rec.status === '已闭环') {
      if (!resolved) return '<span class="pk-fl-flag warn">⚠️ 数据仍显示未解决（已手动闭环，待复核）</span>';
      return '<span class="pk-fl-flag ok">✅ 已闭环</span>';
    }
    if (rec.status === '已解决' && !resolved) return '<span class="pk-fl-flag ready">⏳ 已标「已解决」，飞书数据仍未解决，待🔄重同步校验</span>';
    if (resolved) return '<span class="pk-fl-flag ready">✅ 原数据已解决，标「已解决」后🔄刷新自动闭环</span>';
    return '';
  }
  function logsHtml(rec) {
    var log = rec.log || [];
    if (!log.length) return '<div class="pk-fl-log-i muted">暂无处理记录</div>';
    return log.map(function (l) { return '<div class="pk-fl-log-i"><span class="pk-fl-ts">' + esc(l.ts) + '</span>' + esc(l.text) + '</div>'; }).join('');
  }
  function renderFLCard(item) {
    var rec = item.rec || {}, iss = item.iss, sn = iss ? iss : (rec.snap || {});
    var st = rec.status || '待跟进';
    var owner = rec.owner || sn.person;
    var due = rec.due || '';
    var plan = rec.plan || '';
    var badge = flBadge(item);
    return '<div class="pk-fl-card" data-sig="' + esc(item.sig) + '">' +
      '<div class="pk-fl-h"><span class="pk-fl-type t-' + (sn.type || 'low') + '">' + FL_Type_LABEL[sn.type || 'low'] + '</span>' +
      '<span class="pk-fl-person">' + esc(sn.person || '') + '</span><span class="pk-fl-dept">' + esc(sn.dept || '') + '</span>' +
      (sn.rate != null ? '<span class="pk-fl-rate">' + Math.round(sn.rate) + '%</span>' : '<span class="pk-fl-rate">未打分</span>') +
      badge + '</div>' +
      '<div class="pk-fl-goal">' + esc(trunc(sn.goal, 60)) + '</div>' +
      '<div class="pk-fl-ctrl">' +
      '<label>状态<select class="pk-fl-sel" data-act="status">' + FL_STATES.map(function (s) { return '<option value="' + s + '"' + (s === st ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
      '<label>负责人<input class="pk-fl-in" data-act="owner" value="' + esc(owner) + '"></label>' +
      '<label>截止日<input class="pk-fl-in" type="date" data-act="due" value="' + esc(due) + '"></label>' +
      '</div>' +
      '<label class="pk-fl-planl">规划措施<textarea class="pk-fl-ta" data-act="plan" placeholder="针对该问题拟采取的改进/核实措施…">' + esc(plan) + '</textarea></label>' +
      '<div class="pk-fl-log"><div class="pk-fl-log-t">处理记录</div><div class="pk-fl-logs">' + logsHtml(rec) + '</div>' +
      '<div class="pk-fl-log-add"><input class="pk-fl-in" data-act="logtext" placeholder="追加一条处理记录…"><button class="pk-btn ghost" data-act="logadd">添加</button></div></div>' +
      '</div>';
  }
  function flListHtml(items) {
    if (!items.length) return '<div class="pk-tip">✅ 当前未检出需跟进的问题。</div>';
    return items.map(function (it) { return renderFLCard(it); }).join('');
  }
  // 飞书重同步后：已解决且数据确证解决 → 自动闭环
  function closeResolved() {
    var store = loadFL(); var n = 0, conflict = 0;
    var isJune = PK_PERIOD === '6';
    var data = isJune ? (global.JUNE_PERF || []) : (global.JULY_PERF || []);
    var curMap = {};
    buildIssues(data, PK_PERIOD).forEach(function (iss) { curMap[iss.sig] = iss; });
    // 遍历「已存储的跟进项」（而非仅当前数据），因为已解决的目标在飞书修正后会从检出列表消失
    Object.keys(store).forEach(function (sig) {
      var rec = store[sig]; if (!rec) return;
      var iss = curMap[sig];
      var resolved = !iss ? true : issueResolved(iss);   // 不在当前数据=问题已消失，视为已解决
      if (rec.status === '已解决' && resolved) {
        rec.status = '已闭环'; rec.log = rec.log || [];
        rec.log.push({ ts: nowTs(), text: '飞书重同步自动校验：原数据已解决，系统自动闭环' });
        rec.autoClosedAt = nowTs(); n++;
      } else if (rec.status === '已闭环' && iss && !resolved) { conflict++; }
    });
    saveFL(store); return { closed: n, conflict: conflict };
  }
  function buildFLReport(items) {
    var lines = ['# 奥乐V 绩效问题跟进闭环表（' + (PK_PERIOD === '6' ? '2026年6月' : '2026年7月') + '）', '', '- 生成时间：' + nowTs(), '- 跟进项：' + items.length, ''];
    lines.push('| 类型 | 被考核人 | 部门 | 目标 | 达成率 | 状态 | 负责人 | 截止日 | 规划措施 | 处理记录 |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    items.forEach(function (it) {
      var rec = it.rec || {}, sn = it.iss ? it.iss : (rec.snap || {});
      var logs = (rec.log || []).map(function (l) { return l.ts + ': ' + l.text; }).join(' / ') || '—';
      lines.push('| ' + FL_Type_LABEL[sn.type || 'low'] + ' | ' + (sn.person || '') + ' | ' + (sn.dept || '') + ' | ' + (sn.goal || '') + ' | ' + (sn.rate != null ? Math.round(sn.rate) + '%' : '未打分') + ' | ' + (rec.status || '待跟进') + ' | ' + (rec.owner || sn.person || '') + ' | ' + (rec.due || '—') + ' | ' + (rec.plan || '—') + ' | ' + logs + ' |');
    });
    lines.push('', '> 跟进数据存于本地浏览器（localStorage，未写回飞书）；飞书重同步后「已解决」项自动校验闭环。');
    return lines.join('\n');
  }

  /* ---------- 分口径达成率 ---------- */
  function goalRate(o, period) {
    if (o.score == null) return null;
    if (period === '6') return o.score;
    if (!o.weightPct) return null;
    return o.score / o.weightPct * 100;
  }
  function achieveRate(list, period) {
    var s = 0, w = 0;
    list.forEach(function (o) {
      if (o.score == null || !o.weightPct) return;
      if (period === '6') s += o.score * o.weightPct; else s += o.score;
      w += o.weightPct;
    });
    if (!w) return null;
    return period === '6' ? Math.round(s / w * 10) / 10 : Math.round(s / w * 1000) / 10;
  }

  function deltaHtml(delta, suffix, invert) {
    if (delta == null || isNaN(delta) || delta === 0) return '<span class="delta flat">＝ 持平</span>';
    var isUp = delta > 0;
    var good = invert ? !isUp : isUp;
    var cls = good ? 'up' : 'down';
    var arrow = isUp ? '↑' : '↓';
    var sign = isUp ? '+' : '';
    return '<span class="delta ' + cls + '">' + arrow + ' ' + sign + Math.abs(delta) + (suffix || '') + '</span>';
  }

  // 复制文本（clipboard API + textarea fallback）
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { if (U.toast) U.toast('已复制到剪贴板', 'success'); }, fallbackCopy);
      } else { fallbackCopy(); }
    } catch (e) { fallbackCopy(); }
    function fallbackCopy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        if (U.toast) U.toast('已复制到剪贴板', 'success');
      } catch (e2) { if (U.toast) U.toast('复制失败，请手动选择', 'error'); }
    }
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['绩效管理', 'KPI指标看板']);

    var qm = /[?&]m=(\d+)/.exec(location.hash || '');
    var period = (qm && qm[1] === '6') ? '6' : '7';
    var isJune = period === '6';
    var data = isJune ? (global.JUNE_PERF || []) : (global.JULY_PERF || []);
    var meta = isJune ? (global.JUNE_PERF_META || {}) : (global.JULY_PERF_META || {});
    var base = global.JUNE_PERF || [];
    var total = data.length;

    /* ---------- 聚合（当前月）---------- */
    var groupAgg = {}, deptAgg = {}, scoredN = 0, unsavedN = 0;
    data.forEach(function (o) {
      var p = cleanName(o.person);
      if (!groupAgg[p]) groupAgg[p] = [];
      groupAgg[p].push(o);
      var d = o.dept || '未填/跨部门';
      if (!deptAgg[d]) deptAgg[d] = [];
      deptAgg[d].push(o);
      if (o.score != null) scoredN++; else unsavedN++;
    });
    var peopleN = Object.keys(groupAgg).length;
    var deptNames = Object.keys(deptAgg).sort(function (a, b) { return deptAgg[b].length - deptAgg[a].length; });

    if (!total) {
      view.innerHTML = '<div class="pk"><div class="pk-main"><div class="pk-tip">⚠️ 暂无 ' + period + ' 月绩效记录（window.' + (isJune ? 'JUNE_PERF' : 'JULY_PERF') + ' 为空）。</div></div></div>';
      return;
    }

    var reachRate = achieveRate(data, period) || 0;

    /* ---------- 环比基准（6月，仅7月）---------- */
    var baseReach = isJune ? null : achieveRate(base, '6');
    var baseTargets = base.length;
    var basePeople = 0; base.forEach(function (o) { if (o && o.person) basePeople++; });
    var dTargets = isJune ? null : (total - baseTargets);
    var dReach = (baseReach == null) ? null : Math.round((reachRate - baseReach) * 10) / 10;
    var dScored = isJune ? null : (scoredN - base.length);
    var dUnsaved = isJune ? null : unsavedN;
    var dPeople = isJune ? null : (peopleN - basePeople);

    /* ---------- 指标卡 ×6 ---------- */
    function kpi(label, value, unit, delta, dNote) {
      return '<div class="pk-kpi"><div class="pk-kpi-top"><b>' + value + '</b>' + (unit ? '<span class="unit">' + unit + '</span>' : '') + '</div>' +
        '<div class="lbl">' + label + '</div>' + (delta || '') + (dNote ? '<div class="note">' + dNote + '</div>' : '') + '</div>';
    }
    var kpisHtml = '<div class="pk-kpis">' +
      kpi('目标总数', total, '项', isJune ? null : deltaHtml(dTargets, ' 项 vs 6月'), '6月 ' + baseTargets + ' 项') +
      kpi('平均达成率', reachRate, '%', isJune ? null : deltaHtml(dReach, 'pct vs 6月'), isJune ? '百分制评分' : '已打分加权') +
      kpi('已打分', scoredN, '条', isJune ? null : deltaHtml(dScored, ' 条', true), '占 ' + Math.round(scoredN / total * 100) + '%') +
      kpi('未打分', unsavedN, '条', isJune ? null : deltaHtml(dUnsaved, ' 条', true), '需跟进') +
      kpi('参与人数', peopleN, '人', isJune ? null : deltaHtml(dPeople, ' 人 vs 6月'), '6月 ' + basePeople + ' 人') +
      kpi('覆盖部门', deptNames.length, '个', null, '全公司') +
      '</div>';

    /* ---------- TOP5 ---------- */
    var topList = Object.keys(groupAgg).map(function (p) {
      var list = groupAgg[p];
      return { name: p, dept: (list[0].dept || '未填/跨部门'), rate: achieveRate(list, period), count: list.length };
    }).filter(function (x) { return x.rate != null; }).sort(function (a, b) { return b.rate - a.rate; }).slice(0, 5);
    function rankCls(i) { return i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''; }
    var top5Html = topList.map(function (x, i) {
      return '<div class="row"><div class="rank ' + rankCls(i) + '">' + (i + 1) + '</div>' +
        '<div class="info"><div class="nm">' + esc(x.name) + '</div><div class="meta">' + esc(x.dept) + ' · ' + x.count + ' 项目标</div></div>' +
        '<div class="sc">' + x.rate + '%</div></div>';
    }).join('') || '<div class="pk-tip">暂无可排名人员（全部未打分）</div>';

    /* ---------- 催办清单（未打分按人）---------- */
    var urgeMap = {};
    data.forEach(function (o) {
      if (o.score != null) return;
      var p = cleanName(o.person);
      if (!urgeMap[p]) urgeMap[p] = { name: p, dept: o.dept || '未填/跨部门', goals: [] };
      urgeMap[p].goals.push(o);
    });
    var urgeList = Object.keys(urgeMap).map(function (k) { return urgeMap[k]; })
      .sort(function (a, b) { return b.goals.length - a.goals.length; });
    var urgeCards = urgeList.map(function (u) {
      var first = u.goals[0];
      var more = u.goals.length > 1 ? '<div class="more">+ 其余 ' + (u.goals.length - 1) + ' 条目标待打分</div>' : '';
      return '<div class="pk-ucard"><div class="uh"><span class="un">' + esc(u.name) + '</span>' +
        '<span class="uc">' + u.goals.length + ' 条待打分</span></div>' +
        '<div class="ud">' + esc(u.dept) + '</div>' +
        '<div class="ug">' + esc(trunc(first.goal, 40)) + '</div>' + more + '</div>';
    }).join('');
    var urgeHtml = urgeList.length ? '<div class="pk-urge">' + urgeCards + '</div>'
      : '<div class="pk-tip">✅ 本月目标已全部打分，无待跟进项。</div>';

    /* ---------- 改进分析：低达成率 + 部门短板 ---------- */
    var lowList = [];
    data.forEach(function (o) {
      var r = goalRate(o, period);
      if (r != null && r < 90) lowList.push({ p: cleanName(o.person), d: o.dept || '未填/跨部门', g: o.goal, r: r, w: o.weightPct });
    });
    lowList.sort(function (a, b) { return a.r - b.r; });
    function lowRowsHtml(list) {
      if (!list.length) return '<tr><td colspan="5" class="muted">无低于90%的目标，表现良好 🎉</td></tr>';
      return list.slice(0, 50).map(function (x) {
        var cls = x.r < 70 ? 'pk-low' : 'pk-mid';
        return '<tr><td>' + esc(x.p) + '</td><td>' + esc(x.d) + '</td><td>' + esc(trunc(x.g, 38)) + '</td>' +
          '<td>' + (x.w != null ? x.w + '%' : '—') + '</td><td><span class="' + cls + '">' + Math.round(x.r) + '%</span></td></tr>';
      }).join('');
    }
    // 责任人筛选选项（去重）
    var lowPersons = [];
    lowList.forEach(function (x) { if (lowPersons.indexOf(x.p) < 0) lowPersons.push(x.p); });
    var filterOpts = '<option value="">全部责任人（' + lowPersons.length + '）</option>' +
      lowPersons.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('');
    var deptRates = deptNames.map(function (d) { return { name: d, rate: achieveRate(deptAgg[d], period) }; })
      .filter(function (x) { return x.rate != null; }).sort(function (a, b) { return a.rate - b.rate; });
    var weakHtml = deptRates.slice(0, 3).map(function (x) {
      return '<div class="pk-ucard" style="border-left-color:#FA8C16"><div class="uh"><span class="un">' + esc(x.name) + '</span>' +
        '<span class="uc" style="color:#FA8C16;background:#FFF1E6">' + x.rate + '%</span></div>' +
        '<div class="ud">部门达成率排名末位，建议重点复盘</div></div>';
    }).join('') || '<div class="pk-tip">暂无部门短板数据。</div>';

    /* ---------- 异常目标核查（达成率 > ANOMALY）---------- */
    var anomalyList = [];
    data.forEach(function (o) {
      var r = goalRate(o, period);
      if (r != null && r > ANOMALY) anomalyList.push({ p: cleanName(o.person), d: o.dept || '未填/跨部门', g: o.goal, r: r, w: o.weightPct });
    });
    anomalyList.sort(function (a, b) { return b.r - a.r; });
    var anomalyHtml = '';
    if (anomalyList.length) {
      var items = anomalyList.map(function (x) {
        return '<li><b>' + esc(x.p) + '</b>（' + esc(x.d) + '）— 「' + esc(trunc(x.g, 32)) + '」达成率 <b>' + Math.round(x.r) + '%</b>' +
          (x.w != null ? '（权重 ' + x.w + '%）' : '') + '</li>';
      }).join('');
      anomalyHtml = '<div class="pk-anomaly">⚠️ <b>数据异常核查</b>：以下 ' + anomalyList.length + ' 个目标达成率 >' + ANOMALY + '%，疑似飞书评分录入异常（得分远超权重上限），建议核对原表后修正：' +
        '<ul>' + items + '</ul></div>';
    }

    /* ---------- 问题跟进闭环：当前检出问题 + 已闭环历史项（统一列表，供跟进/闭环）---------- */
    PK_ISSUES = buildIssues(data, period);
    PK_PERIOD = period;
    var flStore = loadFL();
    var flItems = flDisplayList(data, period, flStore);
    PK_FL_ITEMS = flItems;
    saveFL(flStore);   // 持久化默认状态 + 快照（供已闭环项消失后仍可见）

    /* ---------- 目标明细表 ---------- */
    var rowsHtml = data.map(function (o) {
      var p = cleanName(o.person);
      var r = goalRate(o, period);
      return '<tr><td>' + esc(p) + '</td><td>' + esc(o.post) + '</td><td>' + (o.dept ? esc(o.dept) : '—') + '</td>' +
        '<td>' + esc(trunc(o.goal, 44)) + '</td><td>' + (o.weightPct != null ? o.weightPct + '%' : '—') + '</td>' +
        '<td>' + (o.score != null ? '<b style="color:' + rateColor(r) + '">' + o.score + '</b>' : '<span class="pk-noscore">未打分</span>') + '</td>' +
        '<td>' + (r != null ? '<span class="pk-reached">' + Math.round(r) + '%</span>' : '—') + '</td></tr>';
    }).join('');

    /* ---------- 文案/报告生成 ---------- */
    function buildUrgeText() {
      var lines = ['【' + (isJune ? '6' : '7') + '月绩效评分催办】', '以下同事还有 OGSM 目标待打分，请尽快在飞书完成评分：', ''];
      urgeList.forEach(function (u) {
        lines.push('· ' + u.name + '（' + u.dept + '）：' + u.goals.length + ' 条待打分');
        u.goals.slice(0, 3).forEach(function (g) { lines.push('   - ' + (g.goal || '（无目标描述）')); });
        if (u.goals.length > 3) lines.push('   - …（其余 ' + (u.goals.length - 3) + ' 条）');
      });
      lines.push('', '— 来自奥乐V HR 数智化系统 KPI 看板');
      return lines.join('\n');
    }
    function buildWeakReport() {
      var lines = ['# 奥乐V 绩效改进短板报告（' + (isJune ? '2026年6月' : '2026年7月') + '）', ''];
      lines.push('- 整体达成率：' + reachRate + '%');
      lines.push('- 已打分 ' + scoredN + ' / 未打分 ' + unsavedN + '（共 ' + total + ' 条目标）');
      lines.push('- 低达成率目标（<90%）：' + lowList.length + ' 条');
      lines.push('');
      lines.push('## 一、部门短板（达成率末位）');
      deptRates.slice(0, 3).forEach(function (x, i) { lines.push((i + 1) + '. ' + x.name + '：' + x.rate + '%'); });
      lines.push('');
      lines.push('## 二、低达成率目标清单');
      lowList.forEach(function (x) { lines.push('- ' + x.p + '（' + x.d + '）— ' + (x.g || '') + '：达成率 ' + Math.round(x.r) + '%'); });
      if (anomalyList.length) {
        lines.push('');
        lines.push('## 三、数据异常核查（达成率>' + ANOMALY + '%，疑似录入异常）');
        anomalyList.forEach(function (x) { lines.push('- ' + x.p + '（' + x.d + '）— ' + (x.g || '') + '：' + Math.round(x.r) + '%'); });
      }
      lines.push('');
      lines.push('> 数据来源：飞书 OGSM（只读快照），同步于 ' + (meta.syncedAt || '—'));
      return lines.join('\n');
    }

    /* ---------- 页面骨架 ---------- */
    var tipHtml = isJune
      ? '<div class="pk-tip">📌 <div><b>6月为百分制评分快照</b>（score 满分100，达成率=加权得分）。6月为首月，<b>无环比数据</b>。正式分数以飞书为准。</div></div>'
      : '<div class="pk-tip">⚠️ <div><b>7月评分进行中</b>：' + total + ' 条目标中 <b>' + unsavedN + ' 条未打分</b>（' + scoredN + ' 条已打分）。达成率口径=已打分目标「得分÷权重」加权；环比为 vs 6月（<b>两月评分口径不同，环比仅参考</b>）。正式分数以飞书为准。</div></div>';

    var html = '<div class="pk"><div class="pk-head"><div><h1>📊 KPI 指标看板</h1>' +
      '<div class="sub">飞书 OGSM 只读快照 · 2026年' + period + '月 · 共 ' + total + ' 条目标</div></div>' +
      '<button id="pkRefresh" class="pk-refresh-btn">🔄 刷新数据</button></div>' +
      '<div class="pk-main">' +
      '<div class="pk-tabs">' +
      '<a href="#/perf/kpi?m=6" class="pk-tab ' + (isJune ? 'active' : '') + '">6月</a>' +
      '<a href="#/perf/kpi?m=7" class="pk-tab ' + (isJune ? '' : 'active') + '">7月</a>' +
      '</div>' +
      tipHtml + kpisHtml +

      '<div class="pk-charts">' +
      '<div class="pk-box"><h4>各部门达成率对比 <span class="cnt">' + deptNames.length + ' 部门</span></h4><div id="pkDept" class="pk-chart"></div></div>' +
      '<div class="pk-box"><h4>达成率分布（已打分目标） <span class="cnt">' + scoredN + ' 条</span></h4><div id="pkDist" class="pk-chart"></div></div>' +
      '</div>' +

      (anomalyHtml ? anomalyHtml : '') +

      '<div class="pk-tri">' +
      '<div class="pk-box"><h4>达成率趋势（6→7月） <span class="cnt">环比</span></h4><div id="pkTrend" class="pk-chart-trend"></div></div>' +
      '<div class="pk-box"><h4>达成率 TOP5 <span class="cnt">标杆</span></h4><div class="pk-top5">' + top5Html + '</div></div>' +
      '<div class="pk-box"><h4>部门达成率排名 <span class="cnt">' + deptNames.length + '</span></h4><div id="pkRank" class="pk-chart"></div></div>' +
      '</div>' +

      // 催办清单
      '<div class="pk-sec-title">待跟进 · 催办清单 <span class="cnt">' + urgeList.length + ' 人待打分</span>' +
      (urgeList.length ? '<button id="pkCopyUrge" class="pk-btn">📋 复制催办文案</button>' : '') + '</div>' +
      urgeHtml +

      // 改进分析
      '<div class="pk-sec-title" style="margin-top:22px">改进分析 <span class="cnt">低达成率 ' + lowList.length + ' 条</span>' +
      (lowList.length ? '<select id="pkLowFilter" class="pk-filter-sel">' + filterOpts + '</select>' +
        '<button id="pkExportWeak" class="pk-btn ghost">📤 导出短板报告</button>' : '') + '</div>' +
      '<div class="pk-charts" style="grid-template-columns:1fr 1fr">' +
      '<div class="pk-box"><h4>部门短板（达成率末位）</h4>' + (weakHtml ? '<div class="pk-urge">' + weakHtml + '</div>' : weakHtml) + '</div>' +
      '<div class="pk-box"><h4>低达成率目标（&lt;90%）</h4><div style="overflow-x:auto"><table class="pk-tbl"><thead><tr><th>被考核人</th><th>部门</th><th>目标</th><th>权重</th><th>达成率</th></tr></thead><tbody id="pkLowTbody">' + lowRowsHtml(lowList) + '</tbody></table></div>' +
      (lowList.length > 50 ? '<div class="note">仅显示前 50 条，共 ' + lowList.length + ' 条。</div>' : '') + '</div>' +
      '</div>' +

      // 明细表
      '<div class="pk-sec-title" style="margin-top:22px">目标明细 <span class="cnt">' + total + '</span></div>' +
      '<div style="overflow-x:auto"><table class="pk-tbl"><thead><tr><th>被考核人</th><th>岗位</th><th>部门</th><th>目标（OGSM）</th><th>权重</th><th>得分</th><th>达成率</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +

      // 问题跟进闭环
      '<div class="pk-sec-title" style="margin-top:22px">问题跟进闭环 <span class="cnt">'+flItems.length+' 项</span></div>' +
      (flItems.length
        ? '<div class="pk-fl-toolbar"><span class="pk-fl-cnt">共 '+flItems.length+' 项（状态/负责人/截止日/规划措施/处理记录均存本地，刷新不丢；已闭环项数据修正后仍可见）</span>' +
          '<select class="pk-filter-sel" id="pkFlFilter"><option value="">全部状态</option>'+FL_STATES.map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join('')+'</select>' +
          '<button id="pkFlExport" class="pk-btn ghost">📤 导出跟进表</button></div>' +
          '<div class="pk-fl-list" id="pkFlList">'+flListHtml(flItems)+'</div>'
        : '<div class="pk-tip">✅ 当前未检出需跟进的问题（无异常/待打分/低达成率目标）。</div>') +

      '<div class="pk-foot"><span>数据来源：飞书 OGSM绩效（' + (isJune ? '6月' : '7月') + '只读快照，正式维护在飞书）· 同步于 ' + esc(meta.syncedAt || '—') + '</span>' +
      (meta.baseToken ? '<a href="https://oralvictor.feishu.cn/base/' + esc(meta.baseToken) + '" target="_blank" rel="noopener">打开飞书原表 ↗</a>' : '') +
      '</div></div></div>';
    view.innerHTML = html;

    /* ---------- 图表 ---------- */
    if (typeof echarts !== 'undefined') {
      var deptRatesArr = deptNames.map(function (d) { return achieveRate(deptAgg[d], period); });
      var deptBar = echarts.init(U.el('pkDept'));
      U.registerChart(deptBar);
      deptBar.setOption({
        tooltip: { trigger: 'axis', formatter: function (ps) { var p = ps[0]; return p.name + '<br/>达成率：' + (p.data.real == null ? '—' : p.data.real + '%'); } },
        grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: deptNames, axisLabel: { fontSize: 12, interval: 0, rotate: deptNames.length > 5 ? 18 : 0 } },
        yAxis: { type: 'value', minInterval: 10, axisLabel: { fontSize: 11, formatter: '{value}%' } },
        series: [{
          type: 'bar', barWidth: '52%',
          data: deptRatesArr.map(function (r) {
            return { value: capRate(r) == null ? 0 : capRate(r), real: r, itemStyle: { color: rateColor(r), borderRadius: [4, 4, 0, 0] } };
          }),
          label: { show: true, position: 'top', fontSize: 12, formatter: function (p) { return p.data.real != null ? p.data.real + '%' : ''; } }
        }]
      });

      var dist = { '超额(≥120%)': 0, '达标(100-119%)': 0, '良好(90-99%)': 0, '及格(70-89%)': 0, '待改进(<70%)': 0 };
      data.forEach(function (o) {
        var r = goalRate(o, period); if (r == null) return;
        if (r >= 120) dist['超额(≥120%)']++; else if (r >= 100) dist['达标(100-119%)']++;
        else if (r >= 90) dist['良好(90-99%)']++; else if (r >= 70) dist['及格(70-89%)']++; else dist['待改进(<70%)']++;
      });
      var distColors = { '超额(≥120%)': '#18A058', '达标(100-119%)': '#52C41A', '良好(90-99%)': '#2D8CF0', '及格(70-89%)': '#FAAD14', '待改进(<70%)': '#E5484D' };
      var distData = Object.keys(dist).map(function (k) { return { name: k, value: dist[k], itemStyle: { color: distColors[k] } }; }).filter(function (x) { return x.value > 0; });
      var distPie = echarts.init(U.el('pkDist'));
      U.registerChart(distPie);
      distPie.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
        legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { fontSize: 12, formatter: '{b}\n{c} 条' },
          data: distData.length ? distData : [{ name: '全部未打分', value: 1, itemStyle: { color: '#C0C0C0' } }] }]
      });

      var jReach = achieveRate(base, '6');
      var trend = echarts.init(U.el('pkTrend'));
      U.registerChart(trend);
      trend.setOption({
        tooltip: { trigger: 'axis' }, legend: { top: 0, textStyle: { fontSize: 11 } },
        grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: ['6月', '7月'], axisLabel: { fontSize: 12 } },
        yAxis: [
          { type: 'value', name: '达成率%', min: 0, max: 120, axisLabel: { fontSize: 11, formatter: '{value}%' } },
          { type: 'value', name: '目标数', axisLabel: { fontSize: 11 } }
        ],
        series: [
          { name: '平均达成率', type: 'line', yAxisIndex: 0, smooth: true, symbolSize: 10,
            data: [jReach == null ? 0 : jReach, reachRate],
            lineStyle: { width: 3, color: '#C9971B' }, itemStyle: { color: '#C9971B' },
            label: { show: true, fontSize: 13, formatter: '{c}%', position: 'top' }, areaStyle: { color: 'rgba(201,151,27,.12)' } },
          { name: '目标总数', type: 'bar', yAxisIndex: 1, barWidth: '30%',
            data: [baseTargets, total], itemStyle: { color: '#E0B84A', borderRadius: [4, 4, 0, 0] },
            label: { show: true, position: 'top', fontSize: 11, formatter: '{c}' } }
        ]
      });

      var rankPairs = deptNames.map(function (d, i) { return { name: d, rate: deptRatesArr[i] }; })
        .filter(function (x) { return x.rate != null; }).sort(function (a, b) { return a.rate - b.rate; });
      var rankBar = echarts.init(U.el('pkRank'));
      U.registerChart(rankBar);
      rankBar.setOption({
        tooltip: { trigger: 'axis', formatter: function (ps) { var p = ps[0]; return p.name + '：' + (p.data.real == null ? '—' : p.data.real + '%'); } },
        grid: { left: 8, right: 36, top: 10, bottom: 8, containLabel: true },
        xAxis: { type: 'value', axisLabel: { fontSize: 11, formatter: '{value}%' } },
        yAxis: { type: 'category', data: rankPairs.map(function (x) { return x.name; }), axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', barWidth: '55%',
          data: rankPairs.map(function (x) { return { value: capRate(x.rate) == null ? 0 : capRate(x.rate), real: x.rate, itemStyle: { color: rateColor(x.rate), borderRadius: [0, 4, 4, 0] } }; }),
          label: { show: true, position: 'right', fontSize: 12, formatter: function (p) { return p.data.real != null ? p.data.real + '%' : ''; } }
        }]
      });
    }

    /* ---------- 交互绑定 ---------- */
    // 催办文案复制
    var copyBtn = U.el('pkCopyUrge');
    if (copyBtn) copyBtn.onclick = function () { copyText(buildUrgeText()); };
    // 低达成率责任人筛选
    var filterSel = U.el('pkLowFilter');
    if (filterSel) filterSel.onchange = function () {
      var v = filterSel.value;
      var filtered = v ? lowList.filter(function (x) { return x.p === v; }) : lowList;
      var tb = U.el('pkLowTbody');
      if (tb) tb.innerHTML = lowRowsHtml(filtered);
    };
    // 短板报告导出（下载 .md）
    var exportBtn = U.el('pkExportWeak');
    if (exportBtn) exportBtn.onclick = function () {
      var md = buildWeakReport();
      try {
        var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = '奥乐V绩效短板报告_' + (isJune ? '2026-06' : '2026-07') + '.md';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        if (U.toast) U.toast('短板报告已导出', 'success');
      } catch (e) { copyText(md); }
    };
    // 问题跟进闭环：事件委托（状态/负责人/截止日/规划措施 change + 处理记录添加）
    var flRoot = U.el('pkFlList');
    if (flRoot) {
      flRoot.addEventListener('change', function (e) {
        var el = e.target; var act = el.getAttribute('data-act'); if (!act) return;
        var card = el.closest('.pk-fl-card'); if (!card) return;
        var sig = card.getAttribute('data-sig');
        var store = loadFL(); var rec = store[sig] || { status: '待跟进', log: [] };
        rec.log = rec.log || [];
        if (act === 'status') {
          rec.status = el.value;
          if (el.value === '已解决') rec.log.push({ ts: nowTs(), text: '状态→已解决（待飞书重同步校验闭环）' });
        } else if (act === 'owner') { rec.owner = el.value; }
        else if (act === 'due') { rec.due = el.value; }
        else if (act === 'plan') { rec.plan = el.value; }
        store[sig] = rec; saveFL(store);
        if (act === 'status') {
          var iss = null; for (var i = 0; i < PK_ISSUES.length; i++) { if (PK_ISSUES[i].sig === sig) { iss = PK_ISSUES[i]; break; } }
          var fresh = loadFL()[sig] || {};
          card.outerHTML = renderFLCard({ sig: sig, iss: iss, rec: fresh });
        }
      });
      flRoot.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act="logadd"]'); if (!btn) return;
        var card = btn.closest('.pk-fl-card'); var sig = card.getAttribute('data-sig');
        var inp = card.querySelector('[data-act="logtext"]'); var txt = inp ? inp.value.trim() : '';
        if (!txt) return;
        var store = loadFL(); var rec = store[sig] || { status: '待跟进', log: [] }; rec.log = rec.log || [];
        rec.log.push({ ts: nowTs(), text: txt }); store[sig] = rec; saveFL(store);
        var logsBox = card.querySelector('.pk-fl-logs'); if (logsBox) logsBox.innerHTML = logsHtml(rec);
        if (inp) inp.value = '';
      });
    }
    var flFilter = U.el('pkFlFilter');
    if (flFilter) flFilter.onchange = function () {
      var v = flFilter.value;
      var list = v ? PK_FL_ITEMS.filter(function (it) { return (it.rec.status || '待跟进') === v; }) : PK_FL_ITEMS;
      var box = U.el('pkFlList'); if (box) box.innerHTML = flListHtml(list);
    };
    var flExport = U.el('pkFlExport');
    if (flExport) flExport.onclick = function () {
      var md = buildFLReport(PK_FL_ITEMS);
      try {
        var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob); var a = document.createElement('a');
        a.href = url; a.download = '奥乐V绩效问题跟进闭环_' + (isJune ? '2026-06' : '2026-07') + '.md';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        if (U.toast) U.toast('跟进表已导出', 'success');
      } catch (e) { copyText(md); }
    };

    // 刷新数据（飞书重新同步后，强制重新拉取 data 脚本，绕过缓存）
    var refreshBtn = U.el('pkRefresh');
    if (refreshBtn) refreshBtn.onclick = function () {
      var btn = refreshBtn; btn.disabled = true; var oldTxt = btn.textContent; btn.textContent = '刷新中…';
      var files = ['js/perf_june_data.js', 'js/perf_july_data.js'];
      Promise.all(files.map(function (f) {
        return new Promise(function (res, rej) {
          var s = document.createElement('script');
          s.src = f + '?t=' + Date.now();
          s.onload = function () { res(); };
          s.onerror = function () { rej(new Error('加载失败 ' + f)); };
          document.head.appendChild(s);
        });
      })).then(function () {
        var vr = closeResolved();
        window.KpiBoard.render();
        var msg = '数据已刷新（飞书最新同步）';
        if (vr.closed) msg += '；' + vr.closed + ' 项自动闭环';
        if (vr.conflict) msg += '；' + vr.conflict + ' 项已标闭环但数据未解决，请复核';
        if (U.toast) U.toast(msg, vr.conflict ? 'error' : 'success');
      }).catch(function (e) {
        if (U.toast) U.toast('刷新失败：' + e.message, 'error');
      }).then(function () { btn.disabled = false; btn.textContent = oldTxt; });
    };
  }

  global.KpiBoard = { render: render };
})(window);

/* =========================================================================
 * plan.js — 规划计划板块（项目协同计划）
 *   子页：项目协同看板(renderTracker) / 协同作战方案(renderScheme) / 实施路线图(renderRoadmap)
 *   依赖：plan_data.js(window.PLAN_ROWS/PLAN_COLS) · plan_scheme.js(window.PLAN_SCHEME_HTML)
 *   说明：追踪系统从桌面「项目协同计划追踪系统.html」整体移植为 SPA 内自包含模块，
 *        所有 DOM id 与函数加 plan 前缀，交互改用事件委托，避免与 app.js 全局冲突。
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ---------------- 样式（作用域限定在 .plan-tracker / .plan-page） ---------------- */
  var CSS = '\
  .plan-tracker{--p-blue:#2F5496;--p-blue2:#4472C4;--p-bg:#F4F7FC;--p-card:#fff;--p-line:#E2E8F2;--p-ink:#1F2733;--p-muted:#7A8699;--p-stripe:#F4F7FC;--p0:#D9D9D9;--p1:#BDD7EE;--p2:#C6E0B4;--p3:#FCE4D6;--p4:#E4DFEC;--g:#C6EFCE;--y:#FFF2CC;--r:#FFC7CE;font-size:14px;color:var(--p-ink)}\
  .plan-tracker *{box-sizing:border-box}\
  .plan-head{background:linear-gradient(135deg,var(--p-blue),var(--p-blue2));color:#fff;padding:16px 22px;display:flex;flex-wrap:wrap;align-items:center;gap:18px;border-radius:12px 12px 0 0}\
  .plan-head h1{font-size:18px;margin:0;font-weight:700;letter-spacing:.5px}\
  .plan-head .sub{font-size:12px;opacity:.85;margin-top:2px}\
  .plan-stats{display:flex;gap:14px;margin-left:auto;flex-wrap:wrap}\
  .plan-stat{background:rgba(255,255,255,.14);border-radius:10px;padding:8px 14px;text-align:center;min-width:74px}\
  .plan-stat b{display:block;font-size:20px;line-height:1.1}\
  .plan-stat span{font-size:11px;opacity:.9}\
  .plan-nav{display:flex;gap:6px;padding:10px 22px;background:#fff;border-bottom:1px solid var(--p-line);flex-wrap:wrap}\
  .plan-nav button{border:1px solid var(--p-line);background:#fff;color:var(--p-ink);padding:8px 16px;border-radius:20px;cursor:pointer;font-size:13px;font-family:inherit}\
  .plan-nav button.active{background:var(--p-blue);color:#fff;border-color:var(--p-blue)}\
  .plan-nav button:hover{filter:brightness(.98)}\
  .plan-main{padding:18px 22px;max-width:1280px;margin:0 auto}\
  .plan-toolbar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center}\
  .plan-toolbar select,.plan-toolbar input{padding:7px 10px;border:1px solid var(--p-line);border-radius:8px;font-family:inherit;font-size:13px}\
  .plan-board{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}\
  .plan-col{background:#fff;border:1px solid var(--p-line);border-radius:12px;display:flex;flex-direction:column;min-height:120px}\
  .plan-col h3{margin:0;padding:10px 12px;font-size:13px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center}\
  .plan-col .cnt{background:rgba(0,0,0,.12);border-radius:10px;padding:1px 9px;font-size:12px}\
  .plan-col .body{padding:10px;display:flex;flex-direction:column;gap:10px;flex:1}\
  .plan-col.drop{outline:2px dashed var(--p-blue2);outline-offset:-4px}\
  .plan-card{background:var(--p-card);border:1px solid var(--p-line);border-radius:10px;padding:10px;cursor:pointer;box-shadow:0 1px 2px rgba(20,40,80,.05);transition:.15s}\
  .plan-card:hover{box-shadow:0 4px 14px rgba(20,40,80,.12);transform:translateY(-1px)}\
  .plan-card .top{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px}\
  .plan-card .id{font-weight:700;color:var(--p-blue);font-size:12px}\
  .plan-badge{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}\
  .plan-card .name{font-size:13px;line-height:1.45;margin-bottom:8px}\
  .plan-card .meta{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:12px;color:var(--p-muted)}\
  .plan-card .who{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
  .plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}\
  .plan-panel{background:#fff;border:1px solid var(--p-line);border-radius:12px;padding:16px}\
  .plan-panel h4{margin:0 0 12px;font-size:14px;color:var(--p-blue)}\
  .plan-ring{--p:0;width:120px;height:120px;border-radius:50%;margin:auto;background:conic-gradient(var(--p-blue) calc(var(--p)*1%), #E6ECF5 0);display:flex;align-items:center;justify-content:center}\
  .plan-ring i{width:84px;height:84px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;font-weight:700}\
  .plan-bar{display:flex;align-items:center;gap:10px;margin:9px 0;font-size:13px}\
  .plan-bar .lab{width:96px;flex:none}\
  .plan-bar .track{flex:1;height:16px;background:#EEF2F8;border-radius:8px;overflow:hidden}\
  .plan-bar .fill{height:100%;border-radius:8px}\
  .plan-bar .num{width:54px;text-align:right;flex:none;color:var(--p-muted)}\
  .plan-tracker table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--p-line);border-radius:12px;overflow:hidden}\
  .plan-tracker th,.plan-tracker td{padding:9px 11px;border-bottom:1px solid var(--p-line);text-align:left;vertical-align:top;font-size:13px}\
  .plan-tracker th{background:#EEF2F8;color:var(--p-ink);font-weight:700;position:sticky;top:0}\
  .plan-tracker tr:nth-child(even) td{background:var(--p-stripe)}\
  .plan-tracker td .pill{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}\
  .plan-mask{position:fixed;inset:0;background:rgba(20,30,50,.45);display:none;align-items:center;justify-content:center;z-index:50}\
  .plan-mask.show{display:flex}\
  .plan-modal{background:#fff;width:min(560px,92vw);border-radius:14px;padding:20px;max-height:88vh;overflow:auto}\
  .plan-modal h3{margin:0 0 14px;color:var(--p-blue)}\
  .plan-field{margin-bottom:12px}\
  .plan-field label{display:block;font-size:12px;color:var(--p-muted);margin-bottom:4px}\
  .plan-field .v{font-size:14px}\
  .plan-field textarea,.plan-field select{width:100%;padding:8px 10px;border:1px solid var(--p-line);border-radius:8px;font-family:inherit;font-size:13px}\
  .plan-field textarea{resize:vertical;min-height:64px}\
  .plan-row2{display:flex;gap:12px}\
  .plan-row2>div{flex:1}\
  .plan-acts{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}\
  .plan-btn{border:none;border-radius:8px;padding:9px 18px;cursor:pointer;font-family:inherit;font-size:13px}\
  .plan-btn.primary{background:var(--p-blue);color:#fff}\
  .plan-btn.ghost{background:#EEF2F8;color:var(--p-ink)}\
  .plan-legend{font-size:12px;color:var(--p-muted);margin-top:6px}\
  .plan-focus{border-left:4px solid var(--p-blue2);background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:10px}\
  .plan-focus.warn{border-left-color:#E8A33D}\
  .plan-focus.block{border-left-color:#D9534F}\
  .plan-copybtn{background:var(--p-blue);color:#fff;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-family:inherit}\
  .plan-foot{padding:14px 22px;color:var(--p-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}\
  .plan-foot .grow{margin-left:auto}\
  .plan-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22324a;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;opacity:0;transition:.25s;z-index:99}\
  .plan-toast.show{opacity:1}\
  .plan-page{padding:6px 4px}\
  .plan-page__head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px}\
  .plan-page__head h1{font-size:20px;margin:0;color:#2F5496}\
  .plan-page__head .sub{font-size:12px;color:#7A8699}\
  .plan-scheme{background:#fff;border:1px solid #E2E8F2;border-radius:12px;padding:20px 24px;line-height:1.7}\
  .plan-scheme h2{font-size:18px;color:#2F5496;margin:22px 0 10px;border-left:4px solid #4472C4;padding-left:10px}\
  .plan-scheme h3{font-size:15px;color:#1F2733;margin:16px 0 8px}\
  .plan-scheme h4{font-size:14px;color:#1F2733;margin:12px 0 6px}\
  .plan-scheme p{margin:6px 0;color:#3a4456}\
  .plan-scheme .plan-tbl{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}\
  .plan-scheme .plan-tbl th,.plan-scheme .plan-tbl td{border:1px solid #E2E8F2;padding:8px 10px;text-align:left;vertical-align:top}\
  .plan-scheme .plan-tbl th{background:#EEF2F8;font-weight:700}\
  .plan-scheme .plan-tbl tr:nth-child(even) td{background:#F4F7FC}\
  .plan-roadmap{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:8px}\
  .plan-page table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--p-line);border-radius:12px;overflow:hidden;margin:8px 0}\
  .plan-page th,.plan-page td{padding:9px 11px;border-bottom:1px solid var(--p-line);text-align:left;vertical-align:top;font-size:13px}\
  .plan-page th{background:#EEF2F8;font-weight:700}\
  .plan-page tr:nth-child(even) td{background:var(--p-stripe)}\
  .plan-ytstat{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 16px}\
  .plan-ytstat .s{background:#fff;border:1px solid var(--p-line);border-radius:12px;padding:10px 16px;min-width:92px;text-align:center}\
  .plan-ytstat .s b{display:block;font-size:22px;line-height:1.1;color:var(--p-blue)}\
  .plan-ytstat .s span{font-size:12px;color:var(--p-muted)}\
  .plan-sec{font-size:15px;color:var(--p-blue);margin:18px 0 4px;font-weight:700}\
  .plan-draft{background:#fff;border:1px solid var(--p-line);border-radius:12px;padding:14px 16px;margin-bottom:12px}\
  .plan-draft h3{margin:0 0 6px;font-size:15px}\
  .plan-draft .meta{font-size:12px;color:var(--p-muted);margin-bottom:8px}\
  .plan-draft .desc{font-size:13px;color:#3a4456;margin:0 0 8px}\
  .plan-draft a{color:var(--p-blue);font-size:13px;font-weight:600}\
  .plan-phase{background:#fff;border:1px solid #E2E8F2;border-radius:12px;padding:14px;display:flex;flex-direction:column}\
  .plan-phase .ph-top{font-weight:700;font-size:14px;padding:8px 10px;border-radius:8px;margin-bottom:10px;color:#1F2733}\
  .plan-phase .ph-cnt{font-size:12px;color:#7A8699;margin-bottom:8px}\
  .plan-phase ul{margin:0;padding-left:18px;font-size:13px;color:#3a4456;line-height:1.6}\
  .plan-phase.cur{outline:2px solid #4472C4}\
  @media(max-width:900px){.plan-roadmap{grid-template-columns:repeat(2,1fr)}.plan-board{grid-template-columns:repeat(2,1fr)}}';

  function injectCss() {
    if (document.getElementById('planCss')) return;
    var s = document.createElement('style');
    s.id = 'planCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------- 数据 ---------------- */
  var PHASES = [
    { code: 'P0', label: 'P0 基础铺垫', color: 'var(--p0)', desc: '统一项目语言、四类责任矩阵模板、奖金管理办法、数据中台与台账规范、管理者培训。' },
    { code: 'P1', label: 'P1 试点验证', color: 'var(--p1)', desc: '选定 1 条成熟业务线试点，搭建责任矩阵、划清 R/S/A 角色，绑定三维系数定奖金规则。' },
    { code: 'P2', label: 'P2 AI基础落地', color: 'var(--p2)', desc: '在试点基础上引入智能体自动化，沉淀可复用的自动化矩阵与第二阶段能力。' },
    { code: 'P3', label: 'P3 全场景推广', color: 'var(--p3)', desc: '将项目化管理推广至全公司所有部门，形成统一跨部门协同机制。' },
    { code: 'P4', label: 'P4 制度化', color: 'var(--p4)', desc: '把机制写入制度，红黑榜与考核传导固化，形成可持续运转的治理体系。' }
  ];
  var STATUS = { '🟢': { name: '正常', color: 'var(--g)' }, '🟡': { name: '关注', color: 'var(--y)' }, '🔴': { name: '阻塞', color: 'var(--r)' } };
  var COLS = global.PLAN_COLS || [];
  var KEY = 'aolev_plan_v1';

  /* ---------------- 状态 ---------------- */
  function seed() { return (global.PLAN_ROWS || []).map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; }); }
  function load() { try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return seed(); }
  var TASKS = load();
  var CUR = 'board';
  var mineSel = '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(TASKS)); } catch (e) {} flash('已自动保存'); }
  function byId(id) { for (var i = 0; i < TASKS.length; i++) if (TASKS[i]['任务编号'] === id) return TASKS[i]; return null; }

  /* ---------------- 工具 ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { return new Date(); }
  function parseDue(s) { if (!s) return null; var m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; return new Date(m[1] + '-' + m[2] + '-' + m[3]); }
  function dueInfo(s) {
    var d = parseDue(s);
    if (!d) return { txt: String(s || ''), cls: 'cyc', days: null };
    var t = today(); var diff = Math.round((d - t) / 86400000);
    if (diff > 0) return { txt: '剩 ' + diff + ' 天', cls: 'ok', days: diff };
    if (diff === 0) return { txt: '今天截止', cls: 'warn', days: 0 };
    return { txt: '逾期 ' + (-diff) + ' 天', cls: 'over', days: diff };
  }
  function personSet() {
    var set = {}; var re = /\(([^)]+)\)/g; var m;
    var src = TASKS.map(function (t) { return (t['负责人'] || '') + ' ' + (t['协同方'] || ''); }).join(' ');
    while ((m = re.exec(src))) { m[1].split(/[／/＋+]/).forEach(function (x) { var c = x.trim(); if (c && c.length <= 2 && /[一-龥]/.test(c)) set[c] = 1; }); }
    return Object.keys(set);
  }
  function statusBadge(st) { var s = STATUS[st] || { name: st, color: '#eee' }; return '<span class="plan-badge" style="background:' + s.color + '">' + st + ' ' + s.name + '</span>'; }

  function flash(msg) { var s = document.getElementById('planSaved'); if (s) s.textContent = msg; }
  function toast(msg) { var t = document.getElementById('planToast'); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 1800); }

  /* ---------------- 顶部统计 ---------------- */
  function renderStats() {
    var total = TASKS.length;
    var done = TASKS.filter(function (t) { return t['完成'] === '是'; }).length;
    var y = TASKS.filter(function (t) { return t['状态旗'] === '🟡'; }).length;
    var r = TASKS.filter(function (t) { return t['状态旗'] === '🔴'; }).length;
    var over = TASKS.filter(function (t) { var i = dueInfo(t['截止(推算)']); return i.days !== null && i.days < 0; }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('planStats').innerHTML =
      '<div class="plan-stat"><b>' + done + '/' + total + '</b><span>已完成</span></div>' +
      '<div class="plan-stat"><b>' + pct + '%</b><span>总进度</span></div>' +
      '<div class="plan-stat"><b style="color:#FFE08A">' + y + '</b><span>关注</span></div>' +
      '<div class="plan-stat"><b style="color:#FFB3B0">' + r + '</b><span>阻塞</span></div>' +
      '<div class="plan-stat"><b>' + over + '</b><span>逾期</span></div>';
  }

  /* ---------------- 视图 ---------------- */
  function renderBoard() {
    var cols = PHASES.map(function (p) {
      var items = TASKS.filter(function (t) { return t['阶段'] === p.code; });
      var cards = items.map(function (t) {
        var di = dueInfo(t['截止(推算)']);
        return '<div class="plan-card" draggable="true" data-id="' + t['任务编号'] + '">' +
          '<div class="top"><span class="id">' + t['任务编号'] + '</span>' + statusBadge(t['状态旗']) + '</div>' +
          '<div class="name">' + esc(t['任务名称']) + '</div>' +
          '<div class="meta"><span class="who">👤 ' + esc(t['负责人'] || '') + '</span>' +
          '<span class="done"><input type="checkbox" class="plan-done" data-id="' + t['任务编号'] + '" ' + (t['完成'] === '是' ? 'checked' : '') + '> ' + (t['完成'] === '是' ? '✅' : '') + '</span></div>' +
          '<div class="meta"><span class="who">⏰ ' + di.txt + '</span></div></div>';
      }).join('');
      return '<div class="plan-col"><h3 style="background:' + p.color + '">' + p.label + '<span class="cnt">' + items.length + '</span></h3>' +
        '<div class="body" data-phase="' + p.code + '">' + cards + '</div></div>';
    }).join('');
    document.getElementById('planMain').innerHTML = '<div class="plan-board">' + cols + '</div>' +
      '<div class="plan-legend">💡 拖拽卡片到其它阶段列即可更新「阶段」；点卡片可改状态/备注；勾选框标记完成。改动自动保存。</div>';
  }
  function renderDash() {
    var total = TASKS.length;
    var done = TASKS.filter(function (t) { return t['完成'] === '是'; }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    var phaseBars = PHASES.map(function (p) {
      var items = TASKS.filter(function (t) { return t['阶段'] === p.code; });
      var d = items.filter(function (t) { return t['完成'] === '是'; }).length;
      var pc = items.length ? Math.round(d / items.length * 100) : 0;
      return '<div class="plan-bar"><span class="lab">' + p.code + '</span><span class="track"><span class="fill" style="width:' + pc + '%;background:' + p.color + '"></span></span><span class="num">' + d + '/' + items.length + '</span></div>';
    }).join('');
    var y = TASKS.filter(function (t) { return t['状态旗'] === '🟡'; }).length;
    var r = TASKS.filter(function (t) { return t['状态旗'] === '🔴'; }).length;
    var nonG = total - y - r;
    document.getElementById('planMain').innerHTML = '<div class="plan-grid">' +
      '<div class="plan-panel" style="text-align:center"><h4>总体完成度</h4><div class="plan-ring" style="--p:' + pct + '"><i>' + pct + '%</i></div><p style="color:var(--p-muted);margin:10px 0 0">已完成 ' + done + ' / ' + total + ' 项</p></div>' +
      '<div class="plan-panel"><h4>各阶段进度</h4>' + phaseBars + '</div>' +
      '<div class="plan-panel"><h4>风险分布</h4>' +
      '<div class="plan-bar"><span class="lab">🟢 正常</span><span class="track"><span class="fill" style="width:' + (total ? nonG / total * 100 : 0) + '%;background:var(--g)"></span></span><span class="num">' + nonG + '</span></div>' +
      '<div class="plan-bar"><span class="lab">🟡 关注</span><span class="track"><span class="fill" style="width:' + (total ? y / total * 100 : 0) + '%;background:var(--y)"></span></span><span class="num">' + y + '</span></div>' +
      '<div class="plan-bar"><span class="lab">🔴 阻塞</span><span class="track"><span class="fill" style="width:' + (total ? r / total * 100 : 0) + '%;background:var(--r)"></span></span><span class="num">' + r + '</span></div>' +
      '<p class="plan-legend">周会上持续更新状态旗，红/黄项见「风险清单」。</p></div></div>';
  }
  function renderRisk() {
    var items = TASKS.filter(function (t) { return t['状态旗'] !== '🟢'; });
    var rows = items.map(function (t) {
      return '<tr><td>' + t['任务编号'] + '</td><td>' + t['阶段'] + '</td><td>' + statusBadge(t['状态旗']) + '</td>' +
        '<td>' + esc(t['任务名称']) + '</td><td>' + esc(t['负责人'] || '') + '</td><td>' + esc(t['截止(推算)'] || '') + '</td>' +
        '<td>' + esc(t['备注'] || '—') + '</td><td><button class="plan-btn ghost plan-edit" data-id="' + t['任务编号'] + '">处理</button></td></tr>';
    }).join('');
    document.getElementById('planMain').innerHTML = '<div class="plan-toolbar"><b>需重点盯防：</b> 共 ' + items.length + ' 项（🟡关注 + 🔴阻塞）</div>' +
      '<table><thead><tr><th>编号</th><th>阶段</th><th>状态</th><th>任务</th><th>负责人</th><th>截止</th><th>备注/风险</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8">暂无风险项 🎉</td></tr>') + '</tbody></table>';
  }
  function renderMine() {
    var people = personSet();
    if (!mineSel || people.indexOf(mineSel) < 0) mineSel = people[0] || '';
    var opts = people.map(function (p) { return '<option ' + (p === mineSel ? 'selected' : '') + '>' + p + '</option>'; }).join('');
    var items = TASKS.filter(function (t) { return (t['负责人'] || '').indexOf(mineSel) >= 0 || (t['协同方'] || '').indexOf(mineSel) >= 0; });
    var rows = items.map(function (t) {
      return '<tr><td>' + t['任务编号'] + '</td><td>' + t['阶段'] + '</td><td>' + statusBadge(t['状态旗']) + '</td>' +
        '<td>' + esc(t['任务名称']) + '</td><td>' + esc(t['负责人'] || '') + '</td><td>' + esc(t['协同方'] || '—') + '</td><td>' + esc(t['截止(推算)'] || '') + '</td><td>' + (t['完成'] === '是' ? '✅' : '⬜') + '</td></tr>';
    }).join('');
    document.getElementById('planMain').innerHTML = '<div class="plan-toolbar"><label>选择成员：</label><select id="planMineSel">' + opts + '</select>' +
      '<span class="plan-legend">含该成员为负责人或协同方的任务，共 ' + items.length + ' 项</span></div>' +
      '<table><thead><tr><th>编号</th><th>阶段</th><th>状态</th><th>任务</th><th>负责人</th><th>协同方</th><th>截止</th><th>完成</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8">无相关任务</td></tr>') + '</tbody></table>';
  }
  function renderFocus() {
    var list = TASKS.filter(function (t) {
      if (t['状态旗'] === '🟡' || t['状态旗'] === '🔴') return true;
      var i = dueInfo(t['截止(推算)']); return i.days !== null && i.days >= 0 && i.days <= 14;
    }).sort(function (a, b) {
      var da = dueInfo(a['截止(推算)']).days, db = dueInfo(b['截止(推算)']).days;
      var va = (a['状态旗'] === '🔴') ? -1000 : (a['状态旗'] === '🟡') ? -500 : (da == null ? 9999 : da);
      var vb = (b['状态旗'] === '🔴') ? -1000 : (b['状态旗'] === '🟡') ? -500 : (db == null ? 9999 : db);
      return va - vb;
    });
    var html = list.map(function (t) {
      var i = dueInfo(t['截止(推算)']);
      var cls = t['状态旗'] === '🔴' ? 'block' : (t['状态旗'] === '🟡' || (i.days !== null && i.days <= 14)) ? 'warn' : '';
      return '<div class="plan-focus ' + cls + '"><div style="display:flex;justify-content:space-between"><b>' + t['任务编号'] + ' · ' + esc(t['任务名称']) + '</b>' + statusBadge(t['状态旗']) + '</div>' +
        '<div class="plan-legend">负责人：' + esc(t['负责人'] || '') + ' ｜ 截止：' + esc(t['截止(推算)'] || '') + ' ｜ ' + i.txt +
        (t['依赖任务'] && t['依赖任务'] !== '—' ? '｜ 依赖：' + esc(t['依赖任务']) : '') + '</div>' +
        (t['备注'] ? '<div class="plan-legend">备注：' + esc(t['备注']) + '</div>' : '') + '</div>';
    }).join('');
    document.getElementById('planMain').innerHTML = '<div class="plan-toolbar"><b>本周建议推进 ' + list.length + ' 项</b><span class="grow"></span>' +
      '<button class="plan-copybtn" id="planCopyWeek">📋 复制周报</button></div>' +
      '<p class="plan-legend">含：🟡关注 / 🔴阻塞 全部 + 截止在 14 天内的任务，按紧急度排序。</p>' +
      (html || '<p>本周无重点项 🎉</p>');
    var cb = document.getElementById('planCopyWeek');
    if (cb) cb.addEventListener('click', copyWeekly);
  }
  function renderAll() {
    var rows = TASKS.map(function (t) {
      return '<tr><td>' + t['任务编号'] + '</td><td>' + t['阶段'] + '</td><td>' + esc(t['任务名称']) + '</td>' +
        '<td>' + esc(t['负责人'] || '') + '</td><td>' + esc(t['协同方'] || '—') + '</td><td>' + esc(t['截止(推算)'] || '') + '</td>' +
        '<td>' + esc(t['依赖任务'] || '') + '</td><td>' + esc(t['交付物'] || '') + '</td><td>' + statusBadge(t['状态旗']) + '</td>' +
        '<td>' + (t['完成'] === '是' ? '✅' : '⬜') + '</td><td>' + esc(t['备注'] || '—') + '</td>' +
        '<td><button class="plan-btn ghost plan-edit" data-id="' + t['任务编号'] + '">编辑</button></td></tr>';
    }).join('');
    document.getElementById('planMain').innerHTML = '<table><thead><tr><th>编号</th><th>阶段</th><th>任务名称</th><th>负责人</th><th>协同方</th><th>截止</th><th>依赖</th><th>交付物</th><th>状态</th><th>完成</th><th>备注</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ---------------- 交互 ---------------- */
  function openCard(id) {
    var t = byId(id); if (!t) return;
    var di = dueInfo(t['截止(推算)']);
    var statusOpts = Object.keys(STATUS).map(function (k) { return '<option value="' + k + '" ' + (t['状态旗'] === k ? 'selected' : '') + '>' + k + ' ' + STATUS[k].name + '</option>'; }).join('');
    document.getElementById('planModal').innerHTML = '<h3>' + t['任务编号'] + ' · 任务详情</h3>' +
      '<div class="plan-field"><label>任务名称</label><div class="v">' + esc(t['任务名称']) + '</div></div>' +
      '<div class="plan-row2"><div class="plan-field"><label>负责人</label><div class="v">' + esc(t['负责人'] || '') + '</div></div>' +
      '<div class="plan-field"><label>协同方</label><div class="v">' + esc(t['协同方'] || '—') + '</div></div></div>' +
      '<div class="plan-row2"><div class="plan-field"><label>截止(推算)</label><div class="v">' + esc(t['截止(推算)'] || '') + ' ｜ ' + di.txt + '</div></div>' +
      '<div class="plan-field"><label>依赖任务</label><div class="v">' + esc(t['依赖任务'] || '—') + '</div></div></div>' +
      '<div class="plan-field"><label>交付物</label><div class="v">' + esc(t['交付物'] || '—') + '</div></div>' +
      '<div class="plan-row2"><div class="plan-field"><label>状态旗</label><select id="planMStatus">' + statusOpts + '</select></div>' +
      '<div class="plan-field"><label>完成</label><div class="v" style="padding-top:6px"><input type="checkbox" id="planMDone" ' + (t['完成'] === '是' ? 'checked' : '') + '> 标记已完成</div></div></div>' +
      '<div class="plan-field"><label>备注 / 风险说明</label><textarea id="planMNote">' + esc(t['备注'] || '') + '</textarea></div>' +
      '<div class="plan-acts"><button class="plan-btn ghost" id="planCancel">取消</button><button class="plan-btn primary" id="planSave">保存</button></div>';
    document.getElementById('planMask').classList.add('show');
    document.getElementById('planSave').addEventListener('click', function () { saveCard(id); });
    document.getElementById('planCancel').addEventListener('click', closeCard);
  }
  function saveCard(id) {
    var t = byId(id); if (!t) return;
    t['状态旗'] = document.getElementById('planMStatus').value;
    t['完成'] = document.getElementById('planMDone').checked ? '是' : '否';
    t['备注'] = document.getElementById('planMNote').value;
    save(); closeCard(); render();
  }
  function closeCard() { document.getElementById('planMask').classList.remove('show'); }
  function copyWeekly() {
    var done = TASKS.filter(function (t) { return t['完成'] === '是'; }).length, total = TASKS.length;
    var pct = Math.round(done / total * 100);
    var y = TASKS.filter(function (t) { return t['状态旗'] === '🟡'; }).length, r = TASKS.filter(function (t) { return t['状态旗'] === '🔴'; }).length;
    var list = TASKS.filter(function (t) { return t['状态旗'] !== '🟢' || (function () { var i = dueInfo(t['截止(推算)']); return i.days !== null && i.days <= 14; })(); });
    var s = '【责任矩阵×奖励机制 周度推进】\n整体进度：' + done + '/' + total + '（' + pct + '%）；🟡关注 ' + y + ' ｜ 🔴阻塞 ' + r + '\n本周重点推进：\n';
    list.slice(0, 12).forEach(function (t) { var i = dueInfo(t['截止(推算)']); s += '- ' + t['任务编号'] + ' ' + t['任务名称'] + ' [' + t['状态旗'] + '] ' + i.txt + '（' + (t['负责人'] || '') + '）\n'; });
    if (list.length > 12) s += '…另有 ' + (list.length - 12) + ' 项\n';
    s += '\n请各负责人更新实际完成状态与风险。';
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { toast('周报已复制，去粘贴到群里 👍'); }, function () { toast('复制失败，请手动选择'); });
    else toast('当前环境不支持自动复制');
  }
  function exportCSV() {
    var head = COLS;
    var e = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [head.join(',')];
    TASKS.forEach(function (t) { lines.push(head.map(function (c) { return e(t[c]); }).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '项目协同计划_进度快照.csv'; a.click(); toast('已导出 CSV');
  }
  function toggleDone(id, checked) { var t = byId(id); if (t) { t['完成'] = checked ? '是' : '否'; save(); renderStats(); } }
  function onOver(e) { e.preventDefault(); e.currentTarget.classList.add('drop'); }
  function onLeave(e) { e.currentTarget.classList.remove('drop'); }
  function onDrop(e, phase) {
    e.preventDefault(); e.currentTarget.classList.remove('drop');
    var id = e.dataTransfer.getData('text/plain'); var t = byId(id);
    if (t && t['阶段'] !== phase) { t['阶段'] = phase; save(); render(); }
  }

  function render() {
    renderStats();
    if (CUR === 'board') renderBoard();
    else if (CUR === 'dash') renderDash();
    else if (CUR === 'risk') renderRisk();
    else if (CUR === 'mine') renderMine();
    else if (CUR === 'focus') renderFocus();
    else renderAll();
  }

  /* ---------------- 页面装配 ---------------- */
  function renderTracker() {
    injectCss();
    var view = document.getElementById('view');
    if (!view) return;
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['规划计划板块', '项目协同看板']);
    view.innerHTML =
      '<div class="plan-tracker">' +
        '<header class="plan-head"><div><h1>责任矩阵 × 奖励机制 · 落地追踪系统</h1>' +
        '<div class="sub">23 项任务 · P0 基础铺垫 → P4 制度化 · 数据本地保存，关页面不丢</div></div>' +
        '<div class="plan-stats" id="planStats"></div></header>' +
        '<nav class="plan-nav" id="planNav">' +
          '<button data-view="board" class="active">📋 任务看板</button>' +
          '<button data-view="dash">📊 进度仪表盘</button>' +
          '<button data-view="risk">⚠️ 风险清单</button>' +
          '<button data-view="mine">👤 我的任务</button>' +
          '<button data-view="focus">🎯 本周聚焦</button>' +
          '<button data-view="all">🗂️ 全部明细</button>' +
        '</nav>' +
        '<main class="plan-main" id="planMain"></main>' +
        '<footer class="plan-foot"><span id="planSaved">已自动保存</span><span class="grow"></span>' +
        '<button class="plan-btn ghost" id="planExport">⬇ 导出进度 CSV</button>' +
        '<button class="plan-btn ghost" id="planReset">↺ 重置为初始计划</button></footer>' +
        '<div class="plan-mask" id="planMask"><div class="plan-modal" id="planModal"></div></div>' +
        '<div class="plan-toast" id="planToast"></div>' +
      '</div>';

    // 导航切换
    document.getElementById('planNav').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      document.querySelectorAll('#planNav button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active'); CUR = b.getAttribute('data-view'); render();
    });
    // 看板：拖拽 + 卡片点击 + 勾选
    var main = document.getElementById('planMain');
    main.addEventListener('click', function (e) {
      var card = e.target.closest('.plan-card'); if (card && !e.target.classList.contains('plan-done')) { openCard(card.getAttribute('data-id')); return; }
      var edit = e.target.closest('.plan-edit'); if (edit) { openCard(edit.getAttribute('data-id')); return; }
    });
    main.addEventListener('change', function (e) {
      var cb = e.target.closest('.plan-done'); if (cb) toggleDone(cb.getAttribute('data-id'), cb.checked);
    });
    main.addEventListener('dragstart', function (e) { var c = e.target.closest('.plan-card'); if (c) e.dataTransfer.setData('text/plain', c.getAttribute('data-id')); });
    main.addEventListener('dragover', function (e) { var col = e.target.closest('.plan-col .body'); if (col) onOver(e); });
    main.addEventListener('dragleave', function (e) { var col = e.target.closest('.plan-col .body'); if (col) onLeave(e); });
    main.addEventListener('drop', function (e) { var col = e.target.closest('.plan-col .body'); if (col) onDrop(e, col.getAttribute('data-phase')); });
    // 我的任务：成员选择
    main.addEventListener('change', function (e) { if (e.target.id === 'planMineSel') { mineSel = e.target.value; renderMine(); } });
    // 弹窗遮罩点击关闭
    document.getElementById('planMask').addEventListener('click', function (e) { if (e.target.id === 'planMask') closeCard(); });
    // 导出 / 重置
    document.getElementById('planExport').addEventListener('click', exportCSV);
    document.getElementById('planReset').addEventListener('click', function () {
      if (confirm('确认重置为初始计划？所有手动更新将丢失。')) { TASKS = seed(); save(); render(); toast('已重置'); }
    });

    render();
  }

  function renderScheme() {
    injectCss();
    var view = document.getElementById('view');
    if (!view) return;
    var html = global.PLAN_SCHEME_HTML || '<p>方案内容缺失</p>';
    view.innerHTML = '<div class="plan-page"><div class="plan-page__head"><h1>跨部门协同作战方案</h1>' +
      '<span class="sub">奥乐V全公司日常工作项目化 · 在 V4.0 人事行政数字化运营体系基础上推广至全公司</span></div>' +
      '<div class="plan-scheme">' + html + '</div></div>';
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['规划计划板块', '协同作战方案']);
  }

  function renderRoadmap() {
    injectCss();
    var view = document.getElementById('view');
    if (!view) return;
    var cards = PHASES.map(function (p, idx) {
      var items = TASKS.filter(function (t) { return t['阶段'] === p.code; });
      var cur = (idx === 0) ? ' cur' : '';
      return '<div class="plan-phase' + cur + '"><div class="ph-top" style="background:' + p.color + '">' + p.label + '</div>' +
        '<div class="ph-cnt">任务 ' + items.length + ' 项</div>' +
        '<ul><li>' + p.desc + '</li></ul></div>';
    }).join('');
    view.innerHTML = '<div class="plan-page"><div class="plan-page__head"><h1>实施路线图</h1>' +
      '<span class="sub">P0 基础铺垫 → P4 制度化，五阶段滚动推进</span></div>' +
      '<div class="plan-roadmap">' + cards + '</div>' +
      '<p class="plan-legend" style="margin-top:14px">提示：在「项目协同看板」中拖动卡片即可调整任务所处阶段；当前进度与状态实时反映在此路线图。</p></div>';
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['规划计划板块', '实施路线图']);
  }

  function isZhong(t) { return (t['负责人'] || '').indexOf('钟') >= 0 || (t['协同方'] || '').indexOf('钟') >= 0; }
  function taskRow(t) {
    return '<tr><td>' + t['任务编号'] + '</td><td>' + t['阶段'] + '</td><td>' + esc(t['任务名称']) + '</td>' +
      '<td>' + esc(t['负责人'] || '') + '</td><td>' + esc(t['协同方'] || '—') + '</td><td>' + esc(t['截止(推算)'] || '') + '</td>' +
      '<td>' + statusBadge(t['状态旗']) + '</td><td>' + (t['完成'] === '是' ? '✅' : '⬜') + '</td></tr>';
  }
  function copyWeeklyFor(list) {
    var done = list.filter(function (t) { return t['完成'] === '是'; }).length, total = list.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    var y = list.filter(function (t) { return t['状态旗'] === '🟡'; }).length, r = list.filter(function (t) { return t['状态旗'] === '🔴'; }).length;
    var s = '【钟喻 责任矩阵×奖励机制 周度推进】\n整体进度：' + done + '/' + total + '（' + pct + '%）；🟡关注 ' + y + ' ｜ 🔴阻塞 ' + r + '\n本周重点推进：\n';
    list.slice(0, 12).forEach(function (t) { var i = dueInfo(t['截止(推算)']); s += '- ' + t['任务编号'] + ' ' + t['任务名称'] + ' [' + t['状态旗'] + '] ' + i.txt + '（' + (t['负责人'] || '') + '）\n'; });
    if (list.length > 12) s += '…另有 ' + (list.length - 12) + ' 项\n';
    s += '\n请各负责人更新实际完成状态与风险。';
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { toast('周报已复制，去粘贴到群里 👍'); }, function () { toast('复制失败，请手动选择'); });
    else toast('当前环境不支持自动复制');
  }
  function renderZhongyu() {
    injectCss();
    var view = document.getElementById('view');
    if (!view) return;
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['规划计划板块', '钟喻任务台']);
    function yt(l, v, c) { return '<div class="s"><b' + (c ? ' style="color:' + c + '"' : '') + '>' + v + '</b><span>' + l + '</span></div>'; }
    var mine = TASKS.filter(isZhong);
    var total = mine.length;
    var done = mine.filter(function (t) { return t['完成'] === '是'; }).length;
    var y = mine.filter(function (t) { return t['状态旗'] === '🟡'; }).length;
    var r = mine.filter(function (t) { return t['状态旗'] === '🔴'; }).length;
    var over = mine.filter(function (t) { var i = dueInfo(t['截止(推算)']); return i.days !== null && i.days < 0; }).length;
    var owner = mine.filter(function (t) { return (t['负责人'] || '').indexOf('钟') >= 0; });
    var support = mine.filter(function (t) { return (t['协同方'] || '').indexOf('钟') >= 0 && (t['负责人'] || '').indexOf('钟') < 0; });
    var focus = mine.filter(function (t) {
      if (t['状态旗'] === '🟡' || t['状态旗'] === '🔴') return true;
      var i = dueInfo(t['截止(推算)']); return i.days !== null && i.days >= 0 && i.days <= 14;
    });
    var stats = '<div class="plan-ytstat">' + yt('我相关', total) + yt('已完成', done) + yt('进行中', total - done) +
      yt('关注', y, '#E8A33D') + yt('阻塞', r, '#D9534F') + yt('逾期', over, '#D9534F') + '</div>';
    var html = '<div class="plan-page"><div class="plan-page__head"><h1>钟喻任务台</h1>' +
      '<span class="sub">责任矩阵 × 奖励机制落地 · 个人协同控制台（钟喻 / HRD）</span></div>' + stats;
    html += '<div class="plan-sec">我负责的任务（' + owner.length + '）</div><table><thead><tr><th>编号</th><th>阶段</th><th>任务</th><th>负责人</th><th>协同方</th><th>截止</th><th>状态</th><th>完成</th></tr></thead><tbody>' +
      (owner.map(taskRow).join('') || '<tr><td colspan="8">暂无</td></tr>') + '</tbody></table>';
    html += '<div class="plan-sec">我协同的任务（' + support.length + '）</div><table><thead><tr><th>编号</th><th>阶段</th><th>任务</th><th>负责人</th><th>协同方</th><th>截止</th><th>状态</th><th>完成</th></tr></thead><tbody>' +
      (support.map(taskRow).join('') || '<tr><td colspan="8">暂无</td></tr>') + '</tbody></table>';
    html += '<div class="plan-sec">本周聚焦（' + focus.length + '）</div>';
    html += focus.length ? focus.map(function (t) {
      var i = dueInfo(t['截止(推算)']);
      var cls = t['状态旗'] === '🔴' ? 'block' : (t['状态旗'] === '🟡' || (i.days !== null && i.days <= 14)) ? 'warn' : '';
      return '<div class="plan-focus ' + cls + '"><div style="display:flex;justify-content:space-between"><b>' + t['任务编号'] + ' · ' + esc(t['任务名称']) + '</b>' + statusBadge(t['状态旗']) + '</div>' +
        '<div class="plan-legend">负责人：' + esc(t['负责人'] || '') + ' ｜ 截止：' + esc(t['截止(推算)'] || '') + ' ｜ ' + i.txt +
        (t['依赖任务'] && t['依赖任务'] !== '—' ? '｜ 依赖：' + esc(t['依赖任务']) : '') + '</div></div>';
    }).join('') : '<p class="plan-legend">本周无重点项 🎉</p>';
    html += '<div class="plan-toolbar" style="margin-top:14px"><button class="plan-copybtn" id="planCopyZhong">📋 复制我的周报</button>' +
      '<span class="plan-legend">仅含你（钟喻）负责 / 协同的任务</span></div></div>';
    view.innerHTML = html;
    var cb = document.getElementById('planCopyZhong');
    if (cb) cb.addEventListener('click', function () { copyWeeklyFor(mine); });
  }

  var DRAFTS = [
    { id: '项目分类与阶段划分标准（草案）', task: '0.1', name: '项目分类与阶段划分标准', status: '草案', desc: '四类项目分类 + 五阶段划分，落地基础铺垫。' },
    { id: '责任矩阵（RAS）使用指南（草案）', task: '0.2', name: '责任矩阵（RAS）使用指南', status: '草案', desc: 'R/S/A 角色定义 + 四类矩阵模板与使用流程。' },
    { id: '奖金分配管理制度', task: '0.3', name: '奖金分配管理制度', status: '已发布', desc: '三维系数（难度/贡献/协同）+ 协同激励 + 中后台奖励。已于 2026 年 6 月发布生效。' },
    { id: '数字化台账管理规范（草案）', task: '0.5', name: '数字化台账管理规范', status: '草案', desc: '口径/录入/权限/校验统一，数据中台底座。' }
  ];
  function renderDrafts() {
    injectCss();
    var view = document.getElementById('view');
    if (!view) return;
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['规划计划板块', '制度草案包']);
    var cards = DRAFTS.map(function (d) {
      var badge = d.status === '已发布' ? '<span class="plan-badge" style="background:var(--g)">已发布</span>' : '<span class="plan-badge" style="background:var(--y)">草案</span>';
      var cat = d.status === '已发布' ? '正式制度' : '制度草案';
      return '<div class="plan-draft"><h3>' + d.name + ' ' + badge + '</h3>' +
        '<div class="meta">关联任务 ' + d.task + ' ｜ 归属：规划计划板块 › ' + cat + '</div>' +
        '<p class="desc">' + d.desc + '</p>' +
        '<a href="#/wiki/article/' + encodeURIComponent(d.id) + '">查看全文 →</a></div>';
    }).join('');
    view.innerHTML = '<div class="plan-page"><div class="plan-page__head"><h1>制度草案包</h1>' +
      '<span class="sub">责任矩阵 × 奖励机制落地 · 配套制度（标注"草案"为待审批，"已发布"为生效中）</span></div>' +
      '<p class="plan-legend">以下由规划计划各任务产出，已入知识库（规划计划板 › 制度草案 / 正式制度），可全文检索；点击查看完整内容。</p>' + cards + '</div>';
  }

  global.Plan = { renderTracker: renderTracker, renderScheme: renderScheme, renderRoadmap: renderRoadmap, renderZhongyu: renderZhongyu, renderDrafts: renderDrafts };
})(window);

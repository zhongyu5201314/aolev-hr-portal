/* =========================================================================
 * employee_lifecycle.js — 人力资源板块 · 员工入职到离职全生命周期
 *   数据来源：employee_lifecycle_data.js (window.EMP_LIFECYCLE)
 *   依赖：    utils.js（U.* 工具）/ 全局 .modal-* 弹窗类（styles.css）
 *   路由：    #/employee-lifecycle（单页总览 + 节点详情模态，无 sub 分发）
 *   说明：    纯前端；节点"已办标记"落 localStorage；不引入任何外部依赖。
 *            风格对齐 comp_system.js / recruit_system.js（IIFE + 内联 CSS 注入）。
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  /* ---------- 作用域 CSS（仅注入一次，对齐 comp_system.js 写法） ---------- */
  var CSS = [
    '.el{--el:#5B5BD6;--el2:#7C7CE0;--el-bg:#F5F6FB;--el-card:#fff;--el-line:#E6E8F2;--el-ink:#1F2733;--el-muted:#7A8699;--el-ok:#18A058;--el-warn:#E5484D;--el-none:#9AA0B5;--el-warnbg:#FFF6E9;font-size:14px;color:var(--el-ink)}',
    '.el *{box-sizing:border-box}',
    '.el-head{background:linear-gradient(135deg,#5B5BD6,#7C7CE0);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}',
    '.el-head h1{font-size:18px;margin:0;font-weight:700}',
    '.el-head .sub{font-size:12px;opacity:.9;margin-top:3px}',
    '.el-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}',
    '.el-stat{background:rgba(255,255,255,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:82px;cursor:default;transition:.15s}',
    '.el-stat[data-phase]{cursor:pointer}',
    '.el-stat[data-phase]:hover{background:rgba(255,255,255,.3)}',
    '.el-stat b{display:block;font-size:20px;line-height:1.1}',
    '.el-stat span{font-size:11px;opacity:.9}',
    '.el-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}',
    '.el-phase{margin:16px 0;background:var(--el-card);border:1px solid var(--el-line);border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(20,40,80,.05)}',
    '.el-phase-head{background:var(--p-color);color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px}',
    '.el-phase-head .ph-ic{font-size:20px}',
    '.el-phase-head .ph-nm{font-size:15px;font-weight:700}',
    '.el-phase-head .ph-cnt{margin-left:auto;font-size:12px;background:rgba(255,255,255,.2);padding:2px 10px;border-radius:10px}',
    '.el-timeline{display:flex;align-items:stretch;gap:0;margin:14px;overflow-x:auto;padding-bottom:6px}',
    '.el-step{position:relative;flex:1;min-width:160px;background:var(--el-card);border:1px solid var(--el-line);border-left:4px solid var(--p-color);border-radius:12px;padding:14px 12px;margin-right:24px;cursor:pointer;transition:.15s}',
    '.el-step:last-child{margin-right:0}',
    '.el-step:hover{box-shadow:0 5px 16px rgba(20,40,80,.13);transform:translateY(-1px)}',
    ".el-step:before{content:'→';position:absolute;right:-18px;top:50%;transform:translateY(-50%);color:var(--el2);font-size:18px;font-weight:700}",
    ".el-step:last-child:before{content:''}",
    '.el-step .st-seq{position:absolute;top:-9px;left:-9px;width:22px;height:22px;border-radius:50%;background:var(--p-color);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}',
    '.el-step .st-ic{font-size:22px}',
    '.el-step .st-nm{font-size:14px;font-weight:700;margin-top:6px}',
    '.el-step .st-desc{font-size:12px;color:var(--el-muted);margin-top:4px;line-height:1.5}',
    '.el-step .st-owner{font-size:11px;color:var(--el-muted);margin-top:8px}',
    '.el-step.is-done{opacity:.6;border-color:var(--p-color)}',
    '.el-done{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--el-line);background:#fff;color:var(--el-muted);font-size:13px;line-height:20px;text-align:center;cursor:pointer;padding:0;transition:.15s}',
    '.el-done:hover{border-color:var(--p-color);color:var(--p-color)}',
    '.el-done.is-done{background:var(--p-color);color:#fff;border-color:var(--p-color)}',
    '.el-foot{padding:14px 0;color:var(--el-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}',
    '.el-foot a{color:var(--el);font-weight:600;text-decoration:none}',
    /* —— 节点详情模态内容（复用全局 .modal-*，overlay 挂 .el 作用域）—— */
    '.el-modal-title{display:flex;align-items:center;gap:8px;font-size:15px}',
    '.el-modal-ic{font-size:20px}',
    '.el-modal-desc{margin:0 0 12px;font-size:14px;line-height:1.6;color:var(--el-ink)}',
    '.el-modal-row{font-size:13px;margin-bottom:8px;color:var(--el-muted)}',
    '.el-modal-row b{color:var(--el-ink)}',
    '.el-tools{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 16px}',
    '.el-tool{font-size:12px;background:var(--el-bg);border:1px solid var(--el-line);border-radius:8px;padding:3px 10px;color:var(--el-ink)}',
    '.el-sop{display:inline-block;text-decoration:none;background:var(--el);color:#fff;font-size:13px;font-weight:600;padding:9px 16px;border-radius:8px;transition:.15s}',
    '.el-sop:hover{background:var(--el2)}',
    /* —— 响应式：对齐 comp_system.js @media(max-width:760px) —— */
    '@media(max-width:760px){.el-stats{width:100%;margin-left:0}.el-timeline{flex-direction:column}.el-step{margin-right:0;margin-bottom:16px}.el-step:before{content:"↓";right:auto;left:50%;top:auto;bottom:-15px;transform:translateX(-50%)}.el-step:last-child:before{content:""}.el-main{padding:10px 14px 18px}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('empLifecycleCss')) return;
    var s = document.createElement('style');
    s.id = 'empLifecycleCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  /* ---------- localStorage：已办标记持久化（仅存 done 集合） ---------- */
  var LS_KEY = 'emp_lifecycle_progress_v1';
  function loadDone() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return (obj && obj.done && typeof obj.done === 'object') ? obj.done : {};
    } catch (e) { return {}; }
  }
  function saveDone(d) {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify({ done: d })); } catch (e) {}
  }

  // 阶段短名（对齐头部速览文案）
  var SHORT = { onboard: '入职期', develop: '在职期', offboard: '离职期' };

  var DATA = null;
  var done = {};

  function phaseCount(phaseId) {
    var n = 0;
    DATA.stages.forEach(function (s) { if (s.phase === phaseId) n++; });
    return n;
  }
  // 仅统计存在于数据契约中的已办节点，避免脏数据累计
  function doneCount() {
    var n = 0;
    for (var id in done) {
      if (done[id] && DATA.stages.some(function (s) { return s.id === id; })) n++;
    }
    return n;
  }

  /* ---------- 渲染入口（单页总览，parts 仅透传） ---------- */
  function render(parts) {
    injectCss();
    DATA = global.EMP_LIFECYCLE;
    if (!DATA) {
      U.el('view').innerHTML = '<div style="padding:48px;text-align:center;color:#e5484d">⚠️ 全生命周期数据未加载</div>';
      return;
    }
    done = loadDone(); // 每次进入读取持久化状态（刷新保留）
    if (global.App && global.App.setBreadcrumb) {
      global.App.setBreadcrumb(['人力资源', '员工全生命周期']);
    }
    renderOverview();
    bindEvents();
  }

  /* ============================ 总览页 ============================ */
  function renderOverview() {
    var m = DATA.meta || {};

    // 三阶段区块（每区横向时间轴节点卡）
    var phasesHtml = DATA.phases.map(function (ph) {
      var steps = DATA.stages.filter(function (s) { return s.phase === ph.id; });
      var stepsHtml = steps.map(function (st, idx) { return stepHtml(st, idx + 1); }).join('');
      return '<div class="el-phase" id="elPhase_' + esc(ph.id) + '" style="--p-color:' + esc(ph.color) + '">' +
        '<div class="el-phase-head"><span class="ph-ic">' + esc(ph.icon) + '</span>' +
        '<span class="ph-nm">' + esc(ph.name) + '</span>' +
        '<span class="ph-cnt">' + steps.length + ' 个节点</span></div>' +
        '<div class="el-timeline">' + stepsHtml + '</div></div>';
    }).join('');

    // 阶段速览 stat（前 3 个可点击定位，第 4 个为已办计数）
    var phaseStats = DATA.phases.map(function (ph) {
      return '<div class="el-stat" data-phase="' + esc(ph.id) + '" title="定位到' + esc(ph.name) + '">' +
        '<b>' + phaseCount(ph.id) + '</b><span>' + esc(ph.icon) + ' ' + esc(SHORT[ph.id] || ph.name) + '</span></div>';
    }).join('');
    var statsHtml = phaseStats +
      '<div class="el-stat"><b id="elDoneCount">' + doneCount() + '</b><span>✅ 已办 / ' + DATA.stages.length + '</span></div>';

    var html = '<div class="el">' +
      '<div class="el-head"><div><h1>🔄 员工入职到离职全生命周期</h1>' +
      '<div class="sub">数据同步：' + esc(m.syncedAt || '') + ' · 来源：' + esc(m.source || '') + ' · ' + esc(m.version || '') + '</div></div>' +
      '<div class="el-stats">' + statsHtml + '</div></div>' +
      '<div class="el-main">' + phasesHtml +
      '<div class="el-foot"><span>数据来源：' + esc(m.source || '') + '（示例可配置，飞书 ETL 接入为后续工作）</span>' +
      '<span>点击节点卡查看详情；右上角勾选「已办」可标记进度，本地保存</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;
  }

  // 节点卡：序号徽标 + 已办 toggle + icon + name + desc + owner
  function stepHtml(st, seq) {
    var isD = !!done[st.id];
    return '<div class="el-step' + (isD ? ' is-done' : '') + '" data-id="' + esc(st.id) + '" title="点击查看 ' + esc(st.name) + ' 详情">' +
      '<span class="st-seq">' + seq + '</span>' +
      '<button class="el-done' + (isD ? ' is-done' : '') + '" data-id="' + esc(st.id) + '" type="button" title="' + (isD ? '取消已办标记' : '标记为已办') + '" aria-label="已办标记">' + (isD ? '✓' : '') + '</button>' +
      '<div class="st-ic">' + esc(st.icon) + '</div>' +
      '<div class="st-nm">' + esc(st.name) + '</div>' +
      '<div class="st-desc">' + esc(st.desc) + '</div>' +
      '<div class="st-owner">负责人：' + esc(st.owner) + '</div>' +
      '</div>';
  }

  /* ============================ 事件绑定（委托） ============================ */
  function bindEvents() {
    var root = U.$('.el', U.el('view'));
    if (!root) return;
    root.addEventListener('click', function (e) {
      var doneBtn = e.target.closest('.el-done');
      if (doneBtn) { e.stopPropagation(); toggleDone(doneBtn.getAttribute('data-id')); return; }
      var step = e.target.closest('.el-step');
      if (step) { openModal(step.getAttribute('data-id')); return; }
      var stat = e.target.closest('.el-stat[data-phase]');
      if (stat) { scrollToPhase(stat.getAttribute('data-phase')); return; }
    });
  }

  // 已办 toggle：写 localStorage，刷新该卡与头部计数
  function toggleDone(id) {
    if (done[id]) delete done[id]; else done[id] = true;
    saveDone(done);
    var step = U.$('.el-step[data-id="' + id + '"]', U.el('view'));
    if (step) {
      var isD = !!done[id];
      step.classList.toggle('is-done', isD);
      var btn = step.querySelector('.el-done');
      if (btn) {
        btn.classList.toggle('is-done', isD);
        btn.textContent = isD ? '✓' : '';
        btn.setAttribute('title', isD ? '取消已办标记' : '标记为已办');
      }
    }
    var cnt = U.el('elDoneCount');
    if (cnt) cnt.textContent = doneCount();
  }

  // 阶段速览点击：平滑滚动定位到对应阶段区块（无路由变更）
  function scrollToPhase(phaseId) {
    var el = U.el('elPhase_' + phaseId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============================ 节点详情模态 ============================ */
  function openModal(id) {
    var st = null;
    DATA.stages.forEach(function (s) { if (s.id === id) st = s; });
    if (!st) return;
    closeModal(); // 避免叠加
    var ph = null;
    DATA.phases.forEach(function (p) { if (p.id === st.phase) ph = p; });

    var tools = (st.tools || []).map(function (t) { return '<span class="el-tool">' + esc(t) + '</span>'; }).join('') || '<span class="el-tool">—</span>';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay el'; // 挂 .el 作用域以应用弹窗内样式
    overlay.id = 'elModal';
    overlay.innerHTML =
      '<div class="modal-panel">' +
      '<div class="modal-head"><span class="el-modal-title"><span class="el-modal-ic">' + esc(st.icon) + '</span>' + esc(st.name) + '</span>' +
      '<button class="modal-close" type="button" aria-label="关闭">×</button></div>' +
      '<div class="modal-body">' +
      '<p class="el-modal-desc">' + esc(st.desc) + '</p>' +
      '<div class="el-modal-row"><b>所属阶段：</b>' + esc(ph ? ph.name : '') + '</div>' +
      '<div class="el-modal-row"><b>负责人：</b>' + esc(st.owner) + '</div>' +
      '<div class="el-modal-row"><b>使用工具：</b></div>' +
      '<div class="el-tools">' + tools + '</div>' +
      '<a class="el-sop" href="#/wiki/article/' + esc(st.relatedSop) + '" title="查看阶段 SOP：' + esc(st.relatedSop) + '">查看阶段 SOP ›</a>' +
      '</div></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    var sop = overlay.querySelector('.el-sop');
    if (sop) sop.addEventListener('click', function () { closeModal(); }); // 跳转前先移除遮罩
    // 路由切换（侧栏/SOP 跳转）时自动清理遮罩
    global.addEventListener('hashchange', closeModal);
  }

  function closeModal() {
    var m = U.el('elModal');
    if (m && m.parentNode) m.parentNode.removeChild(m);
    global.removeEventListener('hashchange', closeModal);
  }

  /* ---------- 导出 ---------- */
  global.EmpLifecycle = { render: render };
})(window);

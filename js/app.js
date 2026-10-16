/* =========================================================================
 * app.js — 应用外壳 / 哈希路由 / 全局壳（顶栏+侧栏+面包屑）/ 角色切换
 * 依赖：utils.js → charts.js / admin.js / wiki.js（及 vendor: echarts, marked）
 * ========================================================================= */
(function (global) {
  'use strict';
  const U = global.U;

  /* ---------- 脚本懒加载：非首屏模块按需加载，缩小首屏体积 ---------- */
  const _loaded = {};
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (_loaded[src]) return res();
      const s = document.createElement('script');
      s.src = src; s.async = false; // 顺序加载，保证依赖就绪
      s.onload = function () { _loaded[src] = true; res(); };
      s.onerror = function () { rej(new Error('脚本加载失败: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureLoaded(list) {
    return list.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve());
  }
  function resolveDeps(parts) {
    if (!parts.length) return [];
    const p0 = parts[0];
    if (p0 === 'dashboard') return ['vendor/echarts.min.js', 'js/data.js', 'js/charts.js'];
    if (p0 === 'cockpit') return []; // 驾驶舱为独立全屏页（iframe 内自带 echarts），无需主窗注入依赖
    if (p0 === 'admin') return ['js/data.js', 'js/admin.js'];
    if (p0 === 'plan') return ['js/plan_data.js', 'js/plan_scheme.js', 'js/plan.js'];
    if (p0 === 'recruit') return ['vendor/echarts.min.js', 'js/recruit_data.js', 'js/recruit.js'];
    if (p0 === 'recruit-system') return ['vendor/echarts.min.js', 'js/recruit_system_data.js', 'js/recruit_system.js'];
    if (p0 === 'comp-system') return ['vendor/echarts.min.js', 'js/comp_system_data.js', 'js/comp_system.js'];
    if (p0 === 'employee-lifecycle') return ['js/employee_lifecycle_data.js', 'js/employee_lifecycle.js'];
    if (p0 === 'training') return ['vendor/echarts.min.js', 'js/training_data.js', 'js/training.js'];
    if (p0 === 'perf') {
      const sub = parts[1] || '';
      if (sub === 'june') return ['vendor/echarts.min.js', 'js/perf_june_data.js', 'js/perf.js'];
      if (sub === 'july') return ['vendor/echarts.min.js', 'js/perf_july_data.js', 'js/perf_july.js'];
      if (sub === 'kpi') return ['vendor/echarts.min.js', 'js/perf_june_data.js', 'js/perf_july_data.js', 'js/perf_kpi.js'];
      if (sub === 'annual') return ['vendor/echarts.min.js', 'js/perf_annual_data.js', 'js/perf_annual.js'];
      if (sub === 'policy') return ['js/perf_policy.js'];
      return ['vendor/echarts.min.js', 'js/perf_index.js'];
    }
    if (p0 === 'wiki') return ['vendor/marked.min.js', 'js/knowledge.js', 'js/wiki.js'];
    if (p0 === 'reports') return ['vendor/echarts.min.js', 'js/report_data.js', 'js/report_board.js'];
    if (p0 === 'review') return ['js/knowledge.js', 'js/review_board.js'];
    if (p0 === 'ai-pilot') return ['js/knowledge.js', 'js/ai_pilot.js'];
    if (p0 === 'ai-ops') return ['js/knowledge.js', 'js/ai_ops.js'];
    return [];
  }
  let _rt = 0;
  let _cockpitIframe = null; // 人力数据驾驶舱：全屏 iframe 引用，路由切换时回收
  let _cockpitExitBtn = null; // 驾驶舱「返回门户」浮层按钮
  let _cockpitKeyHandler = null; // 驾驶舱 Esc 退出监听

  const NAV = [
    { path: '/', icon: '🏠', label: '首页', hash: '#/' },
    { group: '人力资源板块', items: [
      { path: '/dashboard', icon: '📊', label: '数据看板 · HR概览', hash: '#/dashboard' },
      { path: '/cockpit',  icon: '🖥️', label: '人力数据驾驶舱', hash: '#/cockpit' },
      { path: '/recruit', icon: '🧲', label: '招聘·简历初筛', hash: '#/recruit' },
      { path: '/recruit-system', icon: '🎯', label: '招聘体系搭建', hash: '#/recruit-system' },
      { path: '/comp-system', icon: '💰', label: '薪酬体系搭建', hash: '#/comp-system' },
      { path: '/employee-lifecycle', icon: '🔄', label: '员工全生命周期', hash: '#/employee-lifecycle' },
      { path: '/training', icon: '📚', label: '培训·课程管理', hash: '#/training' },
      { path: '/reports',  icon: '📊', label: '日周月报',        hash: '#/reports' },
    ]},
    { group: '绩效管理板块', items: [
      { path: '/perf',        icon: '📊', label: '板块总览',        hash: '#/perf' },
      { path: '/perf/june',   icon: '📈', label: '月度绩效·6月',   hash: '#/perf/june' },
      { path: '/perf/july',   icon: '📈', label: '月度绩效·7月',   hash: '#/perf/july' },
      { path: '/perf/kpi',    icon: '📊', label: 'KPI指标看板',     hash: '#/perf/kpi' },
      { path: '/perf/annual', icon: '📊', label: '年度绩效·FY2026', hash: '#/perf/annual' },
      { path: '/perf/policy', icon: '📚', label: '绩效制度',        hash: '#/perf/policy' },
    ]},
    { group: '行政板块', items: [
      { path: '/admin/asset', icon: '📦', label: '资产管理', hash: '#/admin/asset' },
      { path: '/admin/leave', icon: '🗓️', label: '请假加班', hash: '#/admin/leave' },
      { path: '/admin/expense', icon: '💰', label: '报销管理', hash: '#/admin/expense' },
      { path: '/admin/seal', icon: '🔖', label: '用章管理', hash: '#/admin/seal' },
      { path: '/admin/meeting', icon: '📅', label: '会议安排', hash: '#/admin/meeting' },
    ]},
    { group: '规划计划板块', items: [
      { path: '/plan/tracker', icon: '🎯', label: '项目协同看板', hash: '#/plan/tracker' },
      { path: '/plan/zhongyu', icon: '👤', label: '钟喻任务台', hash: '#/plan/zhongyu' },
      { path: '/plan/drafts', icon: '📦', label: '制度草案包', hash: '#/plan/drafts' },
      { path: '/plan/scheme', icon: '🗺️', label: '协同作战方案', hash: '#/plan/scheme' },
      { path: '/plan/roadmap', icon: '🛤️', label: '实施路线图', hash: '#/plan/roadmap' },
    ]},
    { group: '数字资产运营板块', items: [
      { path: '/review', icon: '✅', label: '审核流看板', hash: '#/review' },
      { path: '/ai-pilot', icon: '🤖', label: 'AI 试点台', hash: '#/ai-pilot' },
      { path: '/ai-ops', icon: '📈', label: '数字员工运营', hash: '#/ai-ops' },
    ]},
    { path: '/wiki', icon: '📚', label: '制度知识库', hash: '#/wiki' },
  ];

  function buildSidebar() {
    // 操作 #sidebar 容器，一次性写入 [过滤框] + [nav#sidebar-nav] + [折叠按钮]
    const sb = U.el('sidebar');
    let navHtml = '';
    NAV.forEach(function (n) {
      if (n.group) {
        navHtml += '<div class="nav-group"><div class="nav-group__title">' + U.escapeHtml(n.group) + '</div>';
        n.items.forEach(function (it) {
          const ico = it.icon ? '<span class="nav-ico">' + U.escapeHtml(it.icon) + '</span>' : '';
          navHtml += '<a class="nav-item sub" data-path="' + it.path + '" href="' + it.hash + '">' + ico + U.escapeHtml(it.label) + '</a>';
        });
        navHtml += '</div>';
      } else {
        navHtml += '<a class="nav-item" data-path="' + n.path + '" href="' + n.hash + '"><span class="nav-ico">' + U.escapeHtml(n.icon) + '</span>' + U.escapeHtml(n.label) + '</a>';
      }
    });
    sb.innerHTML =
      '<button class="sidebar-collapse" id="sidebar-collapse" title="收起/展开侧栏">«</button>' +
      '<input class="sidebar-filter" id="sidebar-filter" placeholder="过滤菜单…" />' +
      '<nav class="sidebar__nav" id="sidebar-nav">' + navHtml + '</nav>';
  }

  function applySidebarFilter(kw) {
    // 仅按 .nav-item 文本过滤侧栏；组内全空则整组（含标题）隐藏。不影响顶栏 #global-search。
    kw = (kw || '').trim().toLowerCase();
    U.$all('.nav-item').forEach(function (a) {
      var t = (a.textContent || '').toLowerCase();
      a.classList.toggle('hidden', !!kw && t.indexOf(kw) < 0);
    });
    U.$all('.nav-group').forEach(function (g) {
      var anyVisible = g.querySelector('.nav-item:not(.hidden)');
      g.classList.toggle('hidden', !anyVisible);
    });
  }

  function bindSidebarEnhancements() {
    // 折叠按钮 + 过滤框一次性绑定（dataset.bound 守卫防重复绑定）
    var btn = U.el('sidebar-collapse');
    var inp = U.el('sidebar-filter');
    if (btn && !btn.dataset.bound) {
      btn.addEventListener('click', function () {
        var collapsed = document.body.classList.toggle('sidebar-collapsed');
        btn.textContent = collapsed ? '»' : '«';
      });
      btn.dataset.bound = '1';
    }
    if (inp && !inp.dataset.bound) {
      inp.addEventListener('input', function () { applySidebarFilter(inp.value); });
      inp.dataset.bound = '1';
    }
  }

  function highlightSidebar(parts) {
    // 首页（#/ 或 #/home）传空数组时，清空所有侧栏高亮、不点亮任何项（设计稿 §9.3）
    if (!parts || !parts.length) {
      U.$all('.nav-item').forEach(function (a) { a.classList.remove('active'); });
      const home = U.$('.nav-item[data-path="/"]');
      if (home) home.classList.add('active');
      return;
    }
    let active = '/dashboard';
    if (parts[0] === 'admin' && parts[1]) active = '/admin/' + parts[1];
    else if (parts[0] === 'plan') active = '/plan/' + (parts[1] || 'tracker');
    else if (parts[0] === 'recruit') active = '/recruit';
    else if (parts[0] === 'recruit-system') active = '/recruit-system';
    else if (parts[0] === 'comp-system') active = '/comp-system';
    else if (parts[0] === 'employee-lifecycle') active = '/employee-lifecycle';
    else if (parts[0] === 'training') active = '/training';
    else if (parts[0] === 'reports') active = '/reports';
    else if (parts[0] === 'perf') {
      active = parts[1] ? '/perf/' + parts[1] : '/perf';
    }
    else if (parts[0] === 'wiki') active = '/wiki';
    else if (parts[0] === 'review') active = '/review';
    else if (parts[0] === 'ai-pilot') active = '/ai-pilot';
    else if (parts[0] === 'ai-ops') active = '/ai-ops';
    else if (parts[0] === 'cockpit') active = '/cockpit';
    U.$all('.nav-item').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-path') === active);
    });
  }

  function setBreadcrumb(arr) {
    const b = U.el('breadcrumb');
    if (!b) return;
    b.innerHTML = '<a class="crumb-root" href="#/">奥乐V</a>' + (arr || []).map(function (s) {
      return '<span class="crumb-sep">/</span><span>' + U.escapeHtml(s) + '</span>';
    }).join('');
  }

  /* ---------- 路由解析 ---------- */
  function parseHash() {
    let h = location.hash.replace(/^#/, '');
    let q = '';
    const qi = h.indexOf('?');
    if (qi >= 0) { q = h.slice(qi + 1); h = h.slice(0, qi); }
    const parts = h.split('/').filter(Boolean);
    return { parts: parts, q: q };
  }

  /* ---------- 人力数据驾驶舱：纯全屏模式（隐藏门户壳） ---------- */
  function cleanupCockpit() {
    // 路由切换离开驾驶舱时：回收 iframe、浮层按钮、Esc 监听，并还原门户壳
    if (_cockpitIframe) { _cockpitIframe.remove(); _cockpitIframe = null; }
    if (_cockpitExitBtn) { _cockpitExitBtn.remove(); _cockpitExitBtn = null; }
    if (_cockpitKeyHandler) {
      document.removeEventListener('keydown', _cockpitKeyHandler);
      _cockpitKeyHandler = null;
    }
    document.body.classList.remove('cockpit-mode');
  }

  function renderCockpit() {
    setBreadcrumb(['人力数据驾驶舱']);
    const view = U.el('view');
    if (view) view.innerHTML = '';
    // 纯全屏：隐藏门户顶栏/侧栏，iframe 铺满整屏
    document.body.classList.add('cockpit-mode');
    const frame = document.createElement('iframe');
    frame.src = 'hr-dashboard.html';
    frame.title = '奥乐V 人力数据驾驶舱';
    frame.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'border:0;z-index:9999;background:#03080f;';
    document.body.appendChild(frame);
    _cockpitIframe = frame;
    // 「返回门户」浮层按钮：始终覆盖在 iframe 之上，点击退出全屏
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '✕ 返回门户';
    btn.title = '返回奥乐V门户（或按 Esc）';
    btn.setAttribute('aria-label', '返回门户');
    btn.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:10000;' +
      'padding:8px 16px;border:1px solid rgba(64,158,255,.5);border-radius:6px;' +
      'background:rgba(8,18,32,.82);color:#cfe3ff;font-size:14px;cursor:pointer;' +
      'backdrop-filter:blur(4px);box-shadow:0 4px 16px rgba(0,0,0,.4);';
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(20,40,70,.95)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(8,18,32,.82)'; });
    btn.addEventListener('click', function () { location.hash = '#/'; });
    document.body.appendChild(btn);
    _cockpitExitBtn = btn;
    // Esc 键退出（监听父文档，覆盖 iframe 未获焦场景）
    _cockpitKeyHandler = function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') location.hash = '#/';
    };
    document.addEventListener('keydown', _cockpitKeyHandler);
  }

  async function render() {
    const my = ++_rt;
    const r = parseHash();
    const parts = r.parts;
    const view = U.el('view');
    U.disposeCharts(); // 切换路由先销毁旧图表
    cleanupCockpit(); // 回收驾驶舱全屏 iframe / 浮层按钮 / Esc 监听 / 还原门户壳

    const deps = resolveDeps(parts);
    if (deps.length) {
      view.innerHTML = '<div style="padding:48px;text-align:center;color:#9aa4b2;font-size:15px">⏳ 模块加载中…</div>';
      try {
        await ensureLoaded(deps);
      } catch (e) {
        view.innerHTML = '<div style="padding:48px;text-align:center;color:#e5484d">⚠️ ' + (e && e.message ? e.message : '模块加载失败') + '</div>';
        return;
      }
      if (my !== _rt) return; // 期间路由已切换，放弃本次渲染
    }

    if (!parts.length) {
      // 顶层首页：清空侧栏高亮（模块选择器本身即为导航）
      highlightSidebar([]);
      global.ModuleSelector.render();
    } else if (parts[0] === 'dashboard') {
      highlightSidebar(['dashboard']);
      global.Dash.render();
    } else if (parts[0] === 'cockpit') {
      highlightSidebar(['cockpit']);
      renderCockpit();
    } else if (parts[0] === 'home') {
      // 兼容 #/home 别名，与 #/ 等价（设计稿 §1 / §9.1 / §9.2）
      highlightSidebar([]);
      global.ModuleSelector.render();
    } else     if (parts[0] === 'admin') {
      highlightSidebar(parts);
      const sub = parts[1] || 'asset';
      if (sub === 'leave') global.Admin.renderLeave();
      else if (sub === 'expense') global.Admin.renderExpense();
      else if (sub === 'seal') global.Admin.renderSeal();
      else if (sub === 'meeting') global.Admin.renderMeeting();
      else global.Admin.renderAsset();
    } else if (parts[0] === 'plan') {
      highlightSidebar(parts);
      const sub = parts[1] || 'tracker';
      if (sub === 'zhongyu') global.Plan.renderZhongyu();
      else if (sub === 'drafts') global.Plan.renderDrafts();
      else if (sub === 'scheme') global.Plan.renderScheme();
      else if (sub === 'roadmap') global.Plan.renderRoadmap();
      else global.Plan.renderTracker();
    } else if (parts[0] === 'recruit') {
      highlightSidebar(parts);
      global.Recruit.render();
    } else if (parts[0] === 'recruit-system') {
      highlightSidebar(parts);
      global.RecruitSystem.render(parts);
    } else if (parts[0] === 'comp-system') {
      highlightSidebar(parts);
      global.CompSystem.render(parts);
    } else if (parts[0] === 'employee-lifecycle') {
      highlightSidebar(parts);
      global.EmpLifecycle.render(parts);
    } else if (parts[0] === 'training') {
      highlightSidebar(parts);
      global.Training.render();
    } else if (parts[0] === 'perf') {
      highlightSidebar(parts);
      const sub = parts[1] || '';
      if (sub === 'june') global.Perf.render();        // 月度绩效·6月（沿用 perf.js，对应 #/perf/june）
      else if (sub === 'july') global.PerfJuly.render();  // 月度绩效·7月（新建 perf_july.js，对应 #/perf/july）
      else if (sub === 'kpi') global.KpiBoard.render();    // KPI指标看板（新建 perf_kpi.js，对应 #/perf/kpi）
      else if (sub === 'annual') global.PerfAnnual.render();
      else if (sub === 'policy') global.PerfPolicy.render();
      else global.PerfIndex.render();                  // 无 sub → 板块总览导航页（#/perf）
    } else if (parts[0] === 'wiki') {
      highlightSidebar(['wiki']);
      if (!parts[1] || parts[1] === 'list') {
        const board = parts[2] ? decodeURIComponent(parts[2]) : '全部';
        const cat = parts[3] ? decodeURIComponent(parts[3]) : '全部分类';
        const q = r.q ? new URLSearchParams(r.q).get('q') : '';
        global.Wiki.renderList(board, cat, q);
      } else if (parts[1] === 'article') {
        global.Wiki.renderArticle(decodeURIComponent(parts[2]));
      } else {
        global.Wiki.renderPortal();
      }
    } else if (parts[0] === 'reports') {
      highlightSidebar(['reports']);
      global.ReportBoard.render();
    } else if (parts[0] === 'review') {
      highlightSidebar(['review']);
      global.ReviewBoard.render();
    } else if (parts[0] === 'ai-pilot') {
      highlightSidebar(['ai-pilot']);
      global.AiPilot.render();
    } else if (parts[0] === 'ai-ops') {
      highlightSidebar(['ai-ops']);
      global.AiOps.render();
    } else {
      highlightSidebar(['dashboard']);
      global.Dash.render();
    }
    // 路由切换后回到顶部 & 关闭移动端侧栏
    if (view) view.scrollTop = 0;
    document.body.classList.remove('sidebar-open');
  }

  /* ---------- 顶栏交互：角色切换 / 全局搜索 / 移动端菜单 ---------- */
  function setupTopbar() {
    const roleSel = U.el('role-select');
    if (roleSel) {
      roleSel.value = AppState.role;
      roleSel.addEventListener('change', function () {
        AppState.role = roleSel.value;
        updateUserBadge();
        U.toast('已切换角色：' + roleSel.value, 'info');
        render(); // 重新渲染以应用脱敏/权限
      });
    }
    const gs = U.el('global-search');
    if (gs) {
      gs.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          const v = gs.value.trim();
          location.hash = v ? '#/wiki/list/' + encodeURIComponent('全部') + '/' + encodeURIComponent('全部分类') + '?q=' + encodeURIComponent(v) : '#/wiki';
        }
      });
    }
    const menuBtn = U.el('menu-toggle');
    if (menuBtn) menuBtn.addEventListener('click', function () { document.body.classList.toggle('sidebar-open'); });
  }

  const ROLE_LABEL = { 'HR': 'HR 管理员', '负责人': '部门负责人', '员工': '普通员工' };
  function updateUserBadge() {
    const badge = U.el('user-badge');
    if (badge) {
      const role = AppState.role;
      const initial = role === 'HR' ? 'H' : (role === '负责人' ? 'M' : 'E');
      badge.innerHTML = '<span class="avatar">' + initial + '</span><span class="user-meta"><b>' +
        ROLE_LABEL[role] + '</b><small>奥乐V·人事行政</small></span>';
    }
  }

  function init() {
    buildSidebar();
    setupTopbar();
    updateUserBadge();
    bindSidebarEnhancements();
    if (!location.hash) location.hash = '#/';   // 原为 '#/dashboard'，现改为 '#/'（模块选择器为首页）
    render();
    global.addEventListener('hashchange', render);
    global.addEventListener('resize', function () { U.resizeCharts(); });
    // 驾驶舱 iframe 内按 Esc → 退出全屏（iframe 获焦时 keydown 不冒泡到父文档）
    global.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'cockpit-exit') location.hash = '#/';
    });
  }

  global.App = { init: init, setBreadcrumb: setBreadcrumb, render: render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);

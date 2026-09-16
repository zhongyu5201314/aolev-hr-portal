/* module_selector.js — 模块选择器首页（深色卡片网格导航） */
(function (global) {
  'use strict';
  const U = global.U;

  // 注入 .ms 作用域 CSS（仅一次）
  function injectCss() {
    if (document.getElementById('moduleSelectorCss')) return;
    const css =
      '.ms-page{margin:-18px -22px -40px;padding:36px 32px 48px;min-height:calc(100vh - 120px);background:#0f0f1a;box-sizing:border-box}' +
      '.ms-home{display:inline-block;margin-bottom:18px;padding:8px 16px;background:rgba(74,158,255,0.12);border:1px solid rgba(74,158,255,0.5);color:#cfe2ff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;transition:all .2s}' +
      '.ms-home:hover{background:rgba(74,158,255,0.2);border-color:rgba(74,158,255,0.7)}' +
      '.ms-title{color:#e8e8f0;font-size:22px;font-weight:700;margin:0 0 8px 0;letter-spacing:1px}' +
      '.ms-subtitle{color:#8888aa;font-size:13px;margin:0 0 26px 0;font-weight:400}' +
      '.ms-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:720px}' +
      '.ms-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:130px;padding:24px 16px;background:#1e1e38;border-radius:18px;border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 2px rgba(255,255,255,0.04);text-decoration:none;color:#fff;transition:all .25s ease;cursor:pointer}' +
      '.ms-card:hover{transform:translateY(-4px);background:#262645;border-color:rgba(74,158,255,0.4);box-shadow:inset 0 1px 2px rgba(255,255,255,0.04),0 8px 24px rgba(0,0,0,0.3)}' +
      '.ms-card.active{border:2px solid #4a9eff;background:#1a2a4a;box-shadow:0 0 16px rgba(74,158,255,0.3),0 8px 24px rgba(0,0,0,0.3)}' +
      '.ms-icon{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px;flex-shrink:0;transition:background .25s ease}' +
      '.ms-card:hover .ms-icon{background:rgba(255,255,255,0.12)}' +
      '.ms-label{font-size:14px;color:#e8e8f0;text-align:center;line-height:1.4}' +
      '.ms-desc{font-size:11px;color:#8888aa;margin-top:4px;text-align:center}' +
      '.ms-enter{position:absolute;right:14px;bottom:12px;font-size:11px;color:#6a9eff;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s;pointer-events:none}' +
      '.ms-card:hover .ms-enter{opacity:.9;transform:translateY(0)}' +
      '.ms-sub-head{color:#c8c8e0;font-size:16px;font-weight:600;margin:36px 0 14px 0}' +
      '.ms-sub-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:720px}' +
      '.ms-sub{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1e1e38;border-radius:12px;border:1px solid rgba(255,255,255,0.08);text-decoration:none;color:#cfcfe6;transition:all .2s;cursor:pointer}' +
      '.ms-sub:hover{background:#262645;border-color:rgba(74,158,255,0.4);transform:translateY(-2px)}' +
      '.ms-sub.active{border:2px solid #4a9eff;background:#1a2a4a}' +
      '.ms-sub-icon{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}' +
      '.ms-sub-label{font-size:12px;line-height:1.3}' +
      '.ms-foot{color:#6a6a88;font-size:12px;margin-top:22px;text-align:center}' +
      '@media(max-width:1023px){.ms-grid{grid-template-columns:repeat(3,1fr)}.ms-sub-grid{grid-template-columns:repeat(3,1fr)}}' +
      '@media(max-width:767px){.ms-grid{grid-template-columns:repeat(2,1fr);padding:24px 16px 40px}.ms-sub-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:479px){.ms-grid{gap:14px}.ms-icon{width:48px;height:48px;font-size:24px}.ms-sub-icon{width:36px;height:36px;font-size:18px}}';
    const s = document.createElement('style');
    s.id = 'moduleSelectorCss';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // 8 张模块卡片定义
  var MODULES = [
    { icon: '👥', label: '组织人事', desc: '数据看板·HR概览', hash: '#/dashboard', match: { prefix: 'dashboard' } },
    { icon: '🧲', label: '招聘管理', desc: '简历初筛神器', hash: '#/recruit', match: { prefix: 'recruit' } },
    { icon: '📚', label: '培训管理', desc: '课程管理系统', hash: '#/training', match: { prefix: 'training' } },
    { icon: '📊', label: '绩效管理', desc: '月度/年度/制度', hash: '#/perf', match: { prefix: 'perf' } },
    { icon: '📦', label: '资产行政', desc: '资产/请假/报销/用章/会议', hash: '#/admin/asset', match: { prefix: 'admin' } },
    { icon: '🎯', label: '规划计划', desc: '项目协同/任务台/草案', hash: '#/plan/tracker', match: { prefix: 'plan', except: ['zhongyu'] } },
    { icon: '📖', label: '知识库', desc: '制度全文检索', hash: '#/wiki', match: { prefix: 'wiki' } },
    { icon: '⭐', label: '快捷入口', desc: '钟喻个人任务台', hash: '#/plan/zhongyu', match: { exact: 'zhongyu' } },
  ];

  // 常用看板：高频子页二级卡（8 条）
  var SUB_MODULES = [
    { icon: '📈', label: '月度绩效·6月', hash: '#/perf/june', match: { path: '/perf/june' } },
    { icon: '📈', label: '月度绩效·7月', hash: '#/perf/july', match: { path: '/perf/july' } },
    { icon: '📊', label: '年度绩效·FY2026', hash: '#/perf/annual', match: { path: '/perf/annual' } },
    { icon: '📚', label: '绩效制度', hash: '#/perf/policy', match: { path: '/perf/policy' } },
    { icon: '🧲', label: '简历初筛', hash: '#/recruit', match: { prefix: 'recruit' } },
    { icon: '🎯', label: '招聘体系搭建', hash: '#/recruit-system', match: { path: '/recruit-system' } },
    { icon: '💰', label: '薪酬体系搭建', hash: '#/comp-system', match: { path: '/comp-system' } },
    { icon: '🔄', label: '员工全生命周期', hash: '#/employee-lifecycle', match: { path: '/employee-lifecycle' } },
    { icon: '📚', label: '课程管理', hash: '#/training', match: { prefix: 'training' } },
    { icon: '🎯', label: '项目协同', hash: '#/plan/tracker', match: { prefix: 'plan', except: ['zhongyu'] } },
    { icon: '📖', label: '制度知识库', hash: '#/wiki', match: { prefix: 'wiki' } },
    { icon: '📊', label: '日周月报', hash: '#/reports', match: { path: '/reports' } },
    { icon: '✅', label: '审核流看板', hash: '#/review', match: { path: '/review' } },
    { icon: '🤖', label: 'AI 试点台', hash: '#/ai-pilot', match: { path: '/ai-pilot' } },
    { icon: '📈', label: '数字员工运营', hash: '#/ai-ops', match: { path: '/ai-ops' } },
  ];

  function isActive(mod, parts) {
    if (!parts.length) return false;
    var m = mod.match || {};
    // 新增：精确 path 匹配（常用看板）
    if (m.path) {
      return '/' + parts.join('/') === m.path;   // 例：['perf','june'] → '/perf/june'
    }
    // 兼容原主卡 exact（钟喻个人任务台）
    if (m.exact) {
      return parts[0] === 'plan' && parts[1] === m.exact;
    }
    // 前缀匹配（含 except 排除）
    if (m.prefix === parts[0]) {
      if (m.except) return !m.except.some(function (e) { return parts[1] === e; });
      return true;
    }
    return false;
  }

  global.ModuleSelector = {
    render: function () {
      injectCss();
      var view = U.el('view');
      if (!view) return;

      App.setBreadcrumb(['模块选择']);

      var h = location.hash.replace(/^#/, '').split('/').filter(Boolean);

      // 主卡：8 个模块（含 .ms-enter 可点击暗示）
      var cardsHtml = MODULES.map(function (m) {
        var active = isActive(m, h) ? ' active' : '';
        return '<a class="ms-card' + active + '" href="' + m.hash + '">' +
          '<div class="ms-icon">' + U.escapeHtml(m.icon) + '</div>' +
          '<div class="ms-label">' + U.escapeHtml(m.label) + '</div>' +
          '<div class="ms-desc">' + U.escapeHtml(m.desc) + '</div>' +
          '<span class="ms-enter">进入 ›</span>' +
          '</a>';
      }).join('');

      // 常用看板：高频子页二级卡
      var subHtml = SUB_MODULES.map(function (m) {
        var active = isActive(m, h) ? ' active' : '';
        return '<a class="ms-sub' + active + '" href="' + m.hash + '">' +
          '<div class="ms-sub-icon">' + U.escapeHtml(m.icon) + '</div>' +
          '<div class="ms-sub-label">' + U.escapeHtml(m.label) + '</div>' +
          '</a>';
      }).join('');

      view.innerHTML =
        '<div class="ms-page">' +
          '<a class="ms-home" href="#/">🏠 首页 · 模块选择</a>' +
          '<h2 class="ms-title">模块选择</h2>' +
          '<div class="ms-subtitle">奥乐V 人事行政系统 · 一键直达各业务模块</div>' +
          '<div class="ms-grid">' + cardsHtml + '</div>' +
          '<div class="ms-sub-head">常用看板</div>' +
          '<div class="ms-sub-grid">' + subHtml + '</div>' +
          '<div class="ms-foot">共 8 大模块 · 点击卡片进入对应系统</div>' +
        '</div>';
    }
  };
})(window);

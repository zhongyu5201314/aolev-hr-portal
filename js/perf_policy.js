/* =========================================================================
 * perf_policy.js — 绩效管理板块 · 绩效制度 hub（#/perf/policy）
 *   作用域前缀：.pp（金系主色 + 蓝紫 #6C5CE7 点缀，区别于 .pa/.pf）
 *   聚合方式：显式映射数组 POLICY_DOCS（不依赖知识库 tags 分组）
 *   文章标题与 window.KB_ARTICLES 精确匹配；缺失则降级为"未收录"，避免死链。
 *   跳转：href="#/wiki/article/<encodeURIComponent(title)>"（wiki.js 按 id/title 匹配）。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = [
    '.pp{--pp:#C9971B;--pp2:#6C5CE7;--pp-bg:#F7F5FF;--pp-card:#fff;--pp-line:#E7E2F5;--pp-ink:#26201A;--pp-muted:#7A7390;font-size:14px;color:var(--pp-ink)}',
    '.pp *{box-sizing:border-box}',
    '.pp-head{background:linear-gradient(135deg,#6C5CE7,#8E7BEF);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0}',
    '.pp-head h1{font-size:18px;margin:0;font-weight:700}',
    '.pp-head .sub{font-size:12px;opacity:.92;margin-top:3px}',
    '.pp-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}',
    '.pp-declare{border-left:4px solid #6C5CE7;background:#F7F5FF;border:1px solid #E7E2F5;border-left:4px solid #6C5CE7;border-radius:10px;padding:14px 18px;margin:14px 0}',
    '.pp-declare h3{margin:0 0 8px;font-size:15px;color:#5A4BD6}',
    '.pp-declare p{margin:0;font-size:13px;line-height:1.6;color:var(--pp-ink)}',
    '.pp-declare ul{margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.7;color:var(--pp-ink)}',
    '.pp-declare li{margin:2px 0}',
    '.pp-declare .coef{font-weight:700;color:#5A4BD6}',
    '.pp-declare .note{margin:8px 0 0;font-size:12.5px;color:var(--pp-muted);line-height:1.6}',
    '.pp-group{margin-top:22px}',
    '.pp-group__title{font-size:15px;font-weight:700;color:var(--pp-ink);margin:0 0 10px;display:flex;align-items:center;gap:8px}',
    '.pp-group__ico{font-size:16px}',
    '.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}',
    '.pp-card{display:block;background:var(--pp-card);border:1px solid var(--pp-line);border-radius:12px;padding:14px 16px;text-decoration:none;color:inherit;transition:.15s;box-shadow:0 1px 2px rgba(60,40,120,.05)}',
    '.pp-card:hover{box-shadow:0 5px 16px rgba(60,40,120,.14);transform:translateY(-1px);border-color:var(--pp2)}',
    '.pp-card__title{font-size:15px;font-weight:700;line-height:1.4}',
    '.pp-card__desc{font-size:12.5px;color:var(--pp-muted);margin-top:6px;line-height:1.6}',
    '.pp-card__foot{margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.pp-tag{font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600}',
    '.pp-tag--g1{background:#EFECFB;color:#6C5CE7}',
    '.pp-tag--g2{background:#FBF3DD;color:#9A6E12}',
    '.pp-tag--g3{background:#E7F6EE;color:#16794A}',
    '.pp-tag--g4{background:#FDF0DA;color:#9A6A12}',
    '.pp-tag--miss{background:#EFEFEF;color:#888}',
    '.pp-go{margin-left:auto;font-size:12px;color:var(--pp2);font-weight:600}',
    '.pp-foot{padding:12px 0;color:var(--pp-muted);font-size:12px;margin-top:18px;border-top:1px solid var(--pp-line)}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('perfPolicyCss')) return; // 防重复注入
    var s = document.createElement('style');
    s.id = 'perfPolicyCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  // 7 篇正式文章：标题 → 建议标签分组 → 一句话说明（与知识专家报告一致）
  var POLICY_DOCS = [
    { title: '奥乐V OGSM 绩效体系说明',     group: '绩效体系', tag: '绩效体系', desc: 'OGSM 体系总纲' },
    { title: '简化绩效评估方案',           group: '考核制度', tag: '考核制度', desc: '四级评级与薪酬挂钩' },
    { title: '奥乐V绩效考核方案（v1）',     group: '考核制度', tag: '考核制度', desc: '月度考核与工资兑现' },
    { title: '团队激励方案（修订版）',       group: '激励方案', tag: '激励方案', desc: '金银铜区间与改进处理' },
    { title: '全员激励方案（完整版）',       group: '激励方案', tag: '激励方案', desc: '年度全员激励总盘' },
    { title: '奖金分配管理制度',           group: '奖金核算', tag: '奖金核算', desc: '项目奖金分配制度' },
    { title: '仓储人工成本与绩效核算管理办法', group: '奖金核算', tag: '奖金核算', desc: '仓储绩效核算办法' }
  ];
  var GROUP_ORDER = ['绩效体系', '考核制度', '激励方案', '奖金核算'];
  var GROUP_ICON = { '绩效体系': '🧩', '考核制度': '📋', '激励方案': '🏆', '奖金核算': '💰' };
  var GROUP_MOD = { '绩效体系': 'g1', '考核制度': 'g2', '激励方案': 'g3', '奖金核算': 'g4' };

  function render() {
    injectCss();
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['绩效管理', '绩效制度']);

    var KB = global.KB_ARTICLES || [];

    // 按 GROUP_ORDER 聚合渲染
    var groupsHtml = GROUP_ORDER.map(function (g) {
      var docs = POLICY_DOCS.filter(function (d) { return d.group === g; });
      var cards = docs.map(function (d) {
        // 精确匹配知识库标题；缺失则降级为 #/wiki 并标"未收录"
        var found = KB.filter(function (a) { return a.title === d.title; })[0];
        var href = found ? ('#/wiki/article/' + encodeURIComponent(d.title)) : '#/wiki';
        var tagCls = GROUP_MOD[d.group] || 'g1';
        return '<a class="pp-card" href="' + href + '">' +
          '<div class="pp-card__title">' + esc(d.title) + '</div>' +
          '<div class="pp-card__desc">' + esc(d.desc) + '</div>' +
          '<div class="pp-card__foot">' +
          '<span class="pp-tag pp-tag--' + tagCls + '">' + esc(d.group) + '</span>' +
          (found ? '' : '<span class="pp-tag pp-tag--miss">未收录</span>') +
          '<span class="pp-go">查看全文 ↗</span>' +
          '</div></a>';
      }).join('');
      return '<div class="pp-group"><div class="pp-group__title"><span class="pp-group__ico">' +
        (GROUP_ICON[g] || '📄') + '</span>' + esc(g) +
        ' <span style="font-size:12px;color:var(--pp-muted);font-weight:400">(' + docs.length + ')</span></div>' +
        '<div class="pp-grid">' + cards + '</div></div>';
    }).join('');

    var html = '<div class="pp">' +
      '<div class="pp-head"><h1>📚 绩效制度</h1>' +
      '<div class="sub">绩效管理板块 · 制度口径与知识库入口</div></div>' +
      '<div class="pp-main">' +

      // 口径声明区（蓝紫描边）
      '<div class="pp-declare"><h3>📐 绩效口径声明</h3>' +
      '<p>本板块涉及两套评级刻度，<b>适用场景不同，请勿混用</b>：</p>' +
      '<ul>' +
      '<li><b>年度 / 简化绩效（4 级）</b>：金 / 银 / 铜 / 待改进，系数 <span class="coef">金 1.2 / 银 1.0 / 铜 0.9 / 待改进 0.8</span>。适用于年度绩效评估、简化绩效评估方案。</li>' +
      '<li><b>月度绩效 v1（5 档）</b>：金牌 / 银牌 / 铜 / C 级 / D 级，系数 <span class="coef">金牌 1.5 / 银牌 1.2 / 铜牌 1.0 / C 级 0.8 / D 级 0</span>。适用于月度绩效考核与工资兑现。</li>' +
      '</ul>' +
      '<p class="note">两套刻度分别服务于"月度过程管理"与"年度/简化综合评定"，计算口径与挂钩方式不同。</p>' +
      '</div>' +

      groupsHtml +

      '<div class="pp-foot">共 ' + POLICY_DOCS.length + ' 篇制度文章 · 数据来源：window.KB_ARTICLES' +
      (KB.length ? '' : '（未加载）') + '</div>' +

      '</div></div>';
    view.innerHTML = html;
  }

  global.PerfPolicy = { render: render };
})(window);

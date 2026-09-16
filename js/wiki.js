/* =========================================================================
 * wiki.js — 模块三：制度知识库（按「板块 › 类别」两级分类）
 * 门户首页 / 分类列表 / 文章详情（Markdown 渲染 + TOC 锚点）
 * 数据来自 window.KB_ARTICLES（front-matter: board / category / tags / ... + 正文）
 * ========================================================================= */
(function (global) {
  'use strict';
  const U = global.U, KB = global.KB_ARTICLES || [];
  const BOARD_ORDER = ['人力资源', '行政', '规划计划'];

  function articles() { return KB.filter(function (a) { return a.id !== 'index'; }); }
  function getArticle(id) { return KB.find(function (a) { return a.id === id; }); }
  function boardOf(a) { return a.board || '未分板块'; }
  function catOf(a) { return a.category || '未分类'; }

  /* ---------- 两级聚合 ---------- */
  function boards() {
    const set = {};
    articles().forEach(function (a) { set[boardOf(a)] = (set[boardOf(a)] || 0) + 1; });
    const ordered = BOARD_ORDER.filter(function (b) { return set[b]; });
    Object.keys(set).forEach(function (k) { if (ordered.indexOf(k) < 0) ordered.push(k); });
    return ordered.map(function (k) { return { name: k, count: set[k] }; });
  }
  function categoriesOf(board) {
    const set = {};
    articles().forEach(function (a) {
      if (board === '全部' || boardOf(a) === board) set[catOf(a)] = (set[catOf(a)] || 0) + 1;
    });
    return Object.keys(set).map(function (k) { return { name: k, count: set[k] }; });
  }
  function search(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return articles();
    return articles().filter(function (a) {
      const hay = [a.title, boardOf(a), catOf(a), (a.tags || []).join(' '), a.summary, a.body].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function cardHTML(a) {
    return '<a class="kb-card" href="#/wiki/article/' + encodeURIComponent(a.id) + '">' +
      '<div class="kb-card__cat">' + U.escapeHtml(boardOf(a)) + ' › ' + U.escapeHtml(catOf(a)) + '</div>' +
      '<div class="kb-card__title">' + U.escapeHtml(a.title) + '</div>' +
      '<div class="kb-card__summary">' + U.escapeHtml(a.summary) + '</div>' +
      '<div class="kb-card__meta"><span>🕒 ' + U.escapeHtml(a.updated) + '</span>' +
      '<span class="tag-row">' + (a.tags || []).slice(0, 3).map(function (t) { return '<span class="tag tag--info">' + U.escapeHtml(t) + '</span>'; }).join('') + '</span></div>' +
      '</a>';
  }
  function boardLinkHTML(a) {
    var links = a.related_boards || [];
    if (!links.length) return '';
    var LABELS = {
      '#/dashboard': '📊 数据看板', '#/perf': '🎯 绩效板块', '#/reports': '📋 日周月报',
      '#/recruit': '🔍 简历初筛', '#/training': '🎓 培训系统', '#/plan': '🗂 项目协同',
      '#/wiki': '📚 制度知识库', '#/review': '✅ 审核流看板', '#/ai-pilot': '🤖 AI试点台'
    };
    var items = links.map(function (h) {
      var label = LABELS[h] || h;
      return '<a class="related__item" href="' + U.escapeHtml(h) + '">' + U.escapeHtml(label) + '</a>';
    }).join('');
    return '<div class="related"><div class="related__title">🔗 关联看板</div>' + items + '</div>';
  }
  function boardLinks(curBoard, curCat, q) {
    const items = boards().map(function (b) {
      const active = (b.name === curBoard) ? ' active' : '';
      return '<a class="cat-link' + active + '" href="#/wiki/list/' + encodeURIComponent(b.name) + '/' + encodeURIComponent('全部分类') + (q ? '?q=' + encodeURIComponent(q) : '') + '">' + U.escapeHtml(b.name) + ' <span class="muted">(' + b.count + ')</span></a>';
    });
    const all = '<a class="cat-link' + (curBoard === '全部' ? ' active' : '') + '" href="#/wiki/list/' + encodeURIComponent('全部') + '/' + encodeURIComponent('全部分类') + (q ? '?q=' + encodeURIComponent(q) : '') + '">全部板块 <span class="muted">(' + articles().length + ')</span></a>';
    return all + items;
  }
  function catLinks(curBoard, curCat, q) {
    const cs = categoriesOf(curBoard);
    const total = (curBoard === '全部') ? articles().length : articles().filter(function (a) { return boardOf(a) === curBoard; }).length;
    const all = '<a class="cat-link' + (curCat === '全部分类' ? ' active' : '') + '" href="#/wiki/list/' + encodeURIComponent(curBoard) + '/' + encodeURIComponent('全部分类') + (q ? '?q=' + encodeURIComponent(q) : '') + '">全部分类 <span class="muted">(' + total + ')</span></a>';
    const items = cs.map(function (c) {
      const active = (c.name === curCat) ? ' active' : '';
      return '<a class="cat-link' + active + '" href="#/wiki/list/' + encodeURIComponent(curBoard) + '/' + encodeURIComponent(c.name) + (q ? '?q=' + encodeURIComponent(q) : '') + '">' + U.escapeHtml(c.name) + ' <span class="muted">(' + c.count + ')</span></a>';
    });
    return all + items;
  }

  /* ---------- 门户首页 ---------- */
  function renderPortal() {
    const view = U.el('view');
    const bs = boards();
    const hot = articles().slice().sort(function (a, b) { return (b.tags.length * 50 + b.body.length) - (a.tags.length * 50 + a.body.length); }).slice(0, 4);
    const latest = articles().slice().sort(function (a, b) { return b.updated.localeCompare(a.updated); }).slice(0, 4);
    const boardSections = bs.map(function (b) {
      const cards = categoriesOf(b.name).map(function (c) {
        return '<a class="cat-card" href="#/wiki/list/' + encodeURIComponent(b.name) + '/' + encodeURIComponent(c.name) + '">' +
          '<div class="cat-card__name">' + U.escapeHtml(c.name) + '</div>' +
          '<div class="cat-card__count">' + c.count + ' 篇</div></a>';
      }).join('');
      return '<section class="section"><h3 class="section__title">' + U.escapeHtml(b.name) + '（' + b.count + '）</h3><div class="cat-grid">' + cards + '</div></section>';
    }).join('');
    view.innerHTML =
      '<div class="wiki-hero">' +
        '<div class="wiki-hero__title">奥乐V 制度知识库</div>' +
        '<div class="wiki-search"><input id="wiki-search" placeholder="搜索制度 / 政策 / SOP / 绩效 / 激励 …" />' +
        '<button class="btn btn--primary" id="wiki-search-btn">搜索</button></div>' +
      '</div>' +
      boardSections +
      '<div class="wiki-cols">' +
        '<section class="section"><h3 class="section__title">🔥 热门阅读</h3><div class="kb-list">' + hot.map(cardHTML).join('') + '</div></section>' +
        '<section class="section"><h3 class="section__title">🕒 最近更新</h3><div class="kb-list">' + latest.map(cardHTML).join('') + '</div></section>' +
      '</div>';
    const input = U.el('wiki-search'), btn = U.el('wiki-search-btn');
    let timer = null;
    function go() { const q = input.value.trim(); location.hash = '#/wiki/list/' + encodeURIComponent('全部') + '/' + encodeURIComponent('全部分类') + (q ? '?q=' + encodeURIComponent(q) : ''); }
    if (input) input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(go, 300); });
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    if (btn) btn.addEventListener('click', go);
    window.App && window.App.setBreadcrumb(['制度知识库', '门户首页']);
  }

  /* ---------- 分类列表（两级筛选）---------- */
  function renderList(board, cat, q) {
    const view = U.el('view');
    view.innerHTML =
      '<div class="wiki-list-head"><h2 class="page-title">文章列表</h2>' +
        '<div class="wiki-search small"><input id="wiki-search" placeholder="在当前范围搜索…" value="' + U.escapeHtml(q || '') + '" />' +
        '<button class="btn btn--ghost" id="wiki-search-btn">搜索</button></div></div>' +
      '<div class="wiki-list-layout">' +
        '<aside class="wiki-cats">' +
          '<div style="font-size:12px;color:#888;margin:6px 0 4px;font-weight:500">板块</div>' + boardLinks(board, cat, q) +
          '<div style="font-size:12px;color:#888;margin:14px 0 4px;font-weight:500">分类</div>' + catLinks(board, cat, q) +
        '</aside>' +
        '<div class="wiki-results" id="wiki-results"></div>' +
      '</div>';
    const input = U.el('wiki-search'), btn = U.el('wiki-search-btn');
    function apply() {
      const nv = input.value.trim();
      location.hash = '#/wiki/list/' + encodeURIComponent(board) + '/' + encodeURIComponent(cat) + (nv ? '?q=' + encodeURIComponent(nv) : '');
    }
    let timer = null;
    if (input) input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 300); });
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') apply(); });
    if (btn) btn.addEventListener('click', apply);
    renderResults(board, cat, q);
    window.App && window.App.setBreadcrumb(['制度知识库', board === '全部' ? '全部板块' : board, cat === '全部分类' ? '全部分类' : cat]);
  }
  function renderResults(board, cat, q) {
    const box = U.el('wiki-results'); if (!box) return;
    let list = search(q);
    if (board && board !== '全部') list = list.filter(function (a) { return boardOf(a) === board; });
    if (cat && cat !== '全部分类') list = list.filter(function (a) { return catOf(a) === cat; });
    if (!list.length) { box.innerHTML = '<div class="empty-box">未找到匹配的文章</div>'; return; }
    box.innerHTML = '<div class="kb-list">' + list.map(cardHTML).join('') + '</div>';
  }

  /* ---------- 文章详情 ---------- */
  function renderArticle(id) {
    const view = U.el('view');
    const a = getArticle(id);
    if (!a) { view.innerHTML = '<div class="empty-box">文章不存在</div>'; return; }
    const md = (global.marked && global.marked.parse) ? global.marked.parse(a.body) : '<pre>' + U.escapeHtml(a.body) + '</pre>';
    const related = articles().filter(function (x) { return x.category === catOf(a) && x.id !== a.id; }).slice(0, 3);
    view.innerHTML =
      '<div class="article-layout">' +
        '<article class="article-main">' +
          '<div class="article-head"><span class="tag tag--primary">' + U.escapeHtml(boardOf(a)) + ' › ' + U.escapeHtml(catOf(a)) + '</span>' +
            '<h1 class="article-title">' + U.escapeHtml(a.title) + '</h1>' +
            '<div class="article-meta">更新于 ' + U.escapeHtml(a.updated) + ' ｜ 标签：' + (a.tags || []).map(function (t) { return U.escapeHtml(t); }).join('、') + '</div>' +
            '<div class="article-summary">' + U.escapeHtml(a.summary) + '</div></div>' +
          '<div class="article-body">' + md + '</div>' +
        '</article>' +
        '<aside class="article-side">' +
          '<div class="toc"><div class="toc__title">目录</div><div class="toc__list" id="toc-list"></div></div>' +
          boardLinkHTML(a) +
        (related.length ? '<div class="related"><div class="related__title">相关推荐</div>' + related.map(function (r) { return '<a class="related__item" href="#/wiki/article/' + encodeURIComponent(r.id) + '">' + U.escapeHtml(r.title) + '</a>'; }).join('') + '</div>' : '') +
        '</aside>' +
      '</div>';
    buildTOC();
    window.App && window.App.setBreadcrumb(['制度知识库', boardOf(a), catOf(a), a.title]);
  }
  function buildTOC() {
    const body = U.el('view').querySelector('.article-body');
    const toc = U.el('toc-list');
    if (!body || !toc) return;
    const heads = body.querySelectorAll('h1, h2, h3');
    let html = '';
    heads.forEach(function (h, i) {
      if (h.tagName === 'H1') return;
      const id = 'sec-' + i;
      h.id = id;
      const lvl = h.tagName === 'H3' ? 'lvl3' : 'lvl2';
      html += '<a class="toc__item ' + lvl + '" href="#' + id + '" data-target="' + id + '">' + U.escapeHtml(h.textContent) + '</a>';
    });
    if (!html) { toc.parentNode.style.display = 'none'; return; }
    toc.innerHTML = html;
    toc.querySelectorAll('.toc__item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        const t = U.el(item.getAttribute('data-target'));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  global.Wiki = { renderPortal: renderPortal, renderList: renderList, renderArticle: renderArticle };
})(window);

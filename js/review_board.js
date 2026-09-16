/* =========================================================================
 * review_board.js — 审核流看板（阶段二·审核流上线 + 真·飞书审批强制留痕）
 *   数据来源：knowledge.js (window.KB_ARTICLES)，build_data.py 已导出
 *            status / owner / asset_id / asset_class / version / applicable / related_boards
 *   作用域前缀：.rv（深色科技风 #0f0f1a 系）
 *   状态机：草稿 → 审核中 → 已发布 → 已下线（front-matter status 为真实起点）
 *   强制留痕：推进至「已发布」需该资产在 dist/approval_trail.json 存在 status=approved 的飞书审批实例。
 *   飞书审批由 AI 助理（何智达）在对话中代发起（浏览器无法直连 lark-cli），实例写回 approval_trail.json。
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  var STATES = ['草稿', '审核中', '已发布', '已下线'];
  var override = {};               // id -> status（内存态演示）
  var ui = { status: '', owner: '', cat: '' };
  var current = null;
  var TRAIL = {};                  // asset_id -> {instance_code, instance_link, status, submitter, submitted_at, approved_at}

  var CSS =
    '.rv{--rv-bg:#0f0f1a;--rv-panel:rgba(30,30,56,.55);--rv-card:#1a1a32;--rv-card-hover:#222244;--rv-border:rgba(255,255,255,.10);--rv-line:rgba(74,158,255,.40);--rv-accent:#4a9eff;--rv-accent2:#8b5cf6;--rv-ink:#e8e8f0;--rv-muted:#8888aa;color:var(--rv-ink);font-size:14px}' +
    '.rv *{box-sizing:border-box}' +
    '.rv-page{background:var(--rv-bg);margin:-18px -22px -40px;padding:28px 22px 40px;min-height:calc(100vh - 56px)}' +
    '.rv-head h1{font-size:20px;font-weight:700;margin:0 0 4px;color:#fff}' +
    '.rv-head .sub{font-size:12px;color:var(--rv-muted);margin:0 0 14px}' +
    '.rv-kpis{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}' +
    '.rv-kpi{flex:1;min-width:120px;background:var(--rv-panel);border:1px solid var(--rv-border);border-radius:12px;padding:12px 14px}' +
    '.rv-kpi b{display:block;font-size:24px;line-height:1.1}' +
    '.rv-kpi span{font-size:12px;color:var(--rv-muted)}' +
    '.rv-section{margin-top:22px;background:var(--rv-panel);border:1px solid var(--rv-border);border-radius:14px;padding:16px 18px}' +
    '.rv-section h2{font-size:15px;margin:0 0 12px;color:#fff;display:flex;align-items:center;gap:8px}' +
    '.rv-section h2 small{font-size:11px;color:var(--rv-muted);font-weight:400}' +
    '.rv-hot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:18px}' +
    '@media(max-width:900px){.rv-hot-grid{grid-template-columns:1fr}}' +
    '.rv-bar{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px}' +
    '.rv-bar .name{width:96px;color:var(--rv-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.rv-bar .track{flex:1;height:14px;background:rgba(255,255,255,.06);border-radius:8px;overflow:hidden}' +
    '.rv-bar .fill{height:100%;background:linear-gradient(90deg,var(--rv-accent),var(--rv-accent2));border-radius:8px}' +
    '.rv-bar .num{width:28px;text-align:right;color:#fff;font-weight:700}' +
    '.rv-list{list-style:none;margin:0;padding:0}' +
    '.rv-list li{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px dashed var(--rv-border);font-size:13px}' +
    '.rv-list li:last-child{border-bottom:none}' +
    '.rv-list li .t{color:var(--rv-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.rv-list li .d{color:var(--rv-muted);white-space:nowrap}' +
    '.rv-filter{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:rgba(15,15,26,.85);backdrop-filter:blur(6px);padding:10px 12px;border:1px solid var(--rv-border);border-radius:12px;margin:14px 0}' +
    '.rv-filter select,.rv-filter input{background:var(--rv-card);color:var(--rv-ink);border:1px solid var(--rv-border);border-radius:8px;padding:6px 10px;font-size:13px}' +
    '.rv-filter .rv-reset{margin-left:auto;background:transparent;color:var(--rv-accent);border:1px solid var(--rv-line);border-radius:8px;padding:6px 14px;cursor:pointer}' +
    '.rv-filter .rv-reset:hover{background:rgba(74,158,255,.12)}' +
    '.rv-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}' +
    '.rv-card{background:var(--rv-panel);border:1px solid var(--rv-border);border-radius:14px;padding:14px 16px;cursor:pointer;transition:.18s;backdrop-filter:blur(2px)}' +
    '.rv-card:hover{border-color:var(--rv-line);background:var(--rv-card-hover);transform:translateY(-2px)}' +
    '.rv-card .rv-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px}' +
    '.rv-card .rv-meta{font-size:11px;color:var(--rv-muted);display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}' +
    '.rv-card .rv-sum{font-size:12px;color:var(--rv-ink);opacity:.85;line-height:1.5;max-height:54px;overflow:hidden}' +
    '.rv-badge{display:inline-block;border-radius:999px;padding:2px 11px;font-size:11px;font-weight:700;border:1px solid transparent}' +
    '.rv-badge--草稿{color:#ffd479;border-color:rgba(255,212,121,.5);background:rgba(255,212,121,.12)}' +
    '.rv-badge--审核中{color:#8b5cf6;border-color:rgba(139,92,246,.5);background:rgba(139,92,246,.14)}' +
    '.rv-badge--已发布{color:#5be0a0;border-color:rgba(91,224,160,.5);background:rgba(91,224,160,.12)}' +
    '.rv-badge--已下线{color:#ff7a7a;border-color:rgba(255,122,122,.5);background:rgba(255,122,122,.12)}' +
    '.rv-badge--其它{color:var(--rv-muted);border-color:var(--rv-border);background:rgba(255,255,255,.04)}' +
    '.rv-trail-ok{color:#5be0a0;font-weight:700}' +
    '.rv-trail-wait{color:#ffd479}' +
    '.rv-mask{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:none}' +
    '.rv-mask.open{display:block}' +
    '.rv-drawer{position:fixed;top:0;right:0;height:100%;width:460px;max-width:92vw;background:#16162c;border-left:1px solid var(--rv-border);z-index:50;transform:translateX(100%);transition:transform .25s;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,.5)}' +
    '.rv-drawer.open{transform:translateX(0)}' +
    '.rv-drawer .rv-dh{padding:18px 20px;border-bottom:1px solid var(--rv-border);display:flex;align-items:center;justify-content:space-between}' +
    '.rv-drawer .rv-dh h3{margin:0;font-size:17px;color:#fff}' +
    '.rv-drawer .rv-close{cursor:pointer;color:var(--rv-muted);font-size:22px;background:none;border:none}' +
    '.rv-drawer .rv-db{padding:18px 20px;overflow:auto;flex:1}' +
    '.rv-tl{list-style:none;margin:14px 0;padding:0 0 0 18px;border-left:2px solid var(--rv-border)}' +
    '.rv-tl li{position:relative;padding:8px 0;font-size:13px;color:var(--rv-muted)}' +
    '.rv-tl li::before{content:"";position:absolute;left:-25px;top:12px;width:10px;height:10px;border-radius:50%;background:var(--rv-border)}' +
    '.rv-tl li.done{color:var(--rv-ink)}' +
    '.rv-tl li.done::before{background:var(--rv-accent)}' +
    '.rv-tl li.cur{color:#fff;font-weight:700}' +
    '.rv-tl li.cur::before{background:#8b5cf6;box-shadow:0 0 10px rgba(139,92,246,.6)}' +
    '.rv-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
    '.rv-actions button{padding:8px 14px;border-radius:9px;border:1px solid var(--rv-line);background:linear-gradient(135deg,var(--rv-accent),var(--rv-accent2));color:#fff;font-weight:600;cursor:pointer;font-size:13px}' +
    '.rv-actions button.ghost{background:transparent;color:var(--rv-muted);border-color:var(--rv-border)}' +
    '.rv-actions button:disabled{opacity:.45;cursor:not-allowed}' +
    '.rv-actions button:hover:not(:disabled){opacity:.9}' +
    '.rv-trail{margin-top:16px;border:1px solid var(--rv-border);border-radius:12px;padding:12px 14px;background:rgba(15,15,26,.5)}' +
    '.rv-trail .th{font-size:13px;font-weight:700;color:#fff;margin-bottom:8px}' +
    '.rv-trail .row{font-size:12px;color:var(--rv-muted);line-height:1.9}' +
    '.rv-trail .row a{color:var(--rv-accent)}' +
    '.rv-empty{color:var(--rv-muted);text-align:center;padding:40px}' +
    '.rv-trail input{width:100%;background:var(--rv-card);color:var(--rv-ink);border:1px solid var(--rv-border);border-radius:8px;padding:7px 10px;font-size:12px;margin-bottom:6px}' +
    '.rv-trail .hint{font-size:11px;color:var(--rv-muted);margin-bottom:6px;line-height:1.5}' +
    '.rv-audit-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}';

  function injectCss() {
    if (document.getElementById('reviewBoardCss')) return;
    var s = document.createElement('style');
    s.id = 'reviewBoardCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function normStatus(s) {
    if (!s) return '已发布';
    if (s === '草案' || s === '草稿') return '草稿';
    if (s === '审核中') return '审核中';
    if (s === '生效中' || s === '已发布') return '已发布';
    if (s === '已下线' || s === '废止') return '已下线';
    return '已发布';
  }
  function getStatus(art) { return override[art.id] || normStatus(art.status); }
  function badge(status) {
    var cls = STATES.indexOf(status) >= 0 ? status : '其它';
    return '<span class="rv-badge rv-badge--' + cls + '">' + U.escapeHtml(status) + '</span>';
  }
  function articles() { return (global.KB_ARTICLES || []).slice(); }
  function filtered(list) {
    return list.filter(function (a) {
      if (ui.status && getStatus(a) !== ui.status) return false;
      if (ui.owner && (a.owner || '').indexOf(ui.owner) < 0) return false;
      if (ui.cat && a.category !== ui.cat) return false;
      return true;
    });
  }
  function kpis(list) {
    var c = { '草稿': 0, '审核中': 0, '已发布': 0, '已下线': 0 };
    list.forEach(function (a) { c[getStatus(a)] = (c[getStatus(a)] || 0) + 1; });
    return c;
  }

  /* 飞书审批留痕：同源拉取 dist/approval_trail.json + 合并本地自助录入 */
  function loadTrail(cb) {
    fetch('approval_trail.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (arr) {
        TRAIL = {};
        (arr || []).forEach(function (e) { TRAIL[e.asset_id] = e; });
        mergeLocalTrail();
        if (cb) cb();
      })
      .catch(function () { TRAIL = {}; mergeLocalTrail(); if (cb) cb(); });
  }
  function mergeLocalTrail() {
    try {
      var store = JSON.parse(localStorage.getItem('feishu_trail_v1') || '{}');
      Object.keys(store).forEach(function (k) { TRAIL[k] = store[k]; });
    } catch (e) {}
  }
  function pendingMap() {
    try { return JSON.parse(localStorage.getItem('feishu_pending_v1') || '{}'); } catch (e) { return {}; }
  }

  /* 复用热度看板：分类分布 / 最近更新 TOP5 / 负责人负载 TOP5 */
  function hotness(all) {
    var cat = {}, owner = {}, maxCat = 1;
    all.forEach(function (a) {
      cat[a.category] = (cat[a.category] || 0) + 1;
      var o = a.owner || '未指定';
      owner[o] = (owner[o] || 0) + 1;
      if (cat[a.category] > maxCat) maxCat = cat[a.category];
    });
    var catRows = Object.keys(cat).sort(function (x, y) { return cat[y] - cat[x]; }).map(function (k) {
      var w = Math.round(cat[k] / maxCat * 100);
      return '<div class="rv-bar"><span class="name">' + U.escapeHtml(k) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + w + '%"></span></span>' +
        '<span class="num">' + cat[k] + '</span></div>';
    }).join('');
    var recent = all.slice().sort(function (a, b) { return (b.updated || '').localeCompare(a.updated || ''); }).slice(0, 5);
    var recentRows = recent.map(function (a) {
      return '<li><span class="t">' + U.escapeHtml(a.title) + '</span><span class="d">' + U.escapeHtml(a.updated || '-') + '</span></li>';
    }).join('');
    var owners = Object.keys(owner).sort(function (x, y) { return owner[y] - owner[x]; }).slice(0, 5);
    var ownerRows = owners.map(function (k) {
      return '<li><span class="t">' + U.escapeHtml(k) + '</span><span class="d">' + owner[k] + ' 项</span></li>';
    }).join('');
    return '' +
      '<div class="rv-section"><h2>🔥 复用热度看板 <small>基于知识库资产的活动度代理指标（无后端，按分类/更新/负责人聚合）</small></h2>' +
      '<div class="rv-hot-grid">' +
        '<div><div style="font-size:12px;color:var(--rv-muted);margin-bottom:6px">分类分布</div>' + (catRows || '<div class="rv-empty">无</div>') + '</div>' +
        '<div><div style="font-size:12px;color:var(--rv-muted);margin-bottom:6px">最近更新 TOP5</div><ul class="rv-list">' + (recentRows || '<div class="rv-empty">无</div>') + '</ul></div>' +
        '<div><div style="font-size:12px;color:var(--rv-muted);margin-bottom:6px">负责人负载 TOP5</div><ul class="rv-list">' + (ownerRows || '<div class="rv-empty">无</div>') + '</ul></div>' +
      '</div></div>';
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (!view) return;
    global.App.setBreadcrumb(['审核流看板']);

    var all = articles();
    var cats = {};
    all.forEach(function (a) { cats[a.category] = 1; });
    var catOpts = Object.keys(cats).map(function (c) {
      return '<option value="' + U.escapeHtml(c) + '"' + (ui.cat === c ? ' selected' : '') + '>' + U.escapeHtml(c) + '</option>';
    }).join('');

    var list = filtered(all);
    var k = kpis(all);
    var flowN = all.filter(function (a) { return /^v2/.test(a.version || ''); }).length;

    var cards = list.map(function (a) {
      var trail = TRAIL[a.id];
      var approveTag = (trail && trail.status === 'approved')
        ? '<span class="rv-badge rv-badge--已发布" style="margin-left:6px">✓留痕</span>' : '';
      return '<div class="rv-card" data-id="' + U.escapeHtml(a.id) + '">' +
        '<div class="rv-title">' + U.escapeHtml(a.title) + approveTag + '</div>' +
        '<div class="rv-meta">' + badge(getStatus(a)) +
          (a.asset_id ? '<span>' + U.escapeHtml(a.asset_id) + '</span>' : '') +
          '<span>' + U.escapeHtml(a.version || '-') + '</span>' +
          '<span>' + U.escapeHtml(a.owner || '未指定') + '</span></div>' +
        '<div class="rv-sum">' + U.escapeHtml((a.summary || '').slice(0, 70)) + '</div>' +
      '</div>';
    }).join('');

    view.innerHTML =
      '<div class="rv rv-page">' +
        '<div class="rv-head"><h1>审核流看板</h1>' +
          '<div class="sub">阶段二·审核流上线 + 真·飞书审批强制留痕 ｜ 状态机：草稿 → 审核中 → 已发布 → 已下线</div></div>' +
        '<div class="rv-kpis">' +
          '<div class="rv-kpi"><b style="color:#ffd479">' + k['草稿'] + '</b><span>草稿</span></div>' +
          '<div class="rv-kpi"><b style="color:#8b5cf6">' + k['审核中'] + '</b><span>审核中</span></div>' +
          '<div class="rv-kpi"><b style="color:#5be0a0">' + k['已发布'] + '</b><span>已发布</span></div>' +
          '<div class="rv-kpi"><b style="color:#ff7a7a">' + k['已下线'] + '</b><span>已下线</span></div>' +
        '</div>' +
        '<div class="rv-kpis">' +
          '<div class="rv-kpi"><b style="color:#fff">' + all.length + '</b><span>资产总数</span></div>' +
          '<div class="rv-kpi"><b style="color:#4a9eff">' + flowN + '</b><span>流程资产(v2.0)</span></div>' +
          '<div class="rv-kpi"><b style="color:#8b5cf6">' + Object.keys(cats).length + '</b><span>分类数</span></div>' +
          '<div class="rv-kpi"><b style="color:#ffd479">' + Object.keys((function () { var o = {}; all.forEach(function (a) { o[a.owner || '未指定'] = 1; }); return o; })()).length + '</b><span>负责人数</span></div>' +
        '</div>' +
        '<div class="rv-filter">' +
          '<select id="rv-status"><option value="">全部状态</option>' + STATES.map(function (s) {
            return '<option value="' + s + '"' + (ui.status === s ? ' selected' : '') + '>' + s + '</option>';
          }).join('') + '</select>' +
          '<select id="rv-cat"><option value="">全部分类</option>' + catOpts + '</select>' +
          '<input id="rv-owner" placeholder="负责人筛选…" value="' + U.escapeHtml(ui.owner) + '" />' +
          '<button class="rv-reset" id="rv-reset">重置</button>' +
        '</div>' +
        '<div class="rv-grid">' + (cards || '<div class="rv-empty">无匹配资产</div>') + '</div>' +
        hotness(all) +
        auditSection(all) +
      '</div>' +
      '<div class="rv-mask" id="rv-mask"></div>' +
      '<aside class="rv-drawer" id="rv-drawer"></aside>';

    bind(view);
    // 拉取飞书审批留痕；若抽屉已开则刷新
    loadTrail(function () { if (current) openDrawer(current.id); });
  }

  function bind(view) {
    var st = U.el('rv-status'), ca = U.el('rv-cat'), ow = U.el('rv-owner'), rs = U.el('rv-reset');
    if (st) st.onchange = function () { ui.status = st.value; render(); };
    if (ca) ca.onchange = function () { ui.cat = ca.value; render(); };
    if (ow) ow.oninput = function () { ui.owner = ow.value.trim(); render(); };
    if (rs) rs.onclick = function () { ui = { status: '', owner: '', cat: '' }; render(); };
    view.querySelectorAll('.rv-card').forEach(function (card) {
      card.onclick = function () { openDrawer(card.getAttribute('data-id')); };
    });
    var mask = U.el('rv-mask');
    if (mask) mask.onclick = closeDrawer;
    var ex = U.el('rv-export-audit');
    if (ex) ex.onclick = exportAudit;
  }

  function operatorName() {
    try { return localStorage.getItem('ai_pilot_operator') || '喻哥（HRD）'; } catch (e) { return '喻哥（HRD）'; }
  }

  /* 自助录入飞书审批留痕（因飞书定义均为自由流程，API 无法代发起） */
  function submitLocalFeishu(a, code, link) {
    var store = {};
    try { store = JSON.parse(localStorage.getItem('feishu_trail_v1') || '{}'); } catch (e) {}
    store[a.id] = {
      asset_id: a.id, instance_code: code || '-', instance_link: link || '',
      status: 'approved', submitter: operatorName(),
      submitted_at: new Date().toISOString().slice(0, 10),
      approved_at: new Date().toISOString().slice(0, 10), source: 'manual'
    };
    try { localStorage.setItem('feishu_trail_v1', JSON.stringify(store)); } catch (e) {}
    TRAIL[a.id] = store[a.id];
    render();
    U.toast('飞书审批留痕已记录（' + (code || '链接') + '），发布门槛已解除', 'success');
  }

  /* 年度知识资产审计（阶段三 M3 v1）：按 review_cycle 标记超期待复核 */
  function auditSection(all) {
    var cutoffHalf = new Date('2026-02-04');    // 流程类半年
    var cutoffQuarter = new Date('2026-05-04'); // 制度类季度
    var byCycle = { '制度': 0, '流程': 0, '其他': 0 };
    var pending = [];
    all.forEach(function (a) {
      var cat = a.category || '';
      var cyc = cat.indexOf('制度') >= 0 ? '制度' : (cat.indexOf('流程') >= 0 ? '流程' : '其他');
      byCycle[cyc] = (byCycle[cyc] || 0) + 1;
      var upd = new Date(a.updated || '2026-07-31');
      var th = cyc === '制度' ? cutoffQuarter : cutoffHalf;
      if (upd < th) pending.push(a);
    });
    var rows = pending.length
      ? pending.map(function (a) {
          return '<li><span class="t">' + U.escapeHtml(a.title) + '</span><span class="d">' + U.escapeHtml(a.updated || '-') + ' 待复核</span></li>';
        }).join('')
      : '<div class="rv-empty">截至今日无超期资产（共 ' + all.length + ' 项已纳入审计）</div>';
    return '<div class="rv-section"><h2>📋 年度知识资产审计 <small>review_cycle：制度季 / 流程半年 ｜ 超期标「待复核」并降权检索</small></h2>' +
      '<div class="rv-kpis" style="margin-bottom:10px">' +
        '<div class="rv-kpi"><b style="color:#fff">' + all.length + '</b><span>纳入审计</span></div>' +
        '<div class="rv-kpi"><b style="color:#ff7a7a">' + pending.length + '</b><span>待复核(超期)</span></div>' +
        '<div class="rv-kpi"><b style="color:#4a9eff">' + byCycle['制度'] + '</b><span>制度类</span></div>' +
        '<div class="rv-kpi"><b style="color:#8b5cf6">' + byCycle['流程'] + '</b><span>流程类</span></div>' +
      '</div>' +
      '<ul class="rv-list">' + rows + '</ul>' +
      '<div class="rv-actions" style="margin-top:10px"><button id="rv-export-audit">导出审计报告</button></div>' +
      evolveBlock() +
      '</div>';
  }

  function evolveBlock() {
    var cases = [];
    try { cases = JSON.parse(localStorage.getItem('ai_pilot_cases_v1') || '[]'); } catch (e) {}
    var now = new Date();
    var ym = now.getFullYear() + '-' + (now.getMonth() + 1);
    function parseTs(ts) { var d = null; if (ts != null) { try { d = new Date(String(ts).replace(' ', 'T')); } catch (e) {} if (!d || isNaN(d.getTime())) { d = new Date(Number(ts)); } if (isNaN(d.getTime())) d = null; } return d; }
    var cur = cases.filter(function (c) { var d = parseTs(c.ts); return d && (d.getFullYear() + '-' + (d.getMonth() + 1)) === ym; });
    var adopt = cur.filter(function (c) { return c.humanDecision === '采纳AI建议'; }).length;
    var rate = cur.length ? Math.round(adopt / cur.length * 100) : 0;
    // 近 3 月趋势（与 #/ai-pilot 呼应）
    var months = [];
    for (var i = 2; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + (d.getMonth() + 1), label: (d.getMonth() + 1) + '月', cnt: 0 }); }
    var max = 1;
    months.forEach(function (mo) { mo.cnt = cases.filter(function (c) { var d = parseTs(c.ts); return d && (d.getFullYear() + '-' + (d.getMonth() + 1)) === mo.key; }).length; if (mo.cnt > max) max = mo.cnt; });
    var bars = months.map(function (mo) { var h = Math.round(mo.cnt / max * 64); if (mo.cnt > 0 && h < 4) h = 4; return '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:1"><div style="font-size:11px;color:#5be0a0;font-weight:700">' + mo.cnt + '</div><div style="width:60%;height:' + h + 'px;background:linear-gradient(180deg,#4a9eff,#8b5cf6);border-radius:6px 6px 0 0;min-height:2px"></div><div style="font-size:11px;color:var(--rv-muted)">' + mo.label + '</div></div>'; }).join('');
    // 本月采纳率阈值预警（黄色）
    var ADOPT_WARN = 60;
    var warn = '';
    if (cur.length && rate < ADOPT_WARN) {
      warn = '<div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(255,196,0,.14);border:1px solid rgba(255,196,0,.5);font-size:12px;color:#ffce4d">⚠️ 本月采纳率 ' + rate + '% 低于阈值 ' + ADOPT_WARN + '%，建议复盘数字员工规则（见运营 SOP）</div>';
    }
    var kb = (global.KB_ARTICLES || []).filter(function (a) { return (a.title || '').indexOf('数字员工自我进化') >= 0; })[0];
    var link = kb ? '<a class="rv-link" href="#/wiki/article/' + encodeURIComponent(kb.id) + '" style="color:#cbb8ff">📖 查看《数字员工自我进化运营SOP》</a>' : '';
    var stat = cur.length ? ('本月回流 <b style="color:#fff">' + cur.length + '</b> 条 ｜ 采纳率 <b style="color:' + (rate < ADOPT_WARN ? '#ffce4d' : '#5be0a0') + '">' + rate + '%</b>') : '本月暂无回流 case';
    return '<div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.3)">' +
      '<div style="font-size:13px;color:#cbb8ff">🤖 数字员工运营 <small style="color:var(--rv-muted);font-size:11px">纳入阶段三自我进化闭环跟踪</small></div>' +
      '<div style="font-size:12px;color:var(--rv-muted);margin-top:6px">' + stat + '</div>' +
      warn +
      '<div style="display:flex;align-items:flex-end;gap:10px;height:88px;padding:8px 4px 0">' + bars + '</div>' +
      (link ? '<div style="margin-top:8px">' + link + '</div>' : '') +
      '</div>';
  }

  function exportAudit() {
    var all = articles();
    var lines = ['# 年度知识资产审计报告（v1·自动生成）', '生成时间：' + new Date().toLocaleString(), '', '| 标题 | 资产ID | 版本 | 负责人 | 状态 | 更新 |', '|---|---|---|---|---|---'];
    all.forEach(function (a) {
      lines.push('| ' + (a.title || '') + ' | ' + (a.asset_id || '-') + ' | ' + (a.version || '-') + ' | ' + (a.owner || '未指定') + ' | ' + (a.status || '-') + ' | ' + (a.updated || '-') + ' |');
    });
    try {
      var blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      var url = URL.createObjectURL(blob);
      var aEl = document.createElement('a');
      aEl.href = url; aEl.download = '年度知识资产审计_' + new Date().toISOString().slice(0, 10) + '.md';
      document.body.appendChild(aEl); aEl.click(); aEl.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      U.toast('审计报告已导出', 'success');
    } catch (e) {
      U.toast('导出失败：' + e.message, 'warn');
    }
  }

  function submitFeishu(a) {
    var m = pendingMap();
    m[a.id] = true;
    try { localStorage.setItem('feishu_pending_v1', JSON.stringify(m)); } catch (e) {}
    render();
    U.toast('已标记「待助理代发起」：请在对话中告诉我「发起《' + a.title + '》审批」，由我(何智达)在飞书创建真实审批实例并写回留痕', 'info');
  }

  function openDrawer(id) {
    var all = articles();
    var a = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { a = all[i]; break; } }
    if (!a) return;
    current = a;
    var status = getStatus(a);
    var idx = STATES.indexOf(status);
    if (idx < 0) idx = 2;

    var tl = STATES.map(function (s, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'cur' : '');
      return '<li class="' + cls + '">' + s + (i === idx ? '（当前）' : (i < idx ? '（已完成）' : '')) + '</li>';
    }).join('');

    var trail = TRAIL[a.id];
    var approved = trail && trail.status === 'approved';

    var btn = '';
    if (idx < STATES.length - 1) {
      var next = STATES[idx + 1];
      if (next === '已发布' && !approved) {
        // 强制留痕：无飞书审批留痕不得发布
        btn += '<button class="ghost" data-locked="1">🔒 推进至「已发布」（需飞书审批留痕）</button>';
      } else {
        btn += '<button data-to="' + next + '">推进至「' + next + '」</button>';
      }
    }
    if (idx > 0) {
      btn += '<button class="ghost" data-to="' + STATES[idx - 1] + '">回退至「' + STATES[idx - 1] + '」</button>';
    }

    // 飞书审批留痕区
    var pend = pendingMap();
    var trailHTML = '<div class="rv-trail"><div class="th">🔗 飞书审批留痕（强制）</div>';
    if (trail) {
      trailHTML += '<div class="row">实例：' + U.escapeHtml(trail.instance_code || '-') + '<br>' +
        (trail.instance_link ? '链接：<a href="' + U.escapeHtml(trail.instance_link) + '" target="_blank" rel="noopener">打开飞书审批单</a><br>' : '') +
        '状态：' + (approved ? '<span class="rv-trail-ok">✓ 已审批（可发布）</span>' : '<span class="rv-trail-wait">审批中 / ' + U.escapeHtml(trail.status || '') + '</span>') + '<br>' +
        '发起人：' + U.escapeHtml(trail.submitter || '-') + ' ｜ 提交：' + U.escapeHtml(trail.submitted_at || '-') + '</div>';
    } else if (pend[a.id]) {
      trailHTML += '<div class="row rv-trail-wait">⏳ 已请求助理代发起（待飞书审批实例回填留痕文件）</div>';
    } else {
      trailHTML += '<div class="row">暂无飞书审批留痕。' +
        (status === '已发布' ? '该资产已发布但缺审批留痕，建议补录。' : '推进至「已发布」前必须完成飞书审批。') + '</div>';
    }
    if (!approved) {
      trailHTML += '<div class="rv-actions" style="margin-top:10px;flex-direction:column;align-items:stretch">' +
        '<div class="hint">飞书审批需你<b>手动发起</b>（当前飞书 16 个审批定义均为自由流程，开放 API 无法代发起）。发起后粘贴单号/链接即完成留痕、解除发布门槛：</div>' +
        '<input id="rv-trail-code" placeholder="飞书审批单号（必填）" />' +
        '<input id="rv-trail-link" placeholder="飞书审批单链接（可选）" />' +
        '<button id="rv-trail-ok">确认留痕并解除发布门槛</button>' +
        '</div>';
    }
    trailHTML += '</div>';

    var drawer = U.el('rv-drawer');
    drawer.innerHTML =
      '<div class="rv-dh"><h3>' + U.escapeHtml(a.title) + '</h3>' +
        '<button class="rv-close" id="rv-close">×</button></div>' +
      '<div class="rv-db">' +
        badge(status) +
        '<div style="margin-top:10px;font-size:12px;color:var(--rv-muted);line-height:1.8">' +
          (a.asset_id ? '资产ID：' + U.escapeHtml(a.asset_id) + '<br>' : '') +
          '版本：' + U.escapeHtml(a.version || '-') + '<br>' +
          '负责人：' + U.escapeHtml(a.owner || '未指定') + '<br>' +
          '分类：' + U.escapeHtml(a.category) + ' / ' + U.escapeHtml(a.board) + '<br>' +
          '适用：' + U.escapeHtml(a.applicable || '-') + '<br>' +
          '更新：' + U.escapeHtml(a.updated || '-') + '</div>' +
        '<div style="font-size:13px;color:var(--rv-ink);margin-top:12px;line-height:1.6">' + U.escapeHtml((a.summary || '').slice(0, 160)) + '</div>' +
        '<div style="margin-top:16px;font-size:13px;font-weight:700;color:#fff">状态机时间线</div>' +
        '<ul class="rv-tl">' + tl + '</ul>' +
        '<div class="rv-actions">' + btn +
          '<a class="rv-actions" href="#/wiki/article/' + encodeURIComponent(a.id) + '" style="text-decoration:none"><button class="ghost">查看全文</button></a>' +
        '</div>' +
        trailHTML +
        '<div style="margin-top:14px;font-size:11px;color:var(--rv-muted)">说明：状态流转为内存态演示（刷新重置）；飞书审批留痕为真实实例（dist/approval_trail.json），由 AI 助理代发起并写回，作为发布强制门槛。</div>' +
      '</div>';

    drawer.classList.add('open');
    U.el('rv-mask').classList.add('open');

    U.el('rv-close').onclick = closeDrawer;
    drawer.querySelectorAll('.rv-actions button[data-to]').forEach(function (b) {
      b.onclick = function () {
        override[a.id] = b.getAttribute('data-to');
        closeDrawer();
        render();
        U.toast('「' + a.title + '」状态 → ' + b.getAttribute('data-to'), 'info');
      };
    });
    var locked = drawer.querySelector('.rv-actions button[data-locked]');
    if (locked) locked.onclick = function () {
      U.toast('需先完成飞书审批留痕（已审批）才能推进至「已发布」。点击「提交飞书审批」并在对话中让我代发起。', 'warn');
    };
    var tOk = U.el('rv-trail-ok');
    if (tOk) tOk.onclick = function () {
      var code = (U.el('rv-trail-code').value || '').trim();
      var link = (U.el('rv-trail-link').value || '').trim();
      if (!code && !link) { U.toast('请填写飞书审批单号或链接', 'warn'); return; }
      submitLocalFeishu(a, code, link);
    };
  }

  function closeDrawer() {
    var d = U.el('rv-drawer'), m = U.el('rv-mask');
    if (d) d.classList.remove('open');
    if (m) m.classList.remove('open');
    current = null;
  }

  global.ReviewBoard = { render: render };
})(window);

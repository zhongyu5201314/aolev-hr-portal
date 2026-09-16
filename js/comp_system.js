/* =========================================================================
 * comp_system.js — 人力资源板块 · HR 薪酬体系搭建地图
 *   数据来源：comp_system_data.js (window.COMP_SYSTEM)
 *   依赖：    utils.js（U.* 工具）/ vendor/echarts.min.js（按路由加载，能力储备）
 *   路由：    #/comp-system（总览） + /process /structure /kpi /methods
 *   说明：    纯前端，结构占比·KPI 实际值可本地编辑，落 localStorage；
 *            首次无值用示例数据；不引入任何外部依赖。风格对齐 recruit_system.js。
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  /* ---------- 作用域 CSS（仅注入一次，对齐 recruit_system.js 写法） ---------- */
  var CSS = [
    '.cs{--cs:#5B5BD6;--cs2:#7C7CE0;--cs-bg:#F5F6FB;--cs-card:#fff;--cs-line:#E6E8F2;--cs-ink:#1F2733;--cs-muted:#7A8699;--cs-ok:#18A058;--cs-warn:#E5484D;--cs-none:#9AA0B5;--cs-warnbg:#FFF6E9;font-size:14px;color:var(--cs-ink)}',
    '.cs *{box-sizing:border-box}',
    '.cs-head{background:linear-gradient(135deg,#5B5BD6,#7C7CE0);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}',
    '.cs-head h1{font-size:18px;margin:0;font-weight:700}',
    '.cs-head .sub{font-size:12px;opacity:.9;margin-top:3px}',
    '.cs-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}',
    '.cs-stat{background:rgba(255,255,255,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:82px}',
    '.cs-stat b{display:block;font-size:20px;line-height:1.1}',
    '.cs-stat span{font-size:11px;opacity:.9}',
    '.cs-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}',
    '.cs-sec{font-size:15px;font-weight:700;color:var(--cs);margin:18px 0 10px}',
    '.cs-sec .cnt{font-size:12px;font-weight:600;color:var(--cs-muted);background:var(--cs-bg);padding:1px 9px;border-radius:10px;margin-left:6px}',
    '.cs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:14px 0}',
    '.cs-card{background:var(--cs-card);border:1px solid var(--cs-line);border-radius:12px;padding:14px 16px;transition:.15s;box-shadow:0 1px 2px rgba(20,40,80,.05)}',
    '.cs-card:hover{box-shadow:0 5px 16px rgba(20,40,80,.13);transform:translateY(-1px)}',
    '.cs-link{text-decoration:none;color:inherit;display:block}',
    '.cs-mod{display:flex;align-items:center;gap:12px}',
    '.cs-ic{width:42px;height:42px;border-radius:10px;background:var(--cs-bg);display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}',
    '.cs-mod .nm{font-size:16px;font-weight:700}',
    '.cs-mod .kv{font-size:12px;color:var(--cs-muted);margin-top:2px}',
    '.cs-rate-wrap{display:block;text-decoration:none;color:inherit;background:var(--cs-bg);border:1px solid var(--cs-line);border-radius:12px;padding:14px 18px;margin-top:6px;cursor:pointer;transition:.15s}',
    '.cs-rate-wrap:hover{border-color:var(--cs)}',
    '.cs-rate-label{font-size:14px;font-weight:700;color:var(--cs)}',
    '.cs-rate-bar{height:10px;border-radius:6px;background:#E6E8F2;overflow:hidden;margin-top:10px}',
    '.cs-rate-fill{height:100%;background:linear-gradient(90deg,#5B5BD6,#7C7CE0);transition:.3s}',
    '.cs-rate-fill.warn{background:linear-gradient(90deg,#FAAD14,#FFC53D)}',
    '.cs-timeline{display:flex;align-items:stretch;gap:0;margin:14px 0;overflow-x:auto;padding-bottom:6px}',
    '.cs-step{position:relative;flex:1;min-width:150px;background:var(--cs-card);border:1px solid var(--cs-line);border-radius:12px;padding:14px 12px;margin-right:24px}',
    '.cs-step:last-child{margin-right:0}',
    ".cs-step:before{content:'→';position:absolute;right:-18px;top:50%;transform:translateY(-50%);color:var(--cs2);font-size:18px;font-weight:700}",
    ".cs-step:last-child:before{content:''}",
    '.cs-step .st-ic{font-size:24px}',
    '.cs-step .st-nm{font-size:14px;font-weight:700;margin-top:6px}',
    '.cs-step .st-desc{font-size:12px;color:var(--cs-muted);margin-top:4px;line-height:1.5}',
    '.cs-step .st-owner{font-size:11px;color:var(--cs);margin-top:8px}',
    '.cs-stack{display:flex;height:30px;border-radius:8px;overflow:hidden;margin:6px 0 16px;border:1px solid var(--cs-line)}',
    '.cs-seg{display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;transition:width .3s;overflow:hidden;white-space:nowrap}',
    '.cs-bar-track{height:10px;border-radius:6px;background:#E6E8F2;overflow:hidden;margin-top:10px}',
    '.cs-bar-fill{height:100%;background:linear-gradient(90deg,#5B5BD6,#7C7CE0);transition:.3s}',
    '.cs-kpi{background:var(--cs-card);border:1px solid var(--cs-line);border-radius:12px;padding:14px 16px}',
    '.cs-kpi .top{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
    '.cs-kpi .top .ic{font-size:20px}',
    '.cs-kpi .nm{font-size:15px;font-weight:700}',
    '.cs-kpi .dir{margin-left:auto;font-size:11px;color:var(--cs-muted);background:var(--cs-bg);padding:1px 8px;border-radius:8px;white-space:nowrap}',
    '.cs-kpi .desc{font-size:12px;color:var(--cs-muted);margin-bottom:8px}',
    '.cs-kpi .nums{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}',
    '.cs-kpi .nums .t{font-size:12px;color:var(--cs-muted)}',
    '.cs-kpi .nums .a{font-size:20px;font-weight:800;color:var(--cs-muted)}',
    '.cs-kpi input{width:110px;padding:6px 8px;border:1px solid var(--cs-line);border-radius:8px;font-family:inherit;font-size:14px}',
    '.cs-badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:10px}',
    '.cs-badge.ok{background:#18A05822;color:#18A058}',
    '.cs-badge.warn{background:#E5484D22;color:#E5484D}',
    '.cs-badge.none{background:#9AA0B522;color:#9AA0B5}',
    '.cs-methods{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}',
    '.cs-sub{display:block;text-decoration:none;color:inherit;padding:12px;border:1px solid var(--cs-line);border-radius:9px;margin-bottom:12px;transition:.15s}',
    '.cs-sub:hover{border-color:var(--cs);background:var(--cs-bg)}',
    '.cs-sub-head2{font-size:14px;font-weight:700;margin-bottom:6px}',
    '.cs-sub-item{padding:6px 8px;border-top:1px dashed var(--cs-line);margin-top:6px}',
    '.cs-sub-item:first-of-type{border-top:none;margin-top:0}',
    '.cs-sub .sn{font-size:13px;font-weight:700}',
    '.cs-sub .sd{font-size:12px;color:var(--cs-muted);margin-top:2px}',
    '.cs-sub .so{font-size:11px;color:var(--cs);margin-top:2px}',
    '.cs-sop-link{font-size:12px;font-weight:600;color:var(--cs);text-decoration:none;margin-left:8px}',
    '.cs-sop-link:hover{text-decoration:underline}',
    '.cs-note{background:var(--cs-bg);border:1px dashed var(--cs-line);border-radius:10px;padding:18px;text-align:center;color:var(--cs-muted);font-size:13px;margin-top:14px}',
    '.cs-warnbar{background:var(--cs-warnbg);border:1px solid #FFD591;border-radius:10px;padding:10px 14px;font-size:13px;color:#B4541B;margin:12px 0;display:none}',
    '.cs-foot{padding:14px 0;color:var(--cs-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}',
    '.cs-foot a{color:var(--cs);font-weight:600;text-decoration:none}',
    '.cs-btn{border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--cs);color:#fff}',
    '.cs-btn.ghost{background:#fff;color:var(--cs);border:1px solid var(--cs-line)}',
    '@media(max-width:960px){.cs-grid{grid-template-columns:repeat(2,1fr)}}',
    '@media(max-width:760px){.cs-grid{grid-template-columns:1fr}.cs-timeline{flex-direction:column}.cs-step{margin-right:0;margin-bottom:16px}.cs-step:before{content:"↓";right:auto;left:50%;top:auto;bottom:-15px;transform:translateX(-50%)}.cs-step:last-child:before{content:""}.cs-stats{width:100%;margin-left:0}.cs-kpi input{width:96px}.cs-head h1{font-size:16px}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('compSystemCss')) return;
    var s = document.createElement('style');
    s.id = 'compSystemCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  /* ---------- localStorage 数据契约 ---------- */
  var LS_KEY = 'comp_system_config_v1';
  var SEG_COLORS = ['#5B5BD6', '#7C7CE0', '#A5A5EC'];

  function loadConfig() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveConfig(cfg) {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) {}
  }
  // 合并示例默认与本地已编辑值：仅覆盖用户编辑过的字段
  function getConfig() {
    var cfg = loadConfig() || {};
    cfg.kpis = cfg.kpis || {};
    cfg.structure = cfg.structure || {};
    return cfg;
  }

  // 取某项已生效值：编辑值优先，否则回退示例
  function kpiActual(it, cfg) {
    var v = cfg.kpis[it.id];
    if (v === null || v === undefined || v === '') return 0;
    var n = Number(v);
    return isNaN(n) || n < 0 ? 0 : n;
  }
  function structRatio(it, cfg) {
    var v = cfg.structure[it.id];
    if (v === null || v === undefined || v === '') return it.ratio;
    var n = Number(v);
    return isNaN(n) || n < 0 ? it.ratio : n;
  }

  function findIn(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  // 统计子项总数（方法/举措/保障项）
  function sumSubs(arr, key) {
    var n = 0;
    arr.forEach(function (c) { n += (c[key] || []).length; });
    return n;
  }

  /* ---------- KPI 三态判定 ---------- */
  // actual 为 0/null/'' 视为「未填」（灰）；否则按 direction 比 target
  function evalKpi(k, actual) {
    if (actual === 0 || actual === null || actual === undefined || actual === '') {
      return { cls: 'none', label: '未填' };
    }
    var reached = k.direction === '>='
      ? (Number(actual) >= Number(k.target))
      : (Number(actual) <= Number(k.target));
    return reached ? { cls: 'ok', label: '达标' } : { cls: 'warn', label: '未达标' };
  }
  // 总体达标率：已填 KPI 中达标占比
  function kpiRate(cfg) {
    var ks = CS.kpis, filled = 0, ok = 0;
    ks.forEach(function (it) {
      var a = kpiActual(it, cfg);
      if (a !== 0) {
        filled++;
        if (evalKpi(it, a).cls === 'ok') ok++;
      }
    });
    return { filled: filled, ok: ok, rate: filled ? Math.round(ok / filled * 100) : null };
  }

  /* ---------- 通用头部 ---------- */
  function head(title, sub) {
    return '<div class="cs-head"><div><h1>' + esc(title) + '</h1>' +
      '<div class="sub">' + esc(sub) + '</div></div></div>';
  }

  /* ---------- 渲染入口 ---------- */
  var CS = null;

  function render(parts) {
    injectCss();
    CS = global.COMP_SYSTEM;
    if (!CS) {
      U.el('view').innerHTML = '<div style="padding:48px;text-align:center;color:#e5484d">⚠️ 薪酬体系数据未加载</div>';
      return;
    }
    if (global.App && global.App.setBreadcrumb) {
      global.App.setBreadcrumb(['人力资源', '薪酬体系搭建']);
    }
    var sub = (parts && parts[1]) || 'overview';
    var map = {
      overview: renderOverview,
      process: renderProcess,
      structure: renderStructure,
      kpi: renderKpi,
      methods: renderMethods
    };
    (map[sub] || renderOverview)(parts);
  }

  /* ============================ 1) 总览页 ============================ */
  function renderOverview(parts) {
    var cfg = getConfig();
    var rate = kpiRate(cfg);
    var rateDisplay = rate.rate === null ? '待录入' : rate.rate + '%';
    var rateWarn = (rate.rate !== null && rate.rate < 80);

    var procCount = CS.process.length;
    var ratios = CS.structure.map(function (s) { return structRatio(s, cfg); });
    var gradingCount = CS.grading.length;
    var gradingMethods = sumSubs(CS.grading, 'methods');
    var brandCount = CS.brand.length;
    var assuranceCount = CS.assurance.length;
    var assuranceItems = sumSubs(CS.assurance, 'items');

    // 6 大模块入口卡
    var cards = [
      { href: '#/comp-system/process',  icon: '🔗', name: '薪酬搭建流程',   kv: procCount + ' 步全链路' },
      { href: '#/comp-system/structure',icon: '📊', name: '薪酬结构矩阵',   kv: ratios.join('% / ') + '%' },
      { href: '#/comp-system/methods',  icon: '⚖️', name: '薪酬定级评估',   kv: gradingCount + '类 / ' + gradingMethods + '法' },
      { href: '#/comp-system/methods',  icon: '💡', name: '薪酬激励品牌',   kv: brandCount + ' 类举措' },
      { href: '#/comp-system/kpi',      icon: '📈', name: '薪酬核心 KPI',   kv: '总达标率 ' + rateDisplay },
      { href: '#/comp-system/methods',  icon: '🛡️', name: '薪酬体系保障',   kv: assuranceCount + '类 / ' + assuranceItems + '项' }
    ];
    var cardsHtml = cards.map(function (c) {
      return '<a class="cs-card cs-link" href="' + c.href + '" title="' + esc(c.name) + '">' +
        '<div class="cs-mod"><span class="cs-ic">' + esc(c.icon) + '</span>' +
        '<div><div class="nm">' + esc(c.name) + '</div><div class="kv">' + esc(c.kv) + '</div></div></div></a>';
    }).join('');

    var html = '<div class="cs">' +
      '<div class="cs-head"><div><h1>💰 薪酬体系搭建地图</h1>' +
      '<div class="sub">数据同步：' + esc(CS.meta.syncedAt) + ' · 来源：' + esc(CS.meta.source) + ' · ' + esc(CS.meta.version) + '</div></div>' +
      '<div class="cs-stats">' +
      '<div class="cs-stat"><b>' + procCount + '</b><span>搭建流程步数</span></div>' +
      '<div class="cs-stat"><b>' + CS.structure.length + '</b><span>薪酬结构类</span></div>' +
      '<div class="cs-stat"><b>' + esc(rateDisplay) + '</b><span>KPI 总达标率</span></div>' +
      '</div></div>' +
      '<div class="cs-main">' +
      '<div class="cs-sec">六大模块 · 点击进入</div>' +
      '<div class="cs-grid">' + cardsHtml + '</div>' +
      '<a class="cs-rate-wrap" href="#/comp-system/kpi" title="查看 KPI 仪表盘">' +
      '<div class="cs-rate-label">KPI 总体达标率：' + esc(rateDisplay) + (rate.rate === null ? '（0/8 已填）' : '（已填 ' + rate.filled + '/8，达标 ' + rate.ok + '）') + '</div>' +
      '<div class="cs-rate-bar"><div class="cs-rate-fill ' + (rateWarn ? 'warn' : '') + '" style="width:' + (rate.rate === null ? 0 : rate.rate) + '%"></div></div>' +
      '</a>' +
      '<div class="cs-foot"><span>数据来源：' + esc(CS.meta.source) + '（示例可配置，飞书 ETL 接入为后续工作）</span>' +
      '<a href="#/comp-system/kpi">进入 KPI 仪表盘 ›</a></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;
  }

  /* ============================ 2) 流程页（CSS 横向时间轴） ============================ */
  function renderProcess(parts) {
    var stepsHtml = CS.process.map(function (it, idx) {
      return '<div class="cs-step">' +
        '<div class="st-ic">' + esc(it.icon) + '</div>' +
        '<div class="st-nm">' + (idx + 1) + '. ' + esc(it.name) + '</div>' +
        '<div class="st-desc">' + esc(it.desc) + '</div>' +
        '<div class="st-owner">负责人：' + esc(it.owner) + '</div>' +
        '</div>';
    }).join('');

    var html = '<div class="cs">' +
      head('薪酬体系搭建 · 流程', '6 步全链路 · 从战略拆解到薪酬发放') +
      '<div class="cs-main">' +
      '<div class="cs-sec">薪酬搭建全流程</div>' +
      '<div class="cs-timeline">' + stepsHtml + '</div>' +
      '<div class="cs-foot"><a href="#/comp-system">‹ 返回总览</a><span>每一步负责人已标注，编辑位预留（本期仅展示）</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;
  }

  /* ============================ 3) 结构页（条形 + 100% 校验） ============================ */
  function renderStructure(parts) {
    var cfg = getConfig();
    var total = 0;
    CS.structure.forEach(function (it) { total += structRatio(it, cfg); });

    var segsHtml = CS.structure.map(function (it, i) {
      var r = structRatio(it, cfg);
      return '<div class="cs-seg" id="csSeg_' + esc(it.id) + '" style="width:' + r + '%;background:' + SEG_COLORS[i % SEG_COLORS.length] + '" title="' + esc(it.name) + ' ' + r + '%">' +
        (r > 8 ? esc(it.name) + ' ' + r + '%' : '') + '</div>';
    }).join('');

    var cardsHtml = CS.structure.map(function (it) {
      var r = structRatio(it, cfg);
      var toolsStr = (it.tools || []).join('、');
      return '<div class="cs-card">' +
        '<div class="cs-mod"><span class="cs-ic">' + esc(it.icon) + '</span>' +
        '<div><div class="nm">' + esc(it.name) + '</div><div class="kv">' + esc(it.desc) + '</div></div></div>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-top:10px">' +
        '<input type="number" min="0" max="100" id="csStruct_' + esc(it.id) + '" value="' + r + '" data-id="' + esc(it.id) + '" title="编辑' + esc(it.name) +'占比" placeholder="占比" />' +
        '<span style="font-size:12px;color:var(--cs-muted)">%</span></div>' +
        '<div class="cs-bar-track"><div class="cs-bar-fill" id="csStructFill_' + esc(it.id) + '" style="width:' + Math.min(100, r) + '%"></div></div>' +
        '<div style="margin-top:8px;font-size:12px;color:var(--cs-muted)">工具：' + esc(toolsStr) + '</div>' +
        '</div>';
    }).join('');

    var html = '<div class="cs">' +
      head('薪酬体系搭建 · 结构', '3 类占比矩阵 · 合计须为 100%') +
      '<div class="cs-main">' +
      '<div class="cs-sec">整体结构构成</div>' +
      '<div class="cs-stack">' + segsHtml + '</div>' +
      '<div class="cs-warnbar" id="csStructWarn" style="display:' + (total === 100 ? 'none' : 'block') + '">当前合计 ' + total + '%，请调整至 100%</div>' +
      '<div class="cs-sec">分类占比编辑</div>' +
      '<div class="cs-grid">' + cardsHtml + '</div>' +
      '<div class="cs-foot"><a href="#/comp-system">‹ 返回总览</a><span>修改占比即时保存至本地</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;

    CS.structure.forEach(function (it) {
      var inp = U.el('csStruct_' + it.id);
      if (inp) {
        inp.addEventListener('input', function () { onStructInput(it.id, inp.value, cfg); });
        inp.addEventListener('change', function () { onStructInput(it.id, inp.value, cfg); });
      }
    });
  }

  function onStructInput(id, val, cfg) {
    var n = Number(val);
    if (val === '' || isNaN(n) || n < 0) n = 0;
    cfg.structure[id] = n;
    saveConfig(cfg);
    var fill = U.el('csStructFill_' + id);
    if (fill) fill.style.width = Math.min(100, n) + '%';
    // 重新计算合计并更新校验条与堆叠条
    var total = 0;
    CS.structure.forEach(function (it) { total += structRatio(it, cfg); });
    var warn = U.el('csStructWarn');
    if (warn) {
      if (total !== 100) { warn.style.display = 'block'; warn.textContent = '当前合计 ' + total + '%，请调整至 100%'; }
      else { warn.style.display = 'none'; }
    }
    CS.structure.forEach(function (it) {
      var seg = U.el('csSeg_' + it.id);
      if (seg) {
        var r = structRatio(it, cfg);
        seg.style.width = r + '%';
        seg.textContent = (r > 8 ? it.name + ' ' + r + '%' : '');
      }
    });
  }

  /* ============================ 4) KPI 仪表盘 ============================ */
  function renderKpi(parts) {
    var cfg = getConfig();
    var rate = kpiRate(cfg);
    var rateWarn = (rate.rate !== null && rate.rate < 80);

    var cardsHtml = CS.kpis.map(function (it) {
      var actual = kpiActual(it, cfg);
      var st = evalKpi(it, actual);
      var dirSym = it.direction === '>=' ? '≥' : '≤';
      return '<div class="cs-kpi">' +
        '<div class="top"><span class="ic">' + esc(it.icon) + '</span><span class="nm">' + esc(it.name) + '</span>' +
        '<span class="dir">目标 ' + esc(it.target) + ' ' + esc(it.unit) + ' · ' + dirSym + '</span></div>' +
        '<div class="desc">' + esc(it.desc) + '</div>' +
        '<div class="nums"><span class="t">目标</span><span class="a">' + esc(it.target) + ' ' + esc(it.unit) + '</span></div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="number" min="0" id="csKpi_' + esc(it.id) + '" value="' + actual + '" data-id="' + esc(it.id) + '" title="录入' + esc(it.name) + '实际值" placeholder="实际值" />' +
        '<span style="font-size:12px;color:var(--cs-muted)">' + esc(it.unit) + '</span>' +
        '<span class="cs-badge ' + st.cls + '" id="csKpiBadge_' + esc(it.id) + '">' + st.label + '</span>' +
        '</div></div>';
    }).join('');

    var html = '<div class="cs">' +
      head('薪酬体系搭建 · KPI', '8 项指标 · 达标率实时统计') +
      '<div class="cs-main">' +
      '<div class="cs-rate-wrap" style="cursor:default">' +
      '<div class="cs-rate-label" id="csKpiRateLabel">总体达标率：' + (rate.rate === null ? '待录入（0/8 已填）' : (rate.rate + '%（已填 ' + rate.filled + '/8，达标 ' + rate.ok + '）')) + '</div>' +
      '<div class="cs-rate-bar"><div class="cs-rate-fill ' + (rateWarn ? 'warn' : '') + '" id="csKpiFill" style="width:' + (rate.rate === null ? 0 : rate.rate) + '%"></div></div>' +
      '</div>' +
      '<div class="cs-grid">' + cardsHtml + '</div>' +
      '<div class="cs-foot"><button class="cs-btn" id="csReset" title="清空本地配置恢复示例">重置示例</button>' +
      '<a href="#/comp-system">‹ 返回总览</a><span>实际值即时保存至本地</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;

    CS.kpis.forEach(function (it) {
      var inp = U.el('csKpi_' + it.id);
      if (inp) {
        inp.addEventListener('input', function () { onKpiInput(it.id, inp.value, cfg); });
        inp.addEventListener('change', function () { onKpiInput(it.id, inp.value, cfg); });
      }
    });

    var resetBtn = U.el('csReset');
    if (resetBtn) resetBtn.addEventListener('click', function () { resetAll(parts); });
  }

  function onKpiInput(id, val, cfg) {
    var n = Number(val);
    if (val === '' || isNaN(n) || n < 0) cfg.kpis[id] = 0;
    else cfg.kpis[id] = n;
    saveConfig(cfg);
    var it = findIn(CS.kpis, id);
    var st = evalKpi(it, cfg.kpis[id]);
    var badge = U.el('csKpiBadge_' + id);
    if (badge) { badge.textContent = st.label; badge.className = 'cs-badge ' + st.cls; }
    updateKpiRate(cfg);
  }

  function updateKpiRate(cfg) {
    var r = kpiRate(cfg);
    var label = r.rate === null ? '待录入（0/8 已填）' : (r.rate + '%（已填 ' + r.filled + '/8，达标 ' + r.ok + '）');
    var fill = U.el('csKpiFill');
    if (fill) {
      fill.style.width = (r.rate === null ? 0 : r.rate) + '%';
      fill.className = 'cs-rate-fill' + (r.rate !== null && r.rate < 80 ? ' warn' : '');
    }
    var lab = U.el('csKpiRateLabel');
    if (lab) lab.textContent = '总体达标率：' + label;
  }

  function resetAll(parts) {
    if (!global.confirm('确认清空本地配置，恢复示例数据？')) return;
    try { global.localStorage.removeItem(LS_KEY); } catch (e) {}
    U.toast('已重置为示例数据', 'success');
    render(parts); // 重新渲染当前子页，恢复示例
  }

  /* ============================ 5) 定级/激励品牌/保障 索引页 ============================ */
  function renderMethods(parts) {
    // 3 区块：每区子卡整卡跳对应 SOP 文章（asset_id 取自 3 篇 SOP）
    var groups = [
      { icon: '⚖️', name: '薪酬定级评估',     asset: 'SOP-COMP-GRADING',    key: 'grading',   subKey: 'methods' },
      { icon: '💡', name: '薪酬激励与品牌',   asset: 'SOP-COMP-BRAND',     key: 'brand',     subKey: 'actions' },
      { icon: '🛡️', name: '薪酬体系保障',     asset: 'SOP-COMP-ASSURANCE', key: 'assurance', subKey: 'items' }
    ];

    var sectionsHtml = groups.map(function (g) {
      var cats = CS[g.key] || [];
      var subsHtml = cats.map(function (cat) {
        var subs = cat[g.subKey] || [];
        var itemsHtml = subs.map(function (s) {
          var owner = s.owner ? '<div class="so">负责人：' + esc(s.owner) + '</div>' : '';
          return '<div class="cs-sub-item"><div class="sn">' + esc(s.name) + '</div>' +
            '<div class="sd">' + esc(s.desc) + '</div>' + owner + '</div>';
        }).join('');
        return '<a class="cs-sub" href="#/wiki/article/' + esc(g.asset) + '" title="查看' + esc(g.name) + 'SOP：' + esc(cat.name) + '">' +
          '<div class="cs-sub-head2">' + esc(cat.icon || '') + ' ' + esc(cat.name) + '</div>' + itemsHtml + '</a>';
      }).join('');

      return '<div class="cs-sec">' + esc(g.icon) + ' ' + esc(g.name) +
        ' <span class="cnt">' + cats.length + ' 类</span>' +
        ' <a class="cs-sop-link" href="#/wiki/article/' + esc(g.asset) + '" title="查看' + esc(g.name) + '制度 SOP">查看 SOP ›</a></div>' +
        '<div class="cs-methods">' + subsHtml + '</div>';
    }).join('');

    var html = '<div class="cs">' +
      head('薪酬体系搭建 · 方法库', '定级 / 激励品牌 / 保障 · 关联知识库 SOP') +
      '<div class="cs-main">' +
      sectionsHtml +
      '<div class="cs-foot"><a href="#/comp-system">‹ 返回总览</a><span>子卡点击跳转制度知识库</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;
  }

  /* ---------- 导出 ---------- */
  global.CompSystem = { render: render };
})(window);

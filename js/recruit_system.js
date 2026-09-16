/* =========================================================================
 * recruit_system.js — 人力资源板块 · HR 招聘体系搭建地图
 *   数据来源：recruit_system_data.js (window.RECRUIT_SYSTEM)
 *   依赖：    utils.js（U.* 工具）/ vendor/echarts.min.js（漏斗图）
 *   路由：    #/recruit-system（总览） + /funnel /channels /kpi /methods
 *   说明：    纯前端，漏斗人数·KPI 实际值·渠道占比可本地编辑，落 localStorage；
 *            首次无值用示例数据；不引入任何外部依赖。
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  /* ---------- 作用域 CSS（仅注入一次，对齐 recruit.js 写法） ---------- */
  var CSS = '\
  .rs{--rs:#5B5BD6;--rs2:#7C7CE0;--rs-bg:#F5F6FB;--rs-card:#fff;--rs-line:#E6E8F2;--rs-ink:#1F2733;--rs-muted:#7A8699;--rs-ok:#18A058;--rs-warn:#E5484D;--rs-none:#9AA0B5;--rs-warnbg:#FFF6E9;font-size:14px;color:var(--rs-ink)}\
  .rs *{box-sizing:border-box}\
  .rs-head{background:linear-gradient(135deg,#5B5BD6,#7C7CE0);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}\
  .rs-head h1{font-size:18px;margin:0;font-weight:700}\
  .rs-head .sub{font-size:12px;opacity:.9;margin-top:3px}\
  .rs-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}\
  .rs-stat{background:rgba(255,255,255,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:82px}\
  .rs-stat b{display:block;font-size:20px;line-height:1.1}\
  .rs-stat span{font-size:11px;opacity:.9}\
  .rs-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}\
  .rs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:14px 0}\
  .rs-card{background:var(--rs-card);border:1px solid var(--rs-line);border-radius:12px;padding:14px 16px;transition:.15s;box-shadow:0 1px 2px rgba(20,40,80,.05)}\
  .rs-card:hover{box-shadow:0 5px 16px rgba(20,40,80,.13);transform:translateY(-1px)}\
  .rs-card a.rs-link{text-decoration:none;color:inherit;display:block}\
  .rs-mod{display:flex;align-items:center;gap:12px}\
  .rs-ic{width:42px;height:42px;border-radius:10px;background:var(--rs-bg);display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}\
  .rs-mod .nm{font-size:16px;font-weight:700}\
  .rs-mod .kv{font-size:12px;color:var(--rs-muted);margin-top:2px}\
  .rs-rate-wrap{display:block;text-decoration:none;color:inherit;background:var(--rs-bg);border:1px solid var(--rs-line);border-radius:12px;padding:14px 18px;margin-top:6px;cursor:pointer;transition:.15s}\
  .rs-rate-wrap:hover{border-color:var(--rs)}\
  .rs-rate-label{font-size:14px;font-weight:700;color:var(--rs)}\
  .rs-rate-bar{height:10px;border-radius:6px;background:#E6E8F2;overflow:hidden;margin-top:10px}\
  .rs-rate-fill{height:100%;background:linear-gradient(90deg,#5B5BD6,#7C7CE0);transition:.3s}\
  .rs-rate-fill.warn{background:linear-gradient(90deg,#FAAD14,#FFC53D)}\
  .rs-sec{font-size:15px;font-weight:700;color:var(--rs);margin:18px 0 10px}\
  .rs-sec .cnt{font-size:12px;font-weight:600;color:var(--rs-muted);background:var(--rs-bg);padding:1px 9px;border-radius:10px;margin-left:6px}\
  .rs-funnel-wrap{display:grid;grid-template-columns:420px 1fr;gap:16px;align-items:start}\
  .rs-form{background:var(--rs-card);border:1px solid var(--rs-line);border-radius:12px;padding:8px 14px}\
  .rs-row{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px dashed var(--rs-line)}\
  .rs-row:last-child{border-bottom:none}\
  .rs-row .rn{font-size:14px;font-weight:600;flex:1}\
  .rs-row input{width:92px;padding:6px 8px;border:1px solid var(--rs-line);border-radius:8px;font-family:inherit;font-size:13px;text-align:right}\
  .rs-row .rcv{width:60px;text-align:right;font-size:13px;font-weight:700;color:var(--rs)}\
  .rs-row .rcv.good{color:var(--rs-ok)}\
  .rs-row .rcv.low{color:var(--rs-warn)}\
  .rs-chart{width:100%;height:340px}\
  .rs-note{background:var(--rs-bg);border:1px dashed var(--rs-line);border-radius:10px;padding:18px;text-align:center;color:var(--rs-muted);font-size:13px;margin-top:14px}\
  .rs-bar-track{height:8px;border-radius:5px;background:#E6E8F2;overflow:hidden;margin-top:8px}\
  .rs-bar-fill{height:100%;background:linear-gradient(90deg,#5B5BD6,#7C7CE0);transition:.3s}\
  .rs-warnbar{background:var(--rs-warnbg);border:1px solid #FFD591;border-radius:10px;padding:10px 14px;font-size:13px;color:#B4541B;margin:12px 0;display:none}\
  .rs-kpi{background:var(--rs-card);border:1px solid var(--rs-line);border-radius:12px;padding:14px 16px}\
  .rs-kpi .top{display:flex;align-items:center;gap:8px;margin-bottom:6px}\
  .rs-kpi .top .ic{font-size:20px}\
  .rs-kpi .nm{font-size:15px;font-weight:700}\
  .rs-kpi .dir{margin-left:auto;font-size:11px;color:var(--rs-muted);background:var(--rs-bg);padding:1px 8px;border-radius:8px;white-space:nowrap}\
  .rs-kpi .desc{font-size:12px;color:var(--rs-muted);margin-bottom:8px}\
  .rs-kpi .nums{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}\
  .rs-kpi .nums .t{font-size:12px;color:var(--rs-muted)}\
  .rs-kpi .nums .a{font-size:20px;font-weight:800;color:var(--rs-muted)}\
  .rs-kpi input{width:110px;padding:6px 8px;border:1px solid var(--rs-line);border-radius:8px;font-family:inherit;font-size:14px}\
  .rs-badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:10px}\
  .rs-badge.ok{background:#18A05822;color:#18A058}\
  .rs-badge.warn{background:#E5484D22;color:#E5484D}\
  .rs-badge.none{background:#9AA0B522;color:#9AA0B5}\
  .rs-methods{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}\
  .rs-mcard{background:var(--rs-card);border:1px solid var(--rs-line);border-radius:12px;padding:14px 16px}\
  .rs-mcard h3{margin:0 0 4px;font-size:16px;color:var(--rs)}\
  .rs-mcard .mh{font-size:12px;color:var(--rs-muted);margin-bottom:10px}\
  .rs-sub{display:block;text-decoration:none;color:inherit;padding:9px 10px;border:1px solid var(--rs-line);border-radius:9px;margin-bottom:8px;transition:.15s}\
  .rs-sub:hover{border-color:var(--rs);background:var(--rs-bg)}\
  .rs-sub .sn{font-size:13px;font-weight:700}\
  .rs-sub .sd{font-size:12px;color:var(--rs-muted);margin-top:2px}\
  .rs-sub .so{font-size:11px;color:var(--rs);margin-top:2px}\
  .rs-foot{padding:14px 0;color:var(--rs-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}\
  .rs-foot a{color:var(--rs);font-weight:600;text-decoration:none}\
  .rs-btn{border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--rs);color:#fff}\
  .rs-btn.ghost{background:#fff;color:var(--rs);border:1px solid var(--rs-line)}\
  @media(max-width:760px){.rs-funnel-wrap{grid-template-columns:1fr}.rs-chart{height:220px}.rs-stats{width:100%;margin-left:0}.rs-row input{width:80px}.rs-kpi input{width:96px}}';

  function injectCss() {
    if (document.getElementById('recruitSystemCss')) return;
    var s = document.createElement('style');
    s.id = 'recruitSystemCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  /* ---------- localStorage 数据契约 ---------- */
  var LS_KEY = 'recruit_system_config_v1';

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
    cfg.funnel = cfg.funnel || {};
    cfg.kpis = cfg.kpis || {};
    cfg.channels = cfg.channels || {};
    return cfg;
  }

  // 取某项已生效值：编辑值优先，否则回退示例
  function funnelCount(it, cfg) {
    var v = cfg.funnel[it.id];
    return (v === null || v === undefined || v === '') ? it.count : Number(v);
  }
  function channelRatio(it, cfg) {
    var v = cfg.channels[it.id];
    return (v === null || v === undefined || v === '') ? it.ratio : Number(v);
  }
  function kpiActual(it, cfg) {
    var v = cfg.kpis[it.id];
    if (v === null || v === undefined || v === '') return 0;
    var n = Number(v);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function findIn(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
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
    var ks = RS.kpis, filled = 0, ok = 0;
    ks.forEach(function (it) {
      var a = kpiActual(it, cfg);
      if (a !== 0) {
        filled++;
        if (evalKpi(it, a).cls === 'ok') ok++;
      }
    });
    return { filled: filled, ok: ok, rate: filled ? Math.round(ok / filled * 100) : null };
  }

  /* ---------- 漏斗转化率 ---------- */
  function convText(it, count) {
    if (it.prevCount == null) return '—';
    var r = (count / it.prevCount) * 100;
    return Math.round(r) + '%';
  }
  function convClass(r) { return r >= 30 ? 'good' : 'low'; }

  /* ---------- 渲染入口 ---------- */
  var RS = null;
  var _funnelChart = null; // 漏斗图表实例引用，供即时重渲染

  function render(parts) {
    injectCss();
    RS = global.RECRUIT_SYSTEM;
    if (!RS) {
      U.el('view').innerHTML = '<div style="padding:48px;text-align:center;color:#e5484d">⚠️ 招聘体系数据未加载</div>';
      return;
    }
    if (global.App && global.App.setBreadcrumb) {
      global.App.setBreadcrumb(['人力资源', '招聘体系搭建']);
    }
    var sub = (parts && parts[1]) || 'overview';
    var map = {
      overview: renderOverview,
      funnel: renderFunnel,
      channels: renderChannels,
      kpi: renderKpi,
      methods: renderMethods
    };
    (map[sub] || renderOverview)(parts);
  }

  /* ============================ 1) 总览页 ============================ */
  function renderOverview(parts) {
    var cfg = getConfig();
    var onboard = funnelCount(findIn(RS.funnel, 'onboard'), cfg);
    var internalRatio = channelRatio(findIn(RS.channels, 'internal'), cfg);
    var rate = kpiRate(cfg);
    var rateDisplay = rate.rate === null ? '待录入' : rate.rate + '%';
    var rateWarn = (rate.rate !== null && rate.rate < 80);

    // 6 大模块入口卡
    var cards = [
      { href: '#/recruit-system/funnel', icon: '🎯', name: '招聘漏斗', kv: '入职到岗 ' + onboard + ' 人' },
      { href: '#/recruit-system/channels', icon: '📡', name: '招聘渠道', kv: '内部推荐 ' + internalRatio + '%' },
      { href: '#/recruit-system/methods', icon: '🔍', name: '甄选评估', kv: '4 类 / 12 方法' },
      { href: '#/recruit-system/methods', icon: '💎', name: '雇主品牌', kv: '4 类举措' },
      { href: '#/recruit-system/kpi', icon: '📊', name: '招聘 KPI', kv: '总达标率 ' + rateDisplay },
      { href: '#/recruit-system/methods', icon: '🛡️', name: '体系保障', kv: '3 类 / 9 项' }
    ];
    var cardsHtml = cards.map(function (c) {
      return '<a class="rs-card rs-link" href="' + c.href + '" title="' + esc(c.name) + '">' +
        '<div class="rs-mod"><span class="rs-ic">' + esc(c.icon) + '</span>' +
        '<div><div class="nm">' + esc(c.name) + '</div><div class="kv">' + esc(c.kv) + '</div></div></div></a>';
    }).join('');

    var html = '<div class="rs">' +
      '<div class="rs-head"><div><h1>🎯 招聘体系搭建地图</h1>' +
      '<div class="sub">数据同步：' + esc(RS.meta.syncedAt) + ' · 来源：' + esc(RS.meta.source) + ' · ' + esc(RS.meta.version) + '</div></div>' +
      '<div class="rs-stats">' +
      '<div class="rs-stat"><b>' + onboard + '</b><span>漏斗入职总人数</span></div>' +
      '<div class="rs-stat"><b>6</b><span>招聘渠道</span></div>' +
      '<div class="rs-stat"><b>' + esc(rateDisplay) + '</b><span>KPI 总达标率</span></div>' +
      '</div></div>' +
      '<div class="rs-main">' +
      '<div class="rs-sec">六大模块 · 点击进入</div>' +
      '<div class="rs-grid">' + cardsHtml + '</div>' +
      '<a class="rs-rate-wrap" href="#/recruit-system/kpi" title="查看 KPI 仪表盘">' +
      '<div class="rs-rate-label">KPI 总体达标率：' + esc(rateDisplay) + (rate.rate === null ? '（0/8 已填）' : '（已填 ' + rate.filled + '/8，达标 ' + rate.ok + '）') + '</div>' +
      '<div class="rs-rate-bar"><div class="rs-rate-fill ' + (rateWarn ? 'warn' : '') + '" style="width:' + (rate.rate === null ? 0 : rate.rate) + '%"></div></div>' +
      '</a>' +
      '<div class="rs-foot"><span>数据来源：' + esc(RS.meta.source) + '（示例可配置，飞书 ETL 接入为后续工作）</span>' +
      '<a href="#/recruit-system/kpi">进入 KPI 仪表盘 ›</a></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;
  }

  /* ============================ 2) 漏斗可编辑页 ============================ */
  function renderFunnel(parts) {
    var cfg = getConfig();
    var onboard = funnelCount(findIn(RS.funnel, 'onboard'), cfg);

    var rowsHtml = RS.funnel.map(function (it) {
      var count = funnelCount(it, cfg);
      var cv = convText(it, count);
      var cvCls = it.prevCount == null ? '' : convClass((count / it.prevCount) * 100);
      return '<div class="rs-row">' +
        '<span class="rs-ic">' + esc(it.icon) + '</span>' +
        '<span class="rn" title="' + esc(it.desc) + '">' + esc(it.name) + '</span>' +
        '<input type="number" min="0" id="rsFn_' + esc(it.id) + '" value="' + count + '" data-id="' + esc(it.id) + '" title="编辑' + esc(it.name) + '人数" placeholder="人数" />' +
        '<span class="rcv ' + cvCls + '" id="rsCv_' + esc(it.id) + '">' + esc(cv) + '</span>' +
        '</div>';
    }).join('');

    var html = '<div class="rs">' +
      '<div class="rs-head"><div><h1>🎯 招聘体系搭建 · 漏斗</h1>' +
      '<div class="sub">6 环节转化 · 编辑人数即时保存</div></div>' +
      '<div class="rs-stats"><div class="rs-stat"><b>' + onboard + '</b><span>入职</span></div></div></div>' +
      '<div class="rs-main">' +
      '<div class="rs-funnel-wrap">' +
      '<div class="rs-form">' + rowsHtml + '</div>' +
      '<div class="rs-card"><h4 style="margin:0 0 8px;color:var(--rs);font-size:14px">招聘漏斗（占比对称）</h4>' +
      '<div id="rsFunnelChart" class="rs-chart"></div></div>' +
      '</div>' +
      '<div class="rs-note">📈 历史趋势分析（本期敬请期待）</div>' +
      '<div class="rs-foot"><a href="#/recruit-system">‹ 返回总览</a><span>修改人数即时保存至本地</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;

    // 绑定输入（input 即时重渲染 + change 提交写 localStorage，均满足需求）
    RS.funnel.forEach(function (it) {
      var inp = U.el('rsFn_' + it.id);
      if (inp) {
        inp.addEventListener('input', function () { onFunnelInput(it.id, inp.value, cfg); });
        inp.addEventListener('change', function () { onFunnelInput(it.id, inp.value, cfg); });
      }
    });

    renderFunnelChart(cfg);
  }

  function buildFunnelData(cfg) {
    return RS.funnel.map(function (it) {
      return { name: it.name, value: funnelCount(it, cfg) };
    });
  }

  function renderFunnelChart(cfg) {
    if (typeof echarts === 'undefined') return;
    var el = U.el('rsFunnelChart');
    if (!el) return;
    var chart = echarts.init(el);
    U.registerChart(chart);
    _funnelChart = chart;
    chart.setOption({
      tooltip: { trigger: 'item', formatter: function (p) { return p.name + '：' + p.value + ' 人'; } },
      series: [{
        type: 'funnel', sort: 'none', gap: 2,
        left: '8%', right: '8%', top: 10, bottom: 10,
        label: { show: true, position: 'inside', formatter: '{b}\n{c}人', color: '#fff', fontSize: 12 },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        color: ['#5B5BD6', '#7C7CE0', '#A5A5EC', '#6E6ED8', '#8B8BE8', '#B3B3F0'],
        data: buildFunnelData(cfg)
      }]
    });
  }

  function onFunnelInput(id, val, cfg) {
    var n = Number(val);
    if (isNaN(n) || n < 0) n = 0;
    cfg.funnel[id] = n;
    saveConfig(cfg);
    var it = findIn(RS.funnel, id);
    if (it && it.prevCount != null) {
      var cv = U.el('rsCv_' + id);
      if (cv) {
        var r = (n / it.prevCount) * 100;
        cv.textContent = Math.round(r) + '%';
        cv.className = 'rcv ' + convClass(r);
      }
    }
    if (_funnelChart) {
      _funnelChart.setOption({ series: [{ data: buildFunnelData(cfg) }] });
    }
  }

  /* ============================ 3) 渠道矩阵页 ============================ */
  function renderChannels(parts) {
    var cfg = getConfig();
    var total = 0;
    RS.channels.forEach(function (it) { total += channelRatio(it, cfg); });

    var cardsHtml = RS.channels.map(function (it) {
      var ratio = channelRatio(it, cfg);
      return '<div class="rs-card">' +
        '<div class="rs-mod"><span class="rs-ic">' + esc(it.icon) + '</span>' +
        '<div><div class="nm">' + esc(it.name) + '</div><div class="kv">' + esc(it.scene) + '</div></div></div>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-top:10px">' +
        '<input type="number" min="0" max="100" id="rsCh_' + esc(it.id) + '" value="' + ratio + '" data-id="' + esc(it.id) + '" title="编辑' + esc(it.name) + '占比" placeholder="占比" />' +
        '<span style="font-size:12px;color:var(--rs-muted)">%</span></div>' +
        '<div class="rs-bar-track"><div class="rs-bar-fill" id="rsChanFill_' + esc(it.id) + '" style="width:' + Math.min(100, ratio) + '%"></div></div>' +
        '<div class="rs-kv" style="margin-top:8px;font-size:12px;color:var(--rs-muted)">工具：' + esc(it.tools.join('、')) + '</div>' +
        '</div>';
    }).join('');

    var html = '<div class="rs">' +
      '<div class="rs-head"><div><h1>🎯 招聘体系搭建 · 渠道</h1>' +
      '<div class="sub">6 渠道占比矩阵 · 合计须为 100%</div></div></div>' +
      '<div class="rs-main">' +
      '<div class="rs-warnbar" id="rsChanWarn" style="display:' + (total === 100 ? 'none' : 'block') + '">当前合计 ' + total + '%，请调整至 100%</div>' +
      '<div class="rs-grid">' + cardsHtml + '</div>' +
      '<div class="rs-foot"><a href="#/recruit-system">‹ 返回总览</a><span>修改占比即时保存至本地</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;

    RS.channels.forEach(function (it) {
      var inp = U.el('rsCh_' + it.id);
      if (inp) {
        inp.addEventListener('input', function () { onChannelInput(it.id, inp.value, cfg); });
        inp.addEventListener('change', function () { onChannelInput(it.id, inp.value, cfg); });
      }
    });
  }

  function onChannelInput(id, val, cfg) {
    var n = Number(val);
    if (val === '' || isNaN(n) || n < 0) n = 0;
    cfg.channels[id] = n;
    saveConfig(cfg);
    var fill = U.el('rsChanFill_' + id);
    if (fill) fill.style.width = Math.min(100, n) + '%';
    var total = 0;
    RS.channels.forEach(function (it) { total += channelRatio(it, cfg); });
    var warn = U.el('rsChanWarn');
    if (warn) {
      if (total !== 100) { warn.style.display = 'block'; warn.textContent = '当前合计 ' + total + '%，请调整至 100%'; }
      else { warn.style.display = 'none'; }
    }
  }

  /* ============================ 4) KPI 仪表盘 ============================ */
  function renderKpi(parts) {
    var cfg = getConfig();
    var rate = kpiRate(cfg);
    var rateWarn = (rate.rate !== null && rate.rate < 80);

    var cardsHtml = RS.kpis.map(function (it) {
      var actual = kpiActual(it, cfg);
      var st = evalKpi(it, actual);
      var dirSym = it.direction === '>=' ? '≥' : '≤';
      return '<div class="rs-kpi">' +
        '<div class="top"><span class="ic">' + esc(it.icon) + '</span><span class="nm">' + esc(it.name) + '</span>' +
        '<span class="dir">目标 ' + esc(it.target) + ' ' + esc(it.unit) + ' · ' + dirSym + '</span></div>' +
        '<div class="desc">' + esc(it.desc) + '</div>' +
        '<div class="nums"><span class="t">目标</span><span class="a">' + esc(it.target) + ' ' + esc(it.unit) + '</span></div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="number" min="0" id="rsKpi_' + esc(it.id) + '" value="' + actual + '" data-id="' + esc(it.id) + '" title="录入' + esc(it.name) + '实际值" placeholder="实际值" />' +
        '<span style="font-size:12px;color:var(--rs-muted)">' + esc(it.unit) + '</span>' +
        '<span class="rs-badge ' + st.cls + '" id="rsKpiBadge_' + esc(it.id) + '">' + st.label + '</span>' +
        '</div></div>';
    }).join('');

    var html = '<div class="rs">' +
      '<div class="rs-head"><div><h1>🎯 招聘体系搭建 · KPI</h1>' +
      '<div class="sub">8 项指标 · 达标率实时统计</div></div></div>' +
      '<div class="rs-main">' +
      '<div class="rs-rate-wrap" style="cursor:default">' +
      '<div class="rs-rate-label" id="rsKpiRateLabel">总体达标率：' + (rate.rate === null ? '待录入（0/8 已填）' : (rate.rate + '%（已填 ' + rate.filled + '/8，达标 ' + rate.ok + '）')) + '</div>' +
      '<div class="rs-rate-bar"><div class="rs-rate-fill ' + (rateWarn ? 'warn' : '') + '" id="rsKpiFill" style="width:' + (rate.rate === null ? 0 : rate.rate) + '%"></div></div>' +
      '</div>' +
      '<div class="rs-grid">' + cardsHtml + '</div>' +
      '<div class="rs-foot"><button class="rs-btn" id="rsReset" title="清空本地配置恢复示例">重置示例</button>' +
      '<a href="#/recruit-system">‹ 返回总览</a><span>实际值即时保存至本地</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;

    RS.kpis.forEach(function (it) {
      var inp = U.el('rsKpi_' + it.id);
      if (inp) {
        inp.addEventListener('input', function () { onKpiInput(it.id, inp.value, cfg); });
        inp.addEventListener('change', function () { onKpiInput(it.id, inp.value, cfg); });
      }
    });

    var resetBtn = U.el('rsReset');
    if (resetBtn) resetBtn.addEventListener('click', function () { resetAll(parts); });
  }

  function onKpiInput(id, val, cfg) {
    var n = Number(val);
    if (val === '' || isNaN(n) || n < 0) cfg.kpis[id] = 0;
    else cfg.kpis[id] = n;
    saveConfig(cfg);
    var it = findIn(RS.kpis, id);
    var st = evalKpi(it, cfg.kpis[id]);
    var badge = U.el('rsKpiBadge_' + id);
    if (badge) { badge.textContent = st.label; badge.className = 'rs-badge ' + st.cls; }
    updateKpiRate(cfg);
  }

  function updateKpiRate(cfg) {
    var r = kpiRate(cfg);
    var label = r.rate === null ? '待录入（0/8 已填）' : (r.rate + '%（已填 ' + r.filled + '/8，达标 ' + r.ok + '）');
    var fill = U.el('rsKpiFill');
    if (fill) {
      fill.style.width = (r.rate === null ? 0 : r.rate) + '%';
      fill.className = 'rs-rate-fill' + (r.rate !== null && r.rate < 80 ? ' warn' : '');
    }
    var lab = U.el('rsKpiRateLabel');
    if (lab) lab.textContent = '总体达标率：' + label;
  }

  function resetAll(parts) {
    if (!global.confirm('确认清空本地配置，恢复示例数据？')) return;
    try { global.localStorage.removeItem(LS_KEY); } catch (e) {}
    U.toast('已重置为示例数据', 'success');
    render(parts); // 重新渲染当前子页，恢复示例
  }

  /* ============================ 5) 甄选/雇主品牌/保障 索引页 ============================ */
  function renderMethods(parts) {
    // 3 类卡：每卡下挂子项，点击跳对应 SOP 文章
    var groups = [
      {
        icon: '🔍', name: '甄选评估', asset: 'SOP-RECRUIT-SELECTION',
        items: RS.selection.map(function (s) { return { name: s.name, desc: s.methods.length + ' 项方法' }; })
      },
      {
        icon: '💎', name: '雇主品牌', asset: 'SOP-RECRUIT-EVP',
        items: RS.employerBrand.map(function (s) { return { name: s.name, desc: s.actions.length + ' 项举措' }; })
      },
      {
        icon: '🛡️', name: '体系保障', asset: 'SOP-RECRUIT-ASSURANCE',
        items: RS.assurance.map(function (s) { return { name: s.name, desc: s.items.length + ' 项保障' }; })
      }
    ];

    var cardsHtml = groups.map(function (g) {
      var subsHtml = g.items.map(function (it) {
        return '<a class="rs-sub" href="#/wiki/article/' + esc(g.asset) + '" title="查看' + esc(g.name) + 'SOP">' +
          '<div class="sn">' + esc(it.name) + '</div><div class="sd">' + esc(it.desc) + '</div></a>';
      }).join('');
      return '<div class="rs-mcard"><div class="rs-mod"><span class="rs-ic">' + esc(g.icon) + '</span>' +
        '<div><div class="nm">' + esc(g.name) + '</div><div class="mh">点击子项查看 SOP</div></div></div>' +
        subsHtml + '</div>';
    }).join('');

    var html = '<div class="rs">' +
      '<div class="rs-head"><div><h1>🎯 招聘体系搭建 · 方法库</h1>' +
      '<div class="sub">甄选 / 雇主品牌 / 保障 · 关联知识库 SOP</div></div></div>' +
      '<div class="rs-main">' +
      '<div class="rs-methods">' + cardsHtml + '</div>' +
      '<div class="rs-foot"><a href="#/recruit-system">‹ 返回总览</a><span>子项点击跳转制度知识库</span></div>' +
      '</div></div>';
    U.el('view').innerHTML = html;
  }

  /* ---------- 导出 ---------- */
  global.RecruitSystem = { render: render };
})(window);

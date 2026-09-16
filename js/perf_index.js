/* =========================================================================
 * perf_index.js — 绩效管理板块 · 总览导航页（#/perf，无 sub）
 *   作用域前缀：.pi（避免与 perf.js 的 .pf / perf_annual.js 的 .pa / perf_policy.js 的 .pp 冲突）
 *   范式：复用 perf.js 的 injectCss + 作用域 CSS + U.escapeHtml 安全渲染
 *   红线：本页纯导航、无图表，绝不调用 echarts / U.registerChart。
 *        所有动态文本一律过 U.escapeHtml 防注入。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = [
    // 作用域根：金/银绩效主题变量（与 .pf/.pa/.pp 同源）
    '.pi{--pi:#C9971B;--pi2:#E0B84A;--pi-gold:#E8B400;--pi-bg:#FBF7EC;--pi-card:#fff;--pi-line:#EFE6CF;--pi-ink:#26201A;--pi-muted:#998B73;font-size:14px;color:var(--pi-ink)}',
    '.pi *{box-sizing:border-box}',

    // ① 头部区：金色渐变胶囊
    '.pi-head{background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;padding:18px 24px;border-radius:12px;display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-bottom:18px}',
    '.pi-head h1{font-size:18px;margin:0;font-weight:700}',
    '.pi-head .sub{font-size:13px;opacity:.94;margin-top:4px}',
    '.pi-head .pi-count{margin-left:auto;font-size:12px;background:rgba(255,255,255,.18);padding:6px 12px;border-radius:10px}',

    // 头部「🤖 AI 初评」入口（金色描边胶囊按钮，复用阶段三 M2 数字员工）
    '.pi-ai-btn{margin-left:12px;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.7);border-radius:20px;padding:7px 16px;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
    '.pi-ai-btn:hover{background:rgba(255,255,255,.3);transform:translateY(-1px)}',
    '.pi-ai-btn:active{transform:translateY(0)}',
    '.pi-ai-stat{margin:14px 0 4px;padding:10px 14px;border-radius:10px;background:var(--pi-bg);border:1px solid var(--pi-line);font-size:12.5px;color:var(--pi-muted);display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.pi-ai-stat b{color:var(--pi);font-size:14px}',
    '.pi-ai-stat .hl{color:#5be0a0;font-weight:700}',

    // 容器（与 .pf-main/.pa-main 一致）
    '.pi-main{max-width:1280px;margin:0 auto;padding:10px 22px 24px}',

    // ② 模块导航卡网格：桌面三列 / ≤960px 两列 / ≤640px 一列
    '.pi-grid{display:grid;gap:16px;grid-template-columns:repeat(3,1fr)}',
    '@media(max-width:960px){.pi-grid{grid-template-columns:repeat(2,1fr)}}',
    '@media(max-width:640px){.pi-grid{grid-template-columns:1fr}}',

    // 卡片：整卡可点 <a>，白底圆角金边，hover 抬升 + 金色光晕
    '.pi-card{display:block;background:var(--pi-card);border:1px solid var(--pi-line);border-radius:12px;padding:18px 20px;text-decoration:none;color:inherit;transition:.15s;box-shadow:0 1px 2px rgba(80,60,20,.05)}',
    '.pi-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(232,180,0,.28);border-color:var(--pi-gold)}',
    '.pi-ico{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px;transition:.15s}',
    '.pi-card:hover .pi-ico{transform:scale(1.06)}',
    '.pi-name{font-size:16px;font-weight:700}',
    '.pi-desc{font-size:12.5px;color:var(--pi-muted);margin-top:6px;line-height:1.6;min-height:38px}',

    // 指标徽标（浅金底胶囊）
    '.pi-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 14px}',
    '.pi-metric{background:var(--pi-bg);border-radius:10px;padding:6px 12px;text-align:center}',
    '.pi-metric b{display:block;font-size:18px;color:var(--pi);line-height:1.1}',
    '.pi-metric span{font-size:11px;color:var(--pi-muted)}',

    // 「进入 →」：金色文字，hover 箭头右移
    '.pi-go{font-size:13px;color:var(--pi-gold);font-weight:700;display:inline-flex;align-items:center;gap:4px}',
    '.pi-go .arr{transition:.15s}',
    '.pi-card:hover .pi-go .arr{transform:translateX(3px)}',

    // ③ 板块说明条：浅金底 + 金色左边框
    '.pi-info{border-left:4px solid var(--pi-gold);background:var(--pi-bg);border:1px solid var(--pi-line);border-radius:10px;padding:12px 16px;margin-top:18px;font-size:12.5px;line-height:1.7;color:var(--pi-ink)}',
    '.pi-info .warn{color:#7A5B00;font-weight:600}'
  ].join('\n');

  function injectCss() {
    // 防重复注入
    if (document.getElementById('perfIndexCss')) return;
    var s = document.createElement('style');
    s.id = 'perfIndexCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  function render() {
    injectCss();
    var view = U.el('view');
    // 面包屑：绩效管理 / 板块总览
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['绩效管理', '板块总览']);

    // ---- 聚合（见 design/perf_index_design.md §6）----
    // ① 月度（window.JUNE_PERF）：目标数 = 数组长度；参与人数按 person 原始串去重（忽略空串）
    var june = global.JUNE_PERF || [];
    var juneLoaded = Array.isArray(global.JUNE_PERF);
    var juneTargets = june.length;
    var jpMap = {};
    june.forEach(function (o) { if (o && o.person) jpMap[o.person] = 1; });
    var junePeople = Object.keys(jpMap).length;

    // ② 年度（window.ANNUAL_PERF）：参评 = 数组长度；银占比 = 银人数/总人数*100（一位小数）
    var perf = global.ANNUAL_PERF || [];
    var perfLoaded = !!global.ANNUAL_PERF;
    var annualTotal = perf.length;
    var silver = perf.filter(function (o) { return o && o.perf_level === '银'; }).length;
    var silverPct = annualTotal ? (silver / annualTotal * 100).toFixed(1) : '0.0';

    // ②.5 7月（window.JULY_PERF）：目标数 = 数组长度；参与人数按清洗后 person 去重
    var july = global.JULY_PERF || [];
    var julyLoaded = Array.isArray(global.JULY_PERF);
    var julyTargets = july.length;
    var jyMap = {};
    var julyScored = 0;
    july.forEach(function (o) {
      var p = o && o.person;
      // 与 perf_july.js 同口径：姓名全等清洗（李亚楠Danan→李亚楠 / 骆→骆晓珍）
      if (p === '李亚楠Danan') p = '李亚楠';
      if (p === '骆') p = '骆晓珍';
      if (p) jyMap[p] = 1;
      if (o && o.score != null) julyScored++;
    });
    var julyPeople = Object.keys(jyMap).length;
    var scoredCount = julyScored;

    // ③ 制度：7 篇（与 perf_policy.js 的 POLICY_DOCS.length 保持一致）
    var POLICY_COUNT = 7;

    // ---- 四张模块导航卡（7月卡动态读 JULY_PERF）----
    var cards = [
      {
        href: '#/perf/june', ico: '📈', name: '月度绩效·6月',
        desc: '飞书 OGSM 月度目标跟踪（6月快照）',
        metrics: [
          ['目标', juneLoaded ? (juneTargets + ' 项') : '—'],
          ['参与', juneLoaded ? (junePeople + ' 人') : '—']
        ]
      },
      {
        href: '#/perf/july', ico: '📈', name: '月度绩效·7月',
        desc: '飞书 OGSM 月度目标跟踪（7月快照）',
        metrics: [
          ['目标', julyLoaded ? (julyTargets + ' 项') : '—'],
          ['参与', julyLoaded ? (julyPeople + ' 人') : '—'],
          ['评分', '中']
        ]
      },
      {
        href: '#/perf/kpi', ico: '📊', name: 'KPI指标看板',
        desc: '7月达成率/得分分布/部门对比/TOP5（数据参考图）',
        metrics: [
          ['目标', julyLoaded ? (julyTargets + ' 项') : '—'],
          ['已打分', julyLoaded ? (scoredCount + ' 条') : '—']
        ]
      },
      {
        href: '#/perf/annual', ico: '📊', name: '年度绩效·FY2026',
        desc: '财年全员绩效盘点（金/银/铜）',
        metrics: [
          ['参评', perfLoaded ? (annualTotal + ' 人') : '—'],
          ['银占比', perfLoaded ? (silverPct + '%') : '—']
        ]
      },
      {
        href: '#/perf/policy', ico: '📚', name: '绩效制度',
        desc: 'OGSM 体系 / 考核 / 激励 / 奖金 7 篇制度',
        metrics: [
          ['制度文档', POLICY_COUNT + ' 篇']
        ]
      }
    ];

    var cardsHtml = cards.map(function (c) {
      var m = c.metrics.map(function (x) {
        return '<div class="pi-metric"><b>' + esc(x[1]) + '</b><span>' + esc(x[0]) + '</span></div>';
      }).join('');
      return '<a class="pi-card" href="' + c.href + '">' +
        '<div class="pi-ico">' + c.ico + '</div>' +
        '<div class="pi-name">' + esc(c.name) + '</div>' +
        '<div class="pi-desc">' + esc(c.desc) + '</div>' +
        '<div class="pi-metrics">' + m + '</div>' +
        '<div class="pi-go">进入 <span class="arr">→</span></div></a>';
    }).join('');

    view.innerHTML = '<div class="pi"><div class="pi-main">' +
      '<div class="pi-head"><div><h1>📊 绩效管理板块</h1>' +
      '<div class="sub">月度跟踪 · 年度盘点 · 制度沉淀，一屏掌握全员绩效全貌</div></div>' +
      '<div class="pi-count">共 4 个模块</div>' +
      '<button class="pi-ai-btn" id="piAi">🤖 AI 初评</button></div>' +
      aiStatHtml() +
      '<div class="pi-grid">' + cardsHtml + '</div>' +
      '<div class="pi-info">📌 <b>数据来源</b>：月度看板来自飞书 OGSM 同步；年度看板来自 data/performance.csv × E 系列备份花名册补全；制度来自知识库聚合。' +
      ' &nbsp; <span class="warn">⚠️ 年度绩效姓名经 E 系列备份花名册补全</span>：31 人全部定位；2 人（曹淑娟 / 蔚方超）不在现职花名册，部门取自备份。</div>' +
      '</div></div>';

    // 阶段三 M2：绩效管理总览主流程嵌合 AI 初评助手
    // 数字员工按需加载（原生 script 动态加载兜底，AiPilot 未就绪时自动拉取，避免点击崩溃）
    var piAi = U.el('piAi');
    if (piAi) piAi.onclick = function () {
      function launch() { window.AiPilot.quickAssess('perf', '绩效管理板块·总览'); }
      if (window.AiPilot) { launch(); return; }
      var s = document.createElement('script');
      s.src = 'js/ai_pilot.js';
      s.onload = launch;
      s.onerror = function () { if (U.toast) U.toast('数字员工组件加载失败', 'error'); };
      document.head.appendChild(s);
    };
  }

  function aiStatHtml() {
    var cases = [];
    try { cases = JSON.parse(localStorage.getItem('ai_pilot_cases_v1') || '[]'); } catch (e) {}
    var now = new Date();
    var ym = now.getFullYear() + '-' + (now.getMonth() + 1);
    var cur = cases.filter(function (c) {
      var d = null;
      if (c.ts != null) { try { d = new Date(String(c.ts).replace(' ', 'T')); } catch (e) {} if (!d || isNaN(d.getTime())) { d = new Date(Number(c.ts)); } if (isNaN(d.getTime())) d = null; }
      return d && (d.getFullYear() + '-' + (d.getMonth() + 1)) === ym;
    });
    var adopt = cur.filter(function (c) { return c.humanDecision === '采纳AI建议'; }).length;
    var rate = cur.length ? Math.round(adopt / cur.length * 100) : 0;
    if (!cur.length) {
      return '<div class="pi-ai-stat">📅 本月数字员工暂无回流 case ｜ 运行 AI 初评并标注决策即可积累，纳入 <a href="#/review" style="color:var(--pi);font-weight:700">年度审计</a></div>';
    }
    return '<div class="pi-ai-stat">📅 本月数字员工回流 <b>' + cur.length + '</b> 条 ｜ 采纳率 <span class="hl">' + rate + '%</span> ｜ 纳入 <a href="#/review" style="color:var(--pi);font-weight:700">年度审计</a></div>';
  }

  global.PerfIndex = { render: render };
})(window);

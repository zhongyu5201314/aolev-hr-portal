/* =========================================================================
 * ai_ops.js — 数字员工运营中心（#/ai-ops）
 *   作用域前缀：.ao
 *   聚合四块看板：本月概览 / 进化指标 / 近3月趋势 / 数字员工运营块(年度审计)
 *   数据来源：localStorage['ai_pilot_cases_v1']（case 回流）+ global.KB_ARTICLES（SOP 链接）
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = [
    '.ao{font-size:14px;color:#e6e9f0;padding:0 22px 28px;max-width:1100px;margin:0 auto}',
    '.ao *{box-sizing:border-box}',
    '.ao-head{background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;padding:18px 24px;border-radius:14px;margin:18px 0}',
    '.ao-head h1{margin:0;font-size:20px;font-weight:700}',
    '.ao-head .sub{font-size:13px;opacity:.92;margin-top:4px}',
    '.ao-sec{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;margin-bottom:16px}',
    '.ao-sec h2{font-size:15px;margin:0 0 12px;color:#fff}',
    '.ao-sec h2 small{font-size:11px;color:#8b93a7;font-weight:400}',
    '.ao-kpis{display:flex;gap:12px;flex-wrap:wrap}',
    '.ao-kpi{flex:1;min-width:120px;background:rgba(74,158,255,.1);border:1px solid rgba(74,158,255,.25);border-radius:12px;padding:12px 14px;text-align:center}',
    '.ao-kpi b{display:block;font-size:22px;line-height:1.1}',
    '.ao-kpi span{font-size:11px;color:#8b93a7}',
    '.ao-kpi small{display:block;font-size:10px;color:#8b93a7;margin-top:2px}',
    '.ao-badge{margin:10px 0;padding:10px 14px;border-radius:10px;background:rgba(74,158,255,.12);border:1px solid rgba(74,158,255,.3);font-size:13px;color:#c7d0e0}',
    '.ao-badge a{color:#4a9eff;font-weight:700}',
    '.ao-warn{margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(255,196,0,.14);border:1px solid rgba(255,196,0,.5);font-size:12px;color:#ffce4d}',
    '.ao-trend{display:flex;align-items:flex-end;gap:10px;height:100px;padding:8px 4px 0}',
    '.ao-link{display:inline-block;margin-top:8px;color:#cbb8ff;font-size:13px}',
    '.ao-foot{font-size:12px;color:#8b93a7;line-height:1.7;margin-top:8px}',
    '.ao-foot a{color:#4a9eff}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('ao-css')) return;
    var s = document.createElement('style'); s.id = 'ao-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function parseTs(ts) { var d = null; if (ts != null) { try { d = new Date(String(ts).replace(' ', 'T')); } catch (e) {} if (!d || isNaN(d.getTime())) { d = new Date(Number(ts)); } if (isNaN(d.getTime())) d = null; } return d; }

  function render() {
    injectCss();
    var view = U.el('view');
    if (!view) return;
    global.App.setBreadcrumb(['数字员工运营中心']);

    var cases = [];
    try { cases = JSON.parse(localStorage.getItem('ai_pilot_cases_v1') || '[]'); } catch (e) {}
    var now = new Date();
    var ym = now.getFullYear() + '-' + (now.getMonth() + 1);
    var cur = cases.filter(function (c) { var d = parseTs(c.ts); return d && (d.getFullYear() + '-' + (d.getMonth() + 1)) === ym; });
    var adopt = cur.filter(function (c) { return c.humanDecision === '采纳AI建议'; }).length;
    var consistent = cur.filter(function (c) { return c.consistent; }).length;
    var high = cur.filter(function (c) { return c.aiConfidence === '高'; }).length;
    var rate = cur.length ? Math.round(adopt / cur.length * 100) : 0;
    var acc = cur.length ? Math.round(consistent / cur.length * 100) : 0;
    var highR = cur.length ? Math.round(high / cur.length * 100) : 0;
    var ADOPT_WARN = 60;

    var months = [];
    for (var i = 2; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + (d.getMonth() + 1), label: (d.getMonth() + 1) + '月', cnt: 0 }); }
    var max = 1;
    months.forEach(function (mo) { mo.cnt = cases.filter(function (c) { var d = parseTs(c.ts); return d && (d.getFullYear() + '-' + (d.getMonth() + 1)) === mo.key; }).length; if (mo.cnt > max) max = mo.cnt; });
    var bars = months.map(function (mo) { var h = Math.round(mo.cnt / max * 64); if (mo.cnt > 0 && h < 4) h = 4; return '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:1"><div style="font-size:11px;color:#5be0a0;font-weight:700">' + mo.cnt + '</div><div style="width:60%;height:' + h + 'px;background:linear-gradient(180deg,#4a9eff,#8b5cf6);border-radius:6px 6px 0 0;min-height:2px"></div><div style="font-size:11px;color:#8b93a7">' + mo.label + '</div></div>'; }).join('');

    var warn = (cur.length && rate < ADOPT_WARN) ? '<div class="ao-warn">⚠️ 本月采纳率 ' + rate + '% 低于阈值 ' + ADOPT_WARN + '%，建议复盘数字员工规则（见运营 SOP）</div>' : '';
    var statColor = rate < ADOPT_WARN ? '#ffce4d' : '#5be0a0';

    var kb = (global.KB_ARTICLES || []).filter(function (a) { return (a.title || '').indexOf('数字员工自我进化') >= 0; })[0];
    var link = kb ? '<a class="ao-link" href="#/wiki/article/' + encodeURIComponent(kb.id) + '">📖 查看《数字员工自我进化运营SOP》</a>' : '';

    var badge = cur.length
      ? '<div class="ao-badge">📅 本月数字员工回流 <b style="color:#fff">' + cur.length + '</b> 条 ｜ 采纳率 <b style="color:' + statColor + '">' + rate + '%</b> ｜ 纳入 <a href="#/review">年度审计</a></div>'
      : '<div class="ao-badge">📅 本月数字员工暂无回流 case ｜ 运行 AI 助手并标注人工决策即可积累，纳入 <a href="#/review">年度审计</a></div>';

    view.innerHTML =
      '<div class="ao">' +
        '<div class="ao-head"><h1>📈 数字员工运营中心</h1><div class="sub">阶段三·自我进化闭环汇总 ｜ 本月概览 · 进化指标 · 近3月趋势 · 年度审计</div></div>' +
        '<div class="ao-sec"><h2>📅 本月运营概览</h2>' + badge + warn + '</div>' +
        '<div class="ao-sec"><h2>📊 进化指标 <small>基于 case 回流（localStorage 持久化）</small></h2>' +
          '<div class="ao-kpis">' +
            '<div class="ao-kpi"><b style="color:#4a9eff">' + cases.length + '</b><span>累计回流 case</span><small>AI建议vs实际决策样本</small></div>' +
            '<div class="ao-kpi"><b style="color:#5be0a0">' + rate + '%</b><span>本月采纳率</span><small>人工采纳AI建议占比</small></div>' +
            '<div class="ao-kpi"><b style="color:#8b5cf6">' + acc + '%</b><span>本月准确率</span><small>AI建议=人工决策占比</small></div>' +
            '<div class="ao-kpi"><b style="color:#ffd479">' + highR + '%</b><span>本月高置信占比</span><small>高置信建议占比</small></div>' +
          '</div></div>' +
        '<div class="ao-sec"><h2>📈 近 3 月回流趋势 <small>case 按月分布（驱动技能版本进化）</small></h2>' +
          '<div class="ao-trend">' + bars + '</div></div>' +
        '<div class="ao-sec" style="background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.3)"><h2>🤖 数字员工运营 <small>纳入阶段三自我进化闭环跟踪</small></h2>' +
          '<div style="font-size:12px;color:#c7d0e0">' + (cur.length ? ('本月回流 <b style="color:#fff">' + cur.length + '</b> 条 ｜ 采纳率 <b style="color:' + statColor + '">' + rate + '%</b>') : '本月暂无回流 case') + '</div>' +
          link +
        '</div>' +
        '<div class="ao-foot">数据说明：累计/本月指标与趋势来自本机 AI 助手使用留痕（localStorage），跨设备不共享；运营 SOP 与年度审计请在 <a href="#/wiki">知识库</a> / <a href="#/review">审核流看板</a> 查看。AI 不直接做涉薪、涉裁决策。</div>' +
      '</div>';
  }

  global.AiOps = { render: render };
})(window);

/* =========================================================================
 * perf.js — 人力资源板块 · 月度绩效 · 6月 看板
 *   数据来源：perf_june_data.js (window.JUNE_PERF / JUNE_PERF_META)
 *   来源系统：飞书「绩效管理板块」OGSM绩效目标考核(70%-85%)（只读快照）
 *   说明：展示 2026年6月 OGSM 月度绩效目标完成情况（目标/权重/打分/周期/负责人）。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = '\
  .perf{--pf:#C9971B;--pf2:#E0B84A;--pf-bg:#FBF7EC;--pf-card:#fff;--pf-line:#EFE6CF;--pf-ink:#26201A;--pf-muted:#998B73;font-size:14px;color:var(--pf-ink)}\
  .perf *{box-sizing:border-box}\
  .pf-head{background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}\
  .pf-head h1{font-size:18px;margin:0;font-weight:700}\
  .pf-head .sub{font-size:12px;opacity:.9;margin-top:3px}\
  .pf-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}\
  .pf-stat{background:rgba(255,255,255,.18);border-radius:10px;padding:8px 14px;text-align:center;min-width:78px}\
  .pf-stat b{display:block;font-size:20px;line-height:1.1}\
  .pf-stat span{font-size:11px;opacity:.92}\
  .pf-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}\
  .pf-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 14px}\
  .pf-kpi{flex:1;min-width:150px;background:#fff;border:1px solid var(--pf-line);border-radius:12px;padding:14px 16px}\
  .pf-kpi b{display:block;font-size:24px;color:var(--pf);line-height:1.1}\
  .pf-kpi span{font-size:12px;color:var(--pf-muted)}\
  .pf-charts{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-bottom:16px}\
  .pf-chart-box{background:#fff;border:1px solid var(--pf-line);border-radius:12px;padding:12px 14px}\
  .pf-chart-box h4{margin:0 0 8px;font-size:14px;color:var(--pf)}\
  .pf-chart{width:100%;height:260px}\
  .pf-sec-title{font-size:15px;font-weight:700;color:var(--pf);margin:6px 0 10px;display:flex;align-items:center;gap:8px}\
  .pf-sec-title .cnt{font-size:12px;font-weight:600;color:var(--pf-muted);background:var(--pf-bg);padding:1px 9px;border-radius:10px}\
  .pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}\
  .pf-card{background:var(--pf-card);border:1px solid var(--pf-line);border-radius:12px;padding:13px;cursor:pointer;transition:.15s;box-shadow:0 1px 2px rgba(80,60,20,.05)}\
  .pf-card:hover{box-shadow:0 5px 16px rgba(80,60,20,.14);transform:translateY(-1px)}\
  .pf-card .nm{font-size:15px;font-weight:700}\
  .pf-card .post{font-size:12px;color:var(--pf-muted);margin-top:1px}\
  .pf-card .glist{margin:9px 0 0;padding:0;list-style:none}\
  .pf-card .glist li{font-size:12.5px;line-height:1.5;padding:6px 0;border-top:1px dashed var(--pf-line);display:flex;gap:8px}\
  .pf-card .glist li:first-child{border-top:none}\
  .pf-card .gscore{font-weight:800;flex:none;width:38px;text-align:right}\
  .pf-card .gwt{font-size:11px;color:var(--pf-muted);flex:none;width:46px;text-align:right}\
  .pf-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--pf-line);border-radius:12px;overflow:hidden;margin-top:6px}\
  .perf th,.perf td{padding:9px 12px;border-bottom:1px solid var(--pf-line);text-align:left;vertical-align:top;font-size:13px}\
  .perf th{background:#F6EFDD;font-weight:700}\
  .perf tr:nth-child(even) td{background:#FDFBF4}\
  .pf-foot{padding:12px 22px;color:var(--pf-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}\
  .pf-foot a{color:var(--pf);font-weight:600}\
  .pf-mask{position:fixed;inset:0;background:rgba(40,30,10,.45);display:none;align-items:center;justify-content:center;z-index:60}\
  .pf-mask.show{display:flex}\
  .pf-modal{background:#fff;width:min(640px,94vw);border-radius:14px;padding:20px 22px;max-height:90vh;overflow:auto}\
  .pf-modal h3{margin:0 0 4px;color:var(--pf);font-size:17px}\
  .pf-modal .m-sub{font-size:12px;color:var(--pf-muted);margin-bottom:14px}\
  .pf-field{margin-bottom:12px}\
  .pf-field label{display:block;font-size:12px;color:var(--pf-muted);margin-bottom:4px;font-weight:600}\
  .pf-field .v{font-size:13px;line-height:1.6;white-space:pre-wrap}\
  .pf-acts{display:flex;justify-content:flex-end;margin-top:6px}\
  .pf-btn{border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--pf);color:#fff}\
  .pf-badge{font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600;background:var(--pf-bg);color:var(--pf)}\
  @media(max-width:760px){.pf-charts{grid-template-columns:1fr}}';

  function injectCss() {
    if (document.getElementById('perfCss')) return;
    var s = document.createElement('style');
    s.id = 'perfCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }
  function scoreColor(s) {
    if (s == null) return '#9AA0B5';
    if (s >= 90) return '#18A058';
    if (s >= 70) return '#2D8CF0';
    return '#E5484D';
  }
  function splitPersons(s) {
    if (!s) return [];
    return s.split(/[,，、]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['绩效管理', '月度绩效·6月']);
    var data = global.JUNE_PERF || [];
    var meta = global.JUNE_PERF_META || {};

    // ---- 聚合 ----
    var personAgg = {};   // 按个人拆分（用于得分图）
    var groupAgg = {};    // 按原始 person 串分组（用于卡片）
    data.forEach(function (o) {
      splitPersons(o.person).forEach(function (p) {
        if (!personAgg[p]) personAgg[p] = { count: 0, scores: [] };
        personAgg[p].count++;
        if (o.score != null) personAgg[p].scores.push(o.score);
      });
      if (!groupAgg[o.person]) groupAgg[o.person] = [];
      groupAgg[o.person].push(o);
    });

    var total = data.length;
    var people = Object.keys(personAgg);
    var peopleN = people.length;
    var scored = data.filter(function (o) { return o.score != null; });
    var avg = scored.length ? (scored.reduce(function (a, o) { return a + o.score; }, 0) / scored.length) : null;
    var totalW = data.reduce(function (a, o) { return a + (o.weight || 0); }, 0);

    // 按人平均得分（仅含已打分）
    var byPerson = people.map(function (p) {
      var ss = personAgg[p].scores;
      var av = ss.length ? (ss.reduce(function (a, b) { return a + b; }, 0) / ss.length) : null;
      return { person: p, avg: av, count: personAgg[p].count };
    }).filter(function (x) { return x.avg != null; })
      .sort(function (a, b) { return b.avg - a.avg; });

    // 目标周期分布
    var cycleCount = {};
    data.forEach(function (o) { var c = o.cycle || '未填'; cycleCount[c] = (cycleCount[c] || 0) + 1; });
    var cycleColors = { '6月': '#C9971B', '第二季度': '#2D8CF0', '年度': '#18A058', '下半年度': '#7C7CE0', '7月 8月': '#E5484D' };

    var html = '<div class="perf">' +
      '<div class="pf-head"><div><h1>📈 月度绩效 · 6月</h1>' +
      '<div class="sub">飞书「绩效管理板块 · OGSM绩效目标考核」只读快照 · 2026年6月 · 共 ' + total + ' 条目标</div>' +
      '<button id="pfAi" style="margin-top:8px;padding:7px 14px;border-radius:9px;border:1px solid rgba(74,158,255,.5);background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;font-size:13px">🤖 AI 初评</button></div>' +
      '<div class="pf-stats">' +
      '<div class="pf-stat"><b>' + total + '</b><span>目标总数</span></div>' +
      '<div class="pf-stat"><b>' + peopleN + '</b><span>参与人数</span></div>' +
      '<div class="pf-stat"><b>' + scored.length + '</b><span>已打分</span></div>' +
      '<div class="pf-stat"><b>' + (avg != null ? avg.toFixed(1) : '—') + '</b><span>平均得分</span></div>' +
      '</div></div>' +
      '<div class="pf-main">' +
      '<div class="pf-kpis">' +
      '<div class="pf-kpi"><b>' + total + '</b><span>6月目标总数</span></div>' +
      '<div class="pf-kpi"><b>' + peopleN + '</b><span>参与考核人数</span></div>' +
      '<div class="pf-kpi"><b>' + scored.length + '</b><span>已打分目标</span></div>' +
      '<div class="pf-kpi"><b>' + (avg != null ? avg.toFixed(1) : '—') + '</b><span>平均得分(满分100)</span></div>' +
      '<div class="pf-kpi"><b>' + Math.round(totalW * 100) + '%</b><span>权重合计</span></div>' +
      '<div class="pf-kpi"><b>' + Object.keys(cycleCount).length + '</b><span>目标周期数</span></div>' +
      '</div>' +
      '<div class="pf-charts">' +
      '<div class="pf-chart-box"><h4>按人平均得分（已打分）</h4><div id="pfChartScore" class="pf-chart"></div></div>' +
      '<div class="pf-chart-box"><h4>目标周期分布</h4><div id="pfChartCycle" class="pf-chart"></div></div>' +
      '</div>' +
      '<div class="pf-sec-title">目标清单 <span class="cnt">' + total + '</span></div>' +
      '<table class="pf-tbl"><thead><tr><th>被考核人</th><th>岗位</th><th>目标（OGSM）</th><th>权重</th><th>打分</th><th>目标周期</th><th>部门负责人</th></tr></thead><tbody>' +
      data.map(function (o) {
        return '<tr><td>' + esc(o.person) + '</td><td>' + esc(o.post) + '</td><td>' + esc(o.goal) +
          '</td><td>' + (o.weightPct != null ? o.weightPct + '%' : '—') + '</td>' +
          '<td><b style="color:' + scoreColor(o.score) + '">' + (o.score != null ? o.score : '—') + '</b></td>' +
          '<td><span class="pf-badge">' + esc(o.cycle || '—') + '</span></td><td>' + esc(o.deptHead) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<div class="pf-sec-title" style="margin-top:22px">按人视图 <span class="cnt">' + Object.keys(groupAgg).length + ' 组</span></div>' +
      '<div class="pf-grid">' +
      Object.keys(groupAgg).map(function (key) {
        var list = groupAgg[key];
        var items = list.map(function (o) {
          return '<li><span class="gscore" style="color:' + scoreColor(o.score) + '">' + (o.score != null ? o.score : '—') +
            '</span><span class="gwt">' + (o.weightPct != null ? o.weightPct + '%' : '') + '</span>' +
            '<span>' + esc(o.goal) + '</span></li>';
        }).join('');
        return '<div class="pf-card" data-key="' + esc(key) + '">' +
          '<div class="nm">' + esc(key) + '</div>' +
          '<div class="post">' + esc(list[0].post || '—') + ' · ' + list.length + ' 项目</div>' +
          '<ul class="glist">' + items + '</ul></div>';
      }).join('') +
      '</div>' +
      '<div class="pf-foot"><span>数据来源：飞书绩效管理板块（只读快照，正式维护在飞书）· 同步于 ' + esc(meta.syncedAt || '—') + '</span>' +
      (meta.baseToken ? '<a href="https://oralvictor.feishu.cn/base/' + esc(meta.baseToken) + '" target="_blank" rel="noopener">打开飞书原表 ↗</a>' : '') +
      '</div>' +
      '</div>';
    view.innerHTML = html;

    // 图表
    if (typeof echarts !== 'undefined') {
      var c1 = echarts.init(document.getElementById('pfChartScore'));
      U.registerChart(c1);
      c1.setOption({
        tooltip: { trigger: 'axis' }, grid: { left: 8, right: 20, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: 'value', max: 100, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'category', data: byPerson.map(function (x) { return x.person; }).reverse(), axisLabel: { fontSize: 12 } },
        series: [{
          type: 'bar', barWidth: '58%',
          data: byPerson.map(function (x) { return x.avg; }).reverse(),
          itemStyle: { color: function (p) { return scoreColor(p.value); }, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', fontSize: 11, formatter: '{c}' }
        }]
      });
      var cycleData = Object.keys(cycleCount).map(function (k) {
        return { name: k, value: cycleCount[k], itemStyle: { color: cycleColors[k] || '#C9CCDA' } };
      });
      var c2 = echarts.init(document.getElementById('pfChartCycle'));
      U.registerChart(c2);
      c2.setOption({
        tooltip: { trigger: 'item' }, legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        series: [{
          type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
          label: { formatter: '{b}\n{c}', fontSize: 11 },
          data: cycleData
        }]
      });
    }

    // 按人卡片 → 弹窗（事件委托）
    U.el('view').querySelector('.pf-grid').addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.pf-card') : null;
      if (!card) return;
      var key = card.getAttribute('data-key');
      var list = groupAgg[key] || [];
      var rows = list.map(function (o) {
        return '<div class="pf-field"><label>' + esc(o.goal) + '</label>' +
          '<div class="v">权重：' + (o.weightPct != null ? o.weightPct + '%' : '—') +
          ' ｜ 打分：<b style="color:' + scoreColor(o.score) + '">' + (o.score != null ? o.score : '未打分') + '</b>' +
          ' ｜ 目标周期：' + esc(o.cycle || '—') + ' ｜ 部门负责人：' + esc(o.deptHead || '—') + '</div></div>';
      }).join('');
      var mask = document.createElement('div');
      mask.innerHTML = '<div class="pf-mask show" id="pfMask"><div class="pf-modal">' +
        '<h3>' + esc(key) + '</h3>' +
        '<div class="m-sub">' + esc(list[0].post || '—') + ' · ' + list.length + ' 个6月目标</div>' +
        rows +
        '<div class="pf-acts"><button class="pf-btn" id="pfClose">关闭</button></div>' +
        '</div></div>';
      document.body.appendChild(mask.firstChild);
      var m = U.el('pfMask');
      m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.id === 'pfClose') m.remove(); });
    });

    // 阶段三 M2：绩效主流程嵌合 AI 初评助手（健壮按需加载，AiPilot 未就绪时自动拉取）
    var pfAi = U.el('pfAi');
    if (pfAi) pfAi.onclick = function () {
      if (window.AiPilot && window.AiPilot.quickAssess) { window.AiPilot.quickAssess('perf', '月度绩效·6月'); return; }
      var s = document.createElement('script'); s.src = 'js/ai_pilot.js';
      s.onload = function () { if (window.AiPilot && window.AiPilot.quickAssess) window.AiPilot.quickAssess('perf', '月度绩效·6月'); else U.toast('数字员工组件加载失败', 'error'); };
      s.onerror = function () { U.toast('数字员工组件加载失败', 'error'); };
      document.head.appendChild(s);
    };
  }

  global.Perf = { render: render };
})(window);

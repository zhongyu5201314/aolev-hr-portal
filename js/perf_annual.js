/* =========================================================================
 * perf_annual.js — 绩效管理板块 · 年度绩效 · FY2026 看板
 *   数据来源：window.HR_DATA.performance（31 条，字段见 data.js）
 *   作用域前缀：.pa（避免与 perf.js 的 .pf 冲突）
 *   范式：复用 perf.js 的 injectCss + mask/事件委托弹窗 + U.registerChart 自动销毁
 * 红线：等级饼图显式 0（标注"无"）；部门柱图无数据渲染空态"数据待匹配"；
 *       姓名/部门显示"未匹配"，绝不编造部门或姓名数据。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = [
    '.pa{--pa:#C9971B;--pa2:#E0B84A;--pa-bg:#FBF7EC;--pa-card:#fff;--pa-line:#EFE6CF;--pa-ink:#26201A;--pa-muted:#998B73;--pa-gold:#E8B400;--pa-silver:#9AA0B5;--pa-bronze:#B87333;--pa-bad:#E5484D;font-size:14px;color:var(--pa-ink)}',
    '.pa *{box-sizing:border-box}',
    '.pa-head{background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:12px}',
    '.pa-head h1{font-size:18px;margin:0;font-weight:700}',
    '.pa-head .sub{font-size:12px;opacity:.92;margin-top:3px}',
    '.pa-head .pa-meta{margin-left:auto;font-size:12px;opacity:.95;text-align:right;line-height:1.5}',
    '.pa-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}',
    '.pa-gap{display:flex;gap:10px;align-items:flex-start;background:#FFF8E1;border:1px solid #F0D98A;color:#7A5B00;border-radius:10px;padding:10px 14px;margin:14px 0 4px;font-size:13px;line-height:1.6}',
    '.pa-gap code{background:#F6E9C8;padding:0 4px;border-radius:4px;font-size:12px}',
    '.pa-gap .x{margin-left:auto;cursor:pointer;border:none;background:transparent;color:#7A5B00;font-size:18px;line-height:1;padding:0 2px}',
    '.pa-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 14px}',
    '.pa-kpi{flex:1;min-width:150px;background:#fff;border:1px solid var(--pa-line);border-radius:12px;padding:14px 16px}',
    '.pa-kpi b{display:block;font-size:24px;color:var(--pa);line-height:1.1}',
    '.pa-kpi span{font-size:12px;color:var(--pa-muted)}',
    '.pa-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}',
    '.pa-chart-box{background:#fff;border:1px solid var(--pa-line);border-radius:12px;padding:12px 14px}',
    '.pa-chart-box h4{margin:0 0 8px;font-size:14px;color:var(--pa)}',
    '.pa-chart{width:100%;height:260px}',
    '.pa-empty{height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--pa-muted);text-align:center;gap:6px}',
    '.pa-empty .ico{font-size:34px}',
    '.pa-empty .sub{font-size:12px;max-width:320px;line-height:1.5}',
    '.pa-sec-title{font-size:15px;font-weight:700;color:var(--pa);margin:6px 0 10px;display:flex;align-items:center;gap:8px}',
    '.pa-sec-title .cnt{font-size:12px;font-weight:600;color:var(--pa-muted);background:var(--pa-bg);padding:1px 9px;border-radius:10px}',
    '.pa-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--pa-line);border-radius:12px;overflow:hidden;margin-top:6px}',
    '.pa th,.pa td{padding:9px 12px;border-bottom:1px solid var(--pa-line);text-align:left;vertical-align:top;font-size:13px}',
    '.pa th{background:#F6EFDD;font-weight:700}',
    '.pa tr:nth-child(even) td{background:#FDFBF4}',
    '.pa .muted{color:#A99B80;font-size:11px;font-weight:400}',
    '.pa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}',
    '.pa-card{background:var(--pa-card);border:1px solid var(--pa-line);border-radius:12px;padding:13px;cursor:pointer;transition:.15s;box-shadow:0 1px 2px rgba(80,60,20,.05)}',
    '.pa-card:hover{box-shadow:0 5px 16px rgba(80,60,20,.14);transform:translateY(-1px)}',
    '.pa-card .pa-id{font-size:15px;font-weight:700}',
    '.pa-card .pa-line2{font-size:12px;color:var(--pa-muted);margin-top:6px;display:flex;justify-content:space-between}',
    '.pa-badge{font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600;display:inline-block}',
    '.pa-badge--gold{background:#FBF3D7;color:#B8860B}',
    '.pa-badge--silver{background:#EEF0F4;color:#6B7280}',
    '.pa-badge--bronze{background:#F6E9DD;color:#8A5A2B}',
    '.pa-badge--bad{background:#FCE8E8;color:#C0392B}',
    '.pa-mask{position:fixed;inset:0;background:rgba(40,30,10,.45);display:none;align-items:center;justify-content:center;z-index:60}',
    '.pa-mask.show{display:flex}',
    '.pa-modal{background:#fff;width:min(560px,94vw);border-radius:14px;padding:20px 22px;max-height:90vh;overflow:auto}',
    '.pa-modal h3{margin:0 0 4px;color:var(--pa);font-size:17px}',
    '.pa-modal .m-sub{font-size:12px;color:var(--pa-muted);margin-bottom:12px}',
    '.pa-field{margin-bottom:12px}',
    '.pa-field label{display:block;font-size:12px;color:var(--pa-muted);margin-bottom:4px;font-weight:600}',
    '.pa-field .v{font-size:13px;line-height:1.6}',
    '.pa-gap-hint{font-size:11.5px;color:#7A5B00;background:#FFF8E1;border:1px solid #F0D98A;border-radius:8px;padding:8px 10px;margin-top:4px;line-height:1.5}',
    '.pa-acts{display:flex;justify-content:flex-end;margin-top:6px}',
    '.pa-btn{border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--pa);color:#fff}',
    '.pa-foot{padding:12px 0;color:var(--pa-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:18px;border-top:1px solid var(--pa-line)}',
    '@media(max-width:760px){.pa-charts{grid-template-columns:1fr}.pa-kpi{min-width:46%}}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('perfAnnualCss')) return; // 防重复注入
    var s = document.createElement('style');
    s.id = 'perfAnnualCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  // 等级 → 徽章修饰类 + 饼图/图例色
  function levelInfo(level) {
    switch (level) {
      case '金': return { mod: 'gold', color: '#E8B400' };
      case '银': return { mod: 'silver', color: '#9AA0B5' };
      case '铜': return { mod: 'bronze', color: '#B87333' };
      case '待改进': return { mod: 'bad', color: '#E5484D' };
      default: return { mod: 'silver', color: '#9AA0B5' };
    }
  }
  function badge(level) {
    var info = levelInfo(level);
    return '<span class="pa-badge pa-badge--' + info.mod + '">' + esc(level) + '</span>';
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['绩效管理', '年度绩效·FY2026']);

    var perf = global.ANNUAL_PERF || [];
    var total = perf.length;

    // ---- 聚合（动态计算，与设计稿 §2.5/§2.6 数字一致）----
    var counts = { '金': 0, '银': 0, '铜': 0, '待改进': 0 };
    var sumComp = 0, sumScore = 0;
    var ge100 = 0, bt99100 = 0, lt99 = 0;
    perf.forEach(function (o) {
      counts[o.perf_level] = (counts[o.perf_level] || 0) + 1;
      sumComp += (o.ogsm_completion || 0);
      sumScore += (o.score || 0);
      var c = o.ogsm_completion || 0;
      if (c >= 100) ge100++;
      else if (c >= 99) bt99100++;   // 99 ~ 100（不含 100）
      else lt99++;                   // < 99
    });
    var avgComp = total ? sumComp / total : 0;
    var avgScore = total ? sumScore / total : 0;
    var silver = counts['银'] || 0;
    var bronze = counts['铜'] || 0;
    var silverPct = total ? silver / total * 100 : 0;
    var bronzePct = total ? bronze / total * 100 : 0;

    // 部门聚合（现职优先口径），用于「部门分布」柱状图 + 「覆盖部门」标注
    var deptAgg = {};
    perf.forEach(function (o) { var d = o.dept || '未填'; deptAgg[d] = (deptAgg[d] || 0) + 1; });
    var deptCount = Object.keys(deptAgg).length;

    // 空态：无数据
    if (!total) {
      view.innerHTML = '<div class="pa"><div class="pa-main">' +
        '<div class="pa-gap">⚠️ 暂无绩效记录（window.ANNUAL_PERF 为空）。</div></div></div>';
      return;
    }

    function kpi(label, value) {
      return '<div class="pa-kpi"><b>' + value + '</b><span>' + label + '</span></div>';
    }

    // 饼图数据：4 级全部显式传入（金/待改进=0 也传，不静默剔除）
    var levelData = [
      { name: '银', value: silver, itemStyle: { color: '#9AA0B5' } },
      { name: '铜', value: bronze, itemStyle: { color: '#B87333' } },
      { name: '金', value: counts['金'] || 0, itemStyle: { color: '#E8B400' } },
      { name: '待改进', value: counts['待改进'] || 0, itemStyle: { color: '#E5484D' } }
    ];
    // 完成度 3 桶（按语义着色，非逐行 scoreColor）
    var bucketVals = [ge100, bt99100, lt99];
    var bucketColors = ['#18A058', '#FAAD14', '#E5484D'];

    var html = '<div class="pa">' +
      '<div class="pa-head"><div><h1>📊 年度绩效 · FY2026</h1>' +
      '<div class="sub">年度绩效评估 · 财年 FY2026 · 共 ' + total + ' 条绩效记录</div>' +
      '<button id="pAi" style="margin-top:8px;padding:7px 14px;border-radius:9px;border:1px solid rgba(74,158,255,.5);background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;font-size:13px">🤖 AI 初评</button></div>' +
      '<div class="pa-meta">统计口径：年度 4 级<br>数据来源：performance.csv × E 系列备份花名册（姓名/部门已补全）</div></div>' +
      '<div class="pa-main">' +

      // 数据补全说明条（绿/金底，可关闭）—— 正向补全说明
      '<div class="pa-gap" id="paGap" style="background:#F2FBF4;border-color:#B7E0C2;color:#1F6B3B"><span>ⓘ</span><div><b>数据补全说明</b>：姓名/部门已通过 <b>E 系列备份花名册</b>补全（31 人全部定位；其中 2 人 <b>曹淑娟 / 蔚方超</b> 因不在现职花名册，部门取自备份）。部门分布图已还原为真实柱状图。</div>' +
      '<button class="x" id="paGapClose" aria-label="关闭" style="color:#1F6B3B">×</button></div>' +

      // KPI 卡 ×6（＋ 覆盖部门 7 小标注）
      '<div class="pa-kpis">' +
      kpi('参评总人数', total) +
      kpi('平均完成度', avgComp.toFixed(2) + '%') +
      kpi('平均得分', avgScore.toFixed(2)) +
      kpi('银占比', silverPct.toFixed(1) + '%') +
      kpi('铜占比', bronzePct.toFixed(1) + '%') +
      kpi('完成度≥100 人数', ge100) +
      '<div class="pa-kpi" style="flex:0 0 auto"><b style="font-size:16px">⊕ ' + deptCount + '</b><span>覆盖部门</span></div>' +
      '</div>' +

      // 图表行A（双栏）
      '<div class="pa-charts">' +
      '<div class="pa-chart-box"><h4>等级分布（FY2026）</h4><div id="paPie" class="pa-chart"></div></div>' +
      '<div class="pa-chart-box"><h4>完成度分布</h4><div id="paBar" class="pa-chart"></div></div>' +
      '</div>' +

      // 部门分布（行B 通栏，真实柱状图——按 dept 聚合计数，按人数降序）
      '<div class="pa-sec-title">部门分布 <span class="cnt">' + deptCount + ' 部门</span></div>' +
      '<div class="pa-chart-box"><h4>部门分布（按人数）</h4><div id="paDeptBar" class="pa-chart"></div></div>' +

      // 全员明细表
      '<div class="pa-sec-title">全员明细 <span class="cnt">' + total + '</span></div>' +
      '<div style="overflow-x:auto"><table class="pa-tbl"><thead><tr>' +
      '<th>emp_id</th><th>完成度</th><th>得分</th><th>等级</th>' +
      '<th>姓名</th><th>部门</th>' +
      '</tr></thead><tbody>' +
      perf.map(function (o) {
        var comp = (o.ogsm_completion == null ? 0 : o.ogsm_completion).toFixed(1);
        var sc = (o.score == null ? 0 : o.score).toFixed(1);
        return '<tr><td>' + esc(o.emp_id) + '</td>' +
          '<td>' + comp + '</td>' +
          '<td>' + sc + '</td>' +
          '<td>' + badge(o.perf_level) + '</td>' +
          '<td>' + esc(o.name || '—') + '</td><td>' + esc(o.dept || '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div>' +

      // 按人卡片网格
      '<div class="pa-sec-title" style="margin-top:22px">按人视图 <span class="cnt">' + total + '</span></div>' +
      '<div class="pa-grid">' +
      perf.map(function (o) {
        var comp = (o.ogsm_completion == null ? 0 : o.ogsm_completion).toFixed(1);
        var sc = (o.score == null ? 0 : o.score).toFixed(1);
        return '<div class="pa-card" data-key="' + esc(o.emp_id) + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span class="pa-id">' + esc(o.name || o.emp_id) + '</span>' + badge(o.perf_level) + '</div>' +
          '<div class="pa-line2"><span>' + esc(o.dept || '—') + '</span><span>完成度 ' + comp + '</span></div>' +
          '</div>';
      }).join('') +
      '</div>' +

      // 页脚
      '<div class="pa-foot"><span>数据来源：performance.csv × E 系列备份花名册（' + total + ' 条年度绩效记录，只读快照）</span>' +
      '<span>统计口径：年度 4 级（金/银/铜/待改进）· 姓名/部门经备份花名册补全</span></div>' +

      '</div></div>';
    view.innerHTML = html;

    // 缺口条关闭
    var gap = U.el('paGap'), gapClose = U.el('paGapClose');
    if (gap && gapClose) gapClose.addEventListener('click', function () { gap.style.display = 'none'; });

    // ---- 图表（每个 init 后 U.registerChart，路由切换由 app.js disposeCharts 统一销毁）----
    if (typeof echarts !== 'undefined') {
      var pie = echarts.init(U.el('paPie'));
      U.registerChart(pie);
      pie.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        series: [{
          type: 'pie', radius: ['40%', '66%'], center: ['50%', '44%'],
          label: {
            fontSize: 11,
            formatter: function (p) { return p.name + '\n' + (p.value === 0 ? '无' : p.value); }
          },
          data: levelData
        }]
      });

      var bar = echarts.init(U.el('paBar'));
      U.registerChart(bar);
      bar.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: ['完成度≥100', '99~100', '<99'], axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', barWidth: '46%',
          data: bucketVals.map(function (v, i) {
            return { value: v, itemStyle: { color: bucketColors[i], borderRadius: [4, 4, 0, 0] } };
          }),
          label: { show: true, position: 'top', fontSize: 12, formatter: '{c}' }
        }]
      });

      // 部门分布柱状图（按 dept 聚合，按人数降序；无数据则由空态分支兜底）
      var deptNames = Object.keys(deptAgg).sort(function (a, b) { return deptAgg[b] - deptAgg[a]; });
      if (deptNames.length) {
        var deptBar = echarts.init(U.el('paDeptBar'));
        U.registerChart(deptBar);
        deptBar.setOption({
          tooltip: { trigger: 'axis' },
          grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
          xAxis: { type: 'category', data: deptNames, axisLabel: { fontSize: 12, interval: 0, rotate: deptNames.length > 5 ? 18 : 0 } },
          yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
          series: [{
            type: 'bar', barWidth: '52%',
            data: deptNames.map(function (d) {
              return { value: deptAgg[d], itemStyle: { color: '#C9971B', borderRadius: [4, 4, 0, 0] } };
            }),
            label: { show: true, position: 'top', fontSize: 12, formatter: '{c}' }
          }]
        });
      }
    }

    // ---- 按人卡片 → 弹窗（事件委托，复用 perf.js 范式）----
    var grid = view.querySelector('.pa-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.pa-card') : null;
        if (!card) return;
        var key = card.getAttribute('data-key');
        var rec = perf.filter(function (o) { return o.emp_id === key; })[0];
        if (!rec) return;
        var comp = (rec.ogsm_completion == null ? 0 : rec.ogsm_completion).toFixed(1);
        var sc = (rec.score == null ? 0 : rec.score).toFixed(1);
        var mask = document.createElement('div');
        mask.innerHTML = '<div class="pa-mask show" id="paMask"><div class="pa-modal">' +
          '<h3>' + esc(rec.name || rec.emp_id) + '</h3>' +
          '<div class="m-sub">' + badge(rec.perf_level) + ' 年度绩效 · FY2026 · ' + esc(rec.emp_id) + '</div>' +
          '<div class="pa-field"><label>完成度（OGSM）</label><div class="v">' + comp + '%</div></div>' +
          '<div class="pa-field"><label>得分</label><div class="v">' + sc + '</div></div>' +
          '<div class="pa-field"><label>部门</label><div class="v">' + esc(rec.dept || '—') + '</div></div>' +
          '<div class="pa-field"><label>职位 / 层级</label><div class="v">' + esc((rec.title ? rec.title + ' · ' : '') + (rec.level || '')) + '</div></div>' +
          '<div class="pa-field"><label>emp_id</label><div class="v">' + esc(rec.emp_id) + '</div></div>' +
          '<div class="pa-acts"><button class="pa-btn" id="paClose">关闭</button></div>' +
          '</div></div>';
        document.body.appendChild(mask.firstChild);
        var m = U.el('paMask');
        m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.id === 'paClose') m.remove(); });
      // 阶段三 M2：绩效主流程嵌合 AI 初评助手（健壮按需加载，对齐 6月页）
      var pAi = U.el('pAi');
      if (pAi) pAi.onclick = function () {
        if (window.AiPilot && window.AiPilot.quickAssess) { window.AiPilot.quickAssess('perf', '年度绩效·FY2026'); return; }
        var s = document.createElement('script'); s.src = 'js/ai_pilot.js';
        s.onload = function () { if (window.AiPilot && window.AiPilot.quickAssess) window.AiPilot.quickAssess('perf', '年度绩效·FY2026'); else U.toast('数字员工组件加载失败', 'error'); };
        s.onerror = function () { U.toast('数字员工组件加载失败', 'error'); };
        document.head.appendChild(s);
      };
      });
    }
  }

  global.PerfAnnual = { render: render };
})(window);

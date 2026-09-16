/* =========================================================================
 * perf_july.js — 绩效管理板块 · 月度绩效 · 7月 看板
 *   数据来源：perf_july_data.js (window.JULY_PERF / JULY_PERF_META)
 *   来源系统：飞书「OGSM绩效目标考核(70%-85%)7月」tbl56uoiuIQ9v1Gj（只读快照）
 *   作用域前缀：.pj（镜像 perf.js 的 .pf，避免冲突）
 *   范式：复用 perf.js 的 injectCss + 事件委托弹窗 + U.registerChart 自动销毁
 *   红线：137 条未打分须如实标注「未打分」（红灰），绝不臆造分数；
 *        姓名清洗仅全等匹配（避免误伤含「骆」字的其他名）。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = [
    // 作用域根：金/银绩效主题（与 .pf/.pa 同源）
    '.pj{--pj:#C9971B;--pj2:#E0B84A;--pj-bg:#FBF7EC;--pj-card:#fff;--pj-line:#EFE6CF;--pj-ink:#26201A;--pj-muted:#998B73;font-size:14px;color:var(--pj-ink)}',
    '.pj *{box-sizing:border-box}',
    '.pj-head{background:linear-gradient(135deg,#C9971B,#E0B84A);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}',
    '.pj-head h1{font-size:18px;margin:0;font-weight:700}',
    '.pj-head .sub{font-size:12px;opacity:.9;margin-top:3px}',
    '.pj-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}',
    '.pj-stat{background:rgba(255,255,255,.18);border-radius:10px;padding:8px 14px;text-align:center;min-width:78px}',
    '.pj-stat b{display:block;font-size:20px;line-height:1.1}',
    '.pj-stat span{font-size:11px;opacity:.92}',
    '.pj-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}',
    '.pj-tip{display:flex;gap:10px;align-items:flex-start;background:#FFF8E1;border-left:4px solid #FAAD14;color:#7A5B00;padding:10px 14px;border-radius:10px;margin:14px 0 4px;font-size:13px;line-height:1.6}',
    '.pj-tip b{color:#B8860B}',
    '.pj-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 14px}',
    '.pj-kpi{flex:1;min-width:150px;background:#fff;border:1px solid var(--pj-line);border-radius:12px;padding:14px 16px}',
    '.pj-kpi b{display:block;font-size:24px;color:var(--pj);line-height:1.1}',
    '.pj-kpi span{font-size:12px;color:var(--pj-muted)}',
    '.pj-charts{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-bottom:16px}',
    '.pj-chart-box{background:#fff;border:1px solid var(--pj-line);border-radius:12px;padding:12px 14px}',
    '.pj-chart-box h4{margin:0 0 8px;font-size:14px;color:var(--pj)}',
    '.pj-chart{width:100%;height:260px}',
    '.pj-sec-title{font-size:15px;font-weight:700;color:var(--pj);margin:6px 0 10px;display:flex;align-items:center;gap:8px}',
    '.pj-sec-title .cnt{font-size:12px;font-weight:600;color:var(--pj-muted);background:var(--pj-bg);padding:1px 9px;border-radius:10px}',
    '.pj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}',
    '.pj-card{background:var(--pj-card);border:1px solid var(--pj-line);border-radius:12px;padding:13px;cursor:pointer;transition:.15s;box-shadow:0 1px 2px rgba(80,60,20,.05)}',
    '.pj-card:hover{box-shadow:0 5px 16px rgba(80,60,20,.14);transform:translateY(-1px)}',
    '.pj-card .nm{font-size:15px;font-weight:700}',
    '.pj-card .post{font-size:12px;color:var(--pj-muted);margin-top:1px}',
    '.pj-card .glist{margin:9px 0 0;padding:0;list-style:none}',
    '.pj-card .glist li{font-size:12.5px;line-height:1.5;padding:6px 0;border-top:1px dashed var(--pj-line);display:flex;gap:8px}',
    '.pj-card .glist li:first-child{border-top:none}',
    '.pj-card .gscore{font-weight:800;flex:none;width:38px;text-align:right}',
    '.pj-card .gwt{font-size:11px;color:var(--pj-muted);flex:none;width:46px;text-align:right}',
    '.pj-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--pj-line);border-radius:12px;overflow:hidden;margin-top:6px}',
    '.pj th,.pj td{padding:9px 12px;border-bottom:1px solid var(--pj-line);text-align:left;vertical-align:top;font-size:13px}',
    '.pj th{background:#F6EFDD;font-weight:700}',
    '.pj tr:nth-child(even) td{background:#FDFBF4}',
    '.pj .muted{color:#A99B80;font-size:11px;font-weight:400}',
    '.pj-noscore{color:#E5484D;font-weight:700;background:#FCE8E8;padding:1px 8px;border-radius:8px;font-size:12px}',
    '.pj-foot{padding:12px 0;color:var(--pj-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:18px;border-top:1px solid var(--pj-line)}',
    '.pj-foot a{color:var(--pj);font-weight:600}',
    '.pj-mask{position:fixed;inset:0;background:rgba(40,30,10,.45);display:none;align-items:center;justify-content:center;z-index:60}',
    '.pj-mask.show{display:flex}',
    '.pj-modal{background:#fff;width:min(640px,94vw);border-radius:14px;padding:20px 22px;max-height:90vh;overflow:auto}',
    '.pj-modal h3{margin:0 0 4px;color:var(--pj);font-size:17px}',
    '.pj-modal .m-sub{font-size:12px;color:var(--pj-muted);margin-bottom:14px}',
    '.pj-field{margin-bottom:12px}',
    '.pj-field label{display:block;font-size:12px;color:var(--pj-muted);margin-bottom:4px;font-weight:600}',
    '.pj-field .v{font-size:13px;line-height:1.6;white-space:pre-wrap}',
    '.pj-acts{display:flex;justify-content:flex-end;margin-top:6px}',
    '.pj-btn{border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--pj);color:#fff}',
    '@media(max-width:760px){.pj-charts{grid-template-columns:1fr}.pj-kpi{min-width:46%}}'
  ].join('\n');

  function injectCss() {
    // 防重复注入
    if (document.getElementById('perfJulyCss')) return;
    var s = document.createElement('style');
    s.id = 'perfJulyCss';
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

  // 姓名清洗：仅全等匹配（避免误伤含「骆」字的其他名，如「骆晓珍」）
  var NAME_CLEAN = { '李亚楠Danan': '李亚楠', '骆': '骆晓珍' };
  function cleanName(s) {
    if (!s) return s;
    for (var k in NAME_CLEAN) { if (s === k) return NAME_CLEAN[k]; }
    return s;
  }

  function trunc(s, n) {
    s = (s == null ? '' : String(s));
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['绩效管理', '月度绩效·7月']);
    var data = global.JULY_PERF || [];
    var meta = global.JULY_PERF_META || {};
    var total = data.length;

    // ---------- 聚合（动态计算）----------
    var groupAgg = {};           // 按清洗后 person 分组（用于卡片 + 弹窗）
    var deptAgg = {};            // 部门计数（空 → 跨部门/未填）
    var scoredN = 0, unsavedN = 0, sumW = 0, wN = 0, deptSet = {};
    data.forEach(function (o) {
      var p = cleanName(o.person);
      if (!groupAgg[p]) groupAgg[p] = [];
      groupAgg[p].push(o);
      var d = o.dept || '跨部门/未填';
      deptAgg[d] = (deptAgg[d] || 0) + 1;
      if (o.score != null) { scoredN++; } else { unsavedN++; }
      if (o.weightPct != null) { sumW += o.weightPct; wN++; }
      if (o.dept) deptSet[o.dept] = 1;
    });
    var peopleN = Object.keys(groupAgg).length;
    var avgW = wN ? Math.round(sumW / wN) : 0;
    var deptCount = Object.keys(deptSet).length;

    // 空态：无数据
    if (!total) {
      view.innerHTML = '<div class="pj"><div class="pj-main">' +
        '<div class="pj-tip">⚠️ 暂无 7 月绩效记录（window.JULY_PERF 为空）。</div></div></div>';
      return;
    }

    // ---------- KPI ×6 ----------
    function kpi(label, value) {
      return '<div class="pj-kpi"><b>' + value + '</b><span>' + label + '</span></div>';
    }

    var html = '<div class="pj">' +
      '<div class="pj-head"><div><h1>📈 月度绩效 · 7月</h1>' +
      '<div class="sub">飞书 OGSM 只读快照 · 2026年7月 · 共 ' + total + ' 条目标</div>' +
      '<button id="pjAi" style="margin-top:8px;padding:7px 14px;border-radius:9px;border:1px solid rgba(74,158,255,.5);background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;font-size:13px">🤖 AI 初评</button></div>' +
      '<div class="pj-stats">' +
      '<div class="pj-stat"><b>' + total + '</b><span>目标总数</span></div>' +
      '<div class="pj-stat"><b>' + peopleN + '</b><span>参与人数</span></div>' +
      '<div class="pj-stat"><b style="color:#18A058">' + scoredN + '</b><span>已打分</span></div>' +
      '<div class="pj-stat"><b style="color:#E5484D">' + unsavedN + '</b><span>未打分</span></div>' +
      '</div></div>' +
      '<div class="pj-main">' +

      // 评分进行中提示条（橙底）
      '<div class="pj-tip">⚠️ <div><b>7月评分进行中</b>：' + total + ' 条目标中 <b>' + unsavedN + ' 条未打分</b>（仅 ' + scoredN + ' 条已打分且数值待核实），以下为飞书 OGSM 目标<b>跟踪视图</b>，正式分数以飞书为准。</div></div>' +

      // KPI 卡 ×6
      '<div class="pj-kpis">' +
      kpi('目标总数', total) +
      kpi('参与人数', peopleN) +
      kpi('已打分', scoredN) +
      kpi('未打分', unsavedN) +
      kpi('平均权重', avgW + '%') +
      kpi('覆盖部门', deptCount) +
      '</div>' +

      // 图表行（双栏）
      '<div class="pj-charts">' +
      '<div class="pj-chart-box"><h4>部门分布（按目标数）</h4><div id="pjDept" class="pj-chart"></div></div>' +
      '<div class="pj-chart-box"><h4>打分状态</h4><div id="pjScore" class="pj-chart"></div></div>' +
      '</div>' +

      // 目标清单表
      '<div class="pj-sec-title">目标清单 <span class="cnt">' + total + '</span></div>' +
      '<div style="overflow-x:auto"><table class="pj-tbl"><thead><tr>' +
      '<th>被考核人</th><th>岗位</th><th>部门</th><th>目标（OGSM）</th><th>权重</th><th>打分</th><th>部门负责人</th>' +
      '</tr></thead><tbody>' +
      data.map(function (o) {
        var p = cleanName(o.person);
        return '<tr><td>' + esc(p) + '</td>' +
          '<td>' + esc(o.post) + '</td>' +
          '<td>' + (o.dept ? esc(o.dept) : '—') + '</td>' +
          '<td>' + esc(trunc(o.goal, 50)) + '</td>' +
          '<td>' + (o.weightPct != null ? o.weightPct + '%' : '—') + '</td>' +
          '<td>' + (o.score != null
            ? '<b style="color:' + scoreColor(o.score) + '">' + o.score + '</b>'
            : '<span class="pj-noscore">未打分</span>') + '</td>' +
          '<td>' + esc(o.deptHead) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>' +

      // 按人卡片网格
      '<div class="pj-sec-title" style="margin-top:22px">按人视图 <span class="cnt">' + peopleN + ' 人</span></div>' +
      '<div class="pj-grid">' +
      Object.keys(groupAgg).map(function (key) {
        var list = groupAgg[key];
        var firstDept = list[0].dept || '跨部门/未填';
        return '<div class="pj-card" data-key="' + esc(key) + '">' +
          '<div class="nm">' + esc(key) + '</div>' +
          '<div class="post">' + esc(firstDept) + ' · ' + list.length + ' 项目标</div>' +
          '</div>';
      }).join('') +
      '</div>' +

      // 页脚
      '<div class="pj-foot"><span>数据来源：飞书 OGSM绩效目标考核(70%-85%)7月（只读快照，正式维护在飞书）· 同步于 ' + esc(meta.syncedAt || '—') + '</span>' +
      (meta.baseToken ? '<a href="https://oralvictor.feishu.cn/base/' + esc(meta.baseToken) + '" target="_blank" rel="noopener">打开飞书原表 ↗</a>' : '') +
      '</div>' +

      '</div></div>';
    view.innerHTML = html;

    // ---------- 图表（每个 init 后 U.registerChart）----------
    if (typeof echarts !== 'undefined') {
      // 左：部门分布柱状图
      var deptNames = Object.keys(deptAgg).sort(function (a, b) { return deptAgg[b] - deptAgg[a]; });
      var deptBar = echarts.init(U.el('pjDept'));
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

      // 右：打分状态饼图（已打分绿 / 未打分红，强提示「未评分」）
      var scorePie = echarts.init(U.el('pjScore'));
      U.registerChart(scorePie);
      scorePie.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
        legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        series: [{
          type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
          label: {
            fontSize: 12,
            formatter: function (p) {
              if (p.name === '未打分') return '未评分\n' + p.value + ' 条';
              return p.name + '\n' + p.value + ' 条';
            }
          },
          data: [
            { name: '已打分', value: scoredN, itemStyle: { color: '#18A058' } },
            { name: '未打分', value: unsavedN, itemStyle: { color: '#E5484D' } }
          ]
        }]
      });
    }

    // ---------- 按人卡片 → 弹窗（事件委托，复用 perf.js 范式）----------
    var grid = view.querySelector('.pj-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.pj-card') : null;
        if (!card) return;
        var key = card.getAttribute('data-key');
        var list = groupAgg[key] || [];
        if (!list.length) return;
        var rows = list.map(function (o) {
          return '<div class="pj-field"><label>' + esc(o.goal || '（无目标描述）') + '</label>' +
            '<div class="v">权重：' + (o.weightPct != null ? o.weightPct + '%' : '—') +
            ' ｜ 打分：<b style="color:' + scoreColor(o.score) + '">' + (o.score != null ? o.score : '未打分') + '</b>' +
            ' ｜ 周期：' + esc(o.cycle || '—') + ' ｜ 部门负责人：' + esc(o.deptHead || '—') + '</div></div>';
        }).join('');
        var mask = document.createElement('div');
        mask.innerHTML = '<div class="pj-mask show" id="pjMask"><div class="pj-modal">' +
          '<h3>' + esc(key) + '</h3>' +
          '<div class="m-sub">' + esc(list[0].dept || '跨部门/未填') + ' · ' + list.length + ' 个7月目标</div>' +
          rows +
          '<div class="pj-acts"><button class="pj-btn" id="pjClose">关闭</button></div>' +
          '</div></div>';
        document.body.appendChild(mask.firstChild);
        var m = U.el('pjMask');
        m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.id === 'pjClose') m.remove(); });
      // 阶段三 M2：绩效主流程嵌合 AI 初评助手（健壮按需加载，对齐 6月页）
      var pjAi = U.el('pjAi');
      if (pjAi) pjAi.onclick = function () {
        if (window.AiPilot && window.AiPilot.quickAssess) { window.AiPilot.quickAssess('perf', '月度绩效·7月'); return; }
        var s = document.createElement('script'); s.src = 'js/ai_pilot.js';
        s.onload = function () { if (window.AiPilot && window.AiPilot.quickAssess) window.AiPilot.quickAssess('perf', '月度绩效·7月'); else U.toast('数字员工组件加载失败', 'error'); };
        s.onerror = function () { U.toast('数字员工组件加载失败', 'error'); };
        document.head.appendChild(s);
      };
      });
    }
  }

  global.PerfJuly = { render: render };
})(window);

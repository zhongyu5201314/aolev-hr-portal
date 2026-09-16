/* =========================================================================
 * recruit.js — 人力资源板块 · 招聘·简历初筛 看板
 *   数据来源：recruit_data.js (window.RECRUIT_CANDIDATES / RECRUIT_JOBS / RECRUIT_META)
 *   来源系统：飞书「HR简历初筛神器」base（只读快照，正式维护在飞书）
 *   说明：候选人与职位为飞书快照；展示 AI 初筛结论（匹配度/邀约建议/风险预警/
 *        面试官提问建议/潜力激活建议）与招聘状态漏斗，点击候选人查看详情。
 * ========================================================================= */
(function (global) {
  'use strict';

  var CSS = '\
  .recruit{--rc:#5B5BD6;--rc2:#7C7CE0;--rc-bg:#F5F6FB;--rc-card:#fff;--rc-line:#E6E8F2;--rc-ink:#1F2733;--rc-muted:#7A8699;font-size:14px;color:var(--rc-ink)}\
  .recruit *{box-sizing:border-box}\
  .rec-head{background:linear-gradient(135deg,#5B5BD6,#7C7CE0);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}\
  .rec-head h1{font-size:18px;margin:0;font-weight:700}\
  .rec-head .sub{font-size:12px;opacity:.88;margin-top:3px}\
  .rec-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}\
  .rec-stat{background:rgba(255,255,255,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:78px}\
  .rec-stat b{display:block;font-size:20px;line-height:1.1}\
  .rec-stat span{font-size:11px;opacity:.9}\
  .rec-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px 22px 4px}\
  .rec-toolbar select{padding:7px 10px;border:1px solid var(--rc-line);border-radius:8px;font-family:inherit;font-size:13px;background:#fff}\
  .rec-toolbar .grow{margin-left:auto;font-size:12px;color:var(--rc-muted)}\
  .rec-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}\
  .rec-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 14px}\
  .rec-kpi{flex:1;min-width:150px;background:#fff;border:1px solid var(--rc-line);border-radius:12px;padding:14px 16px}\
  .rec-kpi b{display:block;font-size:24px;color:var(--rc);line-height:1.1}\
  .rec-kpi span{font-size:12px;color:var(--rc-muted)}\
  .rec-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}\
  .rec-chart-box{background:#fff;border:1px solid var(--rc-line);border-radius:12px;padding:12px 14px}\
  .rec-chart-box h4{margin:0 0 8px;font-size:14px;color:var(--rc)}\
  .rec-chart{width:100%;height:240px}\
  .rec-sec-title{font-size:15px;font-weight:700;color:var(--rc);margin:6px 0 10px;display:flex;align-items:center;gap:8px}\
  .rec-sec-title .cnt{font-size:12px;font-weight:600;color:var(--rc-muted);background:var(--rc-bg);padding:1px 9px;border-radius:10px}\
  .rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}\
  .rec-card{background:var(--rc-card);border:1px solid var(--rc-line);border-radius:12px;padding:13px;cursor:pointer;transition:.15s;box-shadow:0 1px 2px rgba(20,40,80,.05)}\
  .rec-card:hover{box-shadow:0 5px 16px rgba(20,40,80,.13);transform:translateY(-1px)}\
  .rec-card .top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}\
  .rec-card .nm{font-size:15px;font-weight:700}\
  .rec-card .pos{font-size:12px;color:var(--rc-muted);margin-top:1px}\
  .rec-card .score{font-size:22px;font-weight:800;line-height:1;border-radius:10px;padding:6px 9px;color:#fff;flex:none}\
  .rec-card .badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}\
  .rec-badge{font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600}\
  .rec-card .risk{font-size:12px;color:#B4541B;background:#FFF6E9;border-radius:8px;padding:6px 8px;line-height:1.45;max-height:54px;overflow:hidden}\
  .rec-card .edu{font-size:12px;color:var(--rc-muted);margin-top:7px}\
  .rec-jobs{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--rc-line);border-radius:12px;overflow:hidden;margin-top:6px}\
  .recruit th,.recruit td{padding:9px 12px;border-bottom:1px solid var(--rc-line);text-align:left;vertical-align:top;font-size:13px}\
  .recruit th{background:#EEF0FA;font-weight:700}\
  .recruit tr:nth-child(even) td{background:#FAFBFE}\
  .rec-foot{padding:12px 22px;color:var(--rc-muted);font-size:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}\
  .rec-foot a{color:var(--rc);font-weight:600}\
  .rec-mask{position:fixed;inset:0;background:rgba(20,30,50,.45);display:none;align-items:center;justify-content:center;z-index:60}\
  .rec-mask.show{display:flex}\
  .rec-modal{background:#fff;width:min(620px,94vw);border-radius:14px;padding:20px 22px;max-height:90vh;overflow:auto}\
  .rec-modal h3{margin:0 0 4px;color:var(--rc);font-size:17px}\
  .rec-modal .m-sub{font-size:12px;color:var(--rc-muted);margin-bottom:14px}\
  .rec-field{margin-bottom:12px}\
  .rec-field label{display:block;font-size:12px;color:var(--rc-muted);margin-bottom:4px;font-weight:600}\
  .rec-field .v{font-size:13px;line-height:1.6;white-space:pre-wrap}\
  .rec-field .v.warn{color:#B4541B;background:#FFF6E9;border-radius:8px;padding:8px 10px}\
  .rec-field.risk .v{color:#B4541B}\
  .rec-acts{display:flex;justify-content:flex-end;margin-top:6px}\
  .rec-btn{border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--rc);color:#fff}\
  @media(max-width:760px){.rec-charts{grid-template-columns:1fr}}';

  function injectCss() {
    if (document.getElementById('recruitCss')) return;
    var s = document.createElement('style');
    s.id = 'recruitCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  function matchColor(m) {
    m = Number(m) || 0;
    if (m >= 80) return '#18A058';
    if (m >= 70) return '#2D8CF0';
    return '#E5484D';
  }
  function inviteClass(inv) {
    if (inv && inv.indexOf('高匹配') >= 0) return { c: '#18A058', t: '高匹配·推荐邀约' };
    if (inv && inv.indexOf('中匹配') >= 0) return { c: '#2D8CF0', t: '中匹配·建议邀约' };
    if (inv && inv.indexOf('低匹配') >= 0) return { c: '#E5484D', t: '低匹配·谨慎' };
    if (inv && inv.indexOf('暂无') >= 0) return { c: '#9AA0B5', t: '暂无结果·请稍等' };
    if (inv && inv.indexOf('无匹配') >= 0) return { c: '#9AA0B5', t: '无匹配类别' };
    return { c: '#9AA0B5', t: inv || '未评估' };
  }
  function statusClass(st) {
    if (!st) return { c: '#9AA0B5', t: '初筛中·未定' };
    if (st.indexOf('未通过') >= 0 || st.indexOf('未录用') >= 0 || st.indexOf('拒绝') >= 0) return { c: '#E5484D', t: st };
    if (st.indexOf('录用') >= 0) return { c: '#18A058', t: st };
    if (st.indexOf('通过') >= 0) return { c: '#2D8CF0', t: st };
    return { c: '#F0A020', t: st };
  }
  function badge(t, c) {
    return '<span class="rec-badge" style="background:' + c + '22;color:' + c + '">' + esc(t) + '</span>';
  }

  var _state = { pos: '全部', inv: '全部' };

  function filtered(cands) {
    return cands.filter(function (c) {
      if (_state.pos !== '全部' && c.position !== _state.pos) return false;
      if (_state.inv !== '全部') {
        var ic = inviteClass(c.invite);
        if (ic.t !== _state.inv) return false;
      }
      return true;
    });
  }

  function cardHtml(c) {
    var mc = matchColor(c.match);
    var ic = inviteClass(c.invite);
    var sc = statusClass(c.status);
    var score = c.match ? c.match : '—';
    var riskPrev = (c.risk || '').split('\n')[0] || '无显著风险';
    return '<div class="rec-card" data-id="' + esc(c.id) + '">' +
      '<div class="top"><div><div class="nm">' + esc(c.name) + '</div>' +
      '<div class="pos">' + esc(c.position || '—') + (c.education ? ' · ' + esc(c.education) : '') + '</div></div>' +
      '<div class="score" style="background:' + mc + '">' + esc(score) + '</div></div>' +
      '<div class="badges">' + badge(ic.t, ic.c) + badge(sc.t, sc.c) + '</div>' +
      '<div class="risk">⚠️ ' + esc(riskPrev) + '</div></div>';
  }

  function detailHtml(c) {
    var ic = inviteClass(c.invite);
    var sc = statusClass(c.status);
    function field(label, val, cls) {
      return '<div class="rec-field ' + (cls || '') + '"><label>' + esc(label) + '</label>' +
        '<div class="v ' + (cls === 'risk' ? 'warn' : '') + '">' + esc(val || '—') + '</div></div>';
    }
    return '<div class="rec-mask show" id="recMask"><div class="rec-modal">' +
      '<h3>' + esc(c.name) + (c.match ? ' · 匹配度 ' + esc(c.match) : '') + '</h3>' +
      '<div class="m-sub">' + esc(c.position || '—') + (c.education ? ' · ' + esc(c.education) : '') +
      ' · 面试官：' + esc(c.interviewer || '—') + (c.apply_time ? ' · 投递：' + esc(c.apply_time) : '') + '</div>' +
      '<div class="badges" style="margin-bottom:12px">' + badge(ic.t, ic.c) + badge(sc.t, sc.c) + '</div>' +
      field('⚠️ 风险预警', c.risk, 'risk') +
      field('❓ 面试官提问建议', c.questions) +
      field('🎯 潜力激活建议', c.potential) +
      field('简历解析内容', c.resume_parsed) +
      '<div class="rec-acts"><button class="rec-btn" id="recClose">关闭</button></div>' +
      '</div></div>';
  }

  function renderCharts(cands) {
    if (typeof echarts === 'undefined') return;
    // 邀约建议分布
    var invCount = {};
    cands.forEach(function (c) { var t = inviteClass(c.invite).t; invCount[t] = (invCount[t] || 0) + 1; });
    var invOrder = ['高匹配·推荐邀约', '中匹配·建议邀约', '低匹配·谨慎', '暂无结果·请稍等', '无匹配类别'];
    var invData = invOrder.filter(function (k) { return invCount[k]; }).map(function (k) {
      return { name: k, value: invCount[k] };
    });
    var invColors = { '高匹配·推荐邀约': '#18A058', '中匹配·建议邀约': '#2D8CF0', '低匹配·谨慎': '#E5484D', '暂无结果·请稍等': '#9AA0B5', '无匹配类别': '#C9CCDA' };
    var c1 = echarts.init(document.getElementById('recChartInvite'));
    U.registerChart(c1);
    c1.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
        label: { formatter: '{b}\n{c}', fontSize: 11 },
        data: invData.map(function (d) { return { name: d.name, value: d.value, itemStyle: { color: invColors[d.name] } }; })
      }]
    });
    // 招聘状态分布
    var stCount = {};
    cands.forEach(function (c) { var t = statusClass(c.status).t; stCount[t] = (stCount[t] || 0) + 1; });
    var stOrder = ['初筛中·未定', '初筛待面试', '初筛未通过', '一面待面试', '一面通过', '一面未通过', '二面待面试', '二面通过', '二面未通过', '终面待面试', '终面通过', '终面未通过', '录用待确认', '已录用', '已拒绝'];
    var stData = stOrder.filter(function (k) { return stCount[k]; }).map(function (k) { return [k, stCount[k]]; });
    var c2 = echarts.init(document.getElementById('recChartStatus'));
    U.registerChart(c2);
    c2.setOption({
      tooltip: {}, grid: { left: 8, right: 18, top: 10, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      yAxis: { type: 'category', data: stData.map(function (d) { return d[0]; }), axisLabel: { fontSize: 11 } },
      series: [{ type: 'bar', data: stData.map(function (d) { return d[1]; }), itemStyle: { color: '#5B5BD6', borderRadius: [0, 4, 4, 0] }, barWidth: '58%' }]
    });
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['人力资源', '招聘·简历初筛']);
    var cands = global.RECRUIT_CANDIDATES || [];
    var jobs = global.RECRUIT_JOBS || [];
    var meta = global.RECRUIT_META || {};

    var total = cands.length;
    var jobN = jobs.length;
    var high = cands.filter(function (c) { return Number(c.match) >= 80; }).length;
    var recommend = cands.filter(function (c) { return (c.invite || '').indexOf('高匹配') >= 0; }).length;
    var posOpts = [];
    cands.forEach(function (c) { if (c.position && posOpts.indexOf(c.position) < 0) posOpts.push(c.position); });

    var html = '<div class="recruit">' +
      '<div class="rec-head"><div><h1>🧲 招聘 · 简历初筛</h1>' +
      '<div class="sub">飞书「HR简历初筛神器」只读快照 · 共 ' + total + ' 位候选人 · ' + jobN + ' 个在招职位</div></div>' +
      '<div class="rec-stats">' +
      '<div class="rec-stat"><b>' + total + '</b><span>候选人</span></div>' +
      '<div class="rec-stat"><b>' + jobN + '</b><span>在招职位</span></div>' +
      '<div class="rec-stat"><b>' + high + '</b><span>高匹配≥80</span></div>' +
      '<div class="rec-stat"><b>' + recommend + '</b><span>推荐邀约</span></div>' +
      '</div></div>' +
      '<div class="rec-toolbar">' +
      '<label>应聘职位：</label><select id="recPos"><option value="全部">全部</option>' +
      posOpts.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('') +
      '</select>' +
      '<label>邀约建议：</label><select id="recInv"><option value="全部">全部</option>' +
      ['高匹配·推荐邀约', '中匹配·建议邀约', '低匹配·谨慎', '暂无结果·请稍等', '无匹配类别'].map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('') +
      '</select>' +
      '<button id="recAi" style="padding:7px 14px;border-radius:9px;border:1px solid rgba(74,158,255,.5);background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;font-size:13px;white-space:nowrap">🤖 AI 初筛</button>' +
      '<span class="grow">点击候选人卡片查看 AI 风险预警 / 面试官提问建议 / 潜力激活建议</span>' +
      '</div>' +
      '<div class="rec-main">' +
      '<div class="rec-charts">' +
      '<div class="rec-chart-box"><h4>邀约建议分布</h4><div id="recChartInvite" class="rec-chart"></div></div>' +
      '<div class="rec-chart-box"><h4>招聘状态分布</h4><div id="recChartStatus" class="rec-chart"></div></div>' +
      '</div>' +
      '<div class="rec-sec-title">候选人列表 <span class="cnt" id="recCnt">' + total + '</span></div>' +
      '<div class="rec-grid" id="recGrid">' + cands.map(cardHtml).join('') + '</div>' +
      '<div class="rec-sec-title" style="margin-top:22px">在招职位 <span class="cnt">' + jobN + '</span></div>' +
      '<table class="rec-jobs"><thead><tr><th>职位</th><th>部门</th><th>需求</th><th>已入职</th><th>进度</th><th>HR负责人</th></tr></thead><tbody>' +
      jobs.map(function (j) {
        return '<tr><td>' + esc(j.title) + '</td><td>' + esc(j.dept) + '</td><td>' + esc(j.demand) +
          '</td><td>' + esc(j.hired || '—') + '</td><td>' + esc(j.progress || '—') + '</td><td>' + esc(j.hr) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '</div>' +
      '<div class="rec-foot"><span>数据来源：飞书 HR简历初筛神器（只读快照，正式维护在飞书）</span>' +
      (meta.url ? '<a href="' + esc(meta.url) + '" target="_blank" rel="noopener">打开飞书原表 ↗</a>' : '') +
      '</div>' +
      '</div>';
    view.innerHTML = html;

    // 图表
    renderCharts(cands);

    // 过滤交互
    function applyFilter() {
      var list = filtered(cands);
      U.el('recGrid').innerHTML = list.length ? list.map(cardHtml).join('') : '<div style="color:#7A8699;padding:20px">无符合条件的候选人</div>';
      var cnt = U.el('recCnt'); if (cnt) cnt.textContent = list.length;
    }
    var posSel = U.el('recPos'), invSel = U.el('recInv');
    if (posSel) posSel.addEventListener('change', function () { _state.pos = posSel.value; applyFilter(); });
    if (invSel) invSel.addEventListener('change', function () { _state.inv = invSel.value; applyFilter(); });

    // 候选人详情弹窗（事件委托）
    U.el('recGrid').addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.rec-card') : null;
      if (!card) return;
      var id = card.getAttribute('data-id');
      var c = cands.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      var mask = document.createElement('div');
      mask.innerHTML = detailHtml(c);
      document.body.appendChild(mask.firstChild);
      var m = U.el('recMask');
      m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.id === 'recClose') m.remove(); });
    });

    // 阶段三 M2：招聘主流程嵌合 AI 初筛助手（健壮按需加载，AiPilot 未就绪时自动拉取）
    var recAi = U.el('recAi');
    if (recAi) recAi.onclick = function () {
      if (window.AiPilot && window.AiPilot.quickAssess) { window.AiPilot.quickAssess('resume', '招聘·简历初筛'); return; }
      var s = document.createElement('script'); s.src = 'js/ai_pilot.js';
      s.onload = function () { if (window.AiPilot && window.AiPilot.quickAssess) window.AiPilot.quickAssess('resume', '招聘·简历初筛'); else U.toast('数字员工组件加载失败', 'error'); };
      s.onerror = function () { U.toast('数字员工组件加载失败', 'error'); };
      document.head.appendChild(s);
    };
  }

  global.Recruit = { render: render };
})(window);

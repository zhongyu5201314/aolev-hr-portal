/* =========================================================================
 * training.js — 人力资源板块 · 培训·课程管理 看板
 *   数据来源：training_data.js
 *     (window.TRAINING_COURSES / PLANS / FEEDBACK / POSTMAP / EXAMS / HOMEWORK / META)
 *   来源系统：飞书「【底表】培训管理系统」（只读快照，飞书为权威源）
 *   说明：课程中心(卡片+详情) / 岗位地图(可筛选表) / 培训计划 / 考试中心 /
 *        反馈作业(空状态) + 4 个 echarts 图表；点击课程卡弹详情遮罩。
 *   范式：与「招聘·简历初筛」(recruit.js) 同构，作用域 class 前缀 .tr。
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ---------- 模块级数据缓存（render 时刷新，供 helper / 图表共用） ---------- */
  var COURSES = [], PLANS = [], POSTMAP = [], EXAMS = [], FEEDBACK = [], HOMEWORK = [], META = {};

  /* ---------- 作用域 CSS（幂等注入，id=trainingCss） ---------- */
  var CSS = '\
  .tr{--tr:#2D8CF0;--tr2:#36CFC9;--tr-bg:#F0F7FF;--tr-card:#fff;--tr-line:#E3EDFB;--tr-ink:#1F2733;--tr-muted:#7A8699;font-size:14px;color:var(--tr-ink)}\
  .tr *{box-sizing:border-box}\
  .tr-head{background:linear-gradient(135deg,#2D8CF0,#36CFC9);color:#fff;padding:16px 22px;border-radius:12px 12px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px}\
  .tr-head h1{font-size:18px;margin:0;font-weight:700}\
  .tr-head .sub{font-size:12px;opacity:.9;margin-top:3px}\
  .tr-stats{display:flex;gap:12px;margin-left:auto;flex-wrap:wrap}\
  .tr-stat{background:rgba(255,255,255,.16);border-radius:10px;padding:8px 14px;text-align:center;min-width:84px}\
  .tr-stat b{display:block;font-size:20px;line-height:1.1}\
  .tr-stat span{font-size:11px;opacity:.92}\
  .tr-main{padding:10px 22px 22px;max-width:1280px;margin:0 auto}\
  .tr-kpis{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 14px}\
  .tr-kpi{flex:1;min-width:150px;background:#fff;border:1px solid var(--tr-line);border-radius:12px;padding:14px 16px}\
  .tr-kpi b{display:block;font-size:24px;color:var(--tr);line-height:1.1}\
  .tr-kpi span{font-size:12px;color:var(--tr-muted)}\
  .tr-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}\
  .tr-chart-box{background:#fff;border:1px solid var(--tr-line);border-radius:12px;padding:12px 14px}\
  .tr-chart-box h4{margin:0 0 8px;font-size:14px;color:var(--tr)}\
  .tr-chart{width:100%;height:240px}\
  .tr-sec-title{font-size:15px;font-weight:700;color:var(--tr);margin:6px 0 10px;display:flex;align-items:center;gap:8px}\
  .tr-sec-title .cnt{font-size:12px;font-weight:600;color:var(--tr-muted);background:var(--tr-bg);padding:1px 9px;border-radius:10px}\
  .tr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}\
  .tr-card{background:var(--tr-card);border:1px solid var(--tr-line);border-radius:12px;padding:13px;cursor:pointer;transition:.15s;box-shadow:0 1px 2px rgba(20,40,80,.05)}\
  .tr-card:hover{box-shadow:0 5px 16px rgba(20,40,80,.13);transform:translateY(-1px)}\
  .tr-card .top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}\
  .tr-card .nm{font-size:15px;font-weight:700}\
  .tr-card .owner{font-size:12px;color:var(--tr-muted);margin-top:1px}\
  .tr-card .badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}\
  .tr-badge{font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600}\
  .tr-card .desc{font-size:12px;color:var(--tr-muted);line-height:1.5;max-height:36px;overflow:hidden;margin-bottom:8px}\
  .tr-card .links{display:flex;gap:10px;flex-wrap:wrap;font-size:12px}\
  .tr-link{color:var(--tr);font-weight:600;text-decoration:none}\
  .tr-link:hover{text-decoration:underline}\
  .tr-pending{color:#9AA0B5;font-size:12px}\
  .tr-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:0 0 10px}\
  .tr-toolbar select{padding:7px 10px;border:1px solid var(--tr-line);border-radius:8px;font-family:inherit;font-size:13px;background:#fff}\
  .tr-toolbar .grow{margin-left:auto;font-size:12px;color:var(--tr-muted)}\
  .tr-posts-wrap{overflow-x:auto;border:1px solid var(--tr-line);border-radius:12px;margin-top:6px}\
  .tr-posts{width:100%;border-collapse:collapse;background:#fff;min-width:640px}\
  .tr-posts th,.tr-posts td{padding:9px 12px;border-bottom:1px solid var(--tr-line);text-align:left;vertical-align:top;font-size:13px}\
  .tr-posts th{background:#EAF3FF;font-weight:700;white-space:nowrap}\
  .tr-posts tr:last-child td{border-bottom:none}\
  .tr-posts tr:nth-child(even) td{background:#FAFCFF}\
  .tr-plan{background:var(--tr-card);border:1px solid var(--tr-line);border-radius:12px;padding:14px 16px;margin-top:6px}\
  .tr-plan .p-name{font-size:16px;font-weight:700;color:var(--tr)}\
  .tr-plan .p-owner{font-size:12px;color:var(--tr-muted);margin-top:2px}\
  .tr-plan .p-desc{font-size:13px;line-height:1.6;color:var(--tr-ink);white-space:pre-wrap;margin:8px 0}\
  .tr-plan .rel{font-size:13px;color:var(--tr-muted);margin-top:6px}\
  .tr-plan .tr-badges{margin:8px 0 0}\
  .tr-exam{display:flex;align-items:center;gap:14px;background:var(--tr-card);border:1px solid var(--tr-line);border-radius:12px;padding:14px 16px;margin-top:6px}\
  .tr-exam .e-title{font-size:15px;font-weight:700}\
  .tr-exam .e-sub{font-size:12px;color:var(--tr-muted);margin-top:2px}\
  .tr-exam .e-act{margin-left:auto;flex:none}\
  .tr-btn{border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:13px;background:var(--tr);color:#fff;text-decoration:none;display:inline-block;white-space:nowrap}\
  .tr-btn:hover{filter:brightness(.96)}\
  .tr-empty2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px}\
  .tr-empty{background:var(--tr-card);border:1px dashed var(--tr-line);border-radius:12px;padding:22px;text-align:center}\
  .tr-empty .ico{font-size:30px;opacity:.75}\
  .tr-empty .t1{font-size:14px;font-weight:700;margin:8px 0 4px;color:var(--tr-ink)}\
  .tr-empty .t2{font-size:12px;color:var(--tr-muted);line-height:1.5}\
  .tr-foot{padding:14px 0 4px;color:var(--tr-muted);font-size:12px}\
  .tr-mask{position:fixed;inset:0;background:rgba(20,30,50,.45);display:none;align-items:center;justify-content:center;z-index:60}\
  .tr-mask.show{display:flex}\
  .tr-modal{background:#fff;width:min(640px,94vw);border-radius:14px;padding:20px 22px;max-height:90vh;overflow:auto}\
  .tr-modal h3{margin:0 0 4px;color:var(--tr);font-size:17px}\
  .tr-modal .m-sub{font-size:12px;color:var(--tr-muted);margin-bottom:14px}\
  .tr-modal .tr-badges{margin-bottom:10px}\
  .tr-field{margin-bottom:12px}\
  .tr-field label{display:block;font-size:12px;color:var(--tr-muted);margin-bottom:4px;font-weight:600}\
  .tr-field .v{font-size:13px;line-height:1.6;white-space:pre-wrap}\
  .tr-acts{display:flex;justify-content:flex-end;margin-top:6px}\
  @media(max-width:760px){.tr-charts{grid-template-columns:1fr}.tr-empty2{grid-template-columns:1fr}}';

  function injectCss() {
    if (document.getElementById('trainingCss')) return;
    var s = document.createElement('style');
    s.id = 'trainingCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- 通用 helper ---------- */
  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  // 解析飞书 markdown 链接串：[显示文本](url) → {text,url}；空/不符返回 null
  function parseLink(s) {
    if (!s) return null;
    var m = String(s).trim().match(/\[([^\]]*)\]\(([^)]*)\)/);
    if (!m || !m[2]) return null;
    return { text: m[1], url: m[2] };
  }

  // owner 兼容 字符串 / [{id,name}] 数组，统一返回可读文本
  function ownerText(v) {
    if (v == null) return '—';
    if (Array.isArray(v)) {
      var ns = v.map(function (x) { return (x && typeof x === 'object') ? x.name : x; }).filter(Boolean);
      return ns.join('、') || '—';
    }
    return String(v);
  }

  // 跨表关联 id 反查名称（未来关联填充后生效）
  function resolveNames(ids, src) {
    if (!ids || !ids.length) return '';
    var names = [];
    ids.forEach(function (id) {
      for (var i = 0; i < src.length; i++) {
        if (src[i].id === id) {
          var o = src[i];
          names.push(ownerText(o.name !== undefined ? o.name : o.postName));
          break;
        }
      }
    });
    return names.length ? names.join('、') : '';
  }

  function hashStr(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  // 固定配色映射（标签 / 岗位类型），未知走系统 PALETTE 循环
  var TAG_COLORS = { '必修课程': '#2D8CF0', '新员工培训': '#18A058', '技术类': '#13C2C2', '销售类': '#F0A020', '管理类': '#8B5CF6' };
  var TYPE_COLORS = { '职能': '#2D8CF0', '管理': '#8B5CF6', '技术': '#13C2C2', '运营': '#F0A020', '服务': '#18A058' };
  function tagColor(t) { return TAG_COLORS[t] || global.CONST.PALETTE[Math.abs(hashStr(t)) % global.CONST.PALETTE.length]; }
  function postTypeColor(t) { return TYPE_COLORS[t] || global.CONST.PALETTE[Math.abs(hashStr(t)) % global.CONST.PALETTE.length]; }

  function badge(t, c) {
    return '<span class="tr-badge" style="background:' + c + '22;color:' + c + '">' + esc(t) + '</span>';
  }

  // postType 兼容 单值字符串 / 未来数组
  function typesOf(p) {
    var t = p.postType;
    return Array.isArray(t) ? t : (t ? [t] : []);
  }

  // 链接或「待补充」
  function linkHtml(s) {
    var l = parseLink(s);
    if (!l || !l.url) return '<span class="tr-pending">待补充</span>';
    return '<a class="tr-link" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.text || l.url) + ' ↗</a>';
  }

  // 空数据图表占位
  function emptyChart(c, text) {
    c.setOption({ graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: text || '暂无数据', fill: '#999', fontSize: 13 } }] });
  }

  /* ---------- 各区块渲染 ---------- */
  function kpiCard(label, val) {
    var zero = (val === 0);
    return '<div class="tr-kpi"><b style="' + (zero ? 'color:var(--tr-muted)' : '') + '">' + val + '</b><span>' + esc(label) + '</span></div>';
  }

  function courseCard(c) {
    var tags = (c.tags || []).map(function (t) { return badge(t, tagColor(t)); }).join('');
    var v = parseLink(c.video), r = parseLink(c.resource);
    var vHtml = v ? '<a class="tr-link" href="' + esc(v.url) + '" target="_blank" rel="noopener">🎬 视频</a>'
                  : '<span class="tr-pending">🎬 待补充</span>';
    var rHtml = r ? '<a class="tr-link" href="' + esc(r.url) + '" target="_blank" rel="noopener">📎 资源</a>'
                  : '<span class="tr-pending">📎 待补充</span>';
    return '<div class="tr-card" data-id="' + esc(c.id) + '">' +
      '<div class="top"><div><div class="nm">' + esc(c.name) + '</div>' +
      '<div class="owner">负责人：' + esc(ownerText(c.owner)) + '</div></div></div>' +
      (tags ? '<div class="badges">' + tags + '</div>' : '') +
      '<div class="desc">' + esc(c.desc || '') + '</div>' +
      '<div class="links">' + vHtml + rHtml + '</div></div>';
  }

  function courseDetail(c) {
    var tags = (c.tags || []).map(function (t) { return badge(t, tagColor(t)); }).join('');
    var v = parseLink(c.video), r = parseLink(c.resource);
    var vDisp = v ? '<a class="tr-link" href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.text) + ' ↗</a>' : '待补充（飞书 link 尚未填写）';
    var rDisp = r ? '<a class="tr-link" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.text) + ' ↗</a>' : '待补充（飞书 link 尚未填写）';
    var planNames = resolveNames(c.plan, PLANS);
    var postNames = resolveNames(c.postmap, POSTMAP);
    var planDisp = planNames ? planNames : '待补充（飞书 link 尚未填写）';
    var postDisp = postNames ? postNames : '待补充（飞书 link 尚未填写）';
    var fbDisp = (c.feedbackIds && c.feedbackIds.length) ? (c.feedbackIds.length + ' 条') : '待补充（飞书 link 尚未填写）';
    function field(label, val) {
      return '<div class="tr-field"><label>' + esc(label) + '</label><div class="v">' + val + '</div></div>';
    }
    return '<div class="tr-mask show" id="trMask"><div class="tr-modal">' +
      '<h3>' + esc(c.name) + '</h3>' +
      '<div class="m-sub">负责人：' + esc(ownerText(c.owner)) + '</div>' +
      (tags ? '<div class="tr-badges">' + tags + '</div>' : '') +
      field('📹 视频', vDisp) +
      field('📎 资源', rDisp) +
      field('📝 课程简介', esc(c.desc || '—')) +
      field('🔗 关联培训计划', planDisp) +
      field('🎯 关联岗位', postDisp) +
      field('💬 学员反馈', fbDisp) +
      '<div class="tr-acts"><button class="tr-btn" id="trClose">关闭</button></div>' +
      '</div></div>';
  }

  function postRow(p) {
    var types = typesOf(p).map(function (t) { return badge(t, postTypeColor(t)); }).join('');
    var rec = resolveNames(p.recCourses, COURSES);
    var recDisp = rec ? rec : '<span class="tr-pending">待补充</span>';
    return '<tr><td>' + esc(p.postName) + '</td><td>' + types + '</td><td>' + esc(p.dept) + '</td>' +
      '<td title="' + esc(p.ability) + '" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.ability) + '</td>' +
      '<td>' + recDisp + '</td></tr>';
  }

  function planPanel(p) {
    var fit = (p.fitPost || []).map(function (t) { return badge(t, '#8B5CF6'); }).join('');
    var courseNames = resolveNames(p.courses, COURSES);
    var courseDisp = courseNames ? courseNames : '待补充（飞书 link 尚未填写）';
    return '<div class="tr-plan"><div class="p-name">' + esc(p.name) + '</div>' +
      '<div class="p-owner">负责人：' + esc(ownerText(p.owner)) + '</div>' +
      (fit ? '<div class="tr-badges">' + fit + '</div>' : '') +
      '<div class="p-desc">' + esc(p.desc || '—') + '</div>' +
      '<div class="rel">关联课程：' + courseDisp + '</div></div>';
  }

  function examCard(e) {
    var l = parseLink(e.paperLink);
    var href = l ? l.url : '#';
    var text = l ? l.text : (e.title || '查看试卷');
    return '<div class="tr-exam"><div><div class="e-title">' + esc(e.title) + '</div>' +
      '<div class="e-sub">试卷 / 答案 · 飞书文档</div></div>' +
      '<div class="e-act"><a class="tr-btn" href="' + esc(href) + '" target="_blank" rel="noopener">📝 ' + esc(text) + ' ↗</a></div></div>';
  }

  function emptyBlock(ico, t1, t2) {
    return '<div class="tr-empty"><div class="ico">' + ico + '</div><div class="t1">' + esc(t1) + '</div><div class="t2">' + esc(t2) + '</div></div>';
  }

  /* ---------- 图表（4 个 ECharts，统一 U.registerChart 注册） ---------- */
  function renderCharts() {
    if (typeof echarts === 'undefined') return;

    // C1 岗位类型分布（饼图 doughnut）
    var typeCount = {};
    POSTMAP.forEach(function (p) { typesOf(p).forEach(function (t) { typeCount[t] = (typeCount[t] || 0) + 1; }); });
    var c1data = Object.keys(typeCount).map(function (k) { return { name: k, value: typeCount[k], itemStyle: { color: postTypeColor(k) } }; });
    var c1 = echarts.init(U.el('trChartPostType'));
    U.registerChart(c1);
    if (c1data.length) {
      c1.setOption({
        tooltip: { trigger: 'item' }, legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { formatter: '{b}\n{c}', fontSize: 11 }, data: c1data }]
      });
    } else emptyChart(c1, '暂无数据');

    // C2 部门分布（横向条形图，按数量降序）
    var deptCount = {};
    POSTMAP.forEach(function (p) { if (p.dept) deptCount[p.dept] = (deptCount[p.dept] || 0) + 1; });
    var deptArr = Object.keys(deptCount).map(function (k) { return [k, deptCount[k]]; });
    deptArr.sort(function (a, b) { return b[1] - a[1]; });
    var c2 = echarts.init(U.el('trChartDept'));
    U.registerChart(c2);
    if (deptArr.length) {
      c2.setOption({
        tooltip: {}, grid: { left: 8, right: 18, top: 10, bottom: 8, containLabel: true },
        xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        yAxis: { type: 'category', data: deptArr.map(function (d) { return d[0]; }), axisLabel: { fontSize: 11 } },
        series: [{ type: 'bar', data: deptArr.map(function (d) { return d[1]; }), itemStyle: { color: '#2D8CF0', borderRadius: [0, 4, 4, 0] }, barWidth: '58%' }]
      });
    } else emptyChart(c2, '暂无数据');

    // C3 课程标签分布（饼图 doughnut）
    var tagCount = {};
    COURSES.forEach(function (c) { (c.tags || []).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; }); });
    var c3data = Object.keys(tagCount).map(function (k) { return { name: k, value: tagCount[k], itemStyle: { color: tagColor(k) } }; });
    var c3 = echarts.init(U.el('trChartTags'));
    U.registerChart(c3);
    if (c3data.length) {
      c3.setOption({
        tooltip: { trigger: 'item' }, legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { formatter: '{b}\n{c}', fontSize: 11 }, data: c3data }]
      });
    } else emptyChart(c3, '暂无数据');

    // C4 计划覆盖岗位族（条形图）
    var planCount = {};
    PLANS.forEach(function (p) { (p.fitPost || []).forEach(function (t) { planCount[t] = (planCount[t] || 0) + 1; }); });
    var c4arr = Object.keys(planCount).map(function (k) { return [k, planCount[k]]; });
    var c4 = echarts.init(U.el('trChartPlanPost'));
    U.registerChart(c4);
    if (c4arr.length) {
      c4.setOption({
        tooltip: {}, grid: { left: 8, right: 18, top: 10, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: c4arr.map(function (d) { return d[0]; }), axisLabel: { fontSize: 11, interval: 0 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [{ type: 'bar', data: c4arr.map(function (d) { return d[1]; }), itemStyle: { color: '#8B5CF6', borderRadius: [4, 4, 0, 0] }, barWidth: '52%' }]
      });
    } else emptyChart(c4, '暂无数据');
  }

  /* ---------- 主渲染 ---------- */
  var _filter = { dept: '全部', type: '全部' };

  function render() {
    injectCss();
    _filter.dept = '全部'; _filter.type = '全部'; // 每次进入重置筛选状态，避免路由切换后残留旧值
    var view = U.el('view');
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['人力资源', '培训·课程管理']);

    COURSES = global.TRAINING_COURSES || [];
    PLANS = global.TRAINING_PLANS || [];
    POSTMAP = global.TRAINING_POSTMAP || [];
    EXAMS = global.TRAINING_EXAMS || [];
    FEEDBACK = global.TRAINING_FEEDBACK || [];
    HOMEWORK = global.TRAINING_HOMEWORK || [];
    META = global.TRAINING_META || {};

    var synced = META.syncedAt || '—';

    // 岗位地图筛选下拉选项
    var deptOpts = [];
    var deptSeen = {};
    POSTMAP.forEach(function (p) { if (p.dept && !deptSeen[p.dept]) { deptSeen[p.dept] = 1; deptOpts.push(p.dept); } });
    var typeSeen = {};
    POSTMAP.forEach(function (p) { typesOf(p).forEach(function (t) { typeSeen[t] = 1; }); });
    var typeOpts = Object.keys(typeSeen);

    var html = '<div class="tr">' +
      '<div class="tr-head"><div><h1>📚 培训 · 课程管理</h1>' +
      '<div class="sub">飞书「【底表】培训管理系统」只读快照 · 同步于 ' + esc(synced) +
      ' · 共 ' + COURSES.length + ' 门课程 / ' + PLANS.length + ' 培训计划 / ' + POSTMAP.length + ' 岗位</div></div>' +
      '<div class="tr-stats">' +
      '<div class="tr-stat"><b>' + COURSES.length + '</b><span>课程</span></div>' +
      '<div class="tr-stat"><b>' + POSTMAP.length + '</b><span>岗位</span></div>' +
      '<div class="tr-stat"><b>' + EXAMS.length + '</b><span>考试</span></div>' +
      '</div></div>' +
      '<div class="tr-main">' +
      // KPI 概览条
      '<div class="tr-kpis">' +
      kpiCard('课程总数', COURSES.length) +
      kpiCard('培训计划', PLANS.length) +
      kpiCard('岗位地图', POSTMAP.length) +
      kpiCard('考试中心', EXAMS.length) +
      kpiCard('课程反馈', FEEDBACK.length) +
      kpiCard('作业提交', HOMEWORK.length) +
      '</div>' +
      // 图表区
      '<div class="tr-charts">' +
      '<div class="tr-chart-box"><h4>岗位类型分布</h4><div id="trChartPostType" class="tr-chart"></div></div>' +
      '<div class="tr-chart-box"><h4>部门分布</h4><div id="trChartDept" class="tr-chart"></div></div>' +
      '<div class="tr-chart-box"><h4>课程标签分布</h4><div id="trChartTags" class="tr-chart"></div></div>' +
      '<div class="tr-chart-box"><h4>计划覆盖岗位族</h4><div id="trChartPlanPost" class="tr-chart"></div></div>' +
      '</div>' +
      // ① 课程中心
      '<div class="tr-sec-title">① 课程中心 <span class="cnt">' + COURSES.length + '</span></div>' +
      '<div class="tr-grid" id="trGrid">' + (COURSES.length ? COURSES.map(courseCard).join('') : '<div class="tr-pending" style="padding:20px">暂无课程</div>') + '</div>' +
      // ② 岗位地图
      '<div class="tr-sec-title" style="margin-top:22px">② 岗位地图 <span class="cnt" id="trPostCnt">' + POSTMAP.length + '</span></div>' +
      '<div class="tr-toolbar">' +
      '<label>部门：</label><select id="trDept"><option value="全部">全部</option>' +
      deptOpts.map(function (d) { return '<option value="' + esc(d) + '">' + esc(d) + '</option>'; }).join('') + '</select>' +
      '<label>岗位类型：</label><select id="trPostType"><option value="全部">全部</option>' +
      typeOpts.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('') + '</select>' +
      '<span class="grow">按部门 / 岗位类型前端筛选（共 ' + POSTMAP.length + ' 个岗位）</span>' +
      '</div>' +
      '<div class="tr-posts-wrap"><table class="tr-posts"><thead><tr>' +
      '<th>岗位名称</th><th>岗位类型</th><th>部门</th><th>能力要求</th><th>推荐课程</th>' +
      '</tr></thead><tbody id="trPostsBody">' + POSTMAP.map(postRow).join('') + '</tbody></table></div>' +
      // ③ 培训计划
      '<div class="tr-sec-title" style="margin-top:22px">③ 培训计划 <span class="cnt">' + PLANS.length + '</span></div>' +
      (PLANS.length ? PLANS.map(planPanel).join('') : '<div class="tr-pending" style="padding:20px">暂无培训计划</div>') +
      // ④ 考试中心
      '<div class="tr-sec-title" style="margin-top:22px">④ 考试中心 <span class="cnt">' + EXAMS.length + '</span></div>' +
      (EXAMS.length ? EXAMS.map(examCard).join('') : '<div class="tr-pending" style="padding:20px">暂无考试</div>') +
      // ⑤ 反馈与作业
      '<div class="tr-sec-title" style="margin-top:22px">⑤ 反馈与作业</div>' +
      '<div class="tr-empty2">' +
      emptyBlock('📝', '暂无课程反馈', '学员满意度将在培训结束后由飞书回收 · 数据维护于飞书') +
      emptyBlock('📂', '暂无作业提交', '学员课后作业将在此汇总 · 数据维护于飞书') +
      '</div>' +
      '<div class="tr-foot">数据来源：飞书「【底表】培训管理系统」（只读快照，正式维护在飞书）' +
      (synced ? ' · 同步 ' + esc(synced) : '') + '</div>' +
      '</div></div>';

    view.innerHTML = html;

    // 图表
    renderCharts();

    // 岗位地图筛选
    function applyFilter() {
      var list = POSTMAP.filter(function (p) {
        if (_filter.dept !== '全部' && p.dept !== _filter.dept) return false;
        if (_filter.type !== '全部' && typesOf(p).indexOf(_filter.type) < 0) return false;
        return true;
      });
      var tb = U.el('trPostsBody');
      if (tb) tb.innerHTML = list.length ? list.map(postRow).join('')
        : '<tr><td colspan="5" style="text-align:center;color:#9AA0B5;padding:18px">无符合条件的岗位</td></tr>';
      var cnt = U.el('trPostCnt'); if (cnt) cnt.textContent = list.length;
    }
    var deptSel = U.el('trDept'), typeSel = U.el('trPostType');
    if (deptSel) deptSel.addEventListener('change', function () { _filter.dept = deptSel.value; applyFilter(); });
    if (typeSel) typeSel.addEventListener('change', function () { _filter.type = typeSel.value; applyFilter(); });

    // 课程卡片 → 详情弹窗（事件委托）
    var grid = U.el('trGrid');
    if (grid) grid.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) return; // 让链接自行跳转
      var card = e.target.closest ? e.target.closest('.tr-card') : null;
      if (!card) return;
      var id = card.getAttribute('data-id');
      var c = null;
      for (var i = 0; i < COURSES.length; i++) { if (COURSES[i].id === id) { c = COURSES[i]; break; } }
      if (!c) return;
      var old = U.el('trMask'); if (old) old.remove();
      var mask = document.createElement('div');
      mask.innerHTML = courseDetail(c);
      document.body.appendChild(mask.firstChild);
      var m = U.el('trMask');
      m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.id === 'trClose') m.remove(); });
    });
  }

  global.Training = { render: render };
})(window);

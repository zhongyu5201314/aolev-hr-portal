/* =========================================================================
 * report_board.js — 日周月报报表模块（飞书日报 × OGSM 实时同步）
 *   数据来源：report_data.js
 *     - window.DAILY_REPORTS  （日报，month 形如 "2026年6月"）
 *     - window.WEEKLY_REPORTS （周报，无 month，cycle 形如 "2026年6月第2周"）
 *     - window.OGSM_GOALS_JULY（OGSM 目标，id/goal/objective/owner_name/...）
 *     - window.REPORT_META    （daily_count / weekly_count / synced_at ...）
 *   作用域前缀：.rb（深色科技风 #0f0f1a 系，OGSM 标签蓝紫渐变 pill）
 *   范式：复用 perf.js / module_selector.js 的 injectCss(唯一 id 防重) +
 *        U.escapeHtml 安全渲染 + 事件委托弹窗；本页不调 echarts / U.registerChart。
 *   红线：reporter_id(ou_) 不展示；月报由前端聚合（飞书无月报原始表）；
 *        周报月份从 cycle 正则提取；目标未匹配降级显示，不造假。
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  /* ---------- 注入作用域 CSS（唯一 id 防重复）---------- */
  var CSS = [
    '.rb{--rb-bg:#0f0f1a;--rb-panel:rgba(30,30,56,.55);--rb-card:#1a1a32;--rb-card-hover:#222244;--rb-border:rgba(255,255,255,.10);--rb-line:rgba(74,158,255,.40);--rb-accent:#4a9eff;--rb-accent2:#8b5cf6;--rb-ink:#e8e8f0;--rb-muted:#8888aa;font-size:14px;color:var(--rb-ink)}',
    '.rb *{box-sizing:border-box}',
    /* 页面容器：深色铺满 #view（负 margin 抵消 .main 内边距，侧栏/顶栏浅色壳不动） */
    '.rb-page{background:var(--rb-bg);margin:-18px -22px -40px;padding:28px 22px 40px;min-height:calc(100vh - 56px)}',
    /* 头部 */
    '.rb-head h1{font-size:20px;font-weight:700;margin:0 0 4px;color:#fff}',
    '.rb-head .sub{font-size:12px;color:var(--rb-muted);margin:0 0 16px}',
    /* 筛选条（吸顶） */
    '.rb-filter{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:rgba(15,15,26,.85);backdrop-filter:blur(6px);padding:10px 12px;border:1px solid var(--rb-border);border-radius:12px;margin-bottom:14px}',
    '.rb-filter select,.rb-filter input{background:var(--rb-card);color:var(--rb-ink);border:1px solid var(--rb-border);border-radius:8px;padding:6px 10px;font-size:13px}',
    '.rb-filter .rb-reset{margin-left:auto;background:transparent;color:var(--rb-accent);border:1px solid var(--rb-line);border-radius:8px;padding:6px 14px;cursor:pointer}',
    '.rb-filter .rb-reset:hover{background:rgba(74,158,255,.12)}',
    /* 三 Tab */
    '.rb-tabs{display:flex;gap:6px;margin-bottom:14px}',
    '.rb-tab{padding:8px 18px;border-radius:10px;cursor:pointer;color:var(--rb-muted);border:1px solid transparent;font-size:14px;font-weight:600;transition:.2s}',
    '.rb-tab:hover{color:var(--rb-ink);background:var(--rb-card)}',
    '.rb-tab.is-active{color:#fff;background:linear-gradient(135deg,var(--rb-accent),var(--rb-accent2));box-shadow:0 4px 14px rgba(74,158,255,.3)}',
    /* 卡片网格 + 卡片（半透明面板 + 细边框） */
    '.rb-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(360px,1fr))}',
    '.rb-card{background:var(--rb-panel);border:1px solid var(--rb-border);border-radius:14px;padding:14px 16px;cursor:pointer;transition:.18s;backdrop-filter:blur(2px)}',
    '.rb-card:hover{border-color:var(--rb-line);background:var(--rb-card-hover);transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.35)}',
    '.rb-card .rb-head-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
    '.rb-card .rb-name{font-size:15px;font-weight:700;color:#fff}',
    '.rb-card .rb-date{font-size:12px;color:var(--rb-muted)}',
    '.rb-tag{border-radius:999px;padding:1px 9px;font-size:11px;border:1px solid var(--rb-border);color:var(--rb-muted)}',
    '.rb-tag--dept{color:#bcd2ff;border-color:rgba(74,158,255,.4);background:rgba(74,158,255,.10)}',
    '.rb-sub{font-size:11px;color:var(--rb-muted);margin:-2px 0 8px}',
    '.rb-field{margin:7px 0}',
    '.rb-field label{display:block;font-size:11px;color:var(--rb-muted);font-weight:600;margin-bottom:2px}',
    '.rb-field .v{font-size:13px;line-height:1.6;color:var(--rb-ink);white-space:pre-wrap;word-break:break-word}',
    /* 折叠区（原生 details） */
    '.rb-more{margin-top:6px}',
    '.rb-more summary{cursor:pointer;font-size:12px;color:var(--rb-accent);list-style:none;user-select:none}',
    '.rb-more summary::-webkit-details-marker{display:none}',
    /* OGSM 目标标签（蓝紫渐变 pill，全页最强视觉锚点） */
    '.rb-goals{margin-top:2px}',
    '.rb-goal-tag{display:inline-flex;align-items:center;gap:4px;margin:8px 6px 0 0;padding:3px 11px;border-radius:999px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--rb-accent),var(--rb-accent2));border:1px solid rgba(255,255,255,.18);transition:.18s}',
    '.rb-goal-tag:hover{box-shadow:0 0 12px rgba(139,92,246,.5);transform:translateY(-1px)}',
    /* 月报：KPI / 月份切换 / 排行 / 热力 */
    '.rb-kpis{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}',
    '.rb-kpi{flex:1;min-width:150px;background:var(--rb-panel);border:1px solid var(--rb-border);border-radius:12px;padding:14px 16px}',
    '.rb-kpi b{display:block;font-size:24px;color:var(--rb-accent);line-height:1.1}',
    '.rb-kpi span{font-size:12px;color:var(--rb-muted)}',
    '.rb-month-switch{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}',
    '.rb-month-switch button{padding:7px 18px;border-radius:10px;border:1px solid var(--rb-border);background:var(--rb-card);color:var(--rb-muted);cursor:pointer;font-size:13px;font-weight:600;transition:.18s}',
    '.rb-month-switch button:hover{color:var(--rb-ink)}',
    '.rb-month-switch button.is-active{color:#fff;border-color:var(--rb-line);background:linear-gradient(135deg,var(--rb-accent),var(--rb-accent2))}',
    '.rb-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}',
    '.rb-sec-title{font-size:15px;font-weight:700;color:#fff;margin:0 0 10px}',
    '.rb-rank{background:var(--rb-panel);border:1px solid var(--rb-border);border-radius:12px;padding:12px 14px;margin-bottom:16px}',
    '.rb-rank-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px dashed var(--rb-border);cursor:pointer}',
    '.rb-rank-item:first-of-type{border-top:none}',
    '.rb-rank-item:hover{color:var(--rb-accent)}',
    '.rb-rank .cnt{margin-left:auto;font-size:12px;color:var(--rb-accent);font-weight:700}',
    '.rb-heat{background:var(--rb-panel);border:1px solid var(--rb-border);border-radius:12px;padding:12px 14px}',
    '.rb-heat-row{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px}',
    '.rb-heat-row .nm{width:84px;flex:none;color:var(--rb-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rb-bar{flex:1;height:14px;border-radius:7px;background:rgba(255,255,255,.06);overflow:hidden}',
    '.rb-bar i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,var(--rb-accent),var(--rb-accent2))}',
    '.rb-heat-row .num{width:28px;text-align:right;color:var(--rb-muted)}',
    '.rb-hint{font-size:11px;color:var(--rb-muted)}',
    '.rb-time{color:var(--rb-muted);font-size:13px;display:inline-flex;align-items:center;gap:6px}',
    /* 弹窗（复用 perf.js mask 结构，类名换 rb） */
    '.rb-mask{position:fixed;inset:0;background:rgba(8,8,16,.6);display:none;align-items:center;justify-content:center;z-index:60}',
    '.rb-mask.show{display:flex}',
    '.rb-modal{background:#16162c;width:min(640px,94vw);border:1px solid var(--rb-line);border-radius:14px;padding:20px 22px;max-height:90vh;overflow:auto}',
    '.rb-modal h3{margin:0 0 4px;color:#fff;font-size:17px}',
    '.rb-modal .m-sub{font-size:12px;color:var(--rb-muted);margin-bottom:14px}',
    '.rb-modal .rb-field{margin-bottom:12px}',
    '.rb-acts{display:flex;justify-content:flex-end;margin-top:6px}',
    '.rb-btn{border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-size:13px;background:linear-gradient(135deg,var(--rb-accent),var(--rb-accent2));color:#fff}',
    /* 空态 / 加载态 */
    '.rb-empty{text-align:center;color:var(--rb-muted);padding:48px 0;font-size:14px}',
    '.rb-empty .ico{font-size:34px;display:block;margin-bottom:8px}',
    /* 响应式 */
    '@media(max-width:760px){.rb-grid{grid-template-columns:1fr}.rb-cols{grid-template-columns:1fr}.rb-page{padding:22px 14px 36px}.rb-filter .rb-reset{margin-left:0}}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('reportBoardCss')) return;
    var s = document.createElement('style');
    s.id = 'reportBoardCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }

  /* ---------- 模块内前端状态 ---------- */
  var state = {
    tab: 'daily', // 'daily' | 'weekly' | 'monthly'
    filters: { person: 'all', dept: 'all', start: '', end: '', weekMonth: 'all' },
    month: ''     // 月报选中月份（默认最新）
  };

  /* ---------- 周报月份提取（红线：正则提取 cycle 中的 "YYYY年M月"）---------- */
  function weekMonth(w) {
    var m = (w.cycle || '').match(/(\d{4}年\d{1,2}月)/);
    return m ? m[1] : '未标注';
  }
  // 月份标签 → 可排序数值（"2026年6月" → 2026*12+6）
  function monthKey(label) {
    var m = (label || '').match(/(\d{4})年(\d{1,2})月/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
  }

  /* ---------- 月份列表（日报.month ∪ 周报.cycle 提取；去重排序）---------- */
  function monthList() {
    var s = {};
    (global.DAILY_REPORTS || []).forEach(function (d) { if (d.month) s[d.month] = 1; });
    (global.WEEKLY_REPORTS || []).forEach(function (w) {
      var m = weekMonth(w); if (m && m !== '未标注') s[m] = 1;
    });
    return Object.keys(s).sort(function (a, b) { return monthKey(a) - monthKey(b); });
  }

  function distinctPersons(tab) {
    var src = tab === 'weekly' ? (global.WEEKLY_REPORTS || []) : (global.DAILY_REPORTS || []);
    var s = {}; src.forEach(function (r) { if (r.reporter_name) s[r.reporter_name] = 1; });
    return Object.keys(s).sort();
  }
  function distinctDepts(tab) {
    var src = tab === 'weekly' ? (global.WEEKLY_REPORTS || []) : (global.DAILY_REPORTS || []);
    var s = {}; src.forEach(function (r) { if (r.dept) s[r.dept] = 1; });
    return Object.keys(s).sort();
  }
  function distinctWeekMonths() {
    var s = {}; (global.WEEKLY_REPORTS || []).forEach(function (w) {
      var m = weekMonth(w); if (m && m !== '未标注') s[m] = 1;
    });
    return Object.keys(s).sort(function (a, b) { return monthKey(a) - monthKey(b); });
  }

  /* ---------- 字段块（空值统一显示 —）---------- */
  function field(label, value) {
    var v = (value == null || value === '') ? '—' : esc(value);
    return '<div class="rb-field"><label>' + esc(label) + '</label><div class="v">' + v + '</div></div>';
  }
  function kpi(label, value, empty) {
    return '<div class="rb-kpi"><b>' + (empty ? '—' : value) + '</b><span>' + esc(label) + '</span></div>';
  }
  function emptyState(label, ico) {
    return '<div class="rb-empty"><span class="ico">' + ico + '</span>暂无符合条件的' + esc(label) + '</div>';
  }

  /* ---------- OGSM 目标标签组 ---------- */
  function goalTags(goals, goalIds) {
    goals = goals || []; goalIds = goalIds || [];
    if (!goals.length) return '';
    var html = goals.map(function (g, i) {
      var gid = goalIds[i] != null ? goalIds[i] : '';
      return '<span class="rb-goal-tag" data-goal-id="' + esc(gid) + '" data-goal-name="' + esc(g) + '">🎯 ' + esc(g) + '</span>';
    }).join('');
    return '<div class="rb-goals">' + html + '</div>';
  }

  /* ====================== 日报卡片 ====================== */
  function dailyCard(d) {
    return '<div class="rb-card" data-id="' + esc(d.id) + '" data-tab="daily">' +
      '<div class="rb-head-row">' +
        '<span class="rb-name">👤 ' + esc(d.reporter_name) + '</span>' +
        '<span class="rb-date">🗓️ ' + esc(d.date) + '</span>' +
        '<span class="rb-tag rb-tag--dept">' + esc(d.dept) + '</span>' +
      '</div>' +
      (d.dept_head ? '<div class="rb-sub">负责人：' + esc(d.dept_head) + '</div>' : '') +
      field('① 关键动作', d.key_actions) +
      field('② 日常工作', d.daily_work) +
      field('③ 突发工作', d.emergency) +
      field('④ 明天计划', d.tomorrow_plan) +
      '<details class="rb-more"><summary>展开更多 ▾</summary>' +
        field('难题策略', d.problem_strategy) +
        field('AI提效', d.ai_efficiency) +
      '</details>' +
      goalTags(d.ogsm_goal, d.ogsm_goal_ids) +
      '</div>';
  }

  /* ====================== 周报卡片 ====================== */
  function weeklyCard(w) {
    return '<div class="rb-card" data-id="' + esc(w.id) + '" data-tab="weekly">' +
      '<div class="rb-head-row">' +
        '<span class="rb-name">👤 ' + esc(w.reporter_name) + '</span>' +
        '<span class="rb-date">🗓️ ' + esc(w.cycle) + '</span>' +
        '<span class="rb-tag rb-tag--dept">' + esc(w.dept) + '</span>' +
      '</div>' +
      (w.dept_head ? '<div class="rb-sub">负责人：' + esc(w.dept_head) + '</div>' : '') +
      field('🎯 关联目标进展', w.goal_progress) +
      field('🔥 本周关键动作', w.key_actions) +
      field('📝 本周总结', w.summary) +
      '<details class="rb-more"><summary>展开更多 ▾</summary>' +
        field('💡 改进建议', w.improvement) +
        field('⚠️ 本周难题', w.problems) +
      '</details>' +
      goalTags(w.ogsm_goal, w.ogsm_goal_ids) +
      '</div>';
  }

  /* ====================== 过滤 ====================== */
  function filteredDaily() {
    var f = state.filters;
    return (global.DAILY_REPORTS || []).filter(function (d) {
      if (f.person !== 'all' && d.reporter_name !== f.person) return false;
      if (f.dept !== 'all' && d.dept !== f.dept) return false;
      if (f.start && d.date < f.start) return false;
      if (f.end && d.date > f.end) return false;
      return true;
    });
  }
  function filteredWeekly() {
    var f = state.filters;
    return (global.WEEKLY_REPORTS || []).filter(function (w) {
      if (f.person !== 'all' && w.reporter_name !== f.person) return false;
      if (f.dept !== 'all' && w.dept !== f.dept) return false;
      if (f.weekMonth !== 'all' && weekMonth(w) !== f.weekMonth) return false;
      return true;
    });
  }

  /* ====================== 月报聚合 ====================== */
  function aggregateMonth(monthLabel) {
    var D = global.DAILY_REPORTS || [];
    var W = global.WEEKLY_REPORTS || [];
    var G = global.OGSM_GOALS_JULY || [];
    var dIn = D.filter(function (d) { return d.month === monthLabel; });
    var wIn = W.filter(function (w) { return weekMonth(w) === monthLabel; });

    // 填报人数（去重）：优先 reporter_id，回退 reporter_name
    var reporters = {};
    dIn.forEach(function (d) { reporters[d.reporter_id || d.reporter_name] = 1; });
    wIn.forEach(function (w) { reporters[w.reporter_id || w.reporter_name] = 1; });

    // 活跃部门数
    var depts = {};
    dIn.concat(wIn).forEach(function (r) { if (r.dept) depts[r.dept] = 1; });

    // Top 关联 OGSM 目标榜（累计当月日报+周报的 ogsm_goal_ids 出现次数，取前 10）
    var goalCnt = {};
    dIn.concat(wIn).forEach(function (r) {
      (r.ogsm_goal_ids || []).forEach(function (gid) { goalCnt[gid] = (goalCnt[gid] || 0) + 1; });
    });
    var topGoals = Object.keys(goalCnt).map(function (gid) {
      var g = G.find(function (x) { return x.id === gid; });
      return { id: gid, count: goalCnt[gid], goal: (g && g.goal) ? g.goal : '目标未匹配' };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 10);

    // 个人提交热力（每人 日报+周报 计数，降序）
    var perPerson = {};
    dIn.forEach(function (d) { var k = d.reporter_name; perPerson[k] = (perPerson[k] || 0) + 1; });
    wIn.forEach(function (w) { var k = w.reporter_name; perPerson[k] = (perPerson[k] || 0) + 1; });
    var heat = Object.keys(perPerson).map(function (n) { return { name: n, count: perPerson[n] }; })
      .sort(function (a, b) { return b.count - a.count; });

    return {
      dailyN: dIn.length, weeklyN: wIn.length,
      peopleN: Object.keys(reporters).length, deptN: Object.keys(depts).length,
      topGoals: topGoals, heat: heat
    };
  }

  /* ====================== 渲染：筛选条 / Tab / 列表 ====================== */
  function renderFilter() {
    var tab = state.tab;
    var personOpts = ['<option value="all">全部人员</option>'].concat(
      distinctPersons(tab).map(function (p) {
        return '<option value="' + esc(p) + '"' + (state.filters.person === p ? ' selected' : '') + '>' + esc(p) + '</option>';
      }));
    var deptOpts = ['<option value="all">全部部门</option>'].concat(
      distinctDepts(tab).map(function (d) {
        return '<option value="' + esc(d) + '"' + (state.filters.dept === d ? ' selected' : '') + '>' + esc(d) + '</option>';
      }));

    var timeCtrl = '';
    if (tab === 'daily') {
      timeCtrl = '<span class="rb-time">时间 ' +
        '<input type="date" data-f="start" value="' + esc(state.filters.start) + '"> ~ ' +
        '<input type="date" data-f="end" value="' + esc(state.filters.end) + '"></span>';
    } else if (tab === 'weekly') {
      var wkOpts = ['<option value="all">全部月份</option>'].concat(
        distinctWeekMonths().map(function (m) {
          return '<option value="' + esc(m) + '"' + (state.filters.weekMonth === m ? ' selected' : '') + '>' + esc(m) + '</option>';
        }));
      timeCtrl = '<span class="rb-time">月份 <select data-f="weekMonth">' + wkOpts.join('') + '</select></span>';
    }

    return '<div class="rb-filter">' +
      '<select data-f="person">' + personOpts.join('') + '</select>' +
      '<select data-f="dept">' + deptOpts.join('') + '</select>' +
      timeCtrl +
      '<button class="rb-reset">重置</button>' +
      '</div>';
  }

  function renderTabs() {
    var tabs = [['cockpit', '驾驶舱'], ['daily', '日报'], ['weekly', '周报'], ['monthly', '月报'], ['loop', '闭环管控']];
    return '<div class="rb-tabs">' + tabs.map(function (t) {
      return '<button class="rb-tab' + (state.tab === t[0] ? ' is-active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  function renderDailyList() {
    var list = filteredDaily();
    if (!list.length) return emptyState('日报', '📭');
    return '<div class="rb-grid">' + list.map(dailyCard).join('') + '</div>';
  }
  function renderWeeklyList() {
    var list = filteredWeekly();
    if (!list.length) return emptyState('周报', '📭');
    return '<div class="rb-grid">' + list.map(weeklyCard).join('') + '</div>';
  }

  function renderMonthly() {
    var months = monthList();
    var cur = state.month || months[months.length - 1] || '未标注';
    state.month = cur;
    var agg = aggregateMonth(cur);
    var empty = (agg.dailyN + agg.weeklyN) === 0;

    var switchHtml = '<div class="rb-month-switch">' + months.map(function (m) {
      return '<button data-month="' + esc(m) + '"' + (m === cur ? ' class="is-active"' : '') + '>' + esc(m) + '</button>';
    }).join('') + '</div>';

    var kpiHtml = '<div class="rb-kpis">' +
      kpi('日报条数', agg.dailyN, empty) +
      kpi('周报条数', agg.weeklyN, empty) +
      kpi('填报人数', agg.peopleN, empty) +
      kpi('活跃部门数', agg.deptN, empty) +
      '</div>';

    var rankHtml = '<div class="rb-rank"><div class="rb-sec-title">Top 关联 OGSM 目标</div>' +
      (agg.topGoals.length ? agg.topGoals.map(function (g) {
        return '<div class="rb-rank-item" data-goal-id="' + esc(g.id) + '" data-goal-name="' + esc(g.goal) + '">🎯 ' +
          esc(g.goal) + '<span class="cnt">' + g.count + ' 次关联</span></div>';
      }).join('') : '<div class="rb-empty" style="padding:20px 0">当月暂无 OGSM 关联</div>') +
      '</div>';

    var maxC = agg.heat.length ? agg.heat[0].count : 1;
    var heatHtml = '<div class="rb-heat"><div class="rb-sec-title">个人提交热力</div>' +
      (agg.heat.length ? agg.heat.map(function (h, idx) {
        var w = Math.max(6, Math.round(h.count / maxC * 100));
        var trophy = idx === 0 ? ' 🏆' : '';
        var hint = (idx === agg.heat.length - 1 || h.count === 1) ? ' <span class="rb-hint">可多沉淀日报/周报</span>' : '';
        return '<div class="rb-heat-row"><span class="nm">' + esc(h.name) + trophy + '</span>' +
          '<span class="rb-bar"><i style="width:' + w + '%"></i></span>' +
          '<span class="num">' + h.count + '</span>' + hint + '</div>';
      }).join('') : '<div class="rb-empty" style="padding:20px 0">该月暂无提交记录</div>') +
      '</div>';

    return switchHtml + kpiHtml + '<div class="rb-cols">' + rankHtml + heatHtml + '</div>';
  }

  function renderBodyHtml() {
    if (state.tab === 'daily') return renderDailyList();
    if (state.tab === 'weekly') return renderWeeklyList();
    if (state.tab === 'cockpit') {
      return (global.ReportCockpit && global.ReportCockpit.renderBody)
        ? global.ReportCockpit.renderBody()
        : '<div class="rb-empty"><span class="ico">⚠️</span>驾驶舱模块未加载（js/cockpit.js 缺失）</div>';
    }
    if (state.tab === 'loop') {
      // 闭环管控页自带统计口径与筛选，交由 report_loop.js 全权渲染
      return (global.ReportLoop && global.ReportLoop.renderBody)
        ? global.ReportLoop.renderBody()
        : '<div class="rb-empty"><span class="ico">⚠️</span>闭环管控模块未加载（js/report_loop.js 缺失）</div>';
    }
    return renderMonthly();
  }

  function renderMainHtml() {
    // 闭环管控页不使用日报/周报的「人员-部门-月份」筛选条（语义不同），故隐藏
    var filterHtml = (state.tab === 'loop' || state.tab === 'cockpit') ? '' : renderFilter();
    return filterHtml + renderTabs() + '<div class="rb-body" id="rbBody">' + renderBodyHtml() + '</div>';
  }

  /* ====================== 弹窗 ====================== */
  function openModal(title, sub, bodyHtml) {
    var mask = document.createElement('div');
    mask.innerHTML = '<div class="rb-mask show" id="rbMask"><div class="rb-modal">' +
      '<h3>' + esc(title) + '</h3>' +
      '<div class="m-sub">' + esc(sub) + '</div>' +
      bodyHtml +
      '<div class="rb-acts"><button class="rb-btn" id="rbClose">关闭</button></div>' +
      '</div></div>';
    document.body.appendChild(mask.firstChild);
    var m = U.el('rbMask');
    if (m) m.addEventListener('click', function (ev) {
      if (ev.target === m || ev.target.id === 'rbClose') m.remove();
    });
  }

  function openGoalModal(goalId, goalName) {
    var G = global.OGSM_GOALS_JULY || [];
    var g = null;
    if (goalId) g = G.find(function (x) { return x.id === goalId; });
    if (!g && goalName) g = G.find(function (x) { return x.goal === goalName; }); // id 未命中降级按名

    var body = g
      ? field('目的（Objective）', g.objective) +
        field('负责人', (g.owner_name || '—') + (g.post ? ' · ' + g.post : '')) +
        field('部门', g.dept) +
        field('周期', g.cycle) +
        field('权重', g.weightPct != null ? g.weightPct + '%' : '—') +
        field('打分', g.score != null ? g.score : '待打分') +
        field('关联日报数', (g.linked_daily_ids || []).length)
      : '<div class="rb-field"><div class="v">未找到匹配的目标（id=' + esc(goalId || '') + '）。</div></div>';

    openModal(g ? g.goal : '目标未匹配', 'OGSM 目标详情', body);
  }

  function openDetailModal(id, tab) {
    var list = tab === 'weekly' ? (global.WEEKLY_REPORTS || []) : (global.DAILY_REPORTS || []);
    var r = list.find(function (x) { return x.id === id; });
    if (!r) return;

    var isWeekly = tab === 'weekly';
    var title = (isWeekly ? '周报' : '日报') + ' · ' + r.reporter_name;
    var sub = (isWeekly ? '飞书周报' : '飞书日报') + ' · ' + (r.cycle || r.date || '');

    var body;
    if (isWeekly) {
      body = field('周期', r.cycle) + field('部门', r.dept) + field('负责人', r.dept_head) +
        field('关联目标进展', r.goal_progress) + field('本周关键动作', r.key_actions) +
        field('本周总结', r.summary) + field('改进建议', r.improvement) +
        field('本周难题', r.problems) + field('周报ID', r.weekly_id);
    } else {
      body = field('日期', r.date) + field('月份', r.month) + field('部门', r.dept) +
        field('负责人', r.dept_head) + field('关键动作', r.key_actions) +
        field('日常工作', r.daily_work) + field('突发工作', r.emergency) +
        field('明天计划', r.tomorrow_plan) + field('难题策略', r.problem_strategy) +
        field('AI提效', r.ai_efficiency) + field('日报ID', r.daily_id);
    }
    // 关联 OGSM 目标（可点击反查）
    var goals = r.ogsm_goal || [], goalIds = r.ogsm_goal_ids || [];
    if (goals.length) {
      body += '<div class="rb-field"><label>关联 OGSM 目标</label><div class="v">' + goals.map(function (g, i) {
        return '<span class="rb-goal-tag" data-goal-id="' + esc(goalIds[i] != null ? goalIds[i] : '') +
          '" data-goal-name="' + esc(g) + '">🎯 ' + esc(g) + '</span>';
      }).join('') + '</div></div>';
    }
    openModal(title, sub, body);
  }

  /* ====================== 事件委托 ====================== */
  function syncFiltersFromDom() {
    var main = U.el('rbMain'); if (!main) return;
    var nodes = main.querySelectorAll('[data-f]');
    for (var i = 0; i < nodes.length; i++) {
      state.filters[nodes[i].getAttribute('data-f')] = nodes[i].value;
    }
  }
  function resetFilters() {
    state.filters = { person: 'all', dept: 'all', start: '', end: '', weekMonth: 'all' };
    var main = U.el('rbMain'); if (main) main.innerHTML = renderMainHtml();
  }

  function onViewClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // 1) Tab 切换（不切路由）
    var tab = t.closest('.rb-tab');
    if (tab) {
      state.tab = tab.getAttribute('data-tab');
      var main = U.el('rbMain'); if (main) main.innerHTML = renderMainHtml();
      return;
    }
    // 1.5) 驾驶舱下钻（data-drill 切换页签，隔离于 tab 样式）
    var drill = t.closest('[data-drill]');
    if (drill) {
      state.tab = drill.getAttribute('data-drill');
      var main = U.el('rbMain'); if (main) main.innerHTML = renderMainHtml();
      return;
    }
    // 2) 重置
    if (t.closest('.rb-reset')) { resetFilters(); return; }
    // 3) 月报月份切换
    var mbtn = t.closest('.rb-month-switch button');
    if (mbtn) {
      state.month = mbtn.getAttribute('data-month');
      var body = U.el('rbBody'); if (body) body.innerHTML = renderMonthly();
      return;
    }
    // 4) OGSM 目标标签（优先级高于卡片，先判 → 仅开目标弹窗）
    var tag = t.closest('.rb-goal-tag');
    if (tag) { openGoalModal(tag.getAttribute('data-goal-id'), tag.getAttribute('data-goal-name')); return; }
    // 5) 月报 Top 榜项（目标弹窗）
    var rank = t.closest('.rb-rank-item');
    if (rank) { openGoalModal(rank.getAttribute('data-goal-id'), rank.getAttribute('data-goal-name')); return; }
    // 6) 折叠区内部点击（展开更多）仅触发原生 toggle，不开详情弹窗
    if (t.closest('.rb-more')) return;
    // 7) 卡片 → 详情弹窗
    var card = t.closest('.rb-card');
    if (card) { openDetailModal(card.getAttribute('data-id'), card.getAttribute('data-tab')); return; }
  }

  function onViewChange(e) {
    var el = e.target;
    if (!el || !el.closest) return;
    if (!el.closest('[data-f]')) return;
    syncFiltersFromDom();
    var body = U.el('rbBody'); if (body) body.innerHTML = renderBodyHtml();
  }

  function bindDelegation() {
    var view = U.el('view');
    if (!view || view.__rbBound) return;
    view.__rbBound = '1';
    view.addEventListener('click', onViewClick);
    view.addEventListener('change', onViewChange);
    // 闭环管控页签的一次性事件委托（自带月份选择器）
    if (global.ReportLoop && global.ReportLoop.bindOnce) global.ReportLoop.bindOnce();
  }

  /* ====================== 入口 ====================== */
  function render() {
    injectCss();
    var view = U.el('view');
    if (!view) return;
    if (global.App && global.App.setBreadcrumb) global.App.setBreadcrumb(['日周月报']);

    // 加载态：数据脚本未就绪
    if (!global.DAILY_REPORTS || !global.WEEKLY_REPORTS) {
      view.innerHTML = '<div class="rb"><div class="rb-page">' +
        '<div class="rb-empty"><span class="ico">⏳</span>数据加载中…</div></div></div>';
      return;
    }

    var meta = global.REPORT_META || {};
    var sub = '飞书日报×OGSM 实时同步 · 已沉淀 ' + (meta.daily_count || 0) + ' 条日报 / ' +
      (meta.weekly_count || 0) + ' 条周报 · 同步于 ' + (meta.synced_at || '—');

    view.innerHTML = '<div class="rb"><div class="rb-page">' +
      '<div class="rb-head"><h1>📊 日周月报</h1><p class="sub">' + esc(sub) + '</p></div>' +
      '<div class="rb-main" id="rbMain">' + renderMainHtml() + '</div>' +
      '</div></div>';

    bindDelegation();
  }

  // 全局导出（主名 ReportBoard，别名 Reports 兼容设计稿命名）
  global.ReportBoard = { render: render };
  global.Reports = global.ReportBoard;
})(window);

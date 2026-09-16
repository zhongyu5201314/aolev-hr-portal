/* =========================================================================
 * charts.js — 模块一：HR 数据看板
 * 全局筛选条 + KPI 指标卡 + 四大分析区（人数结构/考勤/绩效/薪酬人效）
 * 所有图表实时联动筛选（部门/周期）。
 * ========================================================================= */
(function (global) {
  'use strict';
  const C = global.CONST, U = global.U, HR = global.HR_DATA;

  let currentEmpList = []; // 当前筛选下的员工集合（供钻取使用）

  /* ---------- 数据计算 ---------- */
  function filteredEmployees(dept) {
    return dept === '全部' ? HR.employees.slice() : HR.employees.filter(function (e) { return e.dept === dept; });
  }
  function empIds(list) { return list.map(function (e) { return e.emp_id; }); }

  // 月度出勤率（按公式：(21.75 - 异常天数)/21.75，异常天按 leave_hours/8 与迟到早退 0.25 折算）
  // 注：年假/调休为已审批带薪假，不计入出勤率异常；仅事假/病假/缺勤/迟到早退影响出勤率
  function attendanceRate(ids, month) {
    const events = HR.attendance.filter(function (a) {
      return ids.indexOf(a.emp_id) >= 0 && String(a.date).slice(0, 7) === month;
    });
    const byEmp = {};
    events.forEach(function (a) { (byEmp[a.emp_id] = byEmp[a.emp_id] || []).push(a); });
    let sum = 0;
    ids.forEach(function (id) {
      let abn = 0;
      (byEmp[id] || []).forEach(function (a) {
        if (a.status === '请假' && (a.leave_type === '事假' || a.leave_type === '病假')) abn += (Number(a.leave_hours) || 0) / 8;
        else if (a.status === '缺勤') abn += (Number(a.leave_hours) || 0) / 8;
        else if (a.status === '迟到' || a.status === '早退') abn += 0.25;
      });
      sum += Math.max(0, (C.WORK_DAYS - abn) / C.WORK_DAYS);
    });
    return ids.length ? sum / ids.length : 0;
  }
  function hasAttMonth(month) {
    return HR.attendance.some(function (a) { return String(a.date).slice(0, 7) === month; });
  }
  function monthCost(ids, month) {
    return HR.compensation.filter(function (c) {
      return ids.indexOf(c.emp_id) >= 0 && c.month === month;
    }).reduce(function (s, c) { return s + (Number(c.total_cost) || 0); }, 0);
  }

  // 聚合计算结果
  function computeAll(list, month) {
    const ids = empIds(list);
    const idset = {};
    ids.forEach(function (i) { idset[i] = true; });
    const perfMap = {};
    HR.performance.forEach(function (p) { perfMap[p.emp_id] = p; });

    /* KPI */
    const headcount = list.length;
    const avgTenureY = list.length ? list.reduce(function (s, e) { return s + (Number(e.tenure) || 0); }, 0) / list.length / 12 : 0;
    const attRate = hasAttMonth(month) ? attendanceRate(ids, month) : null;
    const ogsmVals = list.map(function (e) { return perfMap[e.emp_id] ? Number(perfMap[e.emp_id].ogsm_completion) : null; }).filter(function (v) { return v !== null; });
    const avgOgsm = ogsmVals.length ? ogsmVals.reduce(function (a, b) { return a + b; }, 0) / ogsmVals.length : 0;
    const cost = monthCost(ids, month);
    const monthRevenueTarget = C.REVENUE_CHALLENGE / 12;
    const effRatio = cost > 0 ? monthRevenueTarget / cost : 0;

    // 环比（成本：与上月比；出勤率：与上一有数据月比）
    const mi = C.COMP_MONTHS.indexOf(month);
    const prevMonth = mi > 0 ? C.COMP_MONTHS[mi - 1] : null;
    let costTrend = null;
    if (prevMonth) {
      const prevCost = monthCost(ids, prevMonth);
      if (prevCost > 0) costTrend = (cost - prevCost) / prevCost;
    }
    let attTrend = null;
    const ai = C.ATT_MONTHS.indexOf(month);
    if (ai > 0 && hasAttMonth(month)) {
      const pm = C.ATT_MONTHS[ai - 1];
      const pr = attendanceRate(ids, pm);
      if (pr > 0) attTrend = attRate - pr;
    }

    const kpis = [
      { label: '在职总人数', value: U.fmtInt(headcount), unit: '人', trend: null, good: true },
      { label: '平均司龄', value: avgTenureY.toFixed(1), unit: '年', trend: null, good: true },
      { label: '月度出勤率', value: attRate === null ? '—' : U.pct(attRate), unit: '', trend: attTrend, good: true, reverse: false },
      { label: '平均 OGSM 完成率', value: U.pct(avgOgsm), unit: '', trend: null, good: true },
      { label: '月度人力成本', value: U.fmtWan(cost), unit: '', trend: costTrend, good: false },
      { label: '人效比（营收/成本）', value: effRatio ? effRatio.toFixed(1) + '×' : '—', unit: '', trend: null, good: true },
    ];

    /* ---- 图表配置 ---- */
    const opts = {};

    // 1) 部门分布（横向柱）
    const deptCounts = {};
    list.forEach(function (e) { deptCounts[e.dept] = (deptCounts[e.dept] || 0) + 1; });
    const deptKeys = C.DEPTS.filter(function (d) { return deptCounts[d]; });
    opts.deptDist = {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 18, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'value', name: '人' },
      yAxis: { type: 'category', data: deptKeys, inverse: true },
      series: [{ type: 'bar', data: deptKeys.map(function (d) { return deptCounts[d]; }),
        itemStyle: { color: C.PRIMARY, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' } }],
    };

    // 2) 职级分布（饼）
    const levelCounts = {};
    list.forEach(function (e) { levelCounts[e.level] = (levelCounts[e.level] || 0) + 1; });
    opts.levelDist = {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0, type: 'scroll' },
      series: [{ type: 'pie', radius: ['38%', '66%'], center: ['50%', '44%'],
        data: C.LEVELS.map(function (l) { return { name: l, value: levelCounts[l] || 0 }; }),
        label: { formatter: '{b}\n{c}' }, color: C.PALETTE }],
    };

    // 3) 性别比例（环形）
    let male = 0, female = 0;
    list.forEach(function (e) { if (e.gender === '男') male++; else if (e.gender === '女') female++; });
    opts.gender = {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'],
        data: [{ name: '男', value: male }, { name: '女', value: female }],
        label: { formatter: '{b}\n{c}' }, color: ['#2D8CF0', '#E5618E'] }],
      graphic: [{ type: 'text', left: 'center', top: '38%', style: { text: headcount + '\n人', textAlign: 'center', fill: '#1F2329', fontSize: 14, fontWeight: 'bold' } }],
    };

    // 4) 年龄段（柱）
    function ageBucket(a) { if (a < 25) return '<25'; if (a < 30) return '25-30'; if (a < 35) return '30-35'; if (a < 40) return '35-40'; return '40+'; }
    const ageOrder = ['<25', '25-30', '30-35', '35-40', '40+'];
    const ageCounts = {};
    list.forEach(function (e) { const b = ageBucket(Number(e.age)); ageCounts[b] = (ageCounts[b] || 0) + 1; });
    opts.age = {
      tooltip: { trigger: 'axis' }, grid: { left: 8, right: 14, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: ageOrder }, yAxis: { type: 'value', name: '人' },
      series: [{ type: 'bar', data: ageOrder.map(function (b) { return ageCounts[b] || 0; }),
        itemStyle: { color: C.PALETTE[3], borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top' } }],
    };

    // 5) 工龄分布（柱，按 tenure 月）
    function tenBucket(m) { if (m < 12) return '<1年'; if (m < 36) return '1-3年'; if (m < 60) return '3-5年'; return '5年以上'; }
    const tenOrder = ['<1年', '1-3年', '3-5年', '5年以上'];
    const tenCounts = {};
    list.forEach(function (e) { const b = tenBucket(Number(e.tenure)); tenCounts[b] = (tenCounts[b] || 0) + 1; });
    opts.tenure = {
      tooltip: { trigger: 'axis' }, grid: { left: 8, right: 14, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: tenOrder }, yAxis: { type: 'value', name: '人' },
      series: [{ type: 'bar', data: tenOrder.map(function (b) { return tenCounts[b] || 0; }),
        itemStyle: { color: C.PALETTE[2], borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top' } }],
    };

    // 6) 月度出勤率（折线，近3月有数据月）
    const attLine = C.ATT_MONTHS.map(function (m) { return hasAttMonth(m) ? +(attendanceRate(ids, m) * 100).toFixed(2) : null; });
    opts.attRate = {
      tooltip: { trigger: 'axis', valueFormatter: function (v) { return v == null ? '—' : v + '%'; } },
      grid: { left: 8, right: 14, top: 24, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: C.ATT_MONTHS },
      yAxis: { type: 'value', name: '出勤率%', min: 80, max: 100 },
      series: [{ type: 'line', smooth: true, data: attLine, symbolSize: 8,
        lineStyle: { width: 3, color: C.PALETTE[1] }, itemStyle: { color: C.PALETTE[1] },
        areaStyle: { color: 'rgba(45,140,240,0.12)' },
        markPoint: { data: [{ type: 'max', name: '最高' }] } }],
    };

    // 7) 迟到早退趋势（双折线）
    function cntStatus(st) { return HR.attendance.filter(function (a) { return ids.indexOf(a.emp_id) >= 0 && a.status === st; }); }
    const lateByM = {}, earlyByM = {};
    cntStatus('迟到').forEach(function (a) { const m = String(a.date).slice(0, 7); lateByM[m] = (lateByM[m] || 0) + 1; });
    cntStatus('早退').forEach(function (a) { const m = String(a.date).slice(0, 7); earlyByM[m] = (earlyByM[m] || 0) + 1; });
    opts.lateEarly = {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0 },
      grid: { left: 8, right: 14, top: 20, bottom: 28, containLabel: true },
      xAxis: { type: 'category', data: C.ATT_MONTHS }, yAxis: { type: 'value', name: '人次' },
      series: [
        { name: '迟到', type: 'line', smooth: true, data: C.ATT_MONTHS.map(function (m) { return lateByM[m] || 0; }), itemStyle: { color: C.PALETTE[4] }, lineStyle: { color: C.PALETTE[4] } },
        { name: '早退', type: 'line', smooth: true, data: C.ATT_MONTHS.map(function (m) { return earlyByM[m] || 0; }), itemStyle: { color: C.PALETTE[5] }, lineStyle: { color: C.PALETTE[5] } },
      ],
    };

    // 8) 请假类型分布（环形）
    const leaveByType = {};
    HR.attendance.filter(function (a) {
      return ids.indexOf(a.emp_id) >= 0 && a.status === '请假' && (month === 'ALL' || String(a.date).slice(0, 7) === month || !hasAttMonth(month));
    }).forEach(function (a) { if (a.leave_type) leaveByType[a.leave_type] = (leaveByType[a.leave_type] || 0) + 1; });
    const leaveData = C.LEAVE_TYPES.map(function (t) { return { name: t, value: leaveByType[t] || 0 }; });
    opts.leaveType = {
      tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
        data: leaveData, label: { formatter: '{b}\n{c}' }, color: C.PALETTE }],
    };

    // 9) OGSM 完成率（仪表盘）
    opts.ogsm = {
      series: [{ type: 'gauge', min: 0, max: 100, radius: '92%', center: ['50%', '58%'],
        progress: { show: true, width: 14 }, axisLine: { lineStyle: { width: 14 } },
        detail: { formatter: '{value}%', fontSize: 26, color: C.PRIMARY, offsetCenter: [0, '40%'] },
        data: [{ value: +avgOgsm.toFixed(1), name: 'OGSM 达成' }],
        title: { offsetCenter: [0, '72%'], fontSize: 12, color: '#646A73' } }],
    };

    // 10) 绩效等级分布（环形，4 色固定）
    const perfCounts = {};
    list.forEach(function (e) { const lv = perfMap[e.emp_id] ? perfMap[e.emp_id].perf_level : null; if (lv) perfCounts[lv] = (perfCounts[lv] || 0) + 1; });
    opts.perfLevel = {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
        data: C.PERF_LEVELS.map(function (lv) { return { name: lv, value: perfCounts[lv] || 0, itemStyle: { color: C.PERF_COLORS[lv] } }; }),
        label: { formatter: '{b}\n{c}' } }],
    };

    // 11) 各部门绩效对比（分组柱状，平均得分）
    const deptScores = {};
    list.forEach(function (e) { const p = perfMap[e.emp_id]; if (!p) return; (deptScores[e.dept] = deptScores[e.dept] || []).push(Number(p.score)); });
    const deptArr = Object.keys(deptScores);
    const deptAvg = deptArr.map(function (d) { const a = deptScores[d]; return +(a.reduce(function (x, y) { return x + y; }, 0) / a.length).toFixed(1); });
    opts.perfDept = {
      tooltip: { trigger: 'axis' }, grid: { left: 8, right: 14, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: deptArr, axisLabel: { interval: 0, rotate: deptArr.length > 4 ? 22 : 0 } },
      yAxis: { type: 'value', name: '均分', max: 100 },
      series: [{ type: 'bar', data: deptAvg, itemStyle: { color: C.PALETTE[0], borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top' }, markLine: { silent: true, symbol: 'none', data: [{ type: 'average', name: '均值' }], lineStyle: { color: '#F0A020' } } }],
    };

    // 12) 薪酬结构占比（环形，整体）
    const compRows = HR.compensation.filter(function (c) { return ids.indexOf(c.emp_id) >= 0 && c.month === month; });
    let sumBase = 0, sumPerf = 0, sumAllow = 0;
    compRows.forEach(function (c) { sumBase += Number(c.base) || 0; sumPerf += Number(c.performance_pay) || 0; sumAllow += Number(c.allowance) || 0; });
    opts.compStruct = {
      tooltip: { trigger: 'item', formatter: function (p) { return p.name + '：' + U.fmtWan(p.value) + ' (' + p.percent + '%)'; } },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
        data: [{ name: '基本工资', value: sumBase }, { name: '绩效工资', value: sumPerf }, { name: '津贴', value: sumAllow }],
        label: { formatter: '{b}\n{d}%' }, color: [C.PALETTE[0], C.PALETTE[1], C.PALETTE[2]] }],
    };

    // 13) 近 6 月人力成本趋势（面积折线）
    const costTrend6 = C.COMP_MONTHS.map(function (m) { return monthCost(ids, m); });
    opts.costTrend = {
      tooltip: { trigger: 'axis', valueFormatter: function (v) { return U.fmtWan(v); } },
      grid: { left: 8, right: 14, top: 20, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: C.COMP_MONTHS },
      yAxis: { type: 'value', name: '万元', axisLabel: { formatter: function (v) { return (v / 10000).toFixed(0); } } },
      series: [{ type: 'line', smooth: true, data: costTrend6, symbolSize: 7,
        lineStyle: { width: 3, color: C.PALETTE[0] }, itemStyle: { color: C.PALETTE[0] },
        areaStyle: { color: 'rgba(91,91,214,0.12)' } }],
    };

    // 14) 人效比看板（成本柱 + 人效比线 + 挑战目标参考线）
    const annualCost = costTrend6.reduce(function (a, b) { return a + b; }, 0) / 6 * 12;
    const effTarget = annualCost > 0 ? C.REVENUE_CHALLENGE / annualCost : 0;
    opts.efficiency = {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      grid: { left: 8, right: 8, top: 24, bottom: 30, containLabel: true },
      xAxis: { type: 'category', data: C.COMP_MONTHS },
      yAxis: [
        { type: 'value', name: '成本(万元)', axisLabel: { formatter: function (v) { return (v / 10000).toFixed(0); } } },
        { type: 'value', name: '人效比(×)', min: 0 },
      ],
      series: [
        { name: '月度人力成本', type: 'bar', yAxisIndex: 0, data: costTrend6, itemStyle: { color: 'rgba(91,91,214,0.55)', borderRadius: [4, 4, 0, 0] } },
        { name: '人效比', type: 'line', yAxisIndex: 1, smooth: true, data: costTrend6.map(function (c) { return c > 0 ? +(monthRevenueTarget / c).toFixed(1) : 0; }),
          itemStyle: { color: C.PALETTE[1] }, lineStyle: { color: C.PALETTE[1], width: 3 },
          markLine: { silent: true, symbol: 'none', data: [{ yAxis: +effTarget.toFixed(1), name: '挑战目标' }],
            lineStyle: { color: '#E5484D', type: 'dashed' }, label: { formatter: '挑战目标 ' + effTarget.toFixed(1) + '×', color: '#E5484D' } } },
      ],
    };

    return { kpis: kpis, opts: opts };
  }

  /* ---------- 渲染骨架 ---------- */
  function dashboardHTML(dept, month) {
    const deptOpts = ['全部'].concat(C.DEPTS).map(function (d) {
      return '<option value="' + d + '"' + (d === dept ? ' selected' : '') + '>' + d + '</option>';
    }).join('');
    const monthOpts = C.COMP_MONTHS.map(function (m) {
      return '<option value="' + m + '"' + (m === month ? ' selected' : '') + '>' + m + '</option>';
    }).join('');
    function card(id, title) {
      return '<div class="panel"><div class="panel__title">' + title + '</div>' +
        '<div class="chart" id="chart-' + id + '"></div></div>';
    }
    return '' +
      '<div class="filter-bar">' +
        '<div class="filter-item"><label>统计周期</label><select id="f-month">' + monthOpts + '</select></div>' +
        '<div class="filter-item"><label>部门</label><select id="f-dept">' + deptOpts + '</select></div>' +
        '<button class="btn btn--ghost" id="f-reset">重置</button>' +
        '<div class="filter-tip">筛选实时联动全部图表与指标</div>' +
      '</div>' +
      '<div class="kpi-row" id="kpi-row"></div>' +
      '<section class="section"><h3 class="section__title">一、人数结构分析</h3>' +
        '<div class="grid grid-3">' +
          card('deptDist', '部门分布') + card('levelDist', '职级分布') + card('gender', '性别比例') +
          card('age', '年龄段分布') + card('tenure', '工龄分布') +
        '</div></section>' +
      '<section class="section"><h3 class="section__title">二、考勤分析</h3>' +
        '<div class="grid grid-3">' +
          card('attRate', '月度出勤率') + card('lateEarly', '迟到/早退趋势') + card('leaveType', '请假类型分布') +
        '</div></section>' +
      '<section class="section"><h3 class="section__title">三、绩效分析</h3>' +
        '<div class="grid grid-3">' +
          card('ogsm', 'OGSM 目标完成率') + card('perfLevel', '绩效等级分布') + card('perfDept', '各部门绩效对比') +
        '</div></section>' +
      '<section class="section"><h3 class="section__title">四、薪酬与人效</h3>' +
        '<div class="grid grid-3">' +
          card('compStruct', '薪酬结构占比') + card('costTrend', '近6月人力成本趋势') + card('efficiency', '人效比看板（目标 1.84 亿）') +
        '</div></section>';
  }

  function kpiHTML(kpis) {
    return kpis.map(function (k) {
      let trend = '';
      if (k.trend !== null && k.trend !== undefined) {
        const up = k.trend >= 0;
        const good = k.good ? up : !up; // 成本上升非好；出勤率上升为好
        const arrow = up ? '▲' : '▼';
        const cls = good ? 'up' : 'down';
        const p = (Math.abs(k.trend) * 100).toFixed(1) + '%';
        trend = '<span class="kpi__trend ' + cls + '">' + arrow + ' ' + p + '</span>';
      } else {
        trend = '<span class="kpi__trend flat">—</span>';
      }
      return '<div class="kpi-card">' +
        '<div class="kpi__label">' + k.label + '</div>' +
        '<div class="kpi__value">' + k.value + '<span class="kpi__unit">' + (k.unit || '') + '</span></div>' +
        trend + '</div>';
    }).join('');
  }

  /* ---------- 钻取 ---------- */
  function bindDrill() {
    const deptChart = U.el('chart-deptDist');
    const perfChart = U.el('chart-perfLevel');
    if (deptChart && deptChart.__inst) {
      deptChart.__inst.on('click', function (p) {
        const d = p.name;
        const rows = currentEmpList.filter(function (e) { return e.dept === d; });
        openEmpDrill(d + ' · 人员明细', rows);
      });
    }
    if (perfChart && perfChart.__inst) {
      perfChart.__inst.on('click', function (p) {
        const lv = p.name;
        const pm = {}; HR.performance.forEach(function (x) { pm[x.emp_id] = x; });
        const rows = currentEmpList.filter(function (e) { return pm[e.emp_id] && pm[e.emp_id].perf_level === lv; });
        openEmpDrill(lv + ' 级 · 人员明细', rows);
      });
    }
  }
  function openEmpDrill(title, rows) {
    const headers = ['emp_id', 'name', 'dept', 'title', 'level'];
    const data = rows.map(function (e) { return { emp_id: e.emp_id, name: U.empName(e.emp_id), dept: e.dept, title: e.title, level: e.level }; });
    U.openTableModal(title, ['工号', '姓名', '部门', '岗位', '职级'], data);
  }

  /* ---------- 主渲染 ---------- */
  function render() {
    const view = U.el('view');
    const dept = AppState.filters.dept, month = AppState.filters.month;
    currentEmpList = filteredEmployees(dept);
    const data = computeAll(currentEmpList, month);

    view.innerHTML = dashboardHTML(dept, month);
    U.el('kpi-row').innerHTML = kpiHTML(data.kpis);

    // 销毁旧图表后重建
    U.disposeCharts();

    Object.keys(data.opts).forEach(function (key) {
      const dom = U.el('chart-' + key);
      if (!dom) return;
      const inst = U.registerChart(echarts.init(dom));
      dom.__inst = inst;
      inst.setOption(data.opts[key]);
    });

    bindDrill();
    bindFilters();
    window.App && window.App.setBreadcrumb(['数据看板', '总览']);
  }

  function bindFilters() {
    const mSel = U.el('f-month'), dSel = U.el('f-dept'), reset = U.el('f-reset');
    if (mSel) mSel.addEventListener('change', function () { AppState.filters.month = mSel.value; render(); });
    if (dSel) dSel.addEventListener('change', function () { AppState.filters.dept = dSel.value; render(); });
    if (reset) reset.addEventListener('click', function () { AppState.filters = { dept: '全部', month: C.CURRENT_MONTH }; render(); });
  }

  global.Dash = { render: render };
})(window);

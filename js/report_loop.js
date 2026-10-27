/* =========================================================================
 * report_loop.js — 「日周月报」内的【闭环管控】页签
 *   L0 日报 → L1 周报 → L2 月报 → L3 规划 → L4 管控
 *   数据：window.DAILY_REPORTS / WEEKLY_REPORTS / MONTHLY_REPORTS / OGSM_GOALS / REPORT_META
 *   作用域前缀：.rl（沿用 .rb 深色科技风）
 *
 *   口径纪律（改代码前请先读，违反会得出互相矛盾的结论）：
 *     ① 分数一律一位小数；模型分单点不确定度 ±0.3，不得单独引用
 *     ② ⚠️低可信是【双向】的 —— 处置方式是「不引用」，不是「反向补偿加分」
 *     ③ 禁止以日报条数衡量交付能力（邹 5.6 条/天→7.8 分 vs 李 3.4 条/天→8.2 分，负相关）
 *     ④ 分母必须标明窗口：整月应出勤(10月=27) / 截至数据日(22) / 三周窗口(15) 是三个不同的数
 *     ⑤ 不伪造：任何算不出的数显示「—」，绝不用估算值冒充实测值
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;
  function esc(s) { return U && U.escapeHtml ? U.escapeHtml(s) : String(s == null ? '' : s); }

  /* ★ 脱敏开关：本系统的部署目标是公网 GitHub Pages。
   *   置 false 时，涉及【个人绩效分 / 个人评价】的区块整体折叠，只留部门级聚合。
   *   本地查看置 true。上线前必须由主理人钟慧心确认。 */
  var SHOW_PERSONAL = false;

  /* 闭环统计窗口（三个完整周），与月度复盘已定稿口径一致 */
  var WINDOW = [
    { id: 'W1', label: '10.8-10.10', from: '2026-10-08', to: '2026-10-10' },
    { id: 'W2', label: '10.12-10.17', from: '2026-10-12', to: '2026-10-17' },
    { id: 'W3', label: '10.19-10.24', from: '2026-10-19', to: '2026-10-24' }
  ];
  var HR_DEPT = '人事行政部';
  var TARGET_MONTH = '2026年10月';

  /* 已定稿评分结论（2026-10-26 定稿，不得重新推算） */
  var SCORES = [
    { name: '李文杰', real: [8.2, 8.2, 8.2], model: [7.5, 8.2, 8.0], trust: 'normal' },
    { name: '钟喻',   real: [8.2, 8.0, 8.0], model: [7.8, 8.1, 7.7], trust: 'normal' },
    { name: '邹佩琳', real: [7.2, 7.8, 7.8], model: [7.4, 7.7, 7.5], trust: 'low' }
  ];

  /* 周报「下一步」承诺核销结果 —— 数据源：门户本地 data/weekly_promises.csv（由 bake_promises.js 烘焙为 window.WEEKLY_PROMISES）。
   * 飞书周报表无核销状态字段、且 9/10 月为空，故核销墙改由门户侧 CSV 维护、可手工刷新。
   * 兜底值保留旧定稿，便于 file:// 预览或脚本未加载时降级。 */
  var PROMISES = global.WEEKLY_PROMISES || {
    total: 18, full: 2, partial: 7, none: 9,
    breakdown: [['消失（无下文）', 4], ['顺延', 2], ['降级', 1], ['明确失败', 2]]
  };

  var state = { month: null };

  /* ---------------- 取值 helpers ---------------- */
  function daily() { return global.DAILY_REPORTS || []; }
  function weekly() { return global.WEEKLY_REPORTS || []; }
  function monthly() { return global.MONTHLY_REPORTS || []; }
  function goals() { return global.OGSM_GOALS || []; }
  function meta() { return global.REPORT_META || {}; }

  function hrNames() {
    var s = {};
    monthly().forEach(function (r) {
      if (r.dept === HR_DEPT && r.month === state.month) s[r.reporter_name] = 1;
    });
    return Object.keys(s);
  }

  function monthList() {
    var s = {};
    monthly().forEach(function (r) { s[r.month] = 1; });
    daily().forEach(function (d) { if (d.month) s[d.month] = 1; });
    return Object.keys(s).sort();
  }

  function inWindow(dateStr, w) {
    return !!dateStr && dateStr >= w.from && dateStr <= w.to;
  }

  function pct(n, d) { return d ? Math.round(1000 * n / d) / 10 : null; }

  /* ---------------- 片段 helpers ---------------- */
  /* ---------------- CSS（唯一 id 防重复注入） ---------------- */
  var CSS_ID = 'rl-css-loop';
  var CSS = [
    '.rl-sec{margin:20px 0 8px}',
    '.rl-sec h4{font-size:15px;font-weight:700;margin:0;color:#fff}',
    '.rl-sec .rl-sub{margin:4px 0 0;font-size:12px;color:var(--rb-muted)}',
    '.rl-meta{display:flex;flex-wrap:wrap;gap:8px 16px;padding:10px 14px;border:1px solid var(--rb-border);border-radius:10px;background:rgba(74,158,255,.06);font-size:12px;color:var(--rb-muted)}',
    '.rl-meta b{color:var(--rb-ink)}',
    '.rl-mswitch{margin:10px 0;font-size:12px;color:var(--rb-muted)}',
    '.rl-mswitch select{margin-left:6px;padding:5px 8px;border:1px solid var(--rb-border);border-radius:8px;background:#1a1a32;color:var(--rb-ink);font-size:12px}',
    '.rl-chain{display:flex;align-items:stretch;flex-wrap:wrap;gap:6px;margin-top:10px}',
    '.rl-node{flex:1 1 150px;min-width:140px;padding:10px 12px;border:1px solid var(--rb-border);border-radius:10px;background:rgba(255,255,255,.03)}',
    '.rl-node.ok{border-color:rgba(22,163,74,.45)}',
    '.rl-node.bad{border-color:rgba(220,38,38,.55);background:rgba(220,38,38,.08)}',
    '.rl-node-t{font-size:12px;color:var(--rb-muted)}',
    '.rl-node-v{font-size:18px;font-weight:700;color:#fff;margin:2px 0}',
    '.rl-node-d{font-size:11px;color:var(--rb-muted);line-height:1.5}',
    '.rl-arrow{align-self:center;color:var(--rb-muted);font-size:16px}',
    '.rl-warn{margin:10px 0;padding:10px 12px;border-left:3px solid var(--amber,#d97706);background:rgba(217,119,6,.10);border-radius:0 8px 8px 0;font-size:13px;line-height:1.7}',
    '.rl-hidden{margin:10px 0;padding:14px;border:1px dashed var(--rb-border);border-radius:10px;font-size:13px;line-height:1.8;color:var(--rb-muted)}',
    '.rl-kpis{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}',
    '.rl-kpi{flex:1 1 120px;min-width:110px;padding:10px 12px;border:1px solid var(--rb-border);border-radius:10px;background:rgba(255,255,255,.03)}',
    '.rl-kpi span{display:block;font-size:11px;color:var(--rb-muted)}',
    '.rl-kpi b{display:block;font-size:22px;color:#fff;line-height:1.3}',
    '.rl-kpi i{font-style:normal;font-size:11px;color:var(--rb-muted)}',
    '.rl-kpi.ok b{color:#4ade80}.rl-kpi.mid b{color:#fbbf24}.rl-kpi.bad b{color:#f87171}',
    '.rl-tb{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}',
    '.rl-tb th{text-align:left;padding:7px 9px;border-bottom:1px solid var(--rb-border);color:var(--rb-muted);font-weight:600;background:rgba(255,255,255,.03)}',
    '.rl-tb td{padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}',
    '.rl-tb td.zero{color:#f87171;font-weight:600}',
    '.rl-tb td.ok{color:#4ade80}',
    '.rl-tb .sm{font-size:11px;color:var(--rb-muted)}',
    '.rl-bar{display:inline-block;width:100%;height:7px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;vertical-align:middle}',
    '.rl-bar i{display:block;height:100%;border-radius:4px;background:#4a9eff}',
    '.rl-bar i.ok{background:#22c55e}.rl-bar i.mid{background:#f59e0b}.rl-bar i.bad{background:#ef4444}',
    '.rl-chip{display:inline-block;padding:1px 7px;border-radius:9px;font-size:11px;border:1px solid var(--rb-border);background:rgba(255,255,255,.05)}',
    '.rl-chip.ok{border-color:rgba(22,163,74,.5);color:#4ade80}',
    '.rl-chip.bad{border-color:rgba(220,38,38,.5);color:#f87171;background:rgba(220,38,38,.10)}',
    '.rl-note{margin:8px 0;padding:9px 12px;border-radius:8px;background:rgba(255,255,255,.04);font-size:12px;line-height:1.8;color:#b9b9d0}',
    '.rl-empty{padding:18px;text-align:center;color:var(--rb-muted);font-size:13px}',
    '.rl-redline{margin-top:8px;padding:12px 14px;border:1px solid rgba(220,38,38,.35);border-radius:10px;background:rgba(220,38,38,.06);font-size:12px;line-height:2;color:#c9c9dd}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function secHead(t, sub) {
    return '<div class="rl-sec"><h4>' + esc(t) + '</h4>' +
      (sub ? '<p class="rl-sub">' + esc(sub) + '</p>' : '') + '</div>';
  }
  function chip(txt, cls) {
    return '<span class="rl-chip ' + (cls || '') + '">' + esc(txt) + '</span>';
  }
  function bar(p, cls) {
    var w = Math.max(0, Math.min(100, p || 0));
    return '<span class="rl-bar"><i class="' + (cls || '') + '" style="width:' + w + '%"></i></span>';
  }
  function num(v, suffix) {
    return (v === null || v === undefined) ? '—' : v + (suffix || '');
  }

  /* ====================== 入口 ====================== */
  function renderBody() {
    injectCss();
    var M = meta();
    var ms = monthList();
    if (!state.month) {
      state.month = ms.indexOf(TARGET_MONTH) >= 0 ? TARGET_MONTH : (ms[ms.length - 1] || TARGET_MONTH);
    }

    var wmonths = {};
    weekly().forEach(function (w) { if (w.cycle_month) wmonths[w.cycle_month] = 1; });
    var wkList = Object.keys(wmonths).sort();
    var wkLast = wkList[wkList.length - 1] || '—';

    var html = '';

    /* --- 0. 数据新鲜度 --- */
    html += '<div class="rl-meta">' +
      '<span>同步于 <b>' + esc(M.synced_at || '—') + '</b></span>' +
      '<span>日报 <b>' + (M.daily_count || 0) + '</b></span>' +
      '<span>周报 <b>' + (M.weekly_count || 0) + '</b></span>' +
      '<span>月报(人×月) <b>' + (M.monthly_count || 0) + '</b></span>' +
      '<span>OGSM目标 <b>' + (M.goal_count || 0) + '</b></span>' +
      '<span>跨周期错挂 <b>' + ((M.join_stats && M.join_stats.cross_cycle_records) || 0) + '</b> 条</span>' +
      '</div>';

    /* --- 0.5 统计月份切换（本页自带，独立于上方日报/周报筛选条） --- */
    var mopts = ms.map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === state.month ? ' selected' : '') + '>' + esc(m) + '</option>';
    }).join('');
    html += '<div class="rl-mswitch">统计月份 <select data-rlf="month">' + mopts + '</select>' +
      '<span style="margin-left:10px">「关联目标塌方」为全公司口径；OGSM 矩阵 / 字段熔断 / 双轨评分仅覆盖 ' +
      esc(HR_DEPT) + '</span></div>';

    /* --- 1. 四层闭环链路 --- */
    html += secHead('四层闭环链路 · 当前每一层是否真的有数据', '任一环断了，下一环就只能靠回忆写');
    var l0 = daily().filter(function (d) { return d.month === state.month; }).length;
    var l1 = weekly().filter(function (w) { return w.cycle_month === state.month; }).length;
    var l2 = monthly().filter(function (r) { return r.month === state.month; }).length;
    var nodes = [
      ['L0 日报', l0 + ' 条', l0 > 0, '数据止于 ' + (M.synced_at || '—')],
      ['L1 周报', l1 + ' 条', l1 > 0, l1 > 0 ? '正常' : '⚠️ 本月无周报'],
      ['L2 月报', l2 + ' 人', l2 > 0, 'ETL 物料化，可读可追溯'],
      ['L3 规划', '待建', false, '本页为第一批落地点']
    ];
    html += '<div class="rl-chain">';
    nodes.forEach(function (n, i) {
      html += '<div class="rl-node' + (n[2] ? ' ok' : ' bad') + '">' +
        '<div class="rl-node-t">' + esc(n[0]) + '</div>' +
        '<div class="rl-node-v">' + esc(n[1]) + '</div>' +
        '<div class="rl-node-d">' + esc(n[3]) + '</div></div>';
      if (i < nodes.length - 1) html += '<span class="rl-arrow">' + (nodes[i + 1][2] ? '→' : '⇢') + '</span>';
    });
    html += '</div>';
    if (l1 === 0) {
      html += '<div class="rl-warn">⚠️ <b>周报断层</b>：飞书周报表最后有数据的月份是 <b>' + esc(wkLast) +
        '</b>，本月为零、且无核销状态字段。承诺核销墙已改用<b>门户侧 data/weekly_promises.csv</b> 独立维护（编辑 CSV → 重跑烘焙 → 部署即可刷新）；' +
        '周度 OGSM 达成仍依赖飞书周报表，需恢复周报表填报后才能自动刷新。</div>';
    }

    /* --- 2. 承诺核销墙 --- */
    var pr = PROMISES;
    html += secHead('承诺核销墙 · ' + pr.total + ' 条周报「下一步」的去向',
      '数据源：门户本地 data/weekly_promises.csv（bake_promises.js 烘焙）。飞书周报表无核销状态字段、9/10 月为空，故改由门户侧维护、可手工刷新；编辑 CSV 后重跑烘焙+部署即更新');
    html += '<div class="rl-kpis">' +
      '<div class="rl-kpi"><span>承诺总数</span><b>' + pr.total + '</b></div>' +
      '<div class="rl-kpi ok"><span>完全核销</span><b>' + pr.full + '</b><i>' + Math.round(100 * pr.full / pr.total) + '%</i></div>' +
      '<div class="rl-kpi mid"><span>部分核销</span><b>' + pr.partial + '</b><i>' + Math.round(100 * pr.partial / pr.total) + '%</i></div>' +
      '<div class="rl-kpi bad"><span>未核销</span><b>' + pr.none + '</b><i>' + Math.round(100 * pr.none / pr.total) + '%</i></div>' +
      '</div>';
    html += '<div class="rl-note">未核销 ' + pr.none + ' 条的构成：' +
      pr.breakdown.map(function (x) { return esc(x[0]) + ' <b>' + x[1] + '</b>'; }).join('｜') +
      '。<b>半数承诺没有回执</b> —— 这是「不怕没做完，最怕不知道没做完」的直接证据。</div>';

    /* --- 3. 沉默字段熔断条 --- */
    html += secHead('沉默字段熔断条 · 三个反思类字段的填写率',
      '「日常工作情况 / 难题与策略 / AI提效」是周复盘策略反思的唯一数据来源，全空即代表该维度断供');
    var hrrows = monthly().filter(function (r) { return r.dept === HR_DEPT && r.month === state.month; });
    var reflect = ['daily_work', 'problem_strategy', 'ai_efficiency'];
    var rlabel = { daily_work: '日常工作情况', problem_strategy: '难题与策略', ai_efficiency: 'AI提效点' };
    if (!hrrows.length) {
      html += '<div class="rl-empty">本月无 ' + esc(HR_DEPT) + ' 数据</div>';
    } else {
      html += '<table class="rl-tb"><thead><tr><th>填报人</th>' +
        reflect.map(function (f) { return '<th>' + esc(rlabel[f]) + '</th>'; }).join('') +
        '<th>关完成度</th><th>键动作</th><th>明日计划</th><th>工作清单</th><th>关联目标</th></tr></thead><tbody>';
      hrrows.forEach(function (r) {
        var ff = r.field_fill || {};
        html += '<tr><td><b>' + esc(r.reporter_name) + '</b></td>';
        reflect.forEach(function (f) {
          var v = (ff[f] === null || ff[f] === undefined) ? null : ff[f];
          html += '<td class="' + (v === 0 ? 'zero' : '') + '">' + num(v, '%') + '</td>';
        });
        html += '<td>' + (r.completeness === null || r.completeness === undefined ? '—' : r.completeness.toFixed(2)) + '</td>' +
          '<td>' + num(ff.key_actions, '%') + '</td>' +
          '<td>' + num(ff.tomorrow_plan, '%') + '</td>' +
          '<td class="' + (r.work_list_rate === 0 ? 'zero' : '') + '">' + num(r.work_list_rate, '%') + '</td>' +
          '<td class="' + (r.ogsm_link_rate !== null && r.ogsm_link_rate < 20 ? 'zero' : '') + '">' +
          num(r.ogsm_link_rate, '%') + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '<div class="rl-note">三个反思类字段<b>' + esc(HR_DEPT) + '全员 0%</b>，导致字段完成度恒定为 <b>0.40</b>' +
        '（5 个关键字段里只有 2 个恒有内容）。<b>这是常数不是变量</b> —— 它在 9 个格子（3 人 × 3 周）里零变异，' +
        '所以它会<b>同额压低所有人</b>的模型分，而不会制造任何人际分差。</div>';
    }

    /* --- 4. 关联目标塌方 --- */
    html += secHead('关联目标塌方 · 全公司日报按月统计',
      '「有关联」＝该条日报挂了 OGSM 目标；目标 ID 解析成功率 100%，所以低关联率不是系统 bug，是填报退化');
    var bym = {};
    daily().forEach(function (d) {
      var m = d.month || '未知';
      if (!bym[m]) bym[m] = { n: 0, linked: 0, cross: 0 };
      bym[m].n++;
      if (d.ogsm_goal_ids && d.ogsm_goal_ids.length) bym[m].linked++;
      if (d.cross_cycle) bym[m].cross++;
    });
    html += '<table class="rl-tb"><thead><tr><th>月份</th><th>日报条数</th><th>有关联目标</th><th>关联率</th>' +
      '<th style="width:28%">趋势</th><th>跨周期错挂</th></tr></thead><tbody>';
    Object.keys(bym).sort().forEach(function (m) {
      var o = bym[m], rate = pct(o.linked, o.n);
      html += '<tr><td><b>' + esc(m) + '</b></td><td>' + o.n + '</td><td>' + o.linked + '</td>' +
        '<td class="' + (rate < 40 ? 'zero' : '') + '">' + num(rate, '%') + '</td>' +
        '<td>' + bar(rate, rate < 40 ? 'bad' : (rate < 60 ? 'mid' : 'ok')) + '</td>' +
        '<td class="' + (o.cross ? 'zero' : '') + '">' + o.cross + '</td></tr>';
    });
    html += '</tbody></table>';

    /* --- 5. OGSM 达成矩阵 --- */
    html += secHead('人事行政部 OGSM 达成矩阵 · 成员 × 目标 × 周',
      '以「日报是否关联该目标」作为机器可观测信号；权重沿用 OGSM 目标表');
    var names = hrNames();
    var g10 = goals().filter(function (g) {
      return g.cycle === state.month && g.owner_name && names.indexOf(g.owner_name) >= 0;
    });
    if (!g10.length) {
      html += '<div class="rl-empty">本月无可匹配 OGSM 目标（目标考核周期为 ' + esc(state.month) + '）</div>';
    } else {
      var byOwner = {};
      g10.forEach(function (g) { (byOwner[g.owner_name] = byOwner[g.owner_name] || []).push(g); });
      html += '<table class="rl-tb"><thead><tr><th>负责人</th><th>目标</th><th>权重</th>' +
        WINDOW.map(function (w) { return '<th>' + w.id + '<br><span class="sm">' + esc(w.label) + '</span></th>'; }).join('') +
        '<th>合计</th></tr></thead><tbody>';
      names.forEach(function (nm) {
        var list = byOwner[nm] || [];
        if (!list.length) {
          html += '<tr><td><b>' + esc(nm) + '</b></td>' +
            '<td colspan="' + (WINDOW.length + 2) + '" class="zero">本月未录入 OGSM 目标</td><td>—</td></tr>';
          return;
        }
        list.forEach(function (g) {
          var counts = WINDOW.map(function (w) {
            return daily().filter(function (d) {
              return d.reporter_name === nm && inWindow((d.date || '').slice(0, 10), w) &&
                d.ogsm_goal_ids && d.ogsm_goal_ids.indexOf(g.id) >= 0;
            }).length;
          });
          var total = counts.reduce(function (a, b) { return a + b; }, 0);
          html += '<tr><td>' + esc(nm) + '</td><td class="sm">' + esc(g.goal) + '</td>' +
            '<td>' + num(g.weightPct, '%') + '</td>' +
            counts.map(function (c) { return '<td class="' + (c ? 'ok' : 'zero') + '">' + c + '</td>'; }).join('') +
            '<td><b>' + total + '</b></td></tr>';
        });
      });
      html += '</tbody></table>';
      html += '<div class="rl-note">格子里的数字＝该周内<b>关联到该目标的日报条数</b>。' +
        '全 0 的行表示该成员本月从未把自己的日报挂到这条目标上 —— 无法机器归集时，' +
        'OGSM 进度只能靠人工读正文推断，<b>判定可信度随之下降</b>。</div>';
    }

    /* --- 6. 出勤分母 --- */
    html += secHead('出勤分母 · 三个口径不可混用', '分母选错，同一个人的出勤率能差出一半');
    if (!hrrows.length) {
      html += '<div class="rl-empty">本月无 ' + esc(HR_DEPT) + ' 数据</div>';
    } else {
      html += '<table class="rl-tb"><thead><tr><th>填报人</th><th>实填条数</th><th>去重天数</th>' +
        '<th>整月应出勤</th><th>截至数据日应出勤</th><th>出勤率（截至数据日）</th></tr></thead><tbody>';
      hrrows.forEach(function (r) {
        html += '<tr><td><b>' + esc(r.reporter_name) + '</b></td><td>' + r.daily_count + '</td>' +
          '<td>' + r.distinct_days + '</td>' +
          '<td>' + num(r.required_days) + '</td>' +
          '<td>' + num(r.required_days_to_date) + '</td>' +
          '<td>' + num(r.attendance_rate_to_date, '%') + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '<div class="rl-note">10 月的三个分母分别是：整月 <b>27</b> 天、截至 10-26 <b>22</b> 天、' +
        '10/8–10/24 三周统计窗口 <b>15</b> 天。<b>月度复盘已定稿：10 月用实填天数，11 月起统一改用应出勤天数并重算对比</b>；' +
        '本表把分母摊开，就是为了换口径时能当场看清差在哪。</div>';
    }

    /* --- 7. 双轨评分 --- */
    html += secHead('双轨评分校准 · 实分 vs 模型分（M1-C）', '口径已定稿于 2026-10-26，不再推算');
    if (!SHOW_PERSONAL) {
      html += '<div class="rl-hidden">🔒 <b>个人评分明细已折叠</b>。本页部署目标为公网 GitHub Pages，' +
        '涉及个人绩效分与可信度评价的区块默认不公开。本地查看请把 report_loop.js 的 ' +
        '<code>SHOW_PERSONAL</code> 置 true。</div>';
    } else {
      html += '<div class="rl-warn">🔒 <b>含个人绩效数据 · 请勿外传</b>。当前为本地查看模式；' +
        '部署到公网前必须把 <code>SHOW_PERSONAL</code> 置回 false。</div>';
      html += '<table class="rl-tb"><thead><tr><th>姓名</th>' +
        WINDOW.map(function (w) { return '<th>' + w.id + '<br><span class="sm">' + esc(w.label) + '</span></th>'; }).join('') +
        '<th>模型分区间</th><th>输入可信度</th></tr></thead><tbody>';
      SCORES.forEach(function (s) {
        var lo = Math.min.apply(null, s.model), hi = Math.max.apply(null, s.model);
        html += '<tr><td><b>' + esc(s.name) + '</b></td>';
        WINDOW.forEach(function (w, i) {
          var d = s.real[i] - s.model[i];
          html += '<td>实 <b>' + s.real[i].toFixed(1) + '</b> / 模 ' + s.model[i].toFixed(1) +
            '<br><span class="sm">Δ ' + (d >= 0 ? '+' : '') + d.toFixed(1) + '</span></td>';
        });
        html += '<td>' + lo.toFixed(1) + '–' + hi.toFixed(1) + '</td>' +
          '<td>' + (s.trust === 'low' ? chip('⚠️低可信', 'bad') : chip('可用', 'ok')) + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '<div class="rl-note">' +
        '① 模型分<b>暂不挂钩绩效，仅用于校准口径</b>，任何人不得以此追责；' +
        '② 单点不确定度 <b>±0.3</b>，<b>单点分数不得单独引用</b>；' +
        '③ ⚠️低可信表示<b>该读数的可信度低于他人</b>，它是<b>双向的</b> —— 处置方式是<b>不引用</b>，' +
        '<b>不是反向补偿加分</b>，也<b>不代表本人被冤枉或受委屈</b>；' +
        '④ <b>禁止以日报条数衡量交付能力</b>：邹佩琳 5.6 条/天 → 7.8 分，李文杰 3.4 条/天 → 8.2 分，<b>负相关</b>；' +
        '⑤ 前置修补是<b>结构化字段升必填</b>，<b>不是调分</b>。</div>';
    }

    /* --- 8. 红线 --- */
    html += secHead('本页红线 · 改代码前必读', '');
    html += '<div class="rl-redline">' +
      '<b>1. 不伪造。</b>算不出来的数字一律显示「—」，绝不用估算值冒充实测值；占位值必须带脚注。<br>' +
      '<b>2. 不猜变量。</b>真实变量观测不到时（如「提交是否真实反映当日」），应新增可直接观测的字段，而不是找代理指标顶替。<br>' +
      '<b>3. 依赖基线的结论必须双基线校验。</b>换一种分母口径重算一遍，结论反转就不能下结论。<br>' +
      '<b>4. 输入可信度逐人标注。</b>低可信 ≠ 偏差更大，只表示<b>读数更不可信</b>。<br>' +
      '<b>5. 分母纪律。</b>比率的分母不得以被考核者的行为为转移，否则会诱发 Goodhart 式对策行为。' +
      '</div>';

    return html;
  }

  function bindOnce() {
    var view = U && U.el ? U.el('view') : null;
    if (!view || view.__rlBound) return;
    view.__rlBound = '1';
    view.addEventListener('change', function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      if (el.getAttribute('data-rlf') === 'month') {
        state.month = el.value;
        var b = U.el('rbBody');
        if (b) b.innerHTML = renderBody();
      }
    });
  }

  global.ReportLoop = { renderBody: renderBody, bindOnce: bindOnce };
})(window);

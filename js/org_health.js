/* =========================================================================
 * org_health.js — 人力资源板块 · 组织架构与编制健康诊断
 *   数据来源：org_health_data.js (window.HR_ORG_HEALTH)  ← 烘焙快照，只读
 *   权威口径：knowledge/组织架构与编制诊断_指标口径说明.md（不得推翻）
 *   依赖：    utils.js（U.*）
 *   路由：    #/org-health
 *   红线（已在代码中固化，改动前先读口径文档）：
 *     ① 编制 quota 全为 null → 一律「待录入」灰显，禁止 0 / 100% 兜底
 *     ② 在编人数唯一权威值 = 42（meta.headcountTotal），其余人数必带限定语
 *     ③ headcountTrend 存在于数据文件但【禁止渲染】（R5 二次裁决：不对外）
 *     ④ 组织树必须留「未分配」兜底（当前 1 人），不得从树里消失，且必须写明原因
 *     ⑤ 「单点岗位」对外统一称「结构单点岗位数」，不得等同风险告警（R7）
 *     ⑥ 客服部权威在编 0 人必须注明「客服职能归电商运营部 · 客服组 N 人」，
 *        禁止写「客服部无编制」（会被读成该部门被裁撤）
 *     ⑦ 覆盖率写「41/42」，仓储部须写成「3 有路径 + 1 无路径 = 4」
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  /* ---------- 权限配置（集中常量；后续按用户决策只需改这里，勿写死进渲染逻辑） ---------- */
  /* 权限：读全站唯一运行时权威 window.HR_ROLE_CONFIG（由 app.js 外壳定义，裁决 2026-10-30）。
     缺省时回退到本地值，保证单文件 / 未走外壳调试时仍可用 —— 但线上以 HR_ROLE_CONFIG 为准，
     数据文件（HR_ORG_HEALTH / HR_RISK_BRIEF）中不得再声明 role 字段。 */
  var ACCESS = global.HR_ROLE_CONFIG || {
    'HR':     { visible: true,  scope: 'all', showNames: true  },
    '负责人': { visible: true,  scope: 'own',  showNames: false },
    '员工':   { visible: false, scope: 'none', showNames: false }
  };
  /* 二级部门权威枚举（S6 CONST.DEPTS，8 个） */
  var AUTH_DEPTS = ['管理层', '人事行政部', '仓储部', '品控部', '客服部', '市场部', '电商运营部', '财务部'];
  /* 演示用的模拟编制（仅用于「状态② 正常态」演示，非核定值，且页面会显著标注） */
  var SIM_QUOTA = { '管理层': 3, '人事行政部': 5, '仓储部': 6, '品控部': 2, '客服部': 0, '市场部': 12, '电商运营部': 15, '财务部': 2 };
  var DEFAULT_DEPT = '电商运营部';   // 部门负责人视角的默认部门（可在页面下拉切换）

  /* ---------- 作用域 CSS（全部以 .oh 前缀收敛，避免与门户及其它模块重名冲突） ---------- */
  var CSS = [
    '.oh{--oh-bg1:#06122b;--oh-bg2:#0a1a35;--oh-panel:rgba(16,38,75,0.55);--oh-panel-b:rgba(79,209,255,0.28);--oh-s1:#1E6FFF;--oh-s2:#4FD1FF;--oh-s3:#8FE3FF;--oh-amber:#F5A524;--oh-red:#FF4D4F;--oh-green:#10B981;--oh-text:#E8F1FF;--oh-dim:#C7D8EE;--oh-muted:#7FA6D8;--oh-rc:12px;--oh-rb:8px;--oh-rbg:999px;background:radial-gradient(1200px 700px at 20% -10%,#0d2347 0%,var(--oh-bg1) 45%,var(--oh-bg2) 100%);color:var(--oh-text);font-family:"Microsoft YaHei","微软雅黑",-apple-system,"PingFang SC",sans-serif;font-size:16px;line-height:1.6;border-radius:var(--oh-rc);padding:16px 0 8px;overflow:hidden}',
    '.oh *{box-sizing:border-box}',
    '.oh .oh-wrap{max-width:1440px;margin:0 auto;padding:8px 20px}',
    '.oh h1{font-size:24px;font-weight:700;letter-spacing:1px;margin:0}',
    '.oh h2{font-size:20px;font-weight:700;margin:0}',
    '.oh .panel-title{font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.oh .mono,.oh .num{font-variant-numeric:tabular-nums}',
    /* 口径图例条 */
    '.oh .caliber-bar{display:flex;gap:14px;flex-wrap:wrap;align-items:center;background:rgba(8,24,52,0.7);border:1px solid var(--oh-panel-b);border-radius:var(--oh-rb);padding:10px 14px;font-size:14px;color:var(--oh-dim);margin-bottom:14px}',
    '.oh .caliber-bar b{color:var(--oh-text);font-weight:600}',
    '.oh .legend-item{display:inline-flex;align-items:center;gap:6px}',
    '.oh .dot{width:8px;height:8px;border-radius:50%;flex:none}',
    '.oh .dot.auth{background:var(--oh-green)}',
    '.oh .dot.proxy{background:var(--oh-amber)}',
    '.oh .dot.miss{background:var(--oh-muted)}',
    /* 提示条 */
    '.oh .notice{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.7;border-radius:var(--oh-rb);padding:12px 16px;margin-bottom:16px}',
    '.oh .notice.miss{background:rgba(127,166,216,0.12);border:1px solid rgba(127,166,216,0.45);color:var(--oh-dim)}',
    '.oh .notice.miss .ic{color:var(--oh-muted)}',
    '.oh .notice.proxy{background:rgba(245,165,36,0.10);border:1px solid rgba(245,165,36,0.45);color:var(--oh-dim)}',
    '.oh .notice.proxy .ic{color:var(--oh-amber)}',
    '.oh .notice.demo{background:rgba(255,77,79,0.10);border:1px solid rgba(255,77,79,0.5);color:var(--oh-dim)}',
    '.oh .notice.demo .ic{color:var(--oh-red)}',
    '.oh .notice .ic{font-size:16px;line-height:1.4;flex:none}',
    '.oh .notice b{color:var(--oh-text)}',
    /* Header */
    '.oh header.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:18px;padding:0 20px}',
    '.oh .sub{font-size:14px;color:var(--oh-dim);margin-top:4px}',
    '.oh .demo-switch{display:flex;gap:6px;flex-wrap:wrap}',
    '.oh .ms-btn{font-size:14px;padding:6px 14px;border-radius:var(--oh-rb);cursor:pointer;background:rgba(8,24,52,0.7);border:1px solid var(--oh-panel-b);color:var(--oh-dim);transition:all .18s;font-family:inherit}',
    '.oh .ms-btn:hover{color:var(--oh-s2);border-color:var(--oh-s2)}',
    '.oh .ms-btn.active{background:linear-gradient(135deg,var(--oh-s2),var(--oh-s1));color:#03132b;font-weight:700;border-color:var(--oh-s2)}',
    '.oh .ms-btn:focus-visible{outline:2px solid var(--oh-amber);outline-offset:2px}',
    '.oh .dept-pick{font-size:14px;padding:6px 10px;border-radius:var(--oh-rb);background:rgba(8,24,52,0.7);border:1px solid var(--oh-panel-b);color:var(--oh-text);font-family:inherit}',
    /* KPI */
    '.oh .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}',
    '.oh .kpi{background:linear-gradient(160deg,rgba(20,48,92,0.7),rgba(10,26,53,0.6));border:1px solid var(--oh-panel-b);border-radius:var(--oh-rc);padding:16px 18px;position:relative;overflow:hidden}',
    '.oh .kpi::after{content:"";position:absolute;left:0;top:0;width:3px;height:100%;background:var(--oh-s2);opacity:.6}',
    '.oh .kpi.is-proxy::after{background:var(--oh-amber)}',
    '.oh .kpi.is-miss::after{background:var(--oh-muted)}',
    '.oh .kpi .k{font-size:16px;color:var(--oh-dim);display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.oh .kpi .v{font-size:44px;font-weight:800;line-height:1.15;color:#fff;font-variant-numeric:tabular-nums}',
    '.oh .kpi .u{font-size:16px;color:var(--oh-dim);font-weight:600;margin-left:2px}',
    '.oh .kpi .nb{font-size:14px;color:var(--oh-dim);display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.oh .kpi .lock{color:var(--oh-green)}',
    /* 标签 */
    '.oh .badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;line-height:1.6;padding:1px 9px;border-radius:var(--oh-rbg);white-space:nowrap}',
    '.oh .badge.auth{background:rgba(16,185,129,0.16);color:var(--oh-green);border:1px solid rgba(16,185,129,0.45)}',
    '.oh .badge.proxy{background:rgba(245,165,36,0.14);color:var(--oh-amber);border:1px solid rgba(245,165,36,0.5)}',
    '.oh .badge.miss{background:rgba(127,166,216,0.14);color:var(--oh-muted);border:1px solid rgba(127,166,216,0.5)}',
    '.oh .badge.ok{background:rgba(16,185,129,0.16);color:var(--oh-green);border:1px solid rgba(16,185,129,0.45)}',
    '.oh .badge.warn{background:rgba(245,165,36,0.14);color:var(--oh-amber);border:1px solid rgba(245,165,36,0.5)}',
    '.oh .badge.alert{background:rgba(255,77,79,0.14);color:var(--oh-red);border:1px solid rgba(255,77,79,0.5)}',
    '.oh .badge.grey{background:rgba(127,166,216,0.12);color:var(--oh-muted);border:1px solid rgba(127,166,216,0.42)}',
    '.oh .badge.dash{border-style:dashed}',
    /* 面板 */
    '.oh .grid2{display:grid;grid-template-columns:1.35fr 1fr;gap:16px;margin-bottom:16px}',
    '.oh .panel{background:var(--oh-panel);border:1px solid var(--oh-panel-b);border-radius:var(--oh-rc);padding:16px 18px;backdrop-filter:blur(2px);position:relative;margin-bottom:16px}',
    '.oh .panel-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap}',
    '.oh .panel-note{font-size:14px;color:var(--oh-dim);line-height:1.7;margin-top:10px}',
    '.oh .panel-note.warnNote{background:rgba(245,165,36,0.08);border-left:3px solid var(--oh-amber);padding:8px 12px;border-radius:0 var(--oh-rb) var(--oh-rb) 0}',
    '.oh .panel-note.missNote{background:rgba(127,166,216,0.08);border-left:3px solid var(--oh-muted);padding:8px 12px;border-radius:0 var(--oh-rb) var(--oh-rb) 0}',
    /* 表格 */
    '.oh table{width:100%;border-collapse:collapse;font-size:14px}',
    '.oh th{color:var(--oh-s2);font-weight:600;text-align:right;padding:8px 10px;font-size:14px;border-bottom:1px solid rgba(79,209,255,0.35);white-space:nowrap}',
    '.oh th:first-child,.oh td:first-child{text-align:left}',
    '.oh td{padding:9px 10px;text-align:right;border-bottom:1px solid rgba(79,209,255,0.10);color:var(--oh-text);white-space:nowrap}',
    '.oh tbody tr:hover td{background:rgba(79,209,255,0.07)}',
    '.oh tr.dimmed td{color:var(--oh-muted)}',
    '.oh tr.dimmed .name{color:var(--oh-dim)}',
    '.oh .num{font-weight:700;color:#fff}',
    '.oh .num.muted{color:var(--oh-muted);font-weight:600}',
    '.oh .todo{color:var(--oh-muted);font-weight:600}',
    '.oh .tag-inline{font-size:12px;color:var(--oh-muted);margin-left:6px}',
    /* 组织树 */
    '.oh .tree{font-size:14px}',
    '.oh .tnode{border-left:2px solid rgba(79,209,255,0.18);padding-left:12px;margin-left:2px}',
    '.oh .trow{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:var(--oh-rb);cursor:pointer;transition:background .15s;flex-wrap:wrap}',
    '.oh .trow:hover{background:rgba(79,209,255,0.08)}',
    '.oh .trow.unassigned{border:1px dashed rgba(127,166,216,0.55);background:rgba(127,166,216,0.10)}',
    '.oh .trow.unassigned .tname,.oh .trow.unassigned .tcnt{color:var(--oh-muted)}',
    '.oh .trow:focus-visible{outline:2px solid var(--oh-amber);outline-offset:1px}',
    '.oh .tname{color:#fff;font-weight:600}',
    '.oh .tcnt{color:var(--oh-s2);font-variant-numeric:tabular-nums}',
    '.oh .tcaret{width:16px;color:var(--oh-dim);flex:none;text-align:center;font-size:12px}',
    '.oh .tcaret.leaf{opacity:0}',
    '.oh .tmeta{font-size:12px;color:var(--oh-muted)}',
    '.oh .children{margin-top:2px}',
    '.oh .collapsed>.children{display:none}',
    '.oh .sub-note{font-size:12px;color:var(--oh-amber);margin-left:6px}',
    /* 漏斗 */
    '.oh .funnel{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}',
    '.oh .fstep{border:1px solid var(--oh-panel-b);border-radius:var(--oh-rc);padding:14px;background:rgba(8,24,52,0.5);position:relative}',
    '.oh .fstep.is-main{border-color:var(--oh-s2);box-shadow:0 0 0 1px rgba(79,209,255,.25) inset,0 0 16px rgba(30,111,255,.2)}',
    '.oh .fstep .lvl{font-size:12px;color:var(--oh-dim);letter-spacing:1px}',
    '.oh .fstep .nm{font-size:16px;font-weight:700;color:#fff;margin:4px 0}',
    '.oh .fstep .vv{font-size:32px;font-weight:800;color:var(--oh-s2);font-variant-numeric:tabular-nums;line-height:1.1}',
    '.oh .fstep .vv.isna{font-size:20px;color:var(--oh-muted);font-weight:600}',
    '.oh .fstep .dsc{font-size:14px;color:var(--oh-dim);margin-top:6px;line-height:1.6}',
    '.oh .post-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}',
    '.oh .post-chip{font-size:14px;padding:4px 12px;border-radius:var(--oh-rbg);background:rgba(79,209,255,0.10);border:1px solid rgba(79,209,255,0.3);color:var(--oh-text)}',
    '.oh .post-chip.key{border-color:rgba(245,165,36,0.6);color:var(--oh-amber)}',
    '.oh .post-chip.ghost{border-style:dashed;border-color:rgba(127,166,216,0.5);color:var(--oh-muted)}',
    /* 状态演示盒 */
    '.oh .state-box{border:1px dashed rgba(245,165,36,0.5);border-radius:var(--oh-rc);padding:14px;margin-bottom:16px;background:rgba(245,165,36,0.05)}',
    '.oh .state-box .st-hd{font-size:14px;color:var(--oh-amber);font-weight:700;margin-bottom:6px}',
    '.oh .state-box .st-dsc{font-size:14px;color:var(--oh-dim);line-height:1.7}',
    /* 空态 / 禁入 */
    '.oh .empty-state{text-align:center;padding:44px 20px;color:var(--oh-dim)}',
    '.oh .empty-state .ico{font-size:48px;color:var(--oh-muted);line-height:1;margin-bottom:12px}',
    '.oh .empty-state .t1{font-size:18px;color:#fff;font-weight:700;margin-bottom:6px}',
    '.oh .empty-state .t2{font-size:14px;max-width:560px;margin:0 auto 14px;line-height:1.8}',
    '.oh .btn{display:inline-block;font-size:14px;padding:8px 18px;border-radius:var(--oh-rb);cursor:pointer;background:linear-gradient(135deg,var(--oh-s2),var(--oh-s1));color:#03132b;font-weight:700;border:none;font-family:inherit}',
    '.oh .btn.ghost{background:transparent;border:1px solid var(--oh-panel-b);color:var(--oh-dim)}',
    '.oh .denied{text-align:center;padding:56px 16px;color:var(--oh-dim)}',
    '.oh .denied .ico{font-size:52px;color:var(--oh-red);line-height:1;margin-bottom:12px}',
    '.oh .denied .t1{font-size:20px;color:#fff;font-weight:700;margin-bottom:8px}',
    '.oh .denied .t2{font-size:14px;max-width:640px;margin:0 auto;line-height:1.9}',
    /* 页脚 */
    '.oh footer{margin:0 20px;padding-top:14px;border-top:1px solid rgba(79,209,255,0.18);font-size:14px;color:var(--oh-dim);line-height:1.8}',
    '.oh footer b{color:var(--oh-text)}',
    '.oh code{background:rgba(79,209,255,0.10);padding:1px 5px;border-radius:4px;font-size:13px}',
    '@media (max-width:1199px){.oh .kpi-row{grid-template-columns:repeat(2,1fr)}.oh .grid2{grid-template-columns:1fr}.oh .funnel{grid-template-columns:1fr}}',
    '@media (max-width:767px){.oh{font-size:16px}.oh .oh-wrap{padding:8px 12px}.oh header.top{padding:0 12px}.oh footer{margin:0 12px}.oh .kpi-row{grid-template-columns:1fr}.oh h1{font-size:20px}.oh .kpi .v{font-size:40px}.oh table{font-size:14px}.oh th,.oh td{padding:8px 6px}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('orgHealthCss')) return;
    var s = document.createElement('style');
    s.id = 'orgHealthCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }
  function fmtPct(n) { return (Math.round(n * 10) / 10).toFixed(1) + '%'; }
  function maskName(n) {
    n = String(n == null ? '' : n);
    if (!n) return '—';
    return n.length <= 1 ? n + '**' : n.charAt(0) + '**';
  }

  /* ---------- 模块内状态 ---------- */
  var CUR = 'missing';        // 四状态演示：missing / normal / small / empty
  var mgrDept = (global.AppState && global.AppState.filters && AUTH_DEPTS.indexOf(global.AppState.filters.dept) >= 0)
    ? global.AppState.filters.dept : DEFAULT_DEPT;
  var treeKey = 0;

  function role() { return (global.AppState && global.AppState.role) || 'HR'; }
  function perm() { return ACCESS[role()] || ACCESS['员工']; }

  var ST_DESC = {
    missing: '8 个部门的「核定编制」全部为 null。编制数字位显示灰字「待录入」，利用率与超缺编<b>不参与判定</b>，部门汇总<b>排除</b>未录入部门并在下方注明数量。<span style="color:var(--oh-red)">绝不</span>用 0 兜底。',
    normal: '演示态（<b>非真实数据</b>）：模拟钟喻已核定编制后的界面表现。利用率按「在职 ÷ 核定编制」保留 1 位小数；超缺编按<b>差值 ≥ 1 人</b>判定（比例不参与判定）；三态配色 达标=绿 / 未达标=红 / 未填=灰。',
    small: '部门样本 <b>N &lt; 3</b> 时（如品控部 1 人、管理层 2 人、财务部 2 人），占比类与均值类结论<b>灰显并附提示</b>，不得作为部门结论对外。注意：<b>客服部 0 人是正常占位，不是数据缺失</b>，两者必须视觉区分。',
    empty: '数据文件缺失或字段全空时的空态：显示「暂无数据」而非 0 / 空白，并给出明确的数据源入口与责任人。'
  };
  var ST_TITLE = { missing: '数据缺失（当前真实态）', normal: '正常态（模拟已核定编制）', small: '小样本态', empty: '空数据态' };
  var ST_ORDER = ['missing', 'normal', 'small', 'empty'];

  /* ---------- 计算层 ---------- */
  function rows(D, state, p) {
    if (state === 'empty') return [];
    var all = (D.deptHealth && D.deptHealth.rows) || [];
    var rs = (p.scope === 'own') ? all.filter(function (r) { return r.label === mgrDept; }) : all;
    return rs.map(function (r) {
      var q = state === 'normal' ? (SIM_QUOTA[r.label] != null ? SIM_QUOTA[r.label] : null) : null;
      var hasQ = q != null;
      var gap = hasQ ? r.headcount - q : null;
      var use = (hasQ && q > 0) ? r.headcount / q * 100 : null;   // q === 0 → null（不可算），绝不除零
      var status = { cls: 'grey', txt: '待录入', dash: true };
      if (hasQ) {
        if (gap === 0) status = { cls: 'ok', txt: '持平', dash: false };
        else if (Math.abs(gap) >= 1) status = { cls: 'warn', txt: (gap > 0 ? '超编 ' : '缺编 ') + Math.abs(gap) + ' 人', dash: false };
      }
      var lowSample = r.headcount > 0 && r.headcount < 3;
      var emptyOk = r.headcount === 0 && AUTH_DEPTS.indexOf(r.label) >= 0;
      return {
        label: r.label, headcount: r.headcount, quota: q, hasQ: hasQ, gap: gap, use: use,
        status: status, lowSample: lowSample, emptyOk: emptyOk
      };
    });
  }
  function fmtQuota(r) { return r.hasQ ? '<span class="num">' + r.quota + '</span>' : '<span class="todo">待录入</span>'; }
  function fmtUse(r) {
    if (!r.hasQ) return '<span class="todo">待录入</span>';
    if (r.use == null) return '<span class="todo">—</span><span class="tag-inline">编制 0，不可算</span>';
    return '<span class="num">' + fmtPct(r.use) + '</span>';
  }

  /* ---------- 未分配兜底：新数据契约 meta.treeUnallocated（旧契约 meta.treeMissingPersons 兜底） ----------
     红线：在册但无考勤路径的人【必须】以显式节点留在树上，不得以任何方式消失。      */
  function unalloc(D) {
    var u = (D.meta && D.meta.treeUnallocated) || null;
    var persons = (u && u.persons) || ((D.meta && D.meta.treeMissingPersons) || []);
    return {
      nodeName: (u && u.nodeName) || '未分配（无考勤路径）',
      persons: persons,
      count: persons.length,
      note: (u && u.note) || '在册但无考勤部门路径，已显式列出，请勿解读为数据缺失。'
    };
  }
  function isUnallocNode(D, node) {
    var u = unalloc(D);
    return !!node.unassigned || node.label === u.nodeName;
  }
  /* 树中未分配节点的人数（用于算「路径覆盖」＝ 总人数 − 未分配人数） */
  function unallocCount(D) {
    var t = (D.orgTree && D.orgTree.tree && D.orgTree.tree[0]) || null;
    if (!t) return 0;
    var n = (t.children || []).filter(function (c) { return isUnallocNode(D, c); })
      .reduce(function (s, c) { return s + (c.count || 0); }, 0);
    return n || unalloc(D).count;
  }
  function coveredCount(D) {
    var t = (D.orgTree && D.orgTree.tree && D.orgTree.tree[0]) || null;
    if (!t) return 0;
    return (t.count || 0) - unallocCount(D);
  }
  /* 未分配人员的逐条原因（新契约 meta.treeUnallocated.detail） */
  function unallocDetail(D) {
    var u = (D.meta && D.meta.treeUnallocated) || null;
    return (u && u.detail) || [];
  }
  /* 未分配原因一句话（用于 tooltip / 提示条） */
  function unallocReason(D) {
    var det = unallocDetail(D);
    if (det.length) {
      return det.map(function (d) {
        return d.name + '：' + (d.reason || (d.dept + ' · ' + d.title));
      }).join('；');
    }
    return unalloc(D).note;
  }
  /* ---------- 客服部口径（约束⑥/⑨）：权威在编 0 人，但职能并未消失 ----------
     客服部（二级成本中心）0 人 ↔ 电商运营部 › 客服组 6 人：两个口径并存，
     任何一方都不得否定另一方；页面必须显式注明，禁止写「客服部无编制」。   */
  function csGroup(D) {
    var t = (D.orgTree && D.orgTree.tree && D.orgTree.tree[0]) || null;
    if (!t) return null;
    var hit = null;
    (t.children || []).forEach(function (c) {
      (c.children || []).forEach(function (k) {
        if (String(k.label || '').indexOf('客服') >= 0) hit = { dept: c.label, group: k.label, count: k.count || 0 };
      });
    });
    return hit;
  }
  /* 部门「树内人数 + 未分配人数 = 花名册人数」的对账（取有未分配回挂的部门） */
  function splitDeptRow(D) {
    var rows = (D.treeVsDeptCheck && D.treeVsDeptCheck.rows) || [];
    var hit = null;
    rows.forEach(function (r) { if (r.unallocatedBack > 0) hit = r; });
    return hit;
  }

  function buildTree(D, p) {
    var raw = (D.orgTree && D.orgTree.tree && D.orgTree.tree[0]) || null;
    if (!raw) return null;
    if (p.scope === 'own') {
      var hit = null;
      (raw.children || []).forEach(function (c) { if (c.label === mgrDept) hit = c; });
      if (hit) return { label: hit.label, count: hit.count, children: hit.children || [], scoped: true, rootLabel: null };
      return { label: raw.label, count: raw.count, children: raw.children || [], scoped: false, rootLabel: null };
    }
    var kids = (raw.children || []).slice();
    var u = unalloc(D);
    var hasNode = kids.some(function (c) { return isUnallocNode(D, c); });
    // 红线：数据侧若未自带未分配节点，前端必须补上，绝不让这批人从树里消失
    if (!hasNode && u.count > 0) {
      kids.push({ label: u.nodeName, count: u.count, unassigned: true, children: [] });
    }
    return {
      label: raw.label,
      count: (raw.count || D.meta.headcountTotal),
      children: kids, scoped: true, rootLabel: raw.label, missing: u.persons
    };
  }
  function walkTree(node, depth, open, D) {
    var kids = node.children || [];
    var childSum = kids.reduce(function (s, k) { return s + k.count; }, 0);
    var diff = node.count - childSum;
    var isUn = isUnallocNode(D, node);
    var notInEnum = depth === 1 && AUTH_DEPTS.indexOf(node.label) < 0;
    var isUnassigned = isUn;
    var id = 'oh-tn' + (++treeKey);
    var meta = [
      (!isUnassigned && diff > 0) ? '<span class="sub-note">含直属/未分组 ' + diff + ' 人</span>' : '',
      (notInEnum && !isUnassigned) ? '<span class="sub-note">⚠ 非 8 部门枚举</span>' : '',
      isUnassigned ? '<span class="badge miss dash">无考勤路径 · 非数据缺失</span>' : ''
    ].join('');
    var cls = isUnassigned ? 'trow unassigned' : 'trow';
    /* 防重复句：数据侧 detail[].reason 与 meta.treeUnallocated.note 本身都以「非数据缺失」结尾，
       拼接前先判重，避免出现「…非数据缺失（非数据缺失）」这种重复表述。 */
    var tip = '';
    if (isUnassigned) {
      var rs = unallocReason(D);
      if (rs.indexOf('非数据缺失') < 0) rs += '（非数据缺失）';
      tip = ' title="未分配成员：' + esc(unalloc(D).persons.join('、')) + '｜' + esc(rs) + '"';
    }
    return '<div class="tnode ' + (kids.length && open ? '' : 'collapsed') + '">' +
      '<div class="' + cls + '" ' + (kids.length
        ? 'data-toggle="1" tabindex="0" role="button" aria-expanded="' + open + '" aria-controls="' + id + '" aria-label="展开或收起 ' + esc(node.label) + '"'
        : '') + tip + '>' +
      '<span class="tcaret ' + (kids.length ? '' : 'leaf') + '" aria-hidden="true">' + (kids.length ? (open ? '▼' : '▶') : '·') + '</span>' +
      '<span class="tname">' + esc(node.label) + '</span>' +
      '<span class="tcnt">' + node.count + ' 人</span>' + meta + '</div>' +
      (kids.length ? '<div class="children" id="' + id + '">' + kids.map(function (k) { return walkTree(k, depth + 1, false, D); }).join('') + '</div>' : '') +
      '</div>';
  }

  /* =========================================================================
   * 风险模型纳入人数 —— 单一出处，禁止在展示文案里硬编码 39
   * -------------------------------------------------------------------------
   * 组织模块自身数据不带这个数（它属风险侧口径），故优先读已加载的 HR_RISK_BRIEF，
   *   读不到时走兜底常量。42→43 口径刷新、或风险纳入数 39→38 时，
   *   本页两处引用（单点漏斗 L3「不对齐 N 人」+ 页脚三数并列）自动跟着变。
   * ⚠ 「不对齐 N 人」是 42-39 的差值，必须现算 —— 硬编码会在口径变更时直接算错。
   * ========================================================================= */
  var RISK_MODEL_FALLBACK = 39;
  function riskModelCount() {
    var R = global.HR_RISK_BRIEF;
    if (R && R.meta && R.meta.rows && R.meta.rows.risk != null) return R.meta.rows.risk;
    if (R && R.persons && R.persons.length) return R.persons.length;
    return RISK_MODEL_FALLBACK;
  }

  /* ---------- 渲染：KPI ---------- */
  function kpiHtml(D, state, p) {
    if (state === 'empty') {
      return '<div class="kpi is-miss"><div class="k">在编人数 <span class="badge auth">✅ 权威</span></div>' +
        '<div class="v todo" style="font-size:28px">暂无数据</div><div class="nb">数据源不可用，非 0</div></div>';
    }
    var o = D.overview || {};
    var covered = coveredCount(D);          // 41：能解析出三级路径的人数（已扣除未分配节点）
    var miss = unalloc(D).persons;          // 未分配人员名单（新数据契约 meta.treeUnallocated.persons）
    var cs = csGroup(D);                    // 客服职能实际所在组（电商运营部 › 客服组）
    var sp = D.postSinglePoint || {};
    var l2 = (sp.rows || []).filter(function (r) { return r.singlePoint && !r.isPlaceholder && r.keyPost; }).length;
    return '' +
      '<div class="kpi">' +
      '<div class="k">在编人数 <span class="badge auth">✅ 权威</span> <span class="lock" title="本页唯一允许称『在编人数』的数字">🔒</span></div>' +
      '<div class="v">' + D.meta.headcountTotal + '<span class="u">人</span></div>' +
      '<div class="nb">源：' + esc(D.meta.headcountSource || 'employees.csv') + '｜唯一对外口径</div></div>' +

      '<div class="kpi">' +
      '<div class="k">二级部门 <span class="badge auth">✅ 权威</span></div>' +
      '<div class="v">' + o.deptCountAuth + '<span class="u">个</span></div>' +
      '<div class="nb">客服部 <b>0</b> 人 <span class="badge grey">正常占位 · 非缺失</span>' +
      (cs ? '职能归 ' + esc(cs.dept) + ' · ' + esc(cs.group) + ' <b>' + cs.count + '</b> 人' : '') + '</div></div>' +

      '<div class="kpi">' +
      '<div class="k">三级路径覆盖 <span class="badge miss">' + covered + ' / ' + D.meta.headcountTotal + '</span></div>' +
      '<div class="v">' + covered + '<span class="u">人</span></div>' +
      '<div class="nb">未分配 <b>' + miss.length + '</b> 人待补部门路径' +
      (p.showNames ? ' <span class="badge grey dash">' + esc(miss.join(' / ')) + '</span>' : '') + '</div></div>' +

      '<div class="kpi is-miss">' +
      '<div class="k">业务主线单点岗位数（L2） <span class="badge auth">✅ 已录入</span></div>' +
      '<div class="v" style="font-size:28px">' + l2 + '<span class="u">个</span></div>' +
      '<div class="nb">L1 结构单点 <b>' + sp.singlePointCount + '</b> 个｜核心单点岗 <b>' + l2 + '</b> 个（钟喻指定）</div></div>';
  }

  /* ---------- 渲染：编制健康表 ---------- */
  function quotaHtml(D, state, p) {
    var rs = rows(D, state, p);
    if (state === 'empty') {
      return '<div class="empty-state"><div class="ico" aria-hidden="true">◍</div>' +
        '<div class="t1">暂无编制健康数据</div>' +
        '<div class="t2">未取到 <code>deptHealth.rows</code>。这不是「0 个部门」，而是<b>数据缺失</b>。请确认数据文件已生成并重跑 <code>build_hr_modules.py --module org</code>。</div>' +
        '<span class="btn" style="pointer-events:none">前往数据烘焙脚本</span></div>';
    }
    var missing = rs.filter(function (r) { return !r.hasQ; }).length;
    var included = rs.filter(function (r) { return r.hasQ; });
    var sumHead = included.reduce(function (s, r) { return s + r.headcount; }, 0);
    var sumQuota = included.reduce(function (s, r) { return s + (r.quota || 0); }, 0);
    var companyUse = (included.length && sumQuota > 0) ? (sumHead / sumQuota * 100) : null;
    var showLowCol = state === 'small';
    var cs = csGroup(D);            // 客服职能归位说明（约束⑨）
    var sdr = splitDeptRow(D);      // 含未分配回挂的部门对账（约束⑩）

    var head = '<div class="panel-hd"><div>' +
      '<h2 class="panel-title" id="oh-t-quota">部门编制健康 <span class="badge auth">✅ 在职权威</span>' +
      (p.scope === 'own' ? '<span class="badge grey">仅 ' + esc(mgrDept) + '</span>' : '') + '</h2>' +
      '<div class="sub">在职口径＝employees.csv（' + D.meta.headcountTotal + ' 人）；分母＝飞书《部门编制表》' +
      '<span class="badge ' + (missing ? 'miss' : 'ok') + '">' + (missing ? missing + ' 个部门待录入' : '已全部录入') + '</span></div></div>' +
      '<span class="badge ' + (missing === rs.length ? 'miss' : (missing ? 'warn' : 'ok')) + '" id="oh-quota-badge">' +
      (missing === rs.length ? '编制待录入 ' + missing + '/' + rs.length : '编制已录入 ' + (rs.length - missing) + '/' + rs.length) +
      '</span></div>';

    var body = '<table><thead><tr><th>部门</th><th>在职（人）</th><th>核定编制</th><th>利用率</th><th>差值 / 判定</th>' +
      (showLowCol ? '<th>样本校验</th>' : '') + '</tr></thead><tbody>' +
      rs.map(function (r) {
        var dimRow = !r.hasQ || r.emptyOk || (showLowCol && r.lowSample);
        var nameCell = esc(r.label) +
          (r.emptyOk ? ' <span class="badge grey">0 人 · 正常占位</span>' : '') +
          (cs && r.label === '客服部'
            ? ' <span class="badge grey">职能归 ' + esc(cs.dept) + ' · ' + esc(cs.group) + ' ' + cs.count + ' 人</span>' : '') +
          (sdr && r.label === sdr.dept
            ? ' <span class="badge grey dash">' + sdr.orgTree + ' 有路径 + ' + sdr.unallocatedBack + ' 无路径</span>' : '') +
          (!r.emptyOk && r.lowSample && showLowCol ? ' <span class="badge grey dash">小样本</span>' : '');
        var lowCell = !showLowCol ? '' : '<td>' + (r.emptyOk
          ? '<span class="todo">不适用（0 人非缺失）</span>'
          : (r.lowSample ? '<span class="todo">N&lt;3 灰显</span>' : '<span style="color:var(--oh-green)">N≥3 可用</span>')) + '</td>';
        return '<tr class="' + (dimRow ? 'dimmed' : '') + '">' +
          '<td class="name">' + nameCell + '</td>' +
          '<td><span class="num' + (r.emptyOk ? ' muted' : '') + '">' + r.headcount + '</span></td>' +
          '<td>' + fmtQuota(r) + '</td>' +
          '<td>' + fmtUse(r) + '</td>' +
          '<td><span class="badge ' + r.status.cls + (r.status.dash ? ' dash' : '') + '">' + r.status.txt + '</span></td>' +
          lowCell + '</tr>';
      }).join('') + '</tbody></table>';

    var note = '<div class="panel-note ' + (missing ? 'missNote' : '') + '">' +
      (missing
        ? '⚠ <b>' + missing + '/' + rs.length + ' 个部门编制待录入，未纳入利用率统计</b>。全公司利用率<b>当前不计算</b>（分母不全），<b>禁止</b>用「各部门已录入部分」外推，也<b>禁止</b>显示 0% 或 100%。<br>公司级口径须用 <code>SUM(在职) ÷ SUM(编制)</code>，<b>不得</b>用各部门利用率的算术平均（小部门会被大部门淹没）。'
        : '全公司编制利用率（SUM 口径）＝ SUM(在职) ' + sumHead + ' ÷ SUM(编制) ' + sumQuota + ' ＝ <b>' + (companyUse == null ? '—' : fmtPct(companyUse)) + '</b>；超缺编判定按 <b>差值 ≥ 1 人</b>，比例只展示、<b>不参与判定</b>。') +
      '<br>精度：利用率保留 <b>1 位小数</b>（' + D.meta.headcountTotal + ' 人规模 + 分母多为人工核定估计值，2 位小数属虚假精度）。</div>';
    return head + body + note;
  }

  /* ---------- 渲染：组织树 ---------- */
  function treeHtml(D, state, p) {
    var u = unalloc(D);
    var covered = coveredCount(D);
    var head = '<div class="panel-hd"><div>' +
      '<h2 class="panel-title" id="oh-t-tree">三级组织架构 <span class="badge auth">✅ 路径权威</span></h2>' +
      '<div class="sub">默认展示<b>二级（8 部门 × ' + D.meta.headcountTotal + ' 人白名单）</b>；三级支持下钻</div></div>' +
      '<span class="badge grey dash">' + D.meta.headcountTotal + ' 人白名单 · 已分配 ' + covered + ' + 未分配 ' + u.count + '</span></div>';
    if (state === 'empty') {
      return head + '<div class="empty-state" style="padding:24px 8px"><div class="ico" aria-hidden="true">◍</div>' +
        '<div class="t1">暂无组织架构数据</div><div class="t2">未取到 <code>orgTree.tree</code>。<b>不要</b>渲染一个空的根节点充数。</div></div>';
    }
    var root = buildTree(D, p);
    if (!root) return head + '<div class="empty-state"><div class="t1">暂无组织架构数据</div></div>';
    treeKey = 0;
    var det = unallocDetail(D);
    var sdr = splitDeptRow(D);
    var proxy = '<div class="notice proxy" style="margin:0 0 10px"><span class="ic" aria-hidden="true">⚠</span><span>' +
      '三级路径取自<b>飞书考勤「部门」字段</b>（非 HR 官方组织树），已按 ' + D.meta.headcountTotal + ' 人 <code>emp_id</code> 白名单重建 —— 已剔除「奥乐V」「小V」「口腔顾问-小牙老师」等非人员对象与标注离职者。<br>' +
      '树的总人数＝<b>' + D.meta.headcountTotal + '</b> ＝ 已分配 <b>' + covered + '</b> ＋ 未分配 <b>' + u.count + '</b>' +
      (p.showNames && u.persons.length ? '（' + esc(u.persons.join(' / ')) + '）' : '') +
      '，与花名册闭合；未分配 ' + u.count + ' 人以虚线兜底组呈现，<b>不得从树里消失</b>。<br>' +
      '📌 <b>未分配 ≠ 数据缺失</b>：' + (det.length
        ? det.map(function (d) { return esc(d.name) + '（' + esc(d.dept) + ' · ' + esc(d.title) + '）—— ' + esc(d.reason); }).join('；')
        : esc(u.note)) + '。' +
      (sdr ? '<br>📌 <b>' + esc(sdr.dept) + ' 人数对账</b>：树内 <b>' + sdr.orgTree + '</b>（有考勤路径）＋未分配 <b>' + sdr.unallocatedBack + '</b>（无路径）＝ 花名册 <b>' + sdr.deptHealth + '</b>，<b>不要把树里的 ' + sdr.orgTree + ' 当成该部门人数</b>。' : '') +
      '</span></div>';
    var scopeNote = (p.scope === 'own' && !root.scoped)
      ? '<div class="notice miss" style="margin:0 0 10px"><span class="ic" aria-hidden="true">◑</span><span>本部门（' + esc(mgrDept) + '）暂无三级考勤路径数据，以下展示完整架构供参考。</span></div>' : '';
    var sub = (p.scope === 'own' && root.scoped)
      ? '<div class="notice miss" style="margin:0 0 10px"><span class="ic" aria-hidden="true">🔒</span><span>按角色授权，仅展示<b>' + esc(mgrDept) + '</b>分支。</span></div>' : '';
    return head + proxy + scopeNote + sub + '<div class="tree" id="oh-tree">' + walkTree(root, 0, true, D) + '</div>';
  }

  /* ---------- 渲染：结构单点岗位（三层漏斗） ---------- */
  function funnelHtml(D, state, p) {
    var head = '<div class="panel-hd"><div>' +
      '<h2 class="panel-title" id="oh-t-funnel">结构单点岗位（三层漏斗收敛） <span class="badge proxy">🟡 代理 · 待归一校准</span></h2>' +
      '<div class="sub">' + (D.postSinglePoint.singlePointCount) + ' 个岗位仅 1 人在岗，<b>不得全量告警</b>，须经 L2/L3 收敛</div></div>' +
      '<span class="badge alert">🔴 结构单点 ≠ 风险告警</span></div>';
    if (state === 'empty') {
      return head + '<div class="empty-state" style="padding:20px"><div class="t1">暂无岗位数据</div>' +
        '<div class="t2">未取到 <code>postSinglePoint.rows</code>，<b>不得</b>把岗位数显示为 0。</div></div>';
    }
    var sp = D.postSinglePoint;
    var coreRows = (sp.rows || []).filter(function (r) { return r.singlePoint && !r.isPlaceholder && r.keyPost; });
    var l2 = coreRows.length;
    var l3rows = coreRows.filter(function (r) { return r.highRisk; });
    var l3 = l3rows.length;
    var funnel = '<div class="funnel">' +
      '<div class="fstep"><div class="lvl">L1</div><div class="nm">结构单点岗位数</div>' +
      '<div class="vv">' + sp.singlePointCount + '</div>' +
      '<div class="dsc">title 去重后仅 1 人在岗。<b>仅下钻可见</b>，不推预警。</div>' +
      '<div><span class="badge proxy dash">待归一校准</span></div></div>' +
      '<div class="fstep is-main"><div class="lvl">L2 · 主指标</div><div class="nm">业务主线单点岗位数</div>' +
      '<div class="vv">' + l2 + '</div>' +
      '<div class="dsc">= 单点岗位 ∩ 关键岗位白名单（' + l2 + ' 个核心单点岗）。<b>已收敛</b>：从 L1 ' + sp.singlePointCount + ' 降至 ' + l2 + '。</div>' +
      '<div><span class="badge auth">✅ 已录入</span></div></div>' +
      '<div class="fstep"><div class="lvl">L3</div><div class="nm">高危单点岗位数</div>' +
      '<div class="vv">' + l3 + '</div>' +
      '<div class="dsc">= L2 ∩ 离职风险池（风险等级 中风险/观察池，低风险不计）。风险模型覆盖 ' + riskModelCount() + ' 人，与在编 ' + D.meta.headcountTotal + ' 人不对齐 ' + Math.abs(D.meta.headcountTotal - riskModelCount()) + ' 人，仅作趋势代理。</div>' +
      '<div><span class="badge ' + (l3 > 0 ? 'alert' : 'ok') + '">' + (l3 > 0 ? '🔴 需关注' : '✅ 暂无') + '</span></div></div></div>';

    var chips = sp.rows.filter(function (r) { return r.singlePoint && !r.isPlaceholder; }).slice(0, 8).map(function (r) {
      var m = (r.members || []).map(function (x) { return p.showNames ? x : maskName(x); }).join('、');
      return '<span class="post-chip' + (r.keyPost ? ' key' : '') + '" title="在岗：' + esc(m) + '">' + (r.keyPost ? '🌟 ' : '') + esc(r.label) +
        '<span style="color:var(--oh-muted);font-size:12px">· ' + r.count + ' 人</span></span>';
    }).join('');
    var ghost = sp.rows.filter(function (r) { return r.isPlaceholder; }).map(function (r) {
      return '<span class="post-chip ghost" title="岗位未填写（数据缺失）">' + esc(r.label) + ' · 数据缺失</span>';
    }).join('');

    var tail = '<div class="panel-title" style="font-size:16px;margin-top:6px">L1 全量下钻（示意 Top 8）</div>' +
      '<div class="post-list">' + chips + ghost + '</div>' +
      '<div class="panel-note">' +
      '🔒 <b>人名仅 HRD / 授权 HRBP 可见</b>；其余角色脱敏为「张**」，且任何细分 <b>N &lt; 5 必须合并或隐藏</b>。' +
      '核心岗白名单已录入（岗位级，钟喻指定 ' + l2 + ' 个核心单点岗），标🌟者为关键岗位；L3 高危单点（核心岗且风险等级中风险/观察池）见卡片。</div>' +
      '<div class="panel-note warnNote">⚠ <b>title 未标准化</b>（如「设计」vs「视觉设计经理」、「电商运营助理」vs「用户运营专员」），' +
      'L1=' + sp.singlePointCount + ' 属<b>未经归一的原始去重结果，可能高估</b>（全部合并后可能降至 27）。归一映射已获授权（裁决 R2），完成前须常驻「待归一校准」标注。<br>' +
      '⚠ 总经理、HRD 等岗位<b>本来就该只有 1 人</b>：结构单点<b>不等于</b>风险告警，对外统一称「结构单点岗位数」，仅 L3 才推预警（裁决 R7）。</div>';
    return head + funnel + tail;
  }

  /* ---------- 渲染：两个最容易被误读的口径（约束⑥ 客服部 / ④⑩ 未分配） ---------- */
  function clarifyHtml(D, p) {
    var cs = csGroup(D);
    var u = unalloc(D);
    var det = unallocDetail(D);
    var sdr = splitDeptRow(D);
    var covered = coveredCount(D);
    var total = D.meta.headcountTotal;
    return '<div class="panel-hd"><div>' +
      '<h2 class="panel-title" id="oh-t-clarify">两个易被误读的口径 · 显式注明 <span class="badge auth">✅ 防误读</span></h2>' +
      '<div class="sub">这两条若省略，会被分别误读为「客服部被裁撤」和「数据缺失」，两者都是错误结论</div></div></div>' +

      '<div class="panel-note warnNote">📌 <b>客服部在编 0 人 ≠ 客服部被裁撤</b>：' +
      (cs
        ? '客服职能归 <b>' + esc(cs.dept) + ' · ' + esc(cs.group) + ' ' + cs.count + ' 人</b> —— 二级部门（成本中心）与三级考勤组是两套口径，两处数字<b>不可互相否定</b>。'
        : '客服职能由电商运营部下设客服组承接（见右侧三级架构树）。') +
      '<b>禁止</b>写「客服部无编制 / 客服职能缺失 / 客服编制空缺」。' +
      '</div>' +

      '<div class="panel-note missNote">📌 <b>未分配 ' + u.count + ' 人 ≠ 数据缺失</b>：三级路径覆盖 <b>' + covered + '/' + total + '</b>' +
      '（分母＝在册 ' + total + ' 人；分子＝能解析出真实三级路径的人数）。未分配者已显式挂在「' + esc(u.nodeName) + '」节点，<b>一个都没被丢弃</b>' +
      (p.showNames && u.persons.length ? '，名单：<b>' + esc(u.persons.join('、')) + '</b>' : '') + '。<br>' +
      '原因：' + (det.length
        ? det.map(function (d) { return esc(d.name) + '（' + esc(d.dept) + ' · ' + esc(d.title) + '）—— ' + esc(d.reason); }).join('；')
        : esc(u.note)) + '。<br>' +
      (sdr
        ? '部门对账：<b>' + esc(sdr.dept) + ' ＝ 树内 ' + sdr.orgTree + ' 人（有考勤路径）＋未分配 ' + sdr.unallocatedBack + ' 人（无路径）＝ 花名册 ' + sdr.deptHealth + ' 人</b>；' +
          '<b>只看树会少算 ' + sdr.unallocatedBack + ' 人</b>，读表时<b>不要</b>把树里的 ' + sdr.orgTree + ' 当成该部门人数。'
        : '') +
      '</div>';
  }

  /* ---------- 禁入屏 ---------- */
  function deniedHtml() {
    return '<div class="oh"><div class="oh-wrap"><div class="panel"><div class="denied">' +
      '<div class="ico" aria-hidden="true">🔒</div><div class="t1">你无权查看组织架构与编制健康诊断</div>' +
      '<div class="t2">按当前最严格的默认授权，本模块对<b>员工</b>角色不可见：部门编制、在职分布与「结构单点岗位」名单属内部管理信息，' +
      '且单点岗位会暴露具体在岗人姓名。<br><br>如需对本角色开放（例如仅展示部门人数、隐藏编制与人名），请联系 HRD 钟喻调整授权配置 ' +
      '<code>ACCESS</code>（<code>dist/js/org_health.js</code> 顶部常量）。</div></div></div></div></div>';
  }

  /* ---------- 主渲染 ---------- */
  function render() {
    injectCss();
    var D = global.HR_ORG_HEALTH;
    var view = U.el('view');
    if (!D) {
      view.innerHTML = '<div style="padding:48px;text-align:center;color:#e5484d">⚠️ 组织健康数据未加载（window.HR_ORG_HEALTH 缺失）</div>';
      return;
    }
    if (global.App && global.App.setBreadcrumb) {
      global.App.setBreadcrumb(['人力资源', '组织架构与编制诊断']);
    }
    var p = perm();
    if (!p.visible) { view.innerHTML = deniedHtml(); return; }

    var st = CUR;
    var stateBtns = ST_ORDER.map(function (k) {
      return '<button type="button" class="ms-btn' + (k === st ? ' active' : '') + '" role="tab" aria-selected="' + (k === st ? 'true' : 'false') +
        '" data-state="' + k + '">' + '①②③④'[ST_ORDER.indexOf(k)] + ' ' +
        ({ missing: '数据缺失（真实态）', normal: '正常态（模拟）', small: '小样本态', empty: '空数据态' }[k]) + '</button>';
    }).join('');
    var deptPick = (p.scope === 'own')
      ? '<select class="dept-pick" id="oh-dept" aria-label="选择部门">' + AUTH_DEPTS.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === mgrDept ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('') + '</select>' : '';
    var whoami = { 'HR': 'HR 管理员 · 全量可见', '负责人': '部门负责人 · 仅本部门', '员工': '普通员工 · 不可见' }[role()] || '';

    var demoWarn = (st === 'normal')
      ? '<div class="notice demo" role="alert"><span class="ic" aria-hidden="true">⛔</span><span><b>当前为模拟演示态</b>：下方编制数字是为演示「正常态界面表现」而假设的值，' +
        '<b>不是钟喻核定的编制</b>，<b>严禁截图当真实数据使用</b>。真实编制仍为「待录入」（飞书《部门编制表》在建中）。</span></div>' : '';

    var html = '<div class="oh"><div class="oh-wrap">' +

      '<div class="caliber-bar" role="region" aria-label="口径等级图例">' +
      '<span class="legend-item"><span class="dot auth" aria-hidden="true"></span>✅ <b>权威口径</b>：可直接对外</span>' +
      '<span class="legend-item"><span class="dot proxy" aria-hidden="true"></span>🟡 <b>代理口径</b>：近似值，页面常驻标注</span>' +
      '<span class="legend-item"><span class="dot miss" aria-hidden="true"></span>❌ <b>缺失</b>：显示「待录入」，禁止 0 兜底</span>' +
      '<span style="margin-left:auto">🔒 本页唯一「<b>在编人数</b>」＝ <b>' + D.meta.headcountTotal + '</b>，其余人数均带限定语</span></div>' +

      '<header class="top"><div><h1>组织架构与编制健康诊断</h1>' +
      '<div class="sub">广州市诺晟医疗技术有限公司（奥乐V）｜数据快照 ' + esc(D.meta.generatedAt) +
      ' ｜ 编制 owner：HRD 钟喻 ｜ 当前角色：<b>' + esc(whoami) + '</b></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">' +
      (deptPick ? '<div class="switch-group" style="display:flex;gap:6px;align-items:center"><span class="sub">本部门</span>' + deptPick + '</div>' : '') +
      '<div class="demo-switch" role="tablist" aria-label="状态演示切换">' + stateBtns + '</div></div></header>' +

      '<div class="state-box" role="status" aria-live="polite">' +
      '<div class="st-hd">状态' + '①②③④'[ST_ORDER.indexOf(st)] + '：' + ST_TITLE[st] + '</div>' +
      '<div class="st-dsc">' + ST_DESC[st] + '</div></div>' +

      demoWarn +

      (st === 'missing'
        ? '<div class="notice miss" role="note"><span class="ic" aria-hidden="true">◍</span><span>' +
          '<b>核定编制尚未录入（8/8 部门）</b>：飞书《部门编制表》在建中，编制列<b>强制留空</b>。' +
          '因此「编制利用率 / 超缺编判定」<b>当前不可用</b>，一律显示 <b>「待录入」并灰显</b>，<b>禁止</b>以 0 或 100% 兜底 —— ' +
          '把「在职 5 / 编制 0」算成满编，会把缺编最严重的部门显示成最健康，<b>方向完全相反</b>。<br>' +
          '补数入口：<b>飞书《部门编制表》</b>（owner：钟喻）｜补数后本页自动切换为正常态。</span></div>'
        : '') +

      '<section class="kpi-row" aria-label="核心指标">' + kpiHtml(D, st, p) + '</section>' +

      '<div class="grid2">' +
      '<section class="panel" aria-labelledby="oh-t-quota">' + quotaHtml(D, st, p) + '</section>' +
      '<section class="panel" aria-labelledby="oh-t-tree">' + treeHtml(D, st, p) + '</section>' +
      '</div>' +

      '<section class="panel" aria-labelledby="oh-t-clarify">' + clarifyHtml(D, p) + '</section>' +

      '<section class="panel" aria-labelledby="oh-t-funnel">' + funnelHtml(D, st, p) + '</section>' +

      '<footer>' +
      '<div><b>数据源</b>：S1 本地花名册 <code>data/employees.csv</code>（' + D.meta.headcountTotal + ' 人，<b>在编人数唯一权威源</b>）｜S2 飞书考勤月度汇总（三级路径 + 考勤覆盖人数代理）｜S5 飞书《部门编制表》（建表中）｜S6 前端 <code>CONST.DEPTS</code>（8 个二级部门枚举）</div>' +
      '<div><b>口径说明</b>：三个数不同源，<b>差异不追平</b> —— ' + D.meta.headcountTotal + '（在编，权威）／ ' + coveredCount(D) + '（能解析三级路径）／ ' + riskModelCount() + '（风险模型纳入）；未分配 ' + unalloc(D).count + ' 人（' + esc(unalloc(D).persons.join('、')) + '）属正常无考勤路径，<b>非数据缺失</b>；除 ' + D.meta.headcountTotal + ' 外一律不得当「在编人数」使用。</div>' +
      '<div><b>已下架指标</b>：「人数环比」已裁决<b>砍掉</b> —— 未过滤口径 48→50→53 看似扩编，' + D.meta.headcountTotal + ' 人白名单口径实为 39→38→37 微降，趋势方向可被口径反转，且把休假/未打卡误算为不在编，<b>本页不做任何人数趋势图</b>（数据文件中的 <code>headcountTrend</code> 字段禁止渲染）。</div>' +
      '<div><b>禁止源</b>：员工档案表「部门」字段为脏 select（20 取值含重复口径 + 5 条空值），<b>禁止用于任何分组统计</b>；<code>leave / reimbursement / seal / assets</code> 四张虚构 csv 禁用。</div>' +
      '<div><b>联系 HR</b>：编制核定请找 HRD 钟喻；口径疑问请找 HR 知识策展人（管墨林）。</div>' +
      '</footer>' +
      '</div></div>';

    view.innerHTML = html;
    bindEvents(view, D);
  }

  function bindEvents(view, D) {
    var root = view.firstElementChild;
    if (!root) return;
    root.addEventListener('click', function (e) {
      var st = e.target.closest ? e.target.closest('.ms-btn[data-state]') : null;
      if (st) { CUR = st.getAttribute('data-state'); render(); return; }
      var t = e.target.closest ? e.target.closest('.trow[data-toggle]') : null;
      if (t) {
        var box = t.parentElement;
        box.classList.toggle('collapsed');
        t.setAttribute('aria-expanded', box.classList.contains('collapsed') ? 'false' : 'true');
        var caret = t.querySelector('.tcaret');
        if (caret) caret.textContent = box.classList.contains('collapsed') ? '▶' : '▼';
      }
    });
    root.addEventListener('keydown', function (e) {
      var t = e.target.closest ? e.target.closest('.trow[data-toggle]') : null;
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); }
    });
    var sel = U.el('oh-dept');
    if (sel) sel.addEventListener('change', function () { mgrDept = sel.value; render(); });
  }

  global.OrgHealth = { render: render };
})(window);

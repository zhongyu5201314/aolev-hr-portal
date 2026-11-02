/* =========================================================================
 * risk_brief.js — 人力资源板块 · 员工风险简报
 *   数据来源：risk_brief_data.js (window.HR_RISK_BRIEF)  ← 烘焙快照，只读
 *   权威口径：knowledge/员工风险简报_指标口径说明.md（不得推翻）
 *   依赖：    utils.js（U.*）｜app.js（window.HR_ROLE_CONFIG，唯一权限权威）
 *   路由：    #/risk-brief
 *   红线（已在代码中固化，改动前先读口径文档）：
 *     ① R1 风险评分【不得】用于调薪 / 降薪 / 辞退 / 惩戒 / 末位淘汰 —— 提示条常驻不可关
 *     ② 员工本人【整屏禁入】，不渲染任何分数 / 等级 / 雷达 / 建议
 *     ③ 部门负责人：仅本部门 + 不显示总分 + 不显示六维，只给「等级 + 处置建议」
 *     ④ riskLevel 源表枚举是【4 值】（低风险/中风险/高风险/观察池）；
 *        「待确认」不是枚举值，只是派生展示标签，【禁止】用于取数
 *     ⑤ 观察池 ≡ 置信度不足：不进色阶、不排序、不给总分、不下定论
 *     ⑥ 风险模型 39 人 ≠ 花名册 42 人：禁止「全员风险评估 / 覆盖率100% / 已评估42人」
 *     ⑦ 雷达必须 D1–D6 六维全出；薪酬与发展机会【不进雷达】，各自独立成卡
 *     ⑧ null 维度画成 ⊘「无数据」，禁止填 0；N<5 的细分必须合并或隐藏
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  /* ---------- 权限：读全站唯一运行时权威 window.HR_ROLE_CONFIG（app.js 定义） ---------- */
  var ACCESS = global.HR_ROLE_CONFIG || {
    'HR':     { visible: true,  scope: 'all',  showNames: true,  score: true,  dims: true,  evidence: 'full',     advice: true  },
    '负责人': { visible: true,  scope: 'own',  showNames: false, score: false, dims: false, evidence: 'reviewed', advice: true  },
    '员工':   { visible: false, scope: 'none', showNames: false, score: false, dims: false, evidence: 'none',     advice: false }
  };

  /* ---------- riskLevel 源表枚举（4 值）与派生展示映射 ----------
     ⛔ 取数只认 LEVEL_ENUM 里的 4 值。拿「待确认」去 filter/find/分组会命中 0 行，
        静默漏掉这 6 个人且不报错 —— 这是本模块最容易被踩的坑。              */
  var LEVEL_ENUM    = ['低风险', '中风险', '高风险', '观察池'];
  var LEVEL_CLS     = { '低风险': 'low', '中风险': 'mid', '高风险': 'high', '观察池': 'grey' };
  var LEVEL_DISPLAY = { '低风险': '低风险', '中风险': '中风险', '高风险': '高风险', '观察池': '待确认 · 数据不足' };

  var DEFAULT_DEPT = '电商运营部';   // 部门负责人视角默认部门（页面可切换）

  /* ---------- 作用域 CSS（全部以 .rb 前缀收敛，避免与门户及其它模块重名冲突） ---------- */
  var CSS = [
    '.rb{--rb-bg1:#06122b;--rb-bg2:#0a1a35;--rb-panel:rgba(16,38,75,0.55);--rb-panel-b:rgba(79,209,255,0.28);--rb-s1:#1E6FFF;--rb-s2:#4FD1FF;--rb-s3:#8FE3FF;--rb-amber:#F5A524;--rb-red:#FF4D4F;--rb-green:#10B981;--rb-text:#E8F1FF;--rb-dim:#C7D8EE;--rb-muted:#7FA6D8;--rb-rc:12px;--rb-rb:8px;background:radial-gradient(1200px 700px at 20% -10%,#0d2347 0%,var(--rb-bg1) 45%,var(--rb-bg2) 100%);color:var(--rb-text);font-family:"Microsoft YaHei","微软雅黑",-apple-system,"PingFang SC",sans-serif;font-size:16px;line-height:1.6;border-radius:var(--rb-rc);padding:16px 0 8px;overflow:hidden}',
    '.rb *{box-sizing:border-box}',
    '.rb .rb-wrap{max-width:1440px;margin:0 auto;padding:8px 20px}',
    '.rb h1{font-size:24px;font-weight:700;letter-spacing:1px;margin:0}',
    '.rb h2{font-size:20px;font-weight:700;margin:0}',
    '.rb .mono,.rb .num{font-variant-numeric:tabular-nums}',
    '.rb .sub{font-size:14px;color:var(--rb-dim)}',
    /* 红线提示条（常驻·不可关） */
    '.rb .redline{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.7;border-radius:var(--rb-rb);padding:12px 16px;margin-bottom:14px;background:rgba(255,77,79,0.12);border:1px solid rgba(255,77,79,0.55)}',
    '.rb .redline .ic{color:var(--rb-red);font-size:16px;flex:none}',
    '.rb .redline b{color:#fff}',
    /* 提示条 */
    '.rb .notice{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.7;border-radius:var(--rb-rb);padding:12px 16px;margin-bottom:12px}',
    '.rb .notice.proxy{background:rgba(245,165,36,0.10);border:1px solid rgba(245,165,36,0.45);color:var(--rb-dim)}',
    '.rb .notice.proxy .ic{color:var(--rb-amber);flex:none}',
    '.rb .notice.miss{background:rgba(127,166,216,0.12);border:1px solid rgba(127,166,216,0.45);color:var(--rb-dim)}',
    '.rb .notice.miss .ic{color:var(--rb-muted);flex:none}',
    '.rb .notice.demo{background:rgba(255,77,79,0.10);border:1px dashed rgba(255,77,79,0.5);color:var(--rb-dim)}',
    '.rb .notice.demo .ic{color:var(--rb-red);flex:none}',
    '.rb .notice b{color:#fff}',
    '.rb .notice code{background:rgba(8,24,52,.6);padding:1px 5px;border-radius:4px;font-size:13px}',
    /* Header */
    '.rb header.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:16px;padding:0 20px}',
    '.rb .whoami{font-size:14px;color:var(--rb-dim)}',
    '.rb .demo-switch{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.rb .ms-btn{font-size:14px;color:var(--rb-dim);background:rgba(8,24,52,.6);border:1px solid var(--rb-panel-b);border-radius:var(--rb-rb);padding:5px 12px;cursor:pointer}',
    '.rb .ms-btn.active{background:var(--rb-s1);color:#fff;border-color:var(--rb-s1)}',
    '.rb .ms-btn:focus-visible{outline:2px solid var(--rb-amber);outline-offset:2px}',
    /* KPI */
    '.rb .kpi-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:16px}',
    '.rb .kpi{position:relative;overflow:hidden;background:var(--rb-panel);border:1px solid var(--rb-panel-b);border-radius:var(--rb-rc);padding:14px 16px}',
    '.rb .kpi::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--rb-s2)}',
    '.rb .kpi.c-low::after{background:var(--rb-green)}',
    '.rb .kpi.c-mid::after{background:var(--rb-red)}',
    '.rb .kpi.c-hi::after{background:var(--rb-red)}',
    '.rb .kpi.c-na::after{background:var(--rb-muted)}',
    '.rb .kpi.c-na{background:repeating-linear-gradient(45deg,rgba(127,166,216,0.06),rgba(127,166,216,0.06) 10px,transparent 10px,transparent 20px)}',
    '.rb .kpi.c-grey::after{background:var(--rb-muted)}',
    '.rb .kpi .k{font-size:16px;color:var(--rb-dim);display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.rb .kpi .v{font-size:40px;font-weight:800;line-height:1.15;margin:4px 0 2px;font-variant-numeric:tabular-nums}',
    '.rb .kpi .v .u{font-size:16px;font-weight:600;color:var(--rb-dim);margin-left:4px}',
    '.rb .kpi .v.na{font-size:24px;color:var(--rb-muted)}',
    '.rb .kpi .nb{font-size:14px;color:var(--rb-muted);line-height:1.55}',
    /* 徽章 */
    '.rb .badge{font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid;display:inline-block;line-height:1.6;white-space:nowrap}',
    '.rb .badge.auth{background:rgba(16,185,129,0.16);color:var(--rb-green);border-color:rgba(16,185,129,0.45)}',
    '.rb .badge.proxy{background:rgba(245,165,36,0.14);color:var(--rb-amber);border-color:rgba(245,165,36,0.5)}',
    '.rb .badge.low{background:rgba(16,185,129,0.16);color:var(--rb-green);border-color:rgba(16,185,129,0.45)}',
    '.rb .badge.mid{background:rgba(255,77,79,0.14);color:var(--rb-red);border-color:rgba(255,77,79,0.5)}',
    '.rb .badge.high{background:rgba(255,77,79,0.26);color:#fff;border-color:var(--rb-red);font-weight:700}',
    '.rb .badge.grey{background:rgba(127,166,216,0.12);color:var(--rb-muted);border-color:rgba(127,166,216,0.42)}',
    '.rb .badge.miss{background:rgba(127,166,216,0.14);color:var(--rb-muted);border-color:rgba(127,166,216,0.5)}',
    '.rb .badge.dash{border-style:dashed}',
    /* 面板 */
    '.rb .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}',
    '.rb .panel{background:var(--rb-panel);border:1px solid var(--rb-panel-b);border-radius:var(--rb-rc);padding:16px 18px}',
    '.rb .panel-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap}',
    '.rb .panel-title{font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.rb .panel-note{font-size:14px;color:var(--rb-dim);line-height:1.7;margin-top:10px}',
    '.rb .panel-note.n1{background:rgba(127,166,216,0.08);border-left:3px solid var(--rb-muted);padding:8px 12px;border-radius:0 var(--rb-rb) var(--rb-rb) 0}',
    '.rb .panel-note.n2{background:rgba(245,165,36,0.08);border-left:3px solid var(--rb-amber);padding:8px 12px;border-radius:0 var(--rb-rb) var(--rb-rb) 0}',
    /* 人员列表 */
    '.rb .plist{display:grid;grid-template-columns:repeat(auto-fill,minmax(238px,1fr));gap:12px}',
    '.rb .pcard{border:1px solid var(--rb-panel-b);border-radius:var(--rb-rc);padding:12px;background:rgba(8,24,52,0.5);cursor:pointer}',
    '.rb .pcard:hover{border-color:var(--rb-s2)}',
    '.rb .pcard:focus-visible{outline:2px solid var(--rb-amber);outline-offset:2px}',
    '.rb .pcard.is-low{border-left:4px solid var(--rb-green)}',
    '.rb .pcard.is-mid{border-left:4px solid var(--rb-red)}',
    '.rb .pcard.is-high{border-left:4px solid var(--rb-red);background:rgba(255,77,79,0.08)}',
    '.rb .pcard.is-grey{border-left:4px dashed var(--rb-muted);background:repeating-linear-gradient(45deg,rgba(127,166,216,0.07),rgba(127,166,216,0.07) 10px,transparent 10px,transparent 20px)}',
    '.rb .pcard.sel{border-color:var(--rb-s2);box-shadow:0 0 0 2px rgba(79,209,255,.25)}',
    '.rb .pcard .pn{font-size:16px;font-weight:700;color:#fff;display:flex;justify-content:space-between;gap:8px;align-items:center}',
    '.rb .pcard .pd{font-size:14px;color:var(--rb-dim);margin:2px 0 6px}',
    '.rb .pcard .ps{font-size:14px;color:var(--rb-dim)}',
    '.rb .pcard .ps .num{font-size:20px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums}',
    '.rb .pcard .ps .num.na{font-size:16px;color:var(--rb-muted)}',
    /* 详情 */
    '.rb .detail{display:grid;grid-template-columns:200px 1fr;gap:18px}',
    '.rb .dimrow{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed rgba(79,209,255,0.16);font-size:14px}',
    '.rb .dimrow .dl{color:var(--rb-dim)}',
    '.rb .dimrow .dv{font-variant-numeric:tabular-nums;font-weight:700;color:#fff}',
    '.rb .dimrow.narow .dv{color:var(--rb-muted);font-weight:600}',
    '.rb .advice{font-size:14px;line-height:1.7;color:var(--rb-dim);background:rgba(8,24,52,0.45);border-radius:var(--rb-rb);padding:8px 12px;margin-bottom:8px}',
    '.rb .advice .ah{color:var(--rb-s2);font-weight:700}',
    '.rb .advice-na{font-size:14px;color:var(--rb-dim);background:rgba(127,166,216,0.08);border:1px dashed rgba(127,166,216,0.55);border-radius:var(--rb-rb);padding:10px 12px;line-height:1.75}',
    '.rb .advice-na .an-h{color:#fff;font-size:14px;margin-bottom:6px}',
    '.rb .advice-na .an-steps{margin:0 0 6px 18px;padding:0}',
    '.rb .advice-na .an-steps li{margin-bottom:4px}',
    '.rb .advice-na .an-foot{font-size:12px;color:var(--rb-muted)}',
    '.rb .advice-na b,.rb .advice-na u{color:#fff}',
    '.rb .lockbox{font-size:14px;color:var(--rb-muted);background:repeating-linear-gradient(45deg,rgba(127,166,216,0.10),rgba(127,166,216,0.10) 8px,transparent 8px,transparent 16px);border:1px dashed rgba(127,166,216,0.4);border-radius:var(--rb-rb);padding:10px 12px;line-height:1.7}',
    '.rb .evidence{font-size:14px;line-height:1.8;color:var(--rb-dim);background:rgba(8,24,52,0.45);border-radius:var(--rb-rb);padding:10px 12px;margin-top:6px}',
    '.rb .evidence .ev-k{color:var(--rb-s2);font-weight:700}',
    /* 表格 */
    '.rb table{width:100%;border-collapse:collapse;font-size:14px}',
    '.rb th,.rb td{padding:8px 10px;border-bottom:1px solid rgba(79,209,255,0.16);text-align:left}',
    '.rb th{color:var(--rb-dim);font-weight:600;white-space:nowrap}',
    '.rb td{color:var(--rb-text)}',
    '.rb tr.grey-out td{color:var(--rb-muted)}',
    '.rb .dev-bar{display:inline-block;height:6px;border-radius:3px;margin-left:8px;vertical-align:middle}',
    /* 空态 / 禁入 */
    '.rb .empty-state{text-align:center;padding:32px 16px;color:var(--rb-dim)}',
    '.rb .empty-state .ico{font-size:36px;color:var(--rb-muted);margin-bottom:8px}',
    '.rb .empty-state .t1{font-size:18px;font-weight:700;color:#fff;margin-bottom:6px}',
    '.rb .empty-state .t2{font-size:14px;line-height:1.7}',
    '.rb .denied{text-align:center;padding:56px 24px}',
    '.rb .denied .ico{font-size:48px;margin-bottom:12px}',
    '.rb .denied .t1{font-size:20px;font-weight:700;color:#fff;margin-bottom:10px}',
    '.rb .denied .t2{font-size:14px;color:var(--rb-dim);line-height:1.8;max-width:640px;margin:0 auto;text-align:left}',
    /* 页脚 */
    '.rb footer{font-size:14px;color:var(--rb-muted);line-height:1.8;border-top:1px solid rgba(79,209,255,0.16);margin-top:8px;padding:14px 20px 4px}',
    '.rb footer b{color:var(--rb-dim)}',
    '.rb footer code{background:rgba(8,24,52,.6);padding:1px 5px;border-radius:4px;font-size:13px}',
    '.rb .sel-dept{font-size:14px;background:rgba(8,24,52,.8);color:var(--rb-text);border:1px solid var(--rb-panel-b);border-radius:var(--rb-rb);padding:5px 8px}',
    /* 响应式 */
    '@media (max-width:1199px){.rb .kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.rb .grid2{grid-template-columns:1fr}}',
    '@media (max-width:767px){.rb .kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}.rb .detail{grid-template-columns:1fr}.rb .kpi .v{font-size:32px}}'
  ];

  var _cssInjected = false;
  function injectCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    var st = document.createElement('style');
    st.setAttribute('data-module', 'risk-brief');
    st.textContent = CSS.join('\n');
    document.head.appendChild(st);
  }

  function esc(s) { return U.escapeHtml(s == null ? '' : s); }
  function maskName(n) {
    n = String(n == null ? '' : n);
    if (!n) return '—';
    if (n.length <= 1) return n + '**';
    return n.charAt(0) + '**';
  }

  /* ---------- 角色 / 权限 ---------- */
  function role() { return (global.AppState && global.AppState.role) || 'HR'; }
  function perm() { return ACCESS[role()] || ACCESS['员工']; }

  /* ---------- 派生展示（取数仍用源表 4 值） ---------- */
  function levelDisplay(p) {
    var watch = (p.riskLevel === '观察池') || (p.confidence === '不足');   // 双保险
    var key = LEVEL_ENUM.indexOf(p.riskLevel) >= 0 ? p.riskLevel : '观察池'; // 未知枚举降级，不静默丢弃
    return {
      text: watch ? LEVEL_DISPLAY['观察池'] : LEVEL_DISPLAY[key],
      cls: watch ? 'grey' : LEVEL_CLS[key],
      watch: watch,
      enumKey: key
    };
  }

  /* ---------- 维度键：由 radarDims[i].source「D1_绩效下滑」推出 D1..D6 ---------- */
  function dimKeys(D) {
    return (D.radarDims || []).map(function (d, i) {
      var k = String(d.source || '').split('_')[0];
      return k || ('D' + (i + 1));
    });
  }

  var CUR = 'normal';   // 演示四状态：normal / missing / small / empty
  var mgrDept = DEFAULT_DEPT;   // 部门负责人视角部门；渲染前会校验其存在于数据中，否则回退（见 pickMgrDept）
  var selected = null;

  /* =========================================================================
   * 部门字段解析 —— 前瞻兼容「部门名归一」（hr-data-analyst-2 待办）
   * -------------------------------------------------------------------------
   * 归一落地后，数据侧预计会新增归一化部门字段（dept / deptNorm / deptStd 之一），
   * 且 deptRaw 会保留。解析顺序：归一化字段 → deptRaw。
   * ⚠ deptRaw 的读取【不得删除】：原始值是口径追溯依据，归一后仍需可查。
   * 归一上线前本函数等价于「读 deptRaw」，行为不变，属零风险前置改造。
   * ========================================================================= */
  var DEPT_NORM_KEYS = ['deptNorm', 'deptStd', 'dept'];
  /* 数据侧显式标 deptUnmatched=true 的人：姓名不在花名册内，无法按人归位。
     口径要求「不强行归部门、不丢弃」→ 单列一个非部门分组并显著标注，
     【禁止】把他们的 deptRaw 当成权威部门展示（会与组织模块显示成两个不同结果）。 */
  var DEPT_UNMATCHED = '未归一 · 待人工确认';
  function personDept(p) {
    if (!p) return '';
    if (p.deptUnmatched === true) return DEPT_UNMATCHED;
    for (var i = 0; i < DEPT_NORM_KEYS.length; i++) {
      var v = p[DEPT_NORM_KEYS[i]];
      if (v != null && String(v) !== '') return String(v);
    }
    return p.deptRaw == null ? '' : String(p.deptRaw);
  }
  /* =========================================================================
   * 花名册在编人数 —— 单一出处，禁止在展示文案里硬编码 42 / 43
   * -------------------------------------------------------------------------
   * 2026-10-30 已据飞书员工档案（离职预测 base / tblcRicVARzkUwyh）刷新：
   *   data/employees.csv 现 = 43 人（含 3 名新入职：杨宏 / 林坚灿 / 陈焕华；
   *   剔除 2 名已离职：时华 / 骆晓珍）。风险模型同步剔除已离职曹艳汝 → 38 人。
   * 本页所有「在编 N 人」「≠ 在编 N 人」「已评估 N 人」「反查 N 人花名册」
   *   一律取自数据侧 meta.rosterTotal / meta.headcountTotal，严禁硬编码。
   * 实现：数据侧出 meta.rosterTotal / meta.headcountTotal 就以其为准，
   *   否则走 ROSTER_FALLBACK —— 口径再变时改数据或改这一个常量即可，不用全文搜替换。
   * ========================================================================= */
  var ROSTER_FALLBACK = 42;
  function rosterTotal(D) {
    var m = (D && D.meta) || {};
    if (m.rosterTotal != null) return m.rosterTotal;
    if (m.headcountTotal != null) return m.headcountTotal;
    return ROSTER_FALLBACK;
  }

  /* 归一元数据（归属 hr-data-analyst-2 的产出，只读展示，不二次加工） */
  function normInfo(D) { return (D && D.meta && D.meta.deptNormalization) || null; }
  function unmatchedPersons(D) {
    var n = normInfo(D);
    if (n && n.unmatchedPersons) return n.unmatchedPersons;
    return (D.persons || []).filter(function (x) { return x.deptUnmatched === true; })
      .map(function (x) { return { name: x.label, deptRaw: x.deptRaw, reason: '姓名不在花名册内，无法按人归位' }; });
  }
  /* 薪酬 / 聚合类行的部门字段解析（同一个前瞻策略：归一化字段优先，dept 兜底） */
  function rowDept(r) {
    if (!r) return '';
    for (var i = 0; i < DEPT_NORM_KEYS.length; i++) {
      var v = r[DEPT_NORM_KEYS[i]];
      if (v != null && String(v) !== '') return String(v);
    }
    return (r.dept == null ? (r.deptRaw == null ? '' : String(r.deptRaw)) : String(r.dept));
  }

  /* 部门清单：按纳入人数降序（保证默认落在有人的部门，避免 AppState.filters.dept='全部' 时列表为空） */
  function deptList(D) {
    var m = {};
    (D.persons || []).forEach(function (x) { m[personDept(x)] = (m[personDept(x)] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; });
  }
  function pickMgrDept(D) {
    var ks = deptList(D);
    if (!ks.length) return '';
    if (ks.indexOf(mgrDept) < 0) mgrDept = ks[0];   // '全部' / 脏值 → 回退到人数最多的部门
    return mgrDept;
  }

  var ST_TITLE = { normal: '正常（含常态缺失项）', missing: '数据缺失', small: '小样本', empty: '空数据' };
  var ST_DESC = {
    normal: '全部字段可用时的基准视图。注意：<b>发展机会维度恒为 null、风险趋势仅 1 点</b>，即使在正常态也必须显式标注，属<b>常态缺失</b>而非临时故障。',
    missing: '聚焦三类缺失：① 六维中的 <b>null 维度</b>（模型对缺源数据主动置空）；② <b>置信度＝不足</b> → 不给分数、不给档位、不下定论；③ 发展机会信号 <b>available:false</b>。禁止以 0 填充、禁止用其他信号编造替代。',
    small: '聚焦小样本：薪酬偏离 <b>lowSample:true</b> 的行灰显；部门细分 <b>N&lt;5 必须合并或隐藏</b>（防反推到个人）。',
    empty: '数据文件缺失或 persons 为空。此时<b>不得渲染 0 人 / 0 分</b>，须给出「暂无数据」+ 数据源入口 + 责任人。'
  };

  /* ---------- 可见人员（角色 + 状态过滤） ---------- */
  function visiblePersons(D, state, p) {
    if (state === 'empty') return [];
    if (!p.visible || p.scope === 'none') return [];
    var rs = D.persons || [];
    if (p.scope === 'own') rs = rs.filter(function (x) { return personDept(x) === mgrDept; });
    if (state === 'missing') {
      rs = rs.filter(function (x) {
        return x.confidence === '不足' || dimKeys(D).some(function (k) { return x.dims[k] == null; });
      });
    }
    /* 保持源数据顺序 —— 观察池内部禁止按 totalScore_v2 排序 */
    return rs;
  }

  /* ---------- 部门聚合（N<5 合并/隐藏，防反推） ---------- */
  function deptAggregate(D, list) {
    var map = {};
    list.forEach(function (x) { map[personDept(x)] = (map[personDept(x)] || 0) + 1; });
    var keys = Object.keys(map);
    if (!keys.length) return '<div class="empty-state"><div class="t1">当前筛选下无人员</div></div>';
    var ks = dimKeys(D);
    var rows = keys.map(function (d) {
      var arr = list.filter(function (x) { return personDept(x) === d; });
      var n = arr.length;
      var insuff = arr.filter(function (x) { return x.confidence === '不足'; }).length;
      if (n < 5) {
        return '<tr class="grey-out"><td>' + esc(d) + '</td><td>' + n + '</td>' +
          LEVEL_ENUM.map(function () { return '<td>N&lt;5 已隐藏</td>'; }).join('') +
          '<td>' + insuff + '</td><td><span class="badge grey dash">不予展示</span></td></tr>';
      }
      return '<tr><td>' + esc(d) + '</td><td>' + n + '</td>' +
        LEVEL_ENUM.map(function (k) {
          return '<td>' + arr.filter(function (x) {
            return x.confidence !== '不足' && x.riskLevel === k;
          }).length + '</td>';
        }).join('') +
        '<td>' + insuff + '</td><td><span class="badge auth">可展示</span></td></tr>';
    }).join('');
    return '<table><thead><tr><th>部门</th><th>纳入</th>' +
      LEVEL_ENUM.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') +
      '<th>数据不足</th><th>可展示性</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="panel-note n2">⚠ <b>小样本防反推</b>：任何细分 <b>N&lt;5 必须合并或隐藏</b>。' +
      '「某部门中风险 1 人」看似无害，与部门人数一交叉即可<b>直接反推到个人</b>，故整行灰显而不是显示 1。' +
      '<br><b>置信度不足者单列</b>，不并入档位计数；档位按<b>源表 4 值</b>统计。</div>';
  }

  /* ---------- 六维雷达（null 安全，SVG 手绘，不引外部库） ---------- */
  function radar(p, D, size) {
    var keys = dimKeys(D);
    var N = keys.length;
    var S = size || 190, cx = S / 2, cy = S / 2, R = S / 2 - 40;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / N; }
    function pt(i, r) { return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]; }
    var g = '';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var poly = keys.map(function (_, i) { return pt(i, R * f).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
      g += '<polygon points="' + poly + '" fill="none" stroke="rgba(79,209,255,' + (f === 1 ? 0.35 : 0.15) + ')" stroke-width="1"/>';
    });
    var ax = '', ok = [];
    keys.forEach(function (k, i) {
      var v = p.dims ? p.dims[k] : null;
      var isna = (v == null);
      if (!isna) ok.push([i, v]);
      var a = pt(i, R), lb = pt(i, R + 18);
      var dim = (D.radarDims || [])[i] || {};
      ax += '<line x1="' + cx + '" y1="' + cy + '" x2="' + a[0].toFixed(1) + '" y2="' + a[1].toFixed(1) +
        '" stroke="' + (isna ? 'rgba(127,166,216,0.55)' : 'rgba(79,209,255,0.35)') + '" stroke-width="1"' +
        (isna ? ' stroke-dasharray="3 3"' : '') + '/>';
      ax += '<text x="' + lb[0].toFixed(1) + '" y="' + lb[1].toFixed(1) + '" font-size="11" fill="' +
        (isna ? '#7FA6D8' : '#C7D8EE') + '" text-anchor="middle">' + esc(dim.label || k) +
        (isna ? ' ⊘' : '') + '</text>';
    });
    var poly = '', dots = '';
    if (ok.length >= 3) {
      poly = '<polygon points="' + ok.map(function (o) {
        return pt(o[0], R * Math.max(o[1], 0) / 100).map(function (v) { return v.toFixed(1); }).join(',');
      }).join(' ') + '" fill="rgba(79,209,255,0.18)" stroke="#4FD1FF" stroke-width="1.5"/>';
    }
    dots = ok.map(function (o) {
      var q = pt(o[0], R * Math.max(o[1], 0) / 100);
      return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3" fill="#4FD1FF"/>';
    }).join('');
    return '<svg width="' + S + '" height="' + S + '" viewBox="0 0 ' + S + ' ' + S + '" role="img" ' +
      'aria-label="六维风险雷达，' + ok.length + ' 个维度有值，' + (N - ok.length) + ' 个维度无数据">' +
      g + ax + poly + dots + '</svg>';
  }

  /* ---------- 维度 → 默认动作映射（口径文档 5.2，责任角色与时限为已裁决值，勿随意改写） ---------- */
  var ACTION = {
    D1: { act: '由直属上级做一次绩效复盘面谈，明确改进项与所需资源支持', who: '直属上级', due: '30 天内' },
    D2: { act: '核查其任务饱和度与跨部门阻塞点，确认是「不愿投入」还是「无活可干」', who: 'HRBP', due: '30 天内' },
    D3: { act: '合同到期前 60 天启动续签沟通，由 HRD 准备续签方案', who: 'HRD', due: '到期前 60 天' },
    D4: { act: '结合当前司龄节点做一次职业发展沟通（晋升路径 / 能力建设计划）', who: '直属上级 + HRBP', due: '30 天内' },
    D5: { act: '补做一次关怀触达（生日 / 节日 / 健康）并留痕', who: 'HRBP', due: '15 天内' },
    D6: { act: '先核对原始考勤记录，排除排班/设备/地点/出差/病事假等客观原因，再决定是否做纪律沟通', who: 'HRBP', due: '15 天内' }
  };
  /* =========================================================================
   * EVIDENCE_REVIEWED_READY —— 「依据原文 · 已复核去主观版」就绪开关
   * -------------------------------------------------------------------------
   * 当前值：true（HRD 钟喻 2026-11-02 拍板：对部门负责人开放「已复核去主观版」）
   *
   * 2026-11-02 决策（用户四项拍板之一 ①）：风险主观依据对部门负责人开放。
   *   → 本开关翻 true，部门负责人（evidence='reviewed'）可见「已复核去主观版」依据原文；
   *   HR（evidence='full'）仍可见原始依据；员工整屏禁入（红线 R2/R3）。
   *
   * ⚠ 残留前置（非阻塞，门户数据本就公网可读，翻开关不新增暴露面）：
   *   数据侧「去主观」人工复核（原前置 2）尚未跑 —— reviewed 与 full 共用同一
   *   evidence 字段，故当前经理视图展示的即原文。建议 HR 后续补一遍去主观化改写
   *   （口径文档 R2），以彻底落实「已复核去主观版」的呈现本意。
   * ========================================================================= */
  var EVIDENCE_REVIEWED_READY = true;

  /* ---------- 处置建议（4 步算法：取有值维度 Top2；置信度不足 → 三步补数据） ----------
     ⚠ 建议里是否夹带「依据原文」由 withEvidence 决定：只有 HR（evidence=full）可带，
       部门负责人只能拿到动作本身，避免未复核的主观表述外泄（R2）。            */
  function buildAdvice(p, D, withEvidence) {
    if (p.confidence === '不足') return null;   // 硬约束：不下定论
    var keys = dimKeys(D);
    var rank = keys.filter(function (k) { return p.dims && p.dims[k] != null; })
      .sort(function (a, b) { return p.dims[b] - p.dims[a]; }).slice(0, 2);
    if (!rank.length) return null;
    return rank.map(function (k) {
      var i = keys.indexOf(k);
      var dim = (D.radarDims || [])[i] || {};
      var a = ACTION[k] || { act: '结合该维度做一次针对性沟通与数据回补', who: '直属上级 + HRBP', due: '30 天内' };
      return '<div class="advice"><span class="ah">【' + esc(dim.label || k) + '】</span>' +
        (withEvidence ? esc(p.evidence ? p.evidence[k] : '') + '<br>→ ' : '') +
        '<b>建议</b>：' + esc(a.act) + '（' + esc(a.who) + ' · ' + esc(a.due) + '）</div>';
    }).join('');
  }

  function adviceNaHtml() {
    return '<div class="advice-na">' +
      '<div class="an-h">⛔ 数据不足 · <b>待确认</b>｜本页<b>不给出任何风险定论</b>，' +
      '也<b>不是</b>「HRBP 1对1面谈」的触发条件</div>' +
      '<ol class="an-steps">' +
      '<li><b>① 先补齐缺失数据</b> —— 按下方「依据原文」逐项列明缺失源（合同信息 / OGSM 绩效 / 关怀记录 / 协作数据），由 HRBP 回源补录，<u>不靠估计值顶替</u>。</li>' +
      '<li><b>② 补齐后重评</b> —— 数据齐了再跑一次模型，置信度变为「完整」后才产生档位与处置建议。</li>' +
      '<li><b>③ 补齐前不下风险定论</b> —— 分数不可信；<b>禁止</b>据此面谈、调岗、干预或写入任何人事记录。</li>' +
      '</ol><div class="an-foot">注：本条为<b>数据补录动作</b>，落点在 HR 数据侧，<b>不等于</b>员工关怀或绩效沟通动作。</div></div>';
  }

  /* ---------- KPI ---------- */
  function kpiHtml(D, state, list) {
    if (state === 'empty') {
      return '<div class="kpi c-grey"><div class="k">团队状态</div>' +
        '<div class="v na">暂无数据</div><div class="nb">非 0，非空白</div></div>';
    }
    var all = D.persons || [];
    var n = (D.meta && D.meta.rows && D.meta.rows.risk) || all.length;
    var c = { '低风险': 0, '中风险': 0, '高风险': 0, '观察池': 0 };
    all.forEach(function (p) { if (c[p.riskLevel] != null) c[p.riskLevel]++; });
    var insuff = all.filter(function (p) { return p.confidence === '不足'; }).length;
    return '' +
      '<div class="kpi c-proxy"><div class="k">已纳入模型 <span class="badge proxy">🟡 代理</span></div>' +
        '<div class="v">' + n + '<span class="u"> 人</span></div>' +
        '<div class="nb">＝ 低风险 ' + c['低风险'] + ' ＋ 中风险 ' + c['中风险'] + ' ＋ 高风险 ' + c['高风险'] +
        ' ＋ 观察池 ' + c['观察池'] + '；<b>≠ 在编 ' + rosterTotal(D) + ' 人</b></div></div>' +
      '<div class="kpi c-low"><div class="k">低风险 <span class="badge low">常规</span></div>' +
        '<div class="v">' + c['低风险'] + '<span class="u"> 人</span></div>' +
        '<div class="nb">纳入常规关怀节奏，月度复评</div></div>' +
      '<div class="kpi c-mid"><div class="k">中风险 <span class="badge mid">干预</span></div>' +
        '<div class="v">' + c['中风险'] + '<span class="u"> 人</span></div>' +
        '<div class="nb">负责人 + HRD 联合干预 · 7 天内</div></div>' +
      '<div class="kpi c-hi"><div class="k">高风险 <span class="badge ' + (c['高风险'] > 0 ? 'high' : 'grey') + '">' +
        (c['高风险'] > 0 ? '立即处置' : '本期 0') + '</span></div>' +
        '<div class="v' + (c['高风险'] > 0 ? '' : ' na') + '">' + c['高风险'] + '<span class="u"> 人</span></div>' +
        '<div class="nb">' + (c['高风险'] > 0 ? 'HRD 24h 内介入'
          /* R9 措辞禁令：只能陈述「本期无进入高风险区间者」，不得定性为「本公司无高风险人员」 */
          : '<b>本期无进入高风险区间者</b>（高风险为枚举 4 值之一，本期 0 人＝真实 0，非缺失）。' +
            '🔴 <b>禁止</b>写「本公司无高风险人员」') + '</div></div>' +
      '<div class="kpi c-na"><div class="k">观察池 <span class="badge grey dash">源枚举第 4 值</span></div>' +
        '<div class="v na">' + c['观察池'] + ' 人</div>' +
        '<div class="nb">界面显示标签：<b>' + LEVEL_DISPLAY['观察池'] + '</b>；＝ 置信度不足同一批（' + insuff + ' 人），<b>与分数高低无关</b></div></div>';
  }

  /* ---------- 人员列表 ---------- */
  function listHtml(D, state, list, p) {
    if (state === 'small') return deptAggregate(D, list);
    if (!list.length) {
      return '<div class="empty-state"><div class="t1">当前筛选下无人员</div>' +
        '<div class="t2">' + (p.scope === 'own' ? esc(mgrDept) + ' 本期无纳入人员，属正常，非数据错误。' : '请确认数据文件已生成并重跑 build_hr_modules.py。') + '</div></div>';
    }
    var ks = dimKeys(D);
    return '<div class="plist">' + list.map(function (x) {
      var LD = levelDisplay(x);
      var nm = p.showNames ? esc(x.label) : esc(maskName(x.label));
      var valid = ks.filter(function (k) { return x.dims && x.dims[k] != null; }).length;
      return '<div class="pcard is-' + LD.cls + (selected === x.label ? ' sel' : '') + '" tabindex="0" role="button" ' +
        'aria-label="' + nm + '，' + esc(LD.text) + '" data-p="' + esc(x.label) + '">' +
        '<div class="pn"><span>' + nm + '</span>' +
        '<span class="badge ' + LD.cls + (LD.watch ? ' dash' : '') + '">' + esc(LD.text) + '</span></div>' +
        '<div class="pd">' + esc(personDept(x)) + '</div>' +
        '<div class="ps">' + (p.score
          ? (LD.watch ? '总分 <span class="num na">—（数据不足）</span>'
                      : '总分 <span class="num">' + x.totalScore_v2 + '</span>')
          : '<span style="color:var(--rb-muted)">总分：<b>不对本角色开放</b></span>') +
        '<br><span style="font-size:12px;color:var(--rb-muted)">六维有效 ' + valid + '/' + ks.length +
        (valid < ks.length ? ' · 含无数据维度' : '') + '</span></div></div>';
    }).join('') + '</div>';
  }

  /* ---------- 详情 ---------- */
  function detailHtml(D, state, list, p) {
    if (state === 'empty' || !list.length) {
      return '<div class="empty-state"><div class="t1">暂无详情</div>' +
        '<div class="t2">未取到 <code>HR_RISK_BRIEF.persons</code>。这不是「0 人中风险」。</div></div>';
    }
    var cur = null;
    list.forEach(function (x) { if (selected && x.label === selected) cur = x; });
    if (!cur) cur = list[0];
    var LD = levelDisplay(cur);
    var nm = p.showNames ? esc(cur.label) : esc(maskName(cur.label));
    var ks = dimKeys(D);
    var dimRows = p.dims ? ks.map(function (k, i) {
      var v = cur.dims ? cur.dims[k] : null;
      var dim = (D.radarDims || [])[i] || {};
      return '<div class="dimrow' + (v == null ? ' narow' : '') + '">' +
        '<span class="dl">' + esc(dim.label || k) + '</span>' +
        '<span class="dv">' + (v == null
          ? '⊘ 无数据 <span style="font-size:12px;font-weight:400">（' + esc(cur.evidence ? cur.evidence[k] : '') + '）</span>'
          : Number(v).toFixed(1)) + '</span></div>';
    }).join('') : '';

    var advice = p.advice ? buildAdvice(cur, D, p.evidence === 'full') : '';
    var adviceBlock = advice || (LD.watch ? adviceNaHtml()
      : '<div class="lockbox">暂无可用建议（六维均无有效信号）。</div>');

    var evBlock;
    if (p.evidence === 'full') {
      evBlock = '<div class="evidence">' + ks.map(function (k, i) {
        var dim = (D.radarDims || [])[i] || {};
        return '<div><span class="ev-k">' + esc(dim.label || k) + '</span>：' + esc(cur.evidence ? cur.evidence[k] : '—') + '</div>';
      }).join('') + '</div>';
    } else if (p.evidence === 'reviewed' && EVIDENCE_REVIEWED_READY) {   // 复核未完成 → 一律走下方禁显分支（R2）
      evBlock = '<div class="evidence">' + ks.filter(function (k) { return cur.dims && cur.dims[k] != null; }).map(function (k, i) {
        var dim = (D.radarDims || [])[i] || {};
        return '<div><span class="ev-k">' + esc(dim.label || k) + '</span>：' + esc(cur.evidence ? cur.evidence[k] : '—') + '</div>';
      }).join('') +
      '<div class="panel-note n2" style="margin-top:8px">⚠ 本视图为依据原文的<b>已复核去主观版</b>；含主观评价的原文<b>仅 HRD 可见</b>；分数不对本角色开放。</div></div>';
    } else if (p.evidence === 'onDemand') {
      evBlock = '<div class="lockbox">🔒 依据原文<b>需单独授权</b>方可查看（HRBP 默认不可见）。</div>';
    } else {
      evBlock = '<div class="lockbox">🔒 依据原文<b>需经 HR 人工复核、去除主观表述后方可对本角色开放</b>（R2）。' +
        '当前复核尚未完成（<code>EVIDENCE_REVIEWED_READY = false</code>），故不展示原文；' +
        '本角色可见范围为「<b>风险等级 + 处置建议</b>」。</div>';
    }

    /* 六维雷达仅在有 dims 权限时绘制；部门负责人（dims:false）连雷达都不画，
       否则等于把六维分值用图形泄漏出去 —— 与「不显示六维明细」是同一条约束。 */
    var radarBlock = p.dims
      ? radar(cur, D, 200) +
        '<div class="panel-note" style="margin-top:4px;font-size:12px">' +
        '<b>D1–D6 六维恒全出</b>（合同临近 / 司龄窗口 / 关怀执行 均为强预测因子，不得静默丢弃）；' +
        '虚线轴 ⊘ ＝ <b>该维度无数据</b>（模型主动置空），<b>不画成 0</b>；多边形只连接有值维度。<br>' +
        '「薪酬」与「发展机会」<b>不进雷达</b>，各自单独成卡（见下方两面板）。</div>'
      : '<div style="width:200px"><div class="lockbox" style="text-align:center;padding:36px 12px">' +
        '🔒<br>六维雷达<br><b>不对本角色开放</b></div></div>';

    return '<div class="detail"><div>' + radarBlock +
      '<div class="panel-note" style="margin-top:4px;font-size:12px;display:none">' +
      '<b>D1–D6 六维恒全出</b>（合同临近 / 司龄窗口 / 关怀执行 均为强预测因子，不得静默丢弃）；' +
      '虚线轴 ⊘ ＝ <b>该维度无数据</b>（模型主动置空），<b>不画成 0</b>；多边形只连接有值维度。<br>' +
      '「薪酬」与「发展机会」<b>不进雷达</b>，各自单独成卡（见下方两面板）。</div>' +
      /* 口径文档 2.3 强制：D2 为活跃度代理指标，跨岗位不可比，须随数展示 */
      '<div class="panel-note n2" style="margin-top:6px;font-size:12px">⚠ <b>D2 工作投入＝活跃度代理指标，跨岗位不可比</b>：' +
      '仓储 / 生产 / 客服等一线岗位本就不写日报，其 D2 分会<b>天然偏高</b>；职能 / 运营 / 管理岗天然高频产出日报，D2 分会天然偏低。' +
      '<b>只能在同岗位或同部门内比较，禁止跨部门按 D2 排序</b>（否则会系统性把一线岗位误判为高风险）。</div></div>' +
      '<div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">' +
      '<span style="font-size:18px;font-weight:700;color:#fff">' + nm + '</span>' +
      '<span class="badge ' + LD.cls + (LD.watch ? ' dash' : '') + '">' + esc(LD.text) + '</span>' +
      '<span class="badge ' + (LD.watch ? 'miss' : 'auth') + '">置信度 ' + esc(cur.confidence) + '</span></div>' +
      '<div class="sub" style="margin-bottom:8px">' + esc(personDept(cur)) + ' ｜ ' +
      (p.score ? (LD.watch ? '总分 <b style="color:var(--rb-muted)">—（数据不足，不展示）</b>' : '总分 <b>' + cur.totalScore_v2 + '</b>')
               : '总分 <b style="color:var(--rb-muted)">不对本角色开放</b>') +
      ' ｜ 需复核：' + esc(cur.needReview) + '</div>' +
      (p.dims ? dimRows : '<div class="lockbox">🔒 依据角色授权，<b>六维明细不对本角色开放</b>。部门负责人仅可见「风险等级 + 处置建议」。</div>') +
      '<div style="margin-top:10px"><div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px">处置建议</div>' +
      (p.advice ? adviceBlock : '<div class="lockbox">🔒 处置建议不对本角色开放。</div>') + '</div>' +
      '<div style="margin-top:10px"><div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px">依据原文「D*_依据」</div>' +
      evBlock + '</div></div></div>';
  }

  /* ---------- 薪酬公平感（独立成卡） ---------- */
  function salHtml(D, state, p) {
    /* 薪酬偏离属敏感个人信息：仅 HR（evidence=full）可见。
       部门负责人可见范围＝「风险等级 + 处置建议」（口径文档 6.1），且小部门 N<3 有反推风险。 */
    if (p.evidence !== 'full') {
      return '<div class="lockbox">🔒 薪酬偏离数据<b>不在本角色授权范围内</b>' +
        '（口径文档 6.1：部门负责人可见范围＝风险等级 + 处置建议）。</div>';
    }
    if (state === 'empty') {
      return '<div class="empty-state"><div class="ico">◍</div><div class="t1">暂无薪酬偏离数据</div>' +
        '<div class="t2">不要把「无数据」显示成 <b>0%</b>（那等于宣称完全公平）。</div></div>';
    }
    var rows = (D.salaryDeviation && D.salaryDeviation.rows) || [];
    var focus = (state === 'small') ? rows.filter(function (r) { return r.lowSample; }) : rows.slice(0, 8);
    if (!focus.length) return '<div class="empty-state"><div class="t1">当前筛选下无数据</div></div>';
    return '<table><thead><tr><th>人员</th><th>部门</th><th>偏离 %</th><th>样本</th><th>可用性</th></tr></thead><tbody>' +
      focus.map(function (r) {
        var nm = p.showNames ? esc(r.label) : esc(maskName(r.label));
        var w = Math.min(Math.abs(r.deviationPct) * 1.1, 60);
        var color = r.lowSample ? 'var(--rb-muted)' : (r.deviationPct > 0 ? 'var(--rb-s3)' : 'var(--rb-s2)');
        return '<tr class="' + (r.lowSample ? 'grey-out' : '') + '"><td>' + nm + '</td><td>' + esc(rowDept(r)) + '</td>' +
          '<td style="color:' + color + ';font-weight:700">' + (r.deviationPct > 0 ? '+' : '') + Number(r.deviationPct).toFixed(1) + '%' +
          '<span class="dev-bar" style="width:' + w + 'px;background:' + (r.lowSample ? 'rgba(127,166,216,0.45)' : (r.deviationPct > 0 ? '#8FE3FF' : '#4FD1FF')) + '"></span></td>' +
          '<td>N=' + r.sampleSize + '</td>' +
          '<td>' + (r.lowSample ? '<span class="badge grey dash">小样本 · 灰显</span>' : '<span class="badge low">可用</span>') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="panel-note ' + (state === 'small' ? 'n2' : 'n1') + '">' +
      (state === 'small'
        ? '⚠ <b>N&lt;3 时必须灰显且不得作为薪酬公平感结论</b>：部门样本为 2 人时中位数即两人均值，偏离<b>必然对称</b>（如 ±67.8）―― 这不是巧合，是数学必然；<b>N=1</b> 时自己跟自己比恒为 0.0%，会把「完全无法判断」显示成「完全公平」，<b>误导性最强</b>。'
        : '正值＝高于同部门中位数，负值＝低于。<b>不出任何绝对金额</b>；<b>lowSample=true 的行须灰显</b>，不得当作公平感结论展示。') +
      '</div>';
  }

  /* ---------- 缺失信号与趋势 ---------- */
  function signalHtml(D, state) {
    if (state === 'empty') return '<div class="empty-state"><div class="t1">暂无信号数据</div></div>';
    var dev = D.developmentSignal || {};
    var tr = D.riskTrend || {};
    var one = (tr.points && tr.points[0]) || null;
    var cy = one ? (90 - (one.avgScore / 60) * 70).toFixed(1) : 90;
    return '' +
      '<div style="margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
      '<span style="font-size:16px;font-weight:700;color:#fff">' + esc(dev.label || '发展机会信号') + '</span>' +
      '<span class="badge miss dash">❌ 缺失 · 恒 null</span></div>' +
      '<div class="lockbox"><b>暂无数据</b> —— ' + esc(dev.reason || '') + '。<br>' +
      '⛔ <b>禁止</b>用其他信号（日报活跃度 / 绩效分）编造替代：那会让使用者误以为「公司评估了员工的发展机会」，而事实上没有。<br>' +
      '恢复路径：' + esc(dev.suggestion || '') + '</div>' +
      '<div class="panel-note n1"><b>雷达口径（已裁决）</b>：必须 <b>D1–D6 六维全出</b>，不得只画 5 轴 —— ' +
      '合同临近 / 司龄窗口 / 关怀执行 三项均为强预测因子，静默丢弃等于悄悄抽掉风险因子。<br>' +
      '「薪酬公平感（偏离 %）」与「发展机会信号」<b>不塞进雷达</b>：薪酬 → 左侧<b>独立成卡</b>（只出相对值，绝对金额零出现）；' +
      '发展机会 → 本块<b>独立呈现</b>，恒为「<b>无数据</b>」，禁止留空或填 0（留空会被读成 0 分＝最健康，方向完全反了）。</div></div>' +
      '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
      '<span style="font-size:16px;font-weight:700;color:#fff">' + esc(tr.label || '团队离职风险指数趋势') + '</span>' +
      '<span class="badge proxy">🟡 样本不足</span></div>' +
      '<svg width="100%" height="120" viewBox="0 0 260 120" role="img" aria-label="风险趋势，仅一个数据点，样本不足">' +
      '<line x1="30" y1="90" x2="245" y2="90" stroke="rgba(79,209,255,0.25)"/>' +
      '<text x="26" y="94" font-size="11" fill="#7FA6D8" text-anchor="end">0</text>' +
      '<line x1="30" y1="20" x2="30" y2="90" stroke="rgba(79,209,255,0.25)"/>' +
      (one ? '<circle cx="230" cy="' + cy + '" r="5" fill="#4FD1FF"/>' +
             '<text x="230" y="' + (Number(cy) - 10).toFixed(1) + '" font-size="12" fill="#C7D8EE" text-anchor="middle">' + one.avgScore + '</text>' +
             '<text x="230" y="105" font-size="11" fill="#7FA6D8" text-anchor="middle">' + esc(one.label) + '</text>' : '') +
      '<text x="138" y="60" font-size="12" fill="#7FA6D8" text-anchor="middle">⚠ 仅 ' + ((tr.points || []).length) + ' 个数据点，无法构成趋势</text>' +
      '</svg>' +
      '<div class="panel-note n2">⚠ <b>只能画 1 个点</b>，必须显式标注「趋势自 ' + esc(one ? one.label : '—') + ' 起，样本不足」；' +
      '<b>禁止</b>用旧模型（无月份字段）凑出历史趋势线 —— 那等于伪造时间序列。<b>月度离职率当前不可计算，不展示该指标。</b><br>' +
      '补齐办法（裁决 R3+R6）：每月 1 日 10:00 由 ETL 落一期快照，<b>存满 ≥24 期</b>方可支撑趋势判断。</div></div>';
  }

  function deniedHtml() {
    return '<div class="panel"><div class="denied"><div class="ico" aria-hidden="true">🔒</div>' +
      '<div class="t1">你无权查看员工风险简报</div><div class="t2">' +
      '依据隐私边界红线：<b>员工本人不得看到自己的风险评分与等级</b>。' +
      '被贴上「中风险」标签会直接引发恐慌与信任崩塌，甚至<b>加速其离职</b>（自我实现的预言）；且该评分本身是基于代理指标的估计值。<br><br>' +
      '本页对你完全不可见 —— 包括你自己的分数、等级、六维雷达与处置建议。<br>' +
      '如对工作内容有疑问，请联系你的直属上级或 HRBP。</div></div></div>';
  }

  /* ---------- 主渲染 ---------- */
  function render(parts) {
    injectCss();
    var D = global.HR_RISK_BRIEF;
    var view = U.el('view');
    if (!view) return;
    var p = perm();
    var state = CUR;

    /* 数据缺失 / 未就绪 → 走空态，绝不渲染 0 */
    if (!D || !D.persons || !D.persons.length) state = 'empty';

    var head =
      '<div class="rb"><div class="rb-wrap">' +
      '<header class="top"><div>' +
      '<h1>员工风险简报 <span class="badge ' + (state === 'empty' ? 'miss' : 'proxy') + '">🟡 代理口径</span></h1>' +
      '<div class="sub">数据期：' + esc((D && D.meta && (D.meta.riskPeriods || []).join('、')) || '—') +
      ' ｜ 生成于 ' + esc((D && D.meta && D.meta.generatedAt) || '—') +
      ' ｜ 当前角色：<b class="whoami" id="rb-whoami">' + esc(role()) + '</b></div></div>' +
      '<div class="demo-switch" role="tablist" aria-label="状态演示（上线前删除）">' +
      ['normal', 'missing', 'small', 'empty'].map(function (s) {
        return '<button type="button" class="ms-btn' + (s === CUR ? ' active' : '') + '" data-state="' + s +
          '" role="tab" aria-selected="' + (s === CUR ? 'true' : 'false') + '">' + s + '：' + ST_TITLE[s] + '</button>';
      }).join('') + '</div></header>' +
      /* 红线 R1：常驻、不可关闭 */
      '<div class="redline" role="alert"><span class="ic" aria-hidden="true">⛔</span><span>' +
      '<b>红线 R1</b>：本页风险评分<b>仅用于关怀与保留动作排序</b>，' +
      '<b>不得</b>作为调薪 / 降薪 / 辞退 / 惩戒 / 末位淘汰的依据；' +
      '评分基于代理指标估计值，观察池人员分数<b>不可信</b>。' +
      '任何引用本页数据的人事决定，须另行走人工复核与留痕流程。</span></div>' +
      '<div class="notice demo"><span class="ic" aria-hidden="true">🧪</span><span>' +
      '<b>演示开关</b>：顶部「状态切换」与右上角角色仅为原型演示，' +
      '<b>上线前必须删除</b>，改由后端 RBAC + 数据自动推导状态。</span></div>';

    if (!p.visible) {
      view.innerHTML = head + deniedHtml() + '</div></div>';
      return;
    }

    if (p.scope === 'own') pickMgrDept(D);   // 先校准部门，再取数（防 '全部' 导致空列表）
    var list = visiblePersons(D, state, p);
    var collab = (D && D.collabActivity && D.collabActivity.rows) ? D.collabActivity.rows.length : 0;

    var html = head +
      '<div class="notice miss"><span class="ic" aria-hidden="true">◑</span><span>' +
      '<b>风险模型纳入 ' + ((D && D.meta && D.meta.rows && D.meta.rows.risk) || (D.persons || []).length) + ' 人 ≠ 花名册在编 ' + rosterTotal(D) + ' 人</b>。' +
      '差异来源：模型侧含不在 ' + rosterTotal(D) + ' 人白名单内的人员；白名单侧亦有未被模型纳入者（仅出现在考勤 / 绩效表、无六维打分）。<br>' +
      '⛔ <b>本页禁止出现</b>「全员风险评估」「覆盖率 100%」「已评估 ' + rosterTotal(D) + ' 人」等表述 —— 这三项均不成立。' +
      '统一写法：<b>「已纳入模型 ' + ((D && D.meta && D.meta.rows && D.meta.rows.risk) || (D.persons || []).length) + ' 人」</b>。</span></div>' +

      '<div class="notice proxy"><span class="ic" aria-hidden="true">⚠</span><span>' +
      '<b>观察池 ≡ 置信度不足，是完全同一批人</b>（规则：置信度不足 ⇒ 强制进入观察池，分数不参与排序与结论）。<br>' +
      '故观察池<b>不是</b>「低风险与中风险之间的中间档」，而是「<b>分数可信度不足 · 待确认</b>」的独立状态：' +
      '<b>不进</b> low→mid→high 连续色阶，统一走<b>灰色虚线「待确认」态</b>；' +
      '<b>内部不排序、不横向比较</b>（总分跨度大，低分≠低风险、高分≠高风险，只代表「算不准」）。<br>' +
      '🔧 <b>取数铁律（给工程侧）</b>：<code>riskLevel</code> 源表枚举是 <b>4 值</b>（低风险 / 中风险 / 高风险 / 观察池），' +
      '<b>「待确认」不是枚举值</b>，只是派生展示标签（<code>LEVEL_DISPLAY</code>）。' +
      '任何 filter / 分组 / 统计 <b>必须用 4 值取数</b> —— 拿「待确认」匹配会命中 0 行、' +
      '<b>静默漏掉整批人且不报错</b>。</span></div>' +

      normNoticeHtml(D, p) +

      '<section class="kpi-row" aria-label="风险分布">' + kpiHtml(D, state, list) + '</section>' +

      '<div class="grid2">' +
      '<section class="panel" aria-labelledby="rb-t-person"><div class="panel-hd"><div>' +
      '<h2 class="panel-title" id="rb-t-person">人员风险列表 ' +
      (p.scope === 'own' ? '<span class="badge grey">仅 ' + esc(mgrDept) + '</span>'
                         : '<span class="badge auth">已纳入模型 ' + ((D && D.meta && D.meta.rows && D.meta.rows.risk) || (D.persons || []).length) + ' 人</span>') +
      (state === 'missing' ? '<span class="badge miss">已过滤：仅含缺失项人员</span>' : '') +
      (state === 'small' ? '<span class="badge grey">部门聚合 · N&lt;5 合并</span>' : '') +
      '</h2><div class="sub" style="margin-top:4px">按源数据顺序展示，<b>观察池内部不排序</b></div></div>' +
      (p.scope === 'own' ? deptSelectHtml(D) : '') +
      '</div>' + listHtml(D, state, list, p) +
      '<div class="panel-note n1">🔒 姓名仅在 HR 管理员视图展示全名；其余角色脱敏为「张**」。' +
      '任何细分展示 <b>N&lt;5 必须合并或隐藏</b>（如「某部门中风险 1 人」可直接反推到个人）。<br>' +
      '⛔ <b>观察池内部不得排序、不得横向比较</b>：这批人总分跨度很大，' +
      '<b>低分不代表低风险、高分也不代表高风险，只代表「算不准」</b> —— 给他们排序等于给噪声排序。</div></section>' +

      '<section class="panel" aria-labelledby="rb-t-detail"><div class="panel-hd">' +
      '<h2 class="panel-title" id="rb-t-detail">员工详情 · 六维与处置建议</h2></div>' +
      detailHtml(D, state, list, p) + '</section></div>' +

      '<div class="grid2">' +
      '<section class="panel" aria-labelledby="rb-t-sal"><div class="panel-hd"><div>' +
      '<h2 class="panel-title" id="rb-t-sal">' + esc((D && D.salaryDeviation && D.salaryDeviation.label) || '薪酬公平感（偏离 %）') +
      ' <span class="badge proxy">🟡 代理</span><span class="badge grey">独立成卡 · 不进雷达</span></h2>' +
      '<div class="sub">基准月 <b>' + esc((D && D.meta && D.meta.salaryBasisMonth) || '2026-06') +
      '</b>｜<b>只出相对值，绝对金额零出现</b>｜与「发展机会」同样<b>独立于六维雷达之外</b></div></div></div>' +
      salHtml(D, state, p) + '</section>' +

      '<section class="panel" aria-labelledby="rb-t-sig"><div class="panel-hd">' +
      '<h2 class="panel-title" id="rb-t-sig">缺失信号与趋势（常态缺失）</h2></div>' +
      signalHtml(D, state) + '</section></div>' +

      '<footer>' +
      '<div><b>数据源</b>：' + esc((D && D.meta && D.meta.riskSource) || '—') + '</div>' +
      '<div><b>协作活跃代理</b>：' + esc((D && D.meta && D.meta.collabSource) || '—') +
      '（覆盖 ' + collab + ' 人 ＞ 风险模型 ' + ((D && D.meta && D.meta.rows && D.meta.rows.risk) || (D.persons || []).length) +
      ' 人，两拨人不完全重合，<b>禁止硬 join</b>）</div>' +
      '<div><b>薪酬基准</b>：' + esc((D && D.meta && D.meta.salaryBasisReason) || '—') + '</div>' +
      '<div><b>权限</b>：以 <code>window.HR_ROLE_CONFIG</code> 为唯一运行时权威；' +
      '数据文件 <code>HR_RISK_BRIEF</code> 中<b>不再声明 role 字段</b>（主理人 2026-10-30 裁决）。</div>' +
      '<div><b>联系 HR</b>：口径疑问找 HR 知识策展人（管墨林）｜处置动作与授权找 HRD（钟喻）。</div>' +
      '</footer></div></div>';

    view.innerHTML = html;
    bindEvents(view, D);
  }

  /* ---------- 部门名归一说明条（hr-data-analyst-2 产出，随数展示，不隐藏） ---------- */
  function normNoticeHtml(D, p) {
    var n = normInfo(D);
    var um = unmatchedPersons(D);
    if (!n && !um.length) return '';
    var before = (n && n.beforeRawValues) || [];
    var after = (n && n.afterNormValues) || [];
    var names = um.map(function (x) { return p.showNames ? x.name : maskName(x.name); }).join('、');
    return '<div class="notice miss"><span class="ic" aria-hidden="true">🧭</span><span>' +
      '<b>部门名已归一</b>：二级部门一律按<b>姓名</b>反查 ' + rosterTotal(D) + ' 人花名册重写，' +
      '与组织健康模块<b>共用同一套映射</b>，不另建第二张表。' +
      (before.length ? '<br>归一前取值：<code>' + esc(before.join(' / ')) + '</code>　→　归一后：' +
        '<b>' + esc(after.join(' / ')) + '</b>（8 部门枚举内，<b>outOfEnum 已清零</b>）。' : '') +
      (um.length
        ? '<br>⚠ <b>' + um.length + ' 人部门未能归一</b>（' + esc(names) + '）：原因＝<b>姓名不在 ' + rosterTotal(D) + ' 人花名册内</b>，无法按人归位。' +
          '数据侧裁决：<b>不强行归部门、也不丢弃</b> —— 本页把他们单列为「<b>' + DEPT_UNMATCHED + '</b>」分组，' +
          '其 <code>deptRaw</code>（' + esc(Array.from(new Set(um.map(function (x) { return x.deptRaw; }))).join('/')) +
          '）<b>不作为权威部门展示</b>，避免与组织模块出现两个不同结论。<br>' +
          '这 ' + um.length + ' 人<b>仍计入「已纳入模型 ' + ((D && D.meta && D.meta.rows && D.meta.rows.risk) || (D.persons || []).length) + ' 人」</b>，未被剔除。' +
          '待人工确认其归属后由数据侧重跑即可闭合。'
        : '') +
      '</span></div>';
  }

  function deptSelectHtml(D) {
    var set = {};
    (D.persons || []).forEach(function (x) { set[personDept(x)] = 1; });
    delete set[DEPT_UNMATCHED];   // 非部门分组，不进「负责人切换部门」下拉
    var ks = Object.keys(set).sort();
    return '<select class="sel-dept" id="rb-dept" aria-label="切换部门">' +
      ks.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === mgrDept ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('') + '</select>';
  }

  function bindEvents(view, D) {
    var root = view.firstElementChild;
    if (!root) return;
    root.addEventListener('click', function (e) {
      var st = e.target.closest ? e.target.closest('.ms-btn[data-state]') : null;
      if (st) { CUR = st.getAttribute('data-state'); render(); return; }
      var card = e.target.closest ? e.target.closest('.pcard[data-p]') : null;
      if (card) { selected = card.getAttribute('data-p'); render(); }
    });
    root.addEventListener('keydown', function (e) {
      var card = e.target.closest ? e.target.closest('.pcard[data-p]') : null;
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); }
    });
    var sel = U.el('rb-dept');
    if (sel) sel.addEventListener('change', function () { mgrDept = sel.value; selected = null; render(); });
  }

  global.RiskBrief = { render: render };
})(window);

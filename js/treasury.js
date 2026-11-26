/* =========================================================================
 * treasury.js — 个人宝典（脱敏方法论展示）
 * 数据源：本文件内的 TREASURY 数组（由本地资料提炼的通用方法论/模板摘要）
 * 原则：公开站只展示脱敏后的通用方法；原始文件（含人名/证件/凭证/合同）
 *       仅存于 WorkBuddy 私密云端资料库，不在本页出现下载或原文。
 * ========================================================================= */
(function (global) {
  'use strict';
  const U = global.U;

  function injectCss() {
    if (document.getElementById('treasuryCss')) return;
    const css =
      '.tr-page{padding:4px 2px 40px}' +
      '.tr-hero{position:relative;overflow:hidden;border-radius:18px;padding:30px 32px;margin-bottom:26px;' +
        'background:linear-gradient(135deg,#1b2a4a 0%,#2a1f4a 60%,#3a2258 100%);color:#fff;box-shadow:0 10px 30px rgba(20,20,50,.18)}' +
      '.tr-hero::after{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(120,160,255,.35),transparent 70%)}' +
      '.tr-hero__title{font-size:25px;font-weight:800;letter-spacing:1px;margin:0 0 10px;position:relative;z-index:1}' +
      '.tr-hero__desc{font-size:14px;line-height:1.8;color:#d9e2ff;max-width:760px;position:relative;z-index:1}' +
      '.tr-notice{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:9px 15px;border-radius:10px;' +
        'background:rgba(255,193,86,.14);border:1px solid rgba(255,193,86,.4);color:#ffd98a;font-size:12.5px;position:relative;z-index:1}' +
      '.tr-tabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}' +
      '.tr-tab{padding:9px 18px;border-radius:999px;border:1px solid #dfe3ee;background:#fff;color:#5a6478;' +
        'font-size:13.5px;font-weight:600;cursor:pointer;transition:all .18s}' +
      '.tr-tab:hover{border-color:#6a8cff;color:#3a5bd0;background:#f4f7ff}' +
      '.tr-tab.active{background:linear-gradient(135deg,#4361ee,#5b3fd6);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(67,97,238,.25)}' +
      '.tr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}' +
      '.tr-card{background:#fff;border:1px solid #e7e9f0;border-radius:15px;padding:20px 21px;' +
        'box-shadow:0 2px 10px rgba(30,40,80,.05);transition:all .2s}' +
      '.tr-card:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(30,40,80,.11);border-color:#c9d4ff}' +
      '.tr-card__top{display:flex;align-items:center;gap:10px;margin-bottom:11px}' +
      '.tr-card__icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;' +
        'font-size:20px;background:linear-gradient(135deg,#eef2ff,#f6efff);flex-shrink:0}' +
      '.tr-card__cat{font-size:11px;color:#7a84a0;font-weight:600;letter-spacing:.4px}' +
      '.tr-card__title{font-size:15.5px;font-weight:700;color:#1e2740;margin:0 0 8px;line-height:1.45}' +
      '.tr-card__sum{font-size:12.8px;color:#6b7488;line-height:1.75;margin:0 0 12px}' +
      '.tr-card__tags{display:flex;flex-wrap:wrap;gap:6px}' +
      '.tr-tag{padding:3px 9px;border-radius:6px;background:#f0f3ff;color:#5470c6;font-size:11px;font-weight:600}' +
      '.tr-detail{margin-top:13px;border-top:1px dashed #e5e8f2;padding-top:11px}' +
      '.tr-detail summary{cursor:pointer;color:#4361ee;font-size:12.5px;font-weight:600;list-style:none;user-select:none}' +
      '.tr-detail summary::-webkit-details-marker{display:none}' +
      '.tr-detail summary::before{content:"+ ";font-weight:800}' +
      '.tr-detail[open] summary::before{content:"− "}' +
      '.tr-points{margin:10px 0 0;padding-left:18px;color:#4a5468;font-size:12.5px;line-height:1.9}' +
      '.tr-points li{margin-bottom:3px}' +
      '.tr-foot{margin-top:28px;padding:18px 22px;border-radius:12px;background:#f7f8fc;border:1px solid #e8eaf2;' +
        'color:#78829a;font-size:12.5px;line-height:1.8}' +
      '.tr-foot b{color:#4a5468}' +
      '@media(max-width:640px){.tr-hero{padding:22px 20px}.tr-hero__title{font-size:21px}.tr-grid{grid-template-columns:1fr}}';
    const s = document.createElement('style');
    s.id = 'treasuryCss'; s.textContent = css; document.head.appendChild(s);
  }

  /* ---------------- 数据：全部为脱敏后的通用方法论 ----------------
   * 原始文件（含具体人名、证件号、凭证、合同金额）不在此数组，也不上公开站。
   */
  const T = [
    { cat: '方法论与复盘', icon: '🧭', title: 'HR 团队重建三步法',
      sum: '面对团队秩序混乱时的通用处置框架：不追责过去、不攻击个人，只建立未来、只整顿事与规则。',
      tags: ['组织诊断', '团队重建', '管理原则'],
      points: ['止血：暂停脱离业务的旧方案，控制风险外溢', '重建：围绕 1–2 个核心目标设计极简体系，不追求复杂度',
               '固化：民主讨论→意见征集→协商确认→公示签收，程序正义保障制度有效',
               '沟通原则：把"收权"包装为"流程提效"与"经验赋能"，重大调整提前对齐'] },
    { cat: '方法论与复盘', icon: '⚖️', title: '用工合规三底线',
      sum: '劳动关系处置的通用合规路径，核心是证据、协商、书面闭环，避免仲裁风险。',
      tags: ['用工合规', '证据链', '风险隔离'],
      points: ['证据固化：违纪记录、沟通记录、制度签收页全程留痕', '协商优先：优先协商解除，按法定标准补偿，换取平稳分手',
               '协议闭环：当日完成协议签署、工作交接、社保停缴', '严禁未签协议先停社保或公告辞退'] },
    { cat: '方法论与复盘', icon: '🎯', title: 'OGSM → 岗位 → KPI 联动法',
      sum: '把战略目标逐层拆到岗位日常任务与考核指标的可复用手，实现"战略—任务—数据"一条线。',
      tags: ['OGSM', '岗位拆解', 'KPI设计'],
      points: ['O（目标）：明确战略意图；G（目标值）：量化可衡量结果', 'S（策略）：落地路径；M（衡量）：验证指标',
               '岗位层：每个岗位对齐 OGSM 中自己贡献的 G 与 S', '数据层：指标→汇总→KPI 自动联动，减少人工统计'] },
    { cat: '方法论与复盘', icon: '📋', title: '标准化工作清单方法',
      sum: '把岗位职责转化为"可执行清单 + 核心 KPI + OGSM 映射 + 系统视图"四件套的模板方法。',
      tags: ['工作清单', '岗位标准化', '飞书配置'],
      points: ['标准工作清单：按模块拆任务，明确 Owner', '核心 KPI 与数据联动：定义数据来源与校验规则',
               'OGSM 映射：说明该岗位支撑哪个 O、达成哪个 G', '系统视图：按模块过滤 + 状态分组 + 截止日倒序 + 超期自动升级'] },
    { cat: '方法论与复盘', icon: '📊', title: 'BSC 四维度权重模型',
      sum: '平衡计分卡的通用维度与权重分配参考，可用于季度/月度经营考核框架搭建。',
      tags: ['BSC', '绩效考核', '权重设计'],
      points: ['财务经营 40%', '客户·品牌信任资产 25%', '内部运营·数字化落地 20%', '学习成长·组织建设 15%'] },
    { cat: '方法论与复盘', icon: '🔄', title: '项目化 ABCD 四步法',
      sum: '跨部门项目推进的通用闭环：目标对齐 → 策略解码 → 协作执行 → 成果复盘。',
      tags: ['项目管理', '跨部门协同', '复盘'],
      points: ['Align 目标对齐：统一各方目标与成功标准', 'Breakdown 策略解码：把目标拆成可执行任务',
               'Collaborate 协作执行：明确责任人与节奏', 'Debrief 成果复盘：沉淀方法论，进入下一轮迭代'] },

    { cat: '自媒体与创作', icon: '🎬', title: '热点借势口播脚本结构',
      sum: '短视频口播的通用分镜结构：黑屏标题砸屏 → 新闻快切 → 时间轴 → 多方回应 → 观点收尾。',
      tags: ['短视频', '口播脚本', '内容创作'],
      points: ['0–3s：黑底白字大标题砸屏，切口播怼脸，先声夺人',
               '3–30s：三条新闻截图快切，配时间轴滚动强化节奏', '30–50s：声明/回应截图，提炼一句话关键信息',
               '50–60s：品牌观点收尾，用短句金句提升记忆点', '每条配字幕/特效标注，强化情绪与重点'] },
    { cat: '自媒体与创作', icon: '🎉', title: '团建活动协办要点',
      sum: '活动协办的通用清单框架：目标、流程、分工、预算、风险预案。',
      tags: ['活动组织', '团建', '协作'],
      points: ['先定活动目标与参与人群', '流程表精确到时间段与责任人', '预算与供应商提前锁定',
               '准备天气/安全/人员变动的备选预案'] },

    { cat: '系统与工具', icon: '📈', title: '增长作战大屏设计思路',
      sum: '经营数据大屏的通用设计：核心指标卡 + 趋势图 + 阈值基准线 + 红绿涨跌配色。',
      tags: ['数据大屏', '可视化', '经营分析'],
      points: ['首屏放核心 KPI 卡，一眼看全局', '趋势图配阈值基准线，判断达标与否',
               '涨跌配色遵循国内习惯：涨=红、跌=绿', '深色科技风背景，卡片分区承载不同维度'] },
    { cat: '系统与工具', icon: '🤖', title: '离职风险预测模型思路',
      sum: '员工离职风险打分的通用建模框架：多源数据 → 特征工程 → 风险评分 → 分级预警。',
      tags: ['离职预测', '数据建模', '人才保留'],
      points: ['数据源：档案、绩效、日报打卡等多源汇聚', '特征：司龄、绩效趋势、考勤异常、协作活跃度等',
               '评分：加权打分形成风险分', '分级：高/中/低预警，触发不同保留动作', '注意：模型仅作辅助参考，不做自动化人事决策'] },
    { cat: '系统与工具', icon: '🗂️', title: '多维表格导入规格模板',
      sum: '把任务清单批量导入多维表格的通用规格：字段定义 → 类型映射 → 导入 → 视图配置。',
      tags: ['飞书多维表格', '数据导入', '模板'],
      points: ['先定义列名与字段类型的映射表', '单选字段预设选项，避免导入后返工', 'CSV 用 UTF-8 带 BOM，防止中文乱码',
               '导入后配置看板/仪表盘/筛选视图'] },
    { cat: '系统与工具', icon: '📅', title: '工作日报模板要点',
      sum: '高效日报的通用结构：今日完成、关键数据、问题与风险、明日计划。',
      tags: ['日报', '模板', '工作管理'],
      points: ['今日完成：按结果而非动作描述', '关键数据：用数字说话，可核对', '问题与风险：需支持的事项写清楚',
               '明日计划：明确优先级与交付物'] },
  ];

  const CATS = ['全部', '方法论与复盘', '自媒体与创作', '系统与工具'];
  let current = '全部';

  function cardHTML(it) {
    return '<article class="tr-card">' +
      '<div class="tr-card__top"><div class="tr-card__icon">' + it.icon + '</div>' +
      '<div class="tr-card__cat">' + U.escapeHtml(it.cat) + '</div></div>' +
      '<h3 class="tr-card__title">' + U.escapeHtml(it.title) + '</h3>' +
      '<p class="tr-card__sum">' + U.escapeHtml(it.sum) + '</p>' +
      '<div class="tr-card__tags">' + it.tags.map(function (t) {
        return '<span class="tr-tag">' + U.escapeHtml(t) + '</span>';
      }).join('') + '</div>' +
      '<details class="tr-detail"><summary>查看要点</summary><ul class="tr-points">' +
      it.points.map(function (p) { return '<li>' + U.escapeHtml(p) + '</li>'; }).join('') +
      '</ul></details></article>';
  }

  function render() {
    injectCss();
    const view = U.el('view');
    if (!view) return;
    if (global.App && App.setBreadcrumb) App.setBreadcrumb(['个人宝典']);
    const tabs = CATS.map(function (c) {
      return '<button class="tr-tab' + (c === current ? ' active' : '') + '" data-cat="' + U.escapeHtml(c) + '">' + U.escapeHtml(c) + '</button>';
    }).join('');
    const list = current === '全部' ? T : T.filter(function (x) { return x.cat === current; });
    view.innerHTML =
      '<div class="tr-page">' +
        '<section class="tr-hero">' +
          '<h1 class="tr-hero__title">🧰 个人宝典</h1>' +
          '<div class="tr-hero__desc">制度以外的个人沉淀：方法论、复盘框架、创作素材、工具成果与模板。' +
          '这里呈现的是<strong>脱敏后的通用方法</strong>，便于随时查阅与复用。</div>' +
          '<div class="tr-notice">🔒 原始文件（含具体人名、证件、凭证、合同）仅存于私密云端资料库，不在此公开站展示或下载</div>' +
        '</section>' +
        '<div class="tr-tabs">' + tabs + '</div>' +
        '<div class="tr-grid">' + list.map(cardHTML).join('') + '</div>' +
        '<div class="tr-foot"><b>说明：</b>本页内容为从本地资料提炼的通用方法论摘要，共 ' + T.length +
          ' 条。完整原件、附件与历史版本请到 WorkBuddy 云端资料库按「个人宝典」前缀检索。' +
          '如需新增条目，把资料交给 AI 助理提炼脱敏要点后追加即可。</div>' +
      '</div>';
    U.$all('.tr-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        current = btn.getAttribute('data-cat');
        render();
      });
    });
  }

  global.Treasury = { render: render };
})(window);

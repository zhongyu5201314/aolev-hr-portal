/* =========================================================================
 * ops_chain.js — 会议到预警全链路 SOP（交互展示页）
 * 数据源：本文件内的 STAGES / WARN / WEEK1 常量，来源于会议到预警全链路 SOP 材料。
 * 口径：方法说明，非实时数据；群名 / Webhook / 会议名等具体值标【待补】。
 * 样式：自带作用域 CSS（前缀 oc-），不依赖全局样式变更。
 * ========================================================================= */
(function (global) {
  'use strict';
  const U = global.U;

  function injectCss() {
    if (document.getElementById('opsChainCss')) return;
    const css =
      '.oc-page{padding:4px 2px 40px;font-family:"Microsoft YaHei","微软雅黑",sans-serif;color:#1a1a1a}' +
      '.oc-hero{position:relative;overflow:hidden;border-radius:18px;padding:30px 32px;margin-bottom:22px;' +
        'background:linear-gradient(135deg,#12294d 0%,#1a4d8f 55%,#0d6e5c 100%);color:#fff;box-shadow:0 10px 30px rgba(20,30,60,.18)}' +
      '.oc-hero::after{content:"";position:absolute;right:-60px;top:-70px;width:260px;height:260px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(120,180,255,.35),transparent 70%)}' +
      '.oc-hero__title{font-size:26px;font-weight:800;letter-spacing:1px;margin:0 0 10px;position:relative;z-index:1}' +
      '.oc-hero__desc{font-size:14px;line-height:1.85;color:#e2ecff;max-width:820px;position:relative;z-index:1}' +
      '.oc-hero__flow{margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;position:relative;z-index:1}' +
      '.oc-flownode{padding:6px 12px;border-radius:8px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font-size:12.5px;font-weight:600}' +
      '.oc-flowarrow{color:#9fc6ff;font-weight:700;align-self:center}' +
      '.oc-note{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:9px 15px;border-radius:10px;' +
        'background:rgba(255,193,86,.14);border:1px solid rgba(255,193,86,.42);color:#ffd98a;font-size:12.5px;position:relative;z-index:1}' +
      '.oc-sec{margin:22px 0 8px;font-size:16px;font-weight:800;color:#1a4d8f;border-left:4px solid #1a4d8f;padding-left:10px}' +
      '.oc-sub{font-size:13.5px;font-weight:700;color:#0d6e5c;margin:14px 0 6px}' +
      '.oc-p{font-size:13px;line-height:1.85;color:#4a5468;margin:6px 0}' +
      '.oc-warn{color:#d92d20;font-weight:700}' +
      '.oc-todo{color:#b8860b;font-weight:700}' +
      '.oc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:12px}' +
      '.oc-card{background:#fff;border:1px solid #e5e9f2;border-radius:14px;padding:17px 18px;' +
        'box-shadow:0 2px 10px rgba(30,40,80,.05);transition:all .2s}' +
      '.oc-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(30,40,80,.11);border-color:#b9c8ff}' +
      '.oc-card__top{display:flex;align-items:center;gap:10px;margin-bottom:9px}' +
      '.oc-card__icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;' +
        'font-size:20px;background:linear-gradient(135deg,#eef2ff,#e6f7f2);flex-shrink:0}' +
      '.oc-card__step{font-size:11px;color:#8a94a8;font-weight:700;letter-spacing:.4px}' +
      '.oc-card__title{font-size:15px;font-weight:800;color:#1e2740;margin:0 0 8px;line-height:1.45}' +
      '.oc-card__desc{font-size:12.5px;color:#606a7e;line-height:1.75;margin:0 0 11px}' +
      '.oc-script{background:#f6f8fc;border:1px dashed #c9d4e8;border-radius:9px;padding:10px 12px;margin-top:9px}' +
      '.oc-script__label{font-size:11px;color:#1a4d8f;font-weight:800;margin-bottom:4px}' +
      '.oc-script__text{font-size:12px;color:#374151;line-height:1.7;white-space:pre-wrap;word-break:break-word}' +
      '.oc-detail{margin-top:11px;border-top:1px dashed #e5e8f2;padding-top:9px}' +
      '.oc-detail summary{cursor:pointer;color:#1a4d8f;font-size:12px;font-weight:700;list-style:none;user-select:none}' +
      '.oc-detail summary::-webkit-details-marker{display:none}' +
      '.oc-detail summary::before{content:"+ ";font-weight:800}' +
      '.oc-detail[open] summary::before{content:"− "}' +
      '.oc-points{margin:8px 0 0;padding-left:18px;color:#4a5468;font-size:12px;line-height:1.9}' +
      '.oc-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12.5px}' +
      '.oc-table th{background:#eaf0f8;color:#1a4d8f;border:1px solid #d8e0ec;padding:9px 10px;text-align:left;font-weight:700}' +
      '.oc-table td{border:1px solid #d8e0ec;padding:8px 10px;vertical-align:top;line-height:1.7;color:#374151}' +
      '.oc-table tbody tr:nth-child(even){background:#f9fafc}' +
      '.oc-warncard{border-left:4px solid #d92d20;background:#fff5f4}' +
      '.oc-yellowcard{border-left:4px solid #e0a800;background:#fffdf3}' +
      '.oc-greencard{border-left:4px solid #1a7a4b;background:#f4fcf8}' +
      '.oc-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;margin-right:6px}' +
      '.oc-badge--g{background:#e3f7ed;color:#1a7a4b}.oc-badge--y{background:#fff4d6;color:#9a6b00}.oc-badge--r{background:#ffe3e0;color:#c92a2a}' +
      '.oc-foot{margin-top:28px;padding:16px 20px;border-radius:12px;background:#f7f8fc;border:1px solid #e8eaf2;' +
        'color:#78829a;font-size:12px;line-height:1.85}' +
      '.oc-foot b{color:#4a5468}' +
      '@media(max-width:640px){.oc-hero{padding:22px 20px}.oc-hero__title{font-size:21px}.oc-grid{grid-template-columns:1fr}}';

    const s = document.createElement('style');
    s.id = 'opsChainCss'; s.textContent = css; document.head.appendChild(s);
  }

  /* ---------------- 数据：全部来自 SOP 原始材料 ---------------- */
  const STAGES = [
    {
      step: '第 0 步 · 前置只做一次', icon: '🔌', title: '把管道全部接通',
      desc: '这一步不做，后面所有环节都跑不起来。含企微助理长连接、会议连接器授权、双群建立、资料库目录四个动作。',
      points: [
        '企微助理必须用 WebSocket 长连接，URL 回调无法推送定时任务结果',
        '腾讯会议连接器授权一次即可，之后可取智能纪要与待办',
        '项目群承载日常协作，预警群单独建并复制 Webhook，两路分开避免串扰',
        '资料库先建"我的思维框架"目录，放分析报告、决策记录、复盘点评',
      ],
      script: null,
    },
    {
      step: '第 1 步', icon: '📝', title: '会议输入 → 结构化待办',
      desc: '会议一结束，不用人写纪要，待办已经带着负责人和截止时间进入系统。',
      points: [
        '方式 A 手动触发：适合单场会议，会后直接发指令',
        '方式 B 自动触发：固定例会建定时任务，每天早上 9 点拉取昨日纪要',
        '生成表格后花 30 秒人工核对责任人，不要让未核对的待办进入下一步',
      ],
      script: { label: '方式 A · 手动话术', text: '读取我【日期/时间，待补】的腾讯会议记录，提取所有已确认的待办事项，按「事项｜负责人｜截止时间｜优先级」生成表格。只提取明确承诺的事项，模糊表达标"待确认"，不要编造。' },
    },
    {
      step: '第 2 步', icon: '💬', title: '群聊协作 → 让机器人接活、串上下文',
      desc: '每个员工都能在项目群里 @ 机器人派活，机器人从群聊和会议纪要中拼出完整背景，而不是每次从零交代。',
      points: [
        '统一派活句式置顶，同时调用群聊上下文和会议纪要两个信息源',
        '每周五下午 4 点做群聊进展同步：结论、变化、悬而未决、下周事项',
        '派活后回传结果，相关人确认或修正，产物存回微盘或资料库',
      ],
      script: { label: '统一派活句式', text: '@WorkBuddy 结合本群最近的讨论和【某次会议，待补】的纪要，梳理出当前最需要推进的 3 件事，列清楚负责人、事项和截止时间。' },
    },
    {
      step: '第 3 步', icon: '📚', title: '知识沉淀 → 把判断变成可调用的参照',
      desc: '把你主动投喂的框架和典型对话，沉淀成机器人每次执行任务时可以引用的显式参照。',
      points: [
        '三目录按用途分不按时间分：01-决策原则 / 02-典型对话 / 03-报告与复盘',
        '任务指令末尾加一句"先翻框架再干活"，让它带着判断标准进场',
        '预期管理：逐步校准，不是一次训练就复制大脑；定期让它对比产出并调整',
      ],
      script: { label: '先翻框架再干活', text: '先检索资料库「01-决策原则」目录，按其中的分析框架来处理，不要用通用模板。' },
    },
    {
      step: '第 4 步', icon: '📌', title: '任务推进 → 从表格变成可跟踪的状态',
      desc: '待办不是躺在聊天记录里，而是有状态、有归属、有下一步。',
      points: [
        '把待办以"待认领"状态发到项目群，@对应负责人确认',
        '如已用 TAPD 或企微待办，可同步过去形成外部可追溯 ID',
        '每日进展速览不催办只同步，不 @ 人；无回应本身就是信号',
      ],
      script: { label: '每日进展速览', text: '每天早上 9 点，查看【项目群】和【相关会议纪要】中过去 24 小时的新进展，输出：哪些待办有新动态、哪些仍无回应、今天到期的有哪些。只推送到【项目群】，不要 @ 人。' },
    },
    {
      step: '第 5 步', icon: '🚨', title: '阶段性任务与三级预警',
      desc: '整条链路里最需要规则前置的部分。预警不是越多越好，分级才有意义。',
      points: [
        '🟢 第一级截止前 2 天提醒：项目群轻提醒，不抄送上级',
        '🟡 第二级逾期触发：预警群 @负责人，进展速览标记逾期',
        '🔴 第三级里程碑偏差升级：抄送上级，附卡点、缺口、需谁决策',
      ],
      script: { label: '里程碑预警定时任务', text: '每周一、周四上午 10 点，读取【项目名，待补】的里程碑清单和任务状态，对每个里程碑检查：当前进度是否落后于计划、关键交付物是否已提交、负责人是否已确认。按"🟡关注 / 🔴干预"两级输出，推送到【预警群，待补】。' },
    },
  ];

  const SUMMARY = [
    ['会议输入', '腾讯会议连接器', '拉取智能纪要，提取待办表格', '项目群 + 任务状态'],
    ['群聊协作', '企微助理（长连接）', '@机器人派活，结合群聊加纪要拼上下文', '项目群回传结果'],
    ['知识沉淀', '资料库 + 主动转发', '决策原则 / 典型对话 / 报告三目录', '任务上下文'],
    ['任务推进', '企微群 + 可选 TAPD', '待办落状态，每日进展速览', '项目群'],
    ['阶段预警', '定时任务 + Webhook', '截止前提醒 / 逾期 / 里程碑升级', '预警专用群'],
  ];

  const WARN = [
    { cls: 'oc-greencard', badge: 'oc-badge--g', level: '🟢 第一级 · 预防', cond: '距截止 ≤ 2 天且未完成', act: '项目群轻提醒 @负责人，不抄送上级', cfg: '定时任务每日检查一次' },
    { cls: 'oc-yellowcard', badge: 'oc-badge--y', level: '🟡 第二级 · 纠偏', cond: '已过截止且仍未完成', act: '逾期当天在预警群 @负责人，标记"逾期"', cfg: '触发式提醒，条件满足自动触发' },
    { cls: 'oc-warncard', badge: 'oc-badge--r', level: '🔴 第三级 · 干预', cond: '里程碑前 3 天关键交付物无进展，或逾期超 3 天', act: '自动升级抄送上级，附卡在哪、缺什么、需谁决策', cfg: '偏差分级：绿 ≤5% / 黄 5-15% / 红 >15%' },
  ];

  const WEEK1 = [
    ['Day 1', '完成第 0 步全部配置，发一句"你好"验证企微机器人连通'],
    ['Day 2', '开一场会，用第 1 步手动指令生成待办表格，人工核对责任人后发到项目群'],
    ['Day 3', '在项目群发"结合群聊和纪要梳理行动项"的指令，让团队看到机器人能串上下文'],
    ['Day 4', '把 3 至 5 篇最能体现判断标准的文档放入"01-决策原则"，起草任务中要求先翻框架再写'],
    ['Day 5', '建预警群机器人，只配第一级截止前提醒，先推预警群不 @ 人，跑通后再加逾期和升级'],
  ];

  function esc(s) { return U.escapeHtml ? U.escapeHtml(s) : String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function stageCard(st) {
    let html = '<article class="oc-card">' +
      '<div class="oc-card__top"><div class="oc-card__icon">' + st.icon + '</div><div class="oc-card__step">' + esc(st.step) + '</div></div>' +
      '<h3 class="oc-card__title">' + esc(st.title) + '</h3>' +
      '<p class="oc-card__desc">' + esc(st.desc) + '</p>';
    if (st.script) {
      html += '<div class="oc-script"><div class="oc-script__label">' + esc(st.script.label) + '</div>' +
        '<div class="oc-script__text">' + esc(st.script.text) + '</div></div>';
    }
    html += '<details class="oc-detail"><summary>查看关键动作</summary><ul class="oc-points">' +
      st.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
      '</ul></details></article>';
    return html;
  }

  function render() {
    injectCss();
    const view = U.el('view');
    if (!view) return;
    if (global.App && App.setBreadcrumb) App.setBreadcrumb(['数字资产运营', '会议到预警全链路 SOP']);

    const flow = ['会议输入', '群聊协作', '知识沉淀', '任务推进', '阶段预警'].map(function (x, i) {
      return (i ? '<span class="oc-flowarrow">→</span>' : '') + '<span class="oc-flownode">' + esc(x) + '</span>';
    }).join('');

    view.innerHTML =
      '<div class="oc-page">' +
        '<section class="oc-hero">' +
          '<h1 class="oc-hero__title">🛠️ 会议到预警全链路 SOP</h1>' +
          '<div class="oc-hero__desc">会议开完、群里聊完，事情却没落地。这套链路让 WorkBuddy 打通企业微信的消息、文档、会议、日程、微盘，把散落内容拼成任务背景，再把结果回传到企微会话。</div>' +
          '<div class="oc-hero__flow">' + flow + '</div>' +
          '<div class="oc-note">⚠️ 方法说明，非实时数据。群名、Webhook、会议名等具体值标【待补】，需人工确认后填入，不可臆造。</div>' +
        '</section>' +

        '<div class="oc-sec">一句话纪律</div>' +
        '<p class="oc-p"><span class="oc-warn">先手动跑通，再改成自动。不要第一周就把三级预警全部打开。</span>先让"会议 → 待办 → 群内确认"跑顺，确认责任人不张冠李戴、推送不串频道，再往预警扩展。</p>' +

        '<div class="oc-sec">一张表收住整条链路</div>' +
        '<table class="oc-table"><thead><tr><th>环节</th><th>核心工具</th><th>关键动作</th><th>输出流向</th></tr></thead><tbody>' +
        SUMMARY.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table>' +

        '<div class="oc-sec">五步操作（点击卡片看关键动作）</div>' +
        '<div class="oc-grid">' + STAGES.map(stageCard).join('') + '</div>' +

        '<div class="oc-sec">三级预警机制</div>' +
        '<p class="oc-p">预警不是越多越好，分级才有意义。从轻到重三级：</p>' +
        '<div class="oc-grid">' + WARN.map(function (w) {
          return '<article class="oc-card ' + w.cls + '"><div class="oc-card__top"><span class="oc-badge ' + w.badge + '">' + esc(w.level) + '</span></div>' +
            '<div class="oc-card__title">触发条件</div><p class="oc-card__desc">' + esc(w.cond) + '</p>' +
            '<div class="oc-card__title">动作</div><p class="oc-card__desc">' + esc(w.act) + '</p>' +
            '<div class="oc-card__title">配置方式</div><p class="oc-card__desc">' + esc(w.cfg) + '</p></article>';
        }).join('') + '</div>' +
        '<p class="oc-p">里程碑预警按进度偏差着色：绿色偏差 ≤5%、黄色 5% 至 15%、<span class="oc-warn">红色大于 15% 需立即响应</span>。需要读写本机文件选本地任务，电脑不保证在线选云端任务。</p>' +

        '<div class="oc-sec">第一周最小可跑版本</div>' +
        '<table class="oc-table"><thead><tr><th>天</th><th>动作</th></tr></thead><tbody>' +
        WEEK1.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') +
        '</tbody></table>' +

        '<div class="oc-foot"><b>口径与待补：</b>本页为操作方法的交互展示，非实时任务数据。项目群名、预警群 Webhook、会议名称、里程碑清单、派活示例中的负责人姓名均为【待补】，需人工确认后填入。完整 SOP 见 Word 版《会议到预警全链路SOP-v1126-1.docx》。</div>' +
      '</div>';
  }

  global.OpsChain = { render: render };
})(window);

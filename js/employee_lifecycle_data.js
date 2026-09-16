/**
 * HR 员工入职到离职全生命周期 — 数据契约文件 (Data Contract)
 * -------------------------------------------------------------
 * 用途：为新模块「员工入职到离职全生命周期」提供结构化数据契约，
 *       供前端直接读取 global.EMP_LIFECYCLE.phases / stages，
 *       渲染横向时间轴流程（招聘入职期 → 在职发展期 → 离职退出期）。
 * 风格：与 dist/js/recruit_system_data.js 保持一致
 *       （IIFE + 'use strict' + 挂 window 全局变量 + 顶部注释）。
 * 说明：当前为示例数据（hardcode），可配置；飞书 ETL 接入为后续工作，
 *       本文件不依赖任何本地 .csv 或外部脚本。
 * 版本：v1.0
 */
(function (global) {
  'use strict';

  global.EMP_LIFECYCLE = {
    meta: {
      syncedAt: '2026-09-14',
      source: '示例数据·流程资产',
      version: 'v1.0'
    },

    // 三大阶段定义
    phases: [
      { id: 'onboard',  name: '招聘入职期', icon: '🚪', color: '#5B5BD6' },
      { id: 'develop',  name: '在职发展期', icon: '🌱', color: '#18A058' },
      { id: 'offboard', name: '离职退出期', icon: '👋', color: '#E5484D' }
    ],

    // 全生命周期流程节点（17 个），顺序严格按原图，三阶段归属正确
    stages: [
      // —— 阶段一·招聘入职期 ——
      { id: 'need',      phase: 'onboard', name: '人力需求', icon: '📋', desc: '部门提出用人需求，HR 审核编制与预算', owner: '用人部门', tools: ['需求审批单', '编制台账'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'plan',      phase: 'onboard', name: '招聘计划', icon: '🗺️', desc: 'HR 制定招聘计划，明确节奏与渠道选择', owner: 'HR',       tools: ['招聘计划表', '渠道矩阵'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'recruit',   phase: 'onboard', name: '人员招聘', icon: '🔎', desc: '发布职位、简历筛选、组织面试评估', owner: 'HR/用人部门', tools: ['职位 JD', 'ATS 系统'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'bgcheck',   phase: 'onboard', name: '背景调查', icon: '🛡️', desc: '身份/学历/履历核验，确认信息真实性', owner: 'HR',       tools: ['背调报告', '学信网'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'entry',     phase: 'onboard', name: '入职手续', icon: '📝', desc: 'Offer 发放、合同签订、入职登记建档', owner: 'HR',       tools: ['Offer 函', '劳动合同'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'training',  phase: 'onboard', name: '入职培训', icon: '🎓', desc: '公司文化、制度规范与岗位技能培训', owner: 'HR/导师',  tools: ['培训课件', '导师带教'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'probation', phase: 'onboard', name: '试用考评', icon: '📊', desc: '设定试用期目标，开展月度/季度考评', owner: '用人部门', tools: ['试用期目标卡', '考核表'], relatedSop: 'SOP-EMP-ONBOARD' },
      { id: 'regular',   phase: 'onboard', name: '转正聘用', icon: '✅', desc: '转正答辩/审批通过，正式聘用入职', owner: 'HR/高管',  tools: ['转正审批单', '答辩记录'], relatedSop: 'SOP-EMP-ONBOARD' },

      // —— 阶段二·在职发展期 ——
      { id: 'care',      phase: 'develop', name: '员工关怀', icon: '🤗', desc: '生日/节日/困难慰问，组织团建活动', owner: 'HR',       tools: ['关怀台账', '团建预算'], relatedSop: 'SOP-EMP-DEVELOP' },
      { id: 'perf',      phase: 'develop', name: '绩效考评', icon: '🎯', desc: '季度/年度绩效评估，OGSM 目标对齐', owner: 'HR/部门',  tools: ['绩效系统', 'OGSM 看板'], relatedSop: 'SOP-EMP-DEVELOP' },
      { id: 'promote',   phase: 'develop', name: '员工晋升', icon: '📈', desc: '明确晋升通道，组织评审与调薪', owner: 'HR/高管',  tools: ['晋升标准', '评审表'], relatedSop: 'SOP-EMP-DEVELOP' },
      { id: 'adjust',    phase: 'develop', name: '岗位调整', icon: '🔄', desc: '轮岗、调岗及汇报线调整管理', owner: 'HR/部门',  tools: ['调岗单', '组织树'], relatedSop: 'SOP-EMP-DEVELOP' },
      { id: 'archive',   phase: 'develop', name: '档案完善', icon: '🗂️', desc: '人事档案维护、合同续签与证照管理', owner: 'HR',       tools: ['人事档案', '证照库'], relatedSop: 'SOP-EMP-DEVELOP' },

      // —— 阶段三·离职退出期 ——
      { id: 'leave',     phase: 'offboard', name: '人员离职', icon: '🚶', desc: '辞职/辞退/合同终止，启动退出流程', owner: '员工/HR',  tools: ['离职申请', '解除通知'], relatedSop: 'SOP-EMP-OFFBOARD' },
      { id: 'interview', phase: 'offboard', name: '离职访谈', icon: '💬', desc: '了解离职原因，收集改进建议', owner: 'HR',       tools: ['访谈问卷', '面谈记录'], relatedSop: 'SOP-EMP-OFFBOARD' },
      { id: 'approval',  phase: 'offboard', name: '离职审批', icon: '📑', desc: '工作交接、权限回收与逐级审批', owner: 'HR/部门',  tools: ['交接清单', '权限回收单'], relatedSop: 'SOP-EMP-OFFBOARD' },
      { id: 'clearance', phase: 'offboard', name: '离职手续', icon: '📤', desc: '社保公积金减员、离职证明与档案转出', owner: 'HR',       tools: ['减员申报', '离职证明'], relatedSop: 'SOP-EMP-OFFBOARD' }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.EMP_LIFECYCLE;
  }
})(typeof window !== 'undefined' ? window : this);

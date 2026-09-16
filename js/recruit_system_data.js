/**
 * HR 招聘体系搭建地图 — 数据契约文件 (Data Contract)
 * -------------------------------------------------------------
 * 用途：为新模块「HR 招聘体系搭建地图」提供结构化数据契约，
 *       供前端直接读取 global.RECRUIT_SYSTEM.funnel / channels /
 *       selection / employerBrand / kpis / assurance 等。
 * 风格：与 dist/js/recruit_data.js 保持一致（挂 window 全局变量 + 顶部注释）。
 * 说明：当前为示例数据（hardcode），可配置；飞书 ETL 接入为后续工作，
 *       本文件不依赖任何本地 .csv 或外部脚本。
 * 版本：v1.0
 */
(function (global) {
  'use strict';

  global.RECRUIT_SYSTEM = {
    meta: {
      syncedAt: '2026-08-31',
      source: '示例数据·可配置',
      version: 'v1.0'
    },

    // 1) 招聘漏斗模块：6 环节漏斗
    funnel: [
      { id: 'reach',    name: '人才触达', count: 1000, prevCount: null, convRate: null, icon: '🌐', desc: '多渠道广泛触达潜在候选人，建立人才池入口',        methods: ['招聘网站发布', '社交媒体推广', '内部推荐触达', '校园宣讲', '猎头寻访'] },
      { id: 'resume',   name: '简历筛选', count: 300,  prevCount: 1000, convRate: 30,   icon: '📄', desc: '基于硬性条件与岗位匹配度初筛，过滤无效简历',    methods: ['关键词筛选', 'AI 初筛', '硬性条件过滤', '简历评级'] },
      { id: 'test',     name: '笔试测评', count: 120,  prevCount: 300,  convRate: 40,   icon: '✍️', desc: '笔试+测评验证专业基础与综合素质',              methods: ['专业笔试', '性格测评', '能力测试', '线上测评'] },
      { id: 'interview',name: '面试评估', count: 50,   prevCount: 120,  convRate: 42,   icon: '🗣️', desc: '多轮结构化面试评估能力、经验与价值观',          methods: ['结构化面试', '专业面', '用人部门面', '终面'] },
      { id: 'offer',    name: 'Offer 发放', count: 30, prevCount: 50,   convRate: 60,   icon: '💌', desc: '薪酬沟通与背调后发放录用通知',                  methods: ['薪酬沟通', '背景调查', 'Offer 审批', '发放'] },
      { id: 'onboard',  name: '入职到岗', count: 24,   prevCount: 30,   convRate: 80,   icon: '🚀', desc: '完成入职手续与引导，正式到岗',                  methods: ['入职体检', '材料收集', '入职引导', '培训启动'] }
    ],

    // 2) 招聘渠道矩阵：6 渠道
    channels: [
      { id: 'internal', name: '内部推荐', ratio: 30, icon: '👥', tools: ['员工推荐', '人才库', '内招竞聘'],       scene: '员工熟悉业务、融入快；偏中层与高匹配度岗位' },
      { id: 'online',   name: '网络招聘', ratio: 25, icon: '🌐', tools: ['招聘网站', '社交媒体', 'LinkedIn'],     scene: '覆盖面广、触达快；通用岗位主力渠道' },
      { id: 'campus',   name: '校园招聘', ratio: 20, icon: '🎓', tools: ['宣讲会', '实习转正', '校企合作'],         scene: '校招储备、管培生；长期人才梯队建设' },
      { id: 'headhunt', name: '猎头服务', ratio: 15, icon: '🔍', tools: ['高端岗位', '定向招聘', '行业mapping'],    scene: '中高端/稀缺岗位；精准定向挖猎' },
      { id: 'labor',    name: '劳务渠道', ratio: 5,  icon: '🧰', tools: ['临时用工', '项目外包', '岗位派遣'],       scene: '弹性用工、项目制人员补充' },
      { id: 'other',    name: '其他渠道', ratio: 5,  icon: '📣', tools: ['行业会议', '专业论坛', '人才市场'],       scene: '垂直领域、被动人才触达补充' }
    ],

    // 3) 甄选评估方法：4 类，下挂 3-4 子方法
    selection: [
      { id: 'structured', name: '结构化面试', icon: '🎯', methods: [
        { name: '行为面试法', desc: 'STAR 追问：背景-任务-行动-结果' },
        { name: '情景模拟',   desc: '虚拟业务场景观察应对思路' },
        { name: '专业深度测试', desc: '岗位核心知识点+案例分析' }
      ]},
      { id: 'assessment', name: '测评工具', icon: '🧪', methods: [
        { name: '性格测评', desc: 'MBTI/DISC 等识别性格特质与团队适配' },
        { name: '能力测试', desc: '逻辑、言语、职业素养等标准化测验' },
        { name: '价值观评估', desc: '组织价值观与动机匹配度评估' }
      ]},
      { id: 'center', name: '评估中心', icon: '🏛️', methods: [
        { name: '无领导小组', desc: '观察 Leadership、沟通与协作表现' },
        { name: '公文筐测试', desc: '模拟管理者处理公文与决策场景' },
        { name: '角色扮演',   desc: '模拟客户/上下级互动考察应变' }
      ]},
      { id: 'bgcheck', name: '背景调查', icon: '🔎', methods: [
        { name: '学历验证', desc: '学信网/院校核验学历真实性' },
        { name: '工作履历', desc: '前雇主核实任职与业绩' },
        { name: '职业信用', desc: '商业利益冲突与信用记录核查' }
      ]}
    ],

    // 4) 雇主品牌建设：4 类，下挂 3 子举措
    employerBrand: [
      { id: 'evp', name: 'EVP 定义', icon: '💎', actions: [
        { name: '价值主张',     desc: '明确员工核心收益与成长承诺',       owner: 'HR' },
        { name: '文化特色',     desc: '提炼独特文化与工作方式',           owner: 'HR/品牌' },
        { name: '差异化定位',   desc: '与竞品雇主形成鲜明区隔',           owner: '高管' }
      ]},
      { id: 'brand', name: '品牌传播', icon: '📡', actions: [
        { name: '线上线下',     desc: '多渠道触达候选人与公众',           owner: '市场/HR' },
        { name: '社交媒体',     desc: '官号+员工号运营雇主声量',          owner: '市场' },
        { name: '行业口碑',     desc: '奖项、榜单、案例沉淀声誉',         owner: '品牌' }
      ]},
      { id: 'experience', name: '候选人体验', icon: '🤝', actions: [
        { name: '流程便捷',     desc: '一站式申请与进度透明',             owner: 'HR' },
        { name: '沟通及时',     desc: '节点反馈与拒信有温度',             owner: 'HR' },
        { name: '尊重反馈',     desc: '面试后收集体验并优化',             owner: 'HR' }
      ]},
      { id: 'social', name: '社交招聘', icon: '💬', actions: [
        { name: '雇主IP',       desc: '打造有辨识度的雇主形象',           owner: '品牌' },
        { name: '内容营销',     desc: '真实故事/干货持续输出',            owner: '市场' },
        { name: '员工代言',     desc: '鼓励员工自发传播雇主品牌',         owner: '全员' }
      ]}
    ],

    // 5) 招聘体系 KPI：8 项（actual 预填示例，演示三态：达标绿/未达标红/未填灰）
    //    三态分布：达标 3 / 未达标 2 / 未填 3 → 总达标率 37.5% 触发橙预警
    kpis: [
      { id: 'completion',  name: '招聘完成率', target: 95, actual: 96,   direction: '>=', unit: '%', icon: '🎯', desc: '季度实际招聘人数/计划招聘人数' },
      { id: 'period',      name: '招聘周期',   target: 30, actual: 35,   direction: '<=', unit: '天', icon: '⏱️', desc: '从职位发布到 Offer 接受的平均天数' },
      { id: 'cost',        name: '招聘成本',   target: 5,  actual: 4.2,  direction: '<=', unit: '%', icon: '💰', desc: '招聘费用占人均薪资比例' },
      { id: 'quality',     name: '招聘质量',   target: 85, actual: 88,   direction: '>=', unit: '%', icon: '⭐', desc: '试用期考核达标人数/入职人数（含绩效与融入）' },
      { id: 'probation',   name: '试用期留存', target: 90, actual: 0,    direction: '>=', unit: '%', icon: '🛡️', desc: '试用期满留存人数/入职人数' },
      { id: 'satisfaction',name: '用人满意度', target: 90, actual: 0,    direction: '>=', unit: '%', icon: '😊', desc: '用人部门对到岗人员满意度评分' },
      { id: 'ontime',      name: '到岗及时率', target: 95, actual: 80,   direction: '>=', unit: '%', icon: '⚡', desc: '按期到岗人数/应到岗人数' },
      { id: 'channel',     name: '渠道有效率', target: 60, actual: 0,    direction: '>=', unit: '%', icon: '📊', desc: '有效渠道产出/总渠道产出（简历或 Offer）' }
    ],

    // 6) 体系保障：3 类
    assurance: [
      { id: 'system', name: '制度保障', icon: '📋', items: [
        { name: '招聘管理制度',   desc: '规范招聘流程、权责与合规要求',   owner: 'HRD' },
        { name: '面试评估标准',   desc: '统一评分维度与录用门槛',         owner: 'HR' },
        { name: '背景调查制度',   desc: '明确背调范围、授权与隐私保护',   owner: 'HR' }
      ]},
      { id: 'team', name: '团队保障', icon: '👥', items: [
        { name: 'HR 招聘团队',   desc: '专职招聘顾问与流程运营',         owner: 'HR' },
        { name: '面试官团队',    desc: '认证面试官库与赋能机制',         owner: 'HR/业务' },
        { name: '用人部门协作',  desc: '需求对齐与联合决策机制',         owner: '业务' }
      ]},
      { id: 'tech', name: '系统保障', icon: '🖥️', items: [
        { name: 'ATS 招聘系统',  desc: '职位发布、流程与数据一体化',     owner: 'IT/HR' },
        { name: '人才数据库',    desc: '人才沉淀与再利用资产库',         owner: 'HR' },
        { name: '数据分析平台',  desc: '招聘效能看板与决策支持',         owner: 'HR/数据' }
      ]}
    ]
  };

})(window);

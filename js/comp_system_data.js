/**
 * HR 薪酬体系搭建地图 — 数据契约文件 (Data Contract)
 * -------------------------------------------------------------
 * 用途：为新模块「HR 薪酬体系搭建地图」提供结构化数据契约，
 *       供前端直接读取 global.COMP_SYSTEM.process / structure /
 *       grading / brand / kpis / assurance 等。
 * 风格：与 dist/js/recruit_system_data.js 保持一致（IIFE + 'use strict'
 *       + 挂 window 全局变量 + 顶部注释说明用途）。
 * 说明：当前为示例数据（hardcode），可配置；飞书 ETL 接入为后续工作，
 *       本文件不依赖任何本地 .csv 或外部脚本。KPI 的 actual 默认 0，
 *       待用户填入真实值（或示例值）以查看三态：达标绿/未达标红/未填灰。
 * 版本：v1.0
 */
(function (global) {
  'use strict';

  global.COMP_SYSTEM = {
    meta: {
      syncedAt: '2026-09-14',
      source: '示例数据·可配置',
      version: 'v1.0'
    },

    // 1) 薪酬搭建全流程链路：6 步
    process: [
      { id: 'strategy',  name: '战略拆解与目标对齐', icon: '🎯', desc: '承接业务战略与人力规划，明确薪酬定位、成本目标与激励导向', owner: 'HRD' },
      { id: 'position',  name: '岗位梳理与编制',     icon: '🗂️', desc: '厘清组织架构、岗位职责与编制，奠定薪酬管理基础',           owner: 'HR' },
      { id: 'value-eval',name: '岗位价值评估',       icon: '⚖️', desc: '通过系统方法评估岗位相对价值，形成内部公平基准',           owner: 'HR' },
      { id: 'band',      name: '薪酬宽带设计',       icon: '📊', desc: '搭建职级宽带，设计薪酬区间与带宽差距',                   owner: 'HR' },
      { id: 'standard',  name: '薪资标准拟定',       icon: '💰', desc: '结合市场与内外部公平，拟定各岗位薪资标准与档位',           owner: 'HR/财务' },
      { id: 'calc',      name: '薪酬核算与发放',     icon: '🧮', desc: '考勤锁定→核算→审批→发放，保障准时准确合规',               owner: '财务/HR' }
    ],

    // 2) 薪酬结构矩阵：3 类占比（固定 50% / 浮动 35% / 福利 15%）
    structure: [
      { id: 'fixed',    name: '固定薪酬', ratio: 50, icon: '💎', desc: '基本工资+岗位工资',    tools: ['基本工资', '岗位工资'] },
      { id: 'variable', name: '浮动绩效', ratio: 35, icon: '📈', desc: '绩效奖金+提成',        tools: ['绩效奖金', '提成'] },
      { id: 'welfare',  name: '福利补贴', ratio: 15, icon: '🎁', desc: '五险一金+补贴',        tools: ['五险一金', '补贴'] }
    ],

    // 3) 薪酬定级评估方法：4 类，每类下含子方法/要点
    grading: [
      { id: 'position-value', name: '岗位价值评估', icon: '⚖️', methods: [
        { name: '因素计点法', desc: '按责任、技能、强度等因素打分量化岗位价值' },
        { name: '岗位排序法', desc: '依据整体相对价值对岗位进行主观排序' },
        { name: '岗位分类法', desc: '预设等级标准，将岗位归入对应类别' }
      ]},
      { id: 'job-level', name: '职级宽带体系', icon: '🪜', methods: [
        { name: 'P1-P4 序列', desc: '专业/职能序列分级（P1 入门至 P4 资深）' },
        { name: 'M1-M2 管理序列', desc: '管理序列分级（M1 主管至 M2 总监）' },
        { name: '职级映射', desc: '跨序列、跨部门的职级对应与对齐' }
      ]},
      { id: 'ability', name: '能力资历测评', icon: '🧠', methods: [
        { name: '能力模型', desc: '基于胜任力模型评估任职能力等级' },
        { name: '学历资历', desc: '学历、专业资质与从业年限综合评定' },
        { name: '司龄贡献', desc: '在公司任职年限与历史贡献折算' }
      ]},
      { id: 'market', name: '市场薪酬调研', icon: '🌐', methods: [
        { name: '行业对标', desc: '对标同行业薪酬水平与带宽' },
        { name: '区域对标', desc: '对标所在城市/区域薪酬分位' },
        { name: '岗位对标', desc: '对标关键标杆岗位的薪酬数据' }
      ]}
    ],

    // 4) 薪酬激励与薪酬品牌：4 类，下挂 3 子举措
    brand: [
      { id: 'evp', name: 'EVP 薪酬价值定义', icon: '💡', actions: [
        { name: '价值主张',   desc: '明确薪酬为员工创造的核心价值',   owner: 'HRD' },
        { name: '文化特色',   desc: '将薪酬与组织文化特色相融合',     owner: 'HRD' },
        { name: '差异化定位', desc: '在人才市场形成薪酬竞争力区隔',   owner: '高管' }
      ]},
      { id: 'rules', name: '薪酬规则宣导', icon: '📢', actions: [
        { name: '规则透明',   desc: '薪酬结构与调薪规则清晰可见',     owner: 'HR' },
        { name: '答疑渠道',   desc: '建立薪酬疑问解答与反馈通道',     owner: 'HR' },
        { name: '反面案例',   desc: '借违规案例强化保密与合规意识',   owner: 'HR/合规' }
      ]},
      { id: 'experience', name: '员工薪酬体验', icon: '🤝', actions: [
        { name: '发放准时',   desc: '按时足额发放，建立信任感',       owner: 'HR/财务' },
        { name: '沟通及时',   desc: '薪酬变动主动、及时沟通',         owner: 'HR' },
        { name: '保密尊重',   desc: '严格保密，尊重个人隐私',         owner: '全员' }
      ]},
      { id: 'flexible', name: '弹性薪酬方案', icon: '🎛️', actions: [
        { name: '自选福利',   desc: '提供菜单式福利自选组合',         owner: 'HR' },
        { name: '绩效弹性',   desc: '绩效联动的弹性激励安排',         owner: 'HR' },
        { name: '长期激励',   desc: '股权/递延等长期绑定机制',         owner: '高管/HRD' }
      ]}
    ],

    // 5) 薪酬体系核心 KPI：8 项（目标值严格按图；actual 默认 0 待填）
    kpis: [
      { id: 'band-gap',          name: '薪酬带宽差距',   target: 30,  actual: 0, direction: '<=', unit: '%', icon: '📊', desc: '最高薪与最低薪差距占比' },
      { id: 'cycle',             name: '薪酬核算周期',   target: 3,   actual: 0, direction: '<=', unit: '天', icon: '⏱️', desc: '从考勤锁定到薪资发放天数' },
      { id: 'cost-ratio',        name: '人力成本占比',   target: 18,  actual: 0, direction: '<=', unit: '%', icon: '💰', desc: '薪酬总额/营收' },
      { id: 'satisfaction',      name: '薪酬满意度',     target: 85,  actual: 0, direction: '>=', unit: '%', icon: '😊', desc: '员工薪酬满意度调研' },
      { id: 'compliance',        name: '试用期薪资合规率', target: 98, actual: 0, direction: '>=', unit: '%', icon: '✅', desc: '试用期薪资合规人数/试用期人数' },
      { id: 'dept-satisfaction', name: '部门薪酬满意度', target: 90,  actual: 0, direction: '>=', unit: '%', icon: '🏢', desc: '各部门薪酬满意度均值' },
      { id: 'ontime',            name: '薪资准时发放率', target: 100, actual: 0, direction: '>=', unit: '%', icon: '⚡', desc: '准时发放次数/应发次数' },
      { id: 'band-fit',          name: '薪酬带宽适配率', target: 60,  actual: 0, direction: '>=', unit: '%', icon: '🎯', desc: '适配带宽人数/总人数' }
    ],

    // 6) 薪酬体系保障支撑：3 类
    assurance: [
      { id: 'system', name: '制度保障', icon: '📋', items: [
        { name: '薪酬管理制度', desc: '规范薪酬结构、标准与发放流程',   owner: 'HRD' },
        { name: '薪酬保密制度', desc: '明确保密要求与违规责任',         owner: 'HR' },
        { name: '调薪机制',     desc: '年度/晋级的调薪规则与节奏',       owner: 'HRD' }
      ]},
      { id: 'team', name: '团队保障', icon: '👥', items: [
        { name: 'HR 薪酬团队',      desc: '专职薪酬核算与运营',         owner: 'HR' },
        { name: '财务协同',         desc: '资金安排与发放对账联动',      owner: '财务' },
        { name: '用人部门负责人',   desc: '绩效确认与定级建议',          owner: '业务' }
      ]},
      { id: 'tech', name: '系统保障', icon: '🖥️', items: [
        { name: '薪酬核算系统', desc: '自动核算、校验与发放',           owner: 'IT/HR' },
        { name: '人事数据系统', desc: '人员、合同与异动数据底座',       owner: 'HR/IT' },
        { name: '数据分析平台', desc: '薪酬看板与成本分析',             owner: 'HR/数据' }
      ]}
    ]
  };

})(window);

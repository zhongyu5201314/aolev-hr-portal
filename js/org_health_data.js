// 自动生成 by build_hr_modules.py — 模块1 组织架构与编制健康诊断
// 生成时间: 2026-11-02 13:53
// 只读快照; 数据变更请重跑 build_hr_modules.py
window.HR_ORG_HEALTH = {
  "label": "组织架构与编制健康诊断",
  "meta": {
    "generatedAt": "2026-11-02 13:53",
    "headcountSource": "data/employees.csv (43人, 唯一权威口径)",
    "headcountTotal": 43,
    "quotaSource": "业务核定override(2026-10-30): 编制=实际在册人数(合计43); 飞书部门编制表tbl7db9hYFIrALcA仍空",
    "quotaEditable": true,
    "quotaFilled": 8,
    "treeSource": "飞书考勤月度汇总.部门 完整路径(奥乐V/部门/组)",
    "treeNote": "未使用员工档案表.部门(该字段存在重复口径与空值)",
    "treeDeptRule": "★ 二级节点一律按【人】归位: 用 data/employees.csv 的 dept 重写考勤路径第二段, 而非沿用路径里原有的二级段。三级段(组名)保留考勤表原样, 无权威口径不做归一。",
    "treeWhitelist": "仅计入 data/employees.csv 的43名在册员工; 已离职与非人员对象已剔除",
    "treeCoverage": "41/43",
    "treeCoverageNote": "分母=43在册; 分子=能解析出真实三级路径的人数。无考勤路径但有权威部门者已归位到本部门(如 林朝辉→仓储部→供应链), 仅无权威部门者进「未分配」节点; 树总人数恒为43。",
    "treeMissingPersons": [
      "林朝辉",
      "陈焕华"
    ],
    "treeMissingNote": "指「在册但考勤表无任何部门路径」的人。2026-11-02 起: 有权威部门者已归位到本部门(如 林朝辉→仓储部, 经展示分组落于供应链), 仅无权威部门者才进「未分配」节点; treeDroppedPersons 才是真正被静默丢弃的人数, 恒为 0。",
    "treeDroppedPersons": [],
    "treeUnallocated": {
      "nodeName": "未分配（无考勤路径）",
      "count": 0,
      "persons": [],
      "detail": [],
      "note": "当前无考勤路径人员均已带有权威部门, 已归位到本部门(如 林朝辉→仓储部→供应链), 无需「未分配」兜底节点。"
    },
    "nameAliasApplied": {
      "李亚楠Danan": "李亚楠",
      "骆": "骆晓珍",
      "岳霞": "岳改霞",
      "李小美": "李桂美"
    },
    "momProxySource": "飞书考勤月度汇总, 按「当月有考勤人数」统计",
    "momProxyNote": "代理口径, 非严格在编人数; 档案表无离职日期字段, 无法还原真实在编序列",
    "momProxyWarning": "低置信: 该序列只统计「当月有考勤记录的在册人数」, 会把休假/无打卡记录误判为不在编。按全部姓名统计时呈增长(48→50→53), 按活跃花名册白名单过滤后转为微降, 方向相反。headcountProxy=白名单口径, allNames=未过滤, rawRows=原始行数, 请勿单独使用其一做结论",
    "externalDisplayBan": {
      "field": "headcountTrend",
      "external": false,
      "note": "在编人数趋势禁止对外展示。三口径并存但结论互斥, 对外一律不引用。"
    },
    "rows": {
      "roster": 43,
      "quota": 8,
      "attendanceMonthly": 153
    }
  },
  "overview": {
    "label": "在编总览",
    "headcount": 43,
    "deptCount": 7,
    "deptCountAuth": 8,
    "latestMonthProxy": "2026年9月",
    "latestProxy": 41,
    "latestMom": 1,
    "emptyDeptNote": "客服部当前 0 人, 属正常(非数据缺失)"
  },
  "deptHealth": {
    "label": "部门编制健康",
    "rows": [
      {
        "label": "管理层",
        "headcount": 2,
        "quota": 2,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      },
      {
        "label": "人事行政部",
        "headcount": 5,
        "quota": 5,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      },
      {
        "label": "仓储部",
        "headcount": 4,
        "quota": 4,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      },
      {
        "label": "品控部",
        "headcount": 1,
        "quota": 1,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      },
      {
        "label": "客服部",
        "headcount": 0,
        "quota": 0,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数；客服部并入电商运营部",
        "usageRate": null
      },
      {
        "label": "市场部",
        "headcount": 12,
        "quota": 12,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      },
      {
        "label": "电商运营部",
        "headcount": 17,
        "quota": 17,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      },
      {
        "label": "财务部",
        "headcount": 2,
        "quota": 2,
        "keyPost": null,
        "quotaNote": "业务核定(2026-10-30): 编制=当前实际在册人数",
        "usageRate": 100.0
      }
    ]
  },
  "orgTree": {
    "label": "三级组织架构",
    "tree": [
      {
        "label": "奥乐V",
        "count": 43,
        "children": [
          {
            "label": "电商运营部",
            "count": 17,
            "children": [
              {
                "label": "客服组",
                "count": 6,
                "children": []
              },
              {
                "label": "电商运营组",
                "count": 4,
                "children": []
              },
              {
                "label": "用户运营组",
                "count": 4,
                "children": []
              },
              {
                "label": "设计组",
                "count": 2,
                "children": []
              }
            ]
          },
          {
            "label": "市场部",
            "count": 12,
            "children": [
              {
                "label": "医疗组",
                "count": 3,
                "children": []
              },
              {
                "label": "营销组",
                "count": 3,
                "children": []
              },
              {
                "label": "公益组",
                "count": 2,
                "children": []
              }
            ]
          },
          {
            "label": "人事行政部",
            "count": 5,
            "children": []
          },
          {
            "label": "供应链",
            "count": 5,
            "children": [
              {
                "label": "仓储部",
                "count": 4,
                "children": []
              },
              {
                "label": "品控部",
                "count": 1,
                "children": []
              }
            ]
          },
          {
            "label": "财务部",
            "count": 2,
            "children": []
          },
          {
            "label": "管理层",
            "count": 2,
            "children": []
          }
        ]
      }
    ]
  },
  "treeGroupNodes": {
    "供应链": [
      "仓储部",
      "品控部"
    ]
  },
  "treeGroupNote": "供应链 为展示层父节点(仅组织树), 收纳 仓储部/品控部; 二者仍为独立二级部门, 人数与编制分列不变(各 4 / 1)。",
  "postSinglePoint": {
    "label": "岗位单点分布",
    "totalPosts": 36,
    "singlePointCount": 32,
    "keyPostStatus": "已录入关键岗位白名单(钟喻指定核心岗 8 个单点)",
    "keyPostCount": 8,
    "rows": [
      {
        "label": "总经理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "徐阳波"
        ],
        "highRisk": false
      },
      {
        "label": "总经理助理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "马婧"
        ],
        "highRisk": false
      },
      {
        "label": "电商运营总监",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "黄伟"
        ],
        "highRisk": true
      },
      {
        "label": "天猫运营",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "王莉莉"
        ],
        "highRisk": false
      },
      {
        "label": "视觉设计经理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "韦艺"
        ],
        "highRisk": false
      },
      {
        "label": "设计",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "揭育榜"
        ],
        "highRisk": false
      },
      {
        "label": "微信客服",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "王娟"
        ],
        "highRisk": false
      },
      {
        "label": "用户运营",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "谢友念"
        ],
        "highRisk": false
      },
      {
        "label": "数据运营",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "郭力文"
        ],
        "highRisk": false
      },
      {
        "label": "用户运营专员",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "姜同融"
        ],
        "highRisk": false
      },
      {
        "label": "私域内容",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "金凤"
        ],
        "highRisk": false
      },
      {
        "label": "市场营销负责人",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "刘焕禹"
        ],
        "highRisk": false
      },
      {
        "label": "品牌运营",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "何杨锦"
        ],
        "highRisk": false
      },
      {
        "label": "内容运营",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "周海肖"
        ],
        "highRisk": false
      },
      {
        "label": "医疗渠道销售负责人",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "林亮宇"
        ],
        "highRisk": false
      },
      {
        "label": "公益项目负责人助理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "陈泳珊"
        ],
        "highRisk": false
      },
      {
        "label": "AI运营",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "余圳锋"
        ],
        "highRisk": false
      },
      {
        "label": "品牌负责人",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "李亚楠"
        ],
        "highRisk": false
      },
      {
        "label": "财务经理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "张翠霞"
        ],
        "highRisk": true
      },
      {
        "label": "出纳",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "王荣荣"
        ],
        "highRisk": false
      },
      {
        "label": "HRD",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "钟喻"
        ],
        "highRisk": false
      },
      {
        "label": "HRBP",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "李沛璇"
        ],
        "highRisk": false
      },
      {
        "label": "行政综合专员",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "王仲锡"
        ],
        "highRisk": false
      },
      {
        "label": "数据分析",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "李文杰"
        ],
        "highRisk": false
      },
      {
        "label": "品控主管",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "冯小平"
        ],
        "highRisk": false
      },
      {
        "label": "副总经理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "林朝辉"
        ],
        "highRisk": false
      },
      {
        "label": "仓库主管",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": true,
        "members": [
          "林浩发"
        ],
        "highRisk": false
      },
      {
        "label": "仓库管理员",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "麦少英"
        ],
        "highRisk": false
      },
      {
        "label": "人事行政专员",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "邹佩琳"
        ],
        "highRisk": false
      },
      {
        "label": "实习生",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "杨宏"
        ],
        "highRisk": false
      },
      {
        "label": "运营助理",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "林坚灿"
        ],
        "highRisk": false
      },
      {
        "label": "口腔健康顾问",
        "count": 1,
        "singlePoint": true,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "陈焕华"
        ],
        "highRisk": false
      },
      {
        "label": "(未填写岗位)",
        "count": 1,
        "singlePoint": false,
        "isPlaceholder": true,
        "keyPost": false,
        "members": [
          "张跃峰"
        ],
        "highRisk": false
      },
      {
        "label": "口腔顾问助理",
        "count": 2,
        "singlePoint": false,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "高迪",
          "徐健斌"
        ],
        "highRisk": false
      },
      {
        "label": "电商运营助理",
        "count": 3,
        "singlePoint": false,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "陈智宇",
          "李兴长",
          "何小军"
        ],
        "highRisk": false
      },
      {
        "label": "电商客服",
        "count": 5,
        "singlePoint": false,
        "isPlaceholder": false,
        "keyPost": false,
        "members": [
          "刘淑娥",
          "苏魏魏",
          "岳改霞",
          "...共5人"
        ],
        "highRisk": false
      }
    ]
  },
  "treeVsDeptCheck": {
    "pass": true,
    "formula": "orgTree[dept] + unallocated[dept] == deptHealth[dept]",
    "rows": [
      {
        "dept": "管理层",
        "deptHealth": 2,
        "orgTree": 2,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "人事行政部",
        "deptHealth": 5,
        "orgTree": 5,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "仓储部",
        "deptHealth": 4,
        "orgTree": 4,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "品控部",
        "deptHealth": 1,
        "orgTree": 1,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "客服部",
        "deptHealth": 0,
        "orgTree": 0,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "市场部",
        "deptHealth": 12,
        "orgTree": 12,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "电商运营部",
        "deptHealth": 17,
        "orgTree": 17,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      },
      {
        "dept": "财务部",
        "deptHealth": 2,
        "orgTree": 2,
        "unallocatedBack": 0,
        "diff": 0,
        "result": "PASS"
      }
    ],
    "unallocated": {
      "name": "未分配（无考勤路径）",
      "count": 0,
      "persons": [],
      "byDept": {}
    },
    "treeTotal": 43,
    "rosterTotal": 43,
    "extraLevel2Nodes": [],
    "checkedAt": "2026-11-02 13:53"
  },
  "headcountTrend": {
    "label": "在编人数趋势(代理口径)",
    "proxy": true,
    "externalDisplay": false,
    "displayPolicy": {
      "external": false,
      "internalOnly": true,
      "reason": "代理口径且方向反转: 未过滤口径显示增长(48→50→53), 活跃花名册白名单口径显示微降, 同一份数据得出相反结论。在获得真实入职/离职日期前不可支撑任何对外结论。",
      "forbiddenOutputs": [
        "对外汇报",
        "客户/董事会材料",
        "对外大屏",
        "新闻稿",
        "招标文件"
      ],
      "allowedOutputs": [
        "内部数据探查",
        "口径对齐讨论",
        "方法论验证"
      ],
      "unblockCondition": "员工档案表补录入职日期/离职日期字段后, 用真实在编口径重算并通过一致性门禁"
    },
    "rows": [
      {
        "label": "2026年7月",
        "headcountProxy": 39,
        "rawRows": 49,
        "allNames": 48,
        "mom": null
      },
      {
        "label": "2026年8月",
        "headcountProxy": 40,
        "rawRows": 51,
        "allNames": 50,
        "mom": 1
      },
      {
        "label": "2026年9月",
        "headcountProxy": 41,
        "rawRows": 53,
        "allNames": 53,
        "mom": 1
      }
    ]
  }
};

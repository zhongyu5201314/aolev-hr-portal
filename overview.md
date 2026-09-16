# 奥乐V 人事行政系统 · 部署与说明（dist/）

> 纯静态前端应用，**零后端、无构建步骤**。直接双击 `index.html` 即可在浏览器离线运行；
> 也可通过本地静态服务访问：`http://localhost:8080`。
> 数据全部内嵌为 JS 对象（`js/data.js` / `js/knowledge.js`），规避 `file://` 下 `fetch` 的 CORS 限制。

---

## 一、如何打开

| 方式 | 操作 | 说明 |
|------|------|------|
| 双击打开 | 资源管理器双击 `dist/index.html` | 完全离线，依赖 `vendor/` 下的本地 ECharts / marked |
| 本地服务 | `python -m http.server 8080 --directory dist` | 访问 `http://localhost:8080`；顶栏/侧栏/路由均为纯前端 |

> 图表库 ECharts、Markdown 渲染 marked 已下载至 `dist/vendor/`，**无需联网**。
> 若 `vendor/` 缺失（如误删），请重新运行 `build_data.py` 旁的下载步骤，或把 `index.html` 中的
> `<script src="vendor/echarts.min.js">` 改为 CDN 形式（已在文件注释中说明）。

---

## 二、模块清单

### 模块一 · HR 数据看板（`#/dashboard`）
- 全局筛选条：**统计周期（2026-02 ~ 2026-07）** + **部门** + 重置；任一筛选变化实时联动全部图表与 KPI。
- KPI 指标卡：在职总人数 / 平均司龄 / 月度出勤率 / 平均 OGSM 完成率 / 月度人力成本 / 人效比。
- 四大分析区（共 14 张图）：
  1. **人数结构**：部门分布（柱）、职级分布（饼）、性别比例（环）、年龄段（柱）、工龄分布（柱）
  2. **考勤**：月度出勤率（折线）、迟到/早退趋势（双折线）、请假类型分布（环）
  3. **绩效**：OGSM 完成率（仪表盘）、绩效等级分布（环形·金/银/铜/待改进固定配色）、各部门绩效对比（柱）
  4. **薪酬人效**：薪酬结构占比（环）、近 6 月人力成本趋势（面积折线）、人效比看板（成本柱 + 人效比线 + 1.84 亿挑战目标参考线）
- 钻取：点击「部门分布」柱 / 「绩效等级」扇区 → 弹出该维度人员明细表。

### 模块二 · 行政事务（`#/admin/asset|leave|expense|seal|meeting`）
- **资产管理**：台账表格（编号/名称/类别/领用人/部门/状态/购置日期/位置）+ 新增/编辑弹窗（内存态，HR/负责人可见）。
- **请假加班**：「我要申请」表单 + 「审批列表」（待审批/通过/驳回 Tab，支持通过/驳回，HR/负责人可见）。
- **报销管理**：「填写报销单」表单 + 「报销台账」+ 一键导出 CSV。
- **用章管理**：「用章申请」表单 + 「用章记录」表格。
- **会议安排**：会议室列表 + 本周简易日历（可新增会议）。

> ⚠️ 演示提示：所有「新增/审批/提交」均为**前端内存态，刷新即重置**，页面角落已用灰色小字标注。

### 模块三 · 制度知识库（`#/wiki`）
- **门户首页**：大搜索框 + 分类卡片 + 热门阅读 / 最近更新。
- **文章列表**：左侧分类树 + 顶部搜索（标题/标签/摘要/正文模糊匹配，防抖 300ms）+ 卡片列表。
- **文章详情**：`marked` 渲染 Markdown 正文（含表格/列表/标题）+ 右侧自动目录（TOC 锚点跳转）+ 相关推荐。

### 全局壳
- 顶部栏：品牌 Logo、全局搜索（联动知识库）、角色切换（HR / 部门负责人 / 普通员工，影响姓名脱敏与审批/管理按钮可见性）、用户头像。
- 可折叠侧边栏 + 面包屑；响应式三档（≥1200 / 768–1199 / <768，移动端侧栏抽屉化）。

---

## 三、数据来源与替换方式

数据由 `build_data.py` 生成，来源为项目根目录：
- `data/*.csv`（UTF-8 with BOM，按**字段名**解析，非列序）
- `knowledge/*.md`（`---` 包裹的 YAML front-matter + Markdown 正文）

**替换为真实数据（如飞书/Excel 导出）：**
1. 用同名字段名的 CSV 直接覆盖 `data/` 下对应文件（字段名严格一致即可，前端零改动）；
2. 知识库文章直接更新/新增 `knowledge/*.md`（保持 front-matter 格式）；
3. 重新运行 `build_data.py`（受管 Python）：
   ```
   C:\Users\Administrator\.workbuddy\binaries\python\versions\3.13.12\python.exe build_data.py
   ```
   即可刷新 `dist/js/data.js` 与 `dist/js/knowledge.js`。

### 关键计算口径（已固化在前端）
- **出勤率** = (应出勤 21.75 天 − 异常天数) ÷ 21.75；异常天按 `leave_hours/8`（请假/缺勤）+ 迟到/早退 0.25 折算（满勤无记录，不按行数统计）。
- **人效比** = 月营收目标(1.84 亿 ÷ 12) ÷ 月度人力成本；挑战目标参考线 = 1.84 亿 ÷ 年化人力成本。
- **年营收目标**：挑战 **1.84 亿** / 保底 **1.0 亿**（见 `js/utils.js` 中 `CONST`）。
- 绩效四级固定配色：金 `#F0A020` / 银 `#8C8C8C` / 铜 `#B87333` / 待改进 `#E5484D`。
- 主色 `#5B5BD6`，背景 `#F4F5F9`，图表调色板 `['#5B5BD6','#2D8CF0','#8B5CF6','#18A058','#F0A020','#E5484D']`。

### 字段契约（取数键，禁止改名）
`employees`(emp_id,name,dept,title,level,gender,age,hire_date,tenure,contract_type,manager,base_salary,perf_salary,allowance) ·
`performance`(emp_id,cycle,period,ogsm_completion,perf_level,score) ·
`compensation`(emp_id,month,base,performance_pay,allowance,total_cost) ·
`attendance`(emp_id,date,status,late_min,leave_type,leave_hours) ·
`leave`(id,emp_id,apply_date,leave_type,start_date,end_date,days,reason,status) ·
`reimbursement`(id,emp_id,apply_date,category,amount,status,note) ·
`seal`(id,emp_id,apply_date,seal_type,purpose,status) ·
`assets`(asset_id,name,category,owner_emp_id,status,purchase_date,location)

枚举：部门(7) / 职级(6: P1–P4,M1,M2) / 合同(3) / 请假类型(4: 事假/病假/年假/调休) / 用章类型(3) /
绩效等级(4) / 考勤状态(5) / 资产状态(4) / 报销类别(8)。详见根目录《数据Schema说明.md》与 `design/system-design.md`。

---

## 四、已知限制（MVP 边界）

1. **内存态**：行政事务的增/改/审均为前端会话态，刷新即重置，未持久化（待接入后端）。
2. **示例数据**：当前为脱敏示例数据；姓名界面默认脱敏（如「陈**」），HR/负责人角色可见完整姓名；薪酬仅以聚合形式（成本/占比）展示，不暴露个人薪酬明细。
3. **会议模块**：`data/` 无会议 CSV，采用前端本地 Mock（会议室 + 示例会议），可新增不持久化。
4. **知识库分类**：当前 4 篇文章均归入「绩效与激励」，分类树与门户已预留扩展位（考勤/薪酬/招聘等）。
5. **角色权限**：为演示用的前端开关（隐藏/显示按钮、姓名脱敏），非真实鉴权。

---

## 五、目录结构

```
dist/
├── index.html              # 应用入口（壳：顶栏/侧栏/面包屑 + 脚本装配）
├── overview.md            # 本说明
├── css/
│   └── styles.css        # 全局样式（设计令牌见 system-design.md §9）
├── js/
│   ├── data.js           # 自动生成：window.HR_DATA（8 张表）
│   ├── knowledge.js      # 自动生成：window.KB_ARTICLES（5 篇文章）
│   ├── utils.js          # 常量/状态/工具/通用弹窗/Toast/图表注册表
│   ├── charts.js         # 模块一：HR 数据看板（计算 + 14 图）
│   ├── admin.js          # 模块二：行政事务（资产/请假/报销/用章/会议）
│   ├── wiki.js           # 模块三：制度知识库（门户/列表/详情）
│   └── app.js           # 路由 / 壳 / 角色切换 / 响应式
└── vendor/
    ├── echarts.min.js    # 本地 ECharts 5（图表）
    └── marked.min.js     # 本地 marked 12（Markdown 渲染）
```

---

## 六、后续可扩展项（第二版）

- 接入真实后端 API（替换 `js/data.js` 的内嵌数据，改为 `fetch` + 适配层）。
- 行政表单真实落库、审批流与消息通知、操作审计日志。
- 知识库富文本在线编辑、全文检索引擎、阅读量统计。
- 高级权限矩阵、SSO / 飞书集成、文件真实上传与 Excel 真导出。
- 看板钻取明细页升级为独立路由（当前为弹窗）。

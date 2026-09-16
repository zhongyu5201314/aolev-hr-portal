/* =========================================================================
 * admin.js — 模块二：行政事务
 * 资产 / 请假加班 / 报销 / 用章 / 会议（前端内存态，刷新即重置）
 * ========================================================================= */
(function (global) {
  'use strict';
  const C = global.CONST, U = global.U, HR = global.HR_DATA;

  // 内存态（从内置数据克隆，用户提交仅本次会话有效）
  const AdminState = {
    assets: JSON.parse(JSON.stringify(HR.assets)),
    leaves: JSON.parse(JSON.stringify(HR.leave)),
    reimbursements: JSON.parse(JSON.stringify(HR.reimbursement)),
    seals: JSON.parse(JSON.stringify(HR.seal)),
    meetings: [
      { title: '周经营例会', date: '2026-07-20', room: '大会议室', owner: 'OLV001', attend: '全员' },
      { title: '直播选品评审', date: '2026-07-22', room: '直播间1', owner: 'OLV003', attend: '直播电商部' },
      { title: '研发周会', date: '2026-07-23', room: '小会议室', owner: 'OLV005', attend: '产品研发部' },
    ],
    rooms: [
      { name: '大会议室', cap: 20, equip: ['投影', '白板', '视频'] },
      { name: '小会议室', cap: 8, equip: ['电视', '白板'] },
      { name: '直播间1', cap: 6, equip: ['摄像', '灯光', '提词器'] },
      { name: '洽谈室', cap: 4, equip: ['沙发', '咖啡机'] },
    ],
  };

  // 每个子页的筛选状态
  const F = { asset: { status: '全部', kw: '' }, leaveTab: 'apply', leaveStatus: '待审批', expenseTab: 'apply', sealTab: 'apply' };

  function curUser() {
    if (AppState.role === '员工') return 'OLV011';
    if (AppState.role === '负责人') return 'OLV003';
    return 'OLV001';
  }
  function canManage() { return AppState.role === 'HR' || AppState.role === '负责人'; }

  function statusTag(s) {
    const map = {
      '待审批': 'tag--warn', '通过': 'tag--success', '驳回': 'tag--danger',
      '在用': 'tag--success', '闲置': 'tag--info', '维修': 'tag--warn', '报废': 'tag--muted',
    };
    return '<span class="tag ' + (map[s] || 'tag--info') + '">' + U.escapeHtml(s) + '</span>';
  }

  function empOptions(selected) {
    return HR.employees.map(function (e) {
      return '<option value="' + e.emp_id + '"' + (e.emp_id === selected ? ' selected' : '') + '>' +
        U.escapeHtml(U.empName(e.emp_id) + '（' + e.dept + '）') + '</option>';
    }).join('');
  }
  function nextId(prefix, list, field) {
    let max = 0;
    list.forEach(function (r) { const n = parseInt(String(r[field] || '').replace(prefix, ''), 10); if (!isNaN(n) && n > max) max = n; });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function demoNote() {
    return '<div class="demo-note">演示数据 · 提交与审批仅本次会话有效（刷新即重置）</div>';
  }

  /* ============================ 资产管理 ============================ */
  function renderAsset() {
    const view = U.el('view');
    const statusOpts = ['全部'].concat(C.ASSET_STATUS).map(function (s) {
      return '<option value="' + s + '"' + (F.asset.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    view.innerHTML =
      '<div class="page-head"><div><h2 class="page-title">资产管理</h2>' + demoNote() + '</div>' +
      (canManage() ? '<button class="btn btn--primary" id="asset-add">+ 新增资产</button>' : '') + '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-item"><label>状态</label><select id="asset-status">' + statusOpts + '</select></div>' +
        '<div class="filter-item grow"><label>关键字</label><input id="asset-kw" placeholder="名称 / 编号 / 位置" value="' + U.escapeHtml(F.asset.kw) + '" /></div>' +
      '</div>' +
      '<div class="table-wrap" id="asset-table"></div>';
    bindAsset();
    refreshAssetTable();
  }
  function refreshAssetTable() {
    let rows = AdminState.assets.slice();
    if (F.asset.status !== '全部') rows = rows.filter(function (a) { return a.status === F.asset.status; });
    if (F.asset.kw) {
      const kw = F.asset.kw.toLowerCase();
      rows = rows.filter(function (a) {
        return [a.asset_id, a.name, a.location, a.category].some(function (v) { return String(v).toLowerCase().indexOf(kw) >= 0; });
      });
    }
    let html = '<table class="table"><thead><tr><th>编号</th><th>名称</th><th>类别</th><th>领用人</th><th>部门</th><th>状态</th><th>购置日期</th><th>位置</th>' +
      (canManage() ? '<th>操作</th>' : '') + '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="9" class="empty-cell">暂无资产，点击「新增资产」</td></tr>';
    rows.forEach(function (a) {
      html += '<tr><td>' + a.asset_id + '</td><td>' + U.escapeHtml(a.name) + '</td><td>' + U.escapeHtml(a.category) + '</td>' +
        '<td>' + U.escapeHtml(U.ownerName(a.owner_emp_id)) + '</td><td>' + U.escapeHtml(U.empDept(a.owner_emp_id)) + '</td>' +
        '<td>' + statusTag(a.status) + '</td><td>' + U.escapeHtml(a.purchase_date) + '</td><td>' + U.escapeHtml(a.location) + '</td>';
      if (canManage()) html += '<td class="ops"><button class="link" data-edit="' + a.asset_id + '">编辑</button>' +
        (a.status !== '报废' ? '<button class="link link--danger" data-scrap="' + a.asset_id + '">报废</button>' : '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    U.el('asset-table').innerHTML = html;
    if (canManage()) {
      U.$all('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { openAssetForm(b.getAttribute('data-edit')); }); });
      U.$all('[data-scrap]').forEach(function (b) { b.addEventListener('click', function () {
        const id = b.getAttribute('data-scrap');
        if (window.confirm('确认将 ' + id + ' 标记为「报废」？')) {
          const a = AdminState.assets.find(function (x) { return x.asset_id === id; }); if (a) a.status = '报废';
          U.toast('已报废：' + id, 'success'); refreshAssetTable();
        }
      }); });
    }
  }
  function bindAsset() {
    const st = U.el('asset-status'), kw = U.el('asset-kw'), add = U.el('asset-add');
    if (st) st.addEventListener('change', function () { F.asset.status = st.value; refreshAssetTable(); });
    if (kw) kw.addEventListener('input', function () { F.asset.kw = kw.value; refreshAssetTable(); });
    if (add) add.addEventListener('click', function () { openAssetForm(null); });
  }
  function openAssetForm(id) {
    const a = id ? AdminState.assets.find(function (x) { return x.asset_id === id; }) : null;
    const isEdit = !!a;
    U.openFormModal({
      title: isEdit ? '编辑资产 ' + id : '新增资产',
      submitText: isEdit ? '保存' : '新增',
      fields: [
        { name: 'asset_id', label: '资产编号', type: 'text', required: true, value: a ? a.asset_id : nextId('A', AdminState.assets, 'asset_id'), placeholder: '如 A029' },
        { name: 'name', label: '资产名称', type: 'text', required: true, value: a ? a.name : '' },
        { name: 'category', label: '类别', type: 'select', required: true, value: a ? a.category : C.ASSET_CATS[0], options: C.ASSET_CATS },
        { name: 'owner_emp_id', label: '领用人', type: 'select', value: a ? a.owner_emp_id : '', options: [{ value: '', label: '公司公用' }].concat(HR.employees.map(function (e) { return { value: e.emp_id, label: U.empName(e.emp_id) + '（' + e.dept + '）' }; })) },
        { name: 'status', label: '状态', type: 'select', required: true, value: a ? a.status : '在用', options: C.ASSET_STATUS },
        { name: 'purchase_date', label: '购置日期', type: 'date', required: true, value: a ? a.purchase_date : '2026-07-01' },
        { name: 'location', label: '存放位置', type: 'text', required: true, value: a ? a.location : '' },
      ],
      onSubmit: function (v) {
        if (isEdit) {
          Object.assign(a, v);
        } else {
          AdminState.assets.push(v);
        }
        U.toast(isEdit ? '已保存' : '已新增资产', 'success');
        refreshAssetTable();
      },
    });
  }

  /* ============================ 请假加班 ============================ */
  function renderLeave() {
    const view = U.el('view');
    view.innerHTML =
      '<div class="page-head"><div><h2 class="page-title">请假 / 加班</h2>' + demoNote() + '</div></div>' +
      '<div class="tabs">' +
        '<button class="tab ' + (F.leaveTab === 'apply' ? 'active' : '') + '" data-tab="apply">我要申请</button>' +
        '<button class="tab ' + (F.leaveTab === 'list' ? 'active' : '') + '" data-tab="list">审批列表</button>' +
      '</div><div id="leave-body"></div>';
    U.$all('.tab', view).forEach(function (b) { b.addEventListener('click', function () { F.leaveTab = b.getAttribute('data-tab'); renderLeave(); }); });
    if (F.leaveTab === 'apply') renderLeaveApply(); else renderLeaveList();
  }
  function renderLeaveApply() {
    const body = U.el('leave-body');
    body.innerHTML = '<div class="form-card"><h4>请假 / 加班申请</h4><div id="leave-form-mount"></div></div>';
    // 直接以内联表单呈现（字段较多，使用 openFormModal 的字段描述渲染到容器）
    const mount = U.el('leave-form-mount');
    mount.appendChild(buildInlineForm([
      { name: 'kind', label: '类型', type: 'select', required: true, value: '请假', options: ['请假', '加班'] },
      { name: 'leave_type', label: '请假类型', type: 'select', required: true, value: '事假', options: C.LEAVE_TYPES, dependsOn: { field: 'kind', showWhen: '请假' }, hint: '选择「请假」时必填' },
      { name: 'start_date', label: '开始日期', type: 'date', required: true, value: '2026-07-20' },
      { name: 'end_date', label: '结束日期', type: 'date', required: true, value: '2026-07-20' },
      { name: 'reason', label: '事由', type: 'textarea', required: true, value: '' },
      { name: 'approver', label: '审批人', type: 'select', required: true, value: 'OLV001', options: HR.employees.map(function (e) { return { value: e.emp_id, label: U.empName(e.emp_id) + '（' + e.dept + '）' }; }) },
    ], '提交申请', function (v) {
      const d1 = new Date(v.start_date), d2 = new Date(v.end_date);
      if (d2 < d1) { U.toast('结束日期不能早于开始日期', 'error'); return false; }
      const days = (AppState.role === '员工' ? 1 : 1); // 占位，下面重算
      const diff = Math.round((d2 - d1) / 86400000) + 1;
      const rec = {
        id: nextId('LV', AdminState.leaves, 'id'), emp_id: curUser(),
        apply_date: new Date().toISOString().slice(0, 10),
        leave_type: v.kind === '请假' ? v.leave_type : '加班',
        start_date: v.start_date, end_date: v.end_date, days: diff,
        reason: v.reason, status: '待审批',
      };
      AdminState.leaves.push(rec);
      U.toast('已提交，单号 ' + rec.id, 'success');
      F.leaveTab = 'list'; F.leaveStatus = '待审批'; renderLeave();
      return true;
    }));
  }
  function renderLeaveList() {
    const body = U.el('leave-body');
    const statuses = ['待审批', '通过', '驳回'];
    const tabs = statuses.map(function (s) {
      const n = AdminState.leaves.filter(function (l) { return l.status === s; }).length;
      return '<button class="tab ' + (F.leaveStatus === s ? 'active' : '') + '" data-st="' + s + '">' + s + ' (' + n + ')</button>';
    }).join('');
    body.innerHTML = '<div class="tabs sub">' + tabs + '</div><div class="table-wrap" id="leave-table"></div>';
    U.$all('[data-st]', body).forEach(function (b) { b.addEventListener('click', function () { F.leaveStatus = b.getAttribute('data-st'); renderLeaveList(); }); });
    let rows = AdminState.leaves.filter(function (l) { return l.status === F.leaveStatus; });
    if (AppState.role === '员工') rows = rows.filter(function (l) { return l.emp_id === curUser(); });
    let html = '<table class="table"><thead><tr><th>单号</th><th>申请人</th><th>类型</th><th>起止</th><th>天数</th><th>事由</th><th>状态</th>' +
      (canManage() ? '<th>操作</th>' : '') + '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="8" class="empty-cell">暂无记录</td></tr>';
    rows.forEach(function (l) {
      html += '<tr><td>' + l.id + '</td><td>' + U.escapeHtml(U.empName(l.emp_id)) + '</td><td>' + U.escapeHtml(l.leave_type) + '</td>' +
        '<td>' + l.start_date + ' ~ ' + l.end_date + '</td><td>' + l.days + '</td><td>' + U.escapeHtml(l.reason) + '</td><td>' + statusTag(l.status) + '</td>';
      if (canManage()) html += '<td class="ops">' + approveOps(l, AdminState.leaves, 'leave-table') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    U.el('leave-table').innerHTML = html;
    bindApproveOps('leave-table');
  }

  /* ============================ 报销管理 ============================ */
  function renderExpense() {
    const view = U.el('view');
    view.innerHTML =
      '<div class="page-head"><div><h2 class="page-title">报销管理</h2>' + demoNote() + '</div></div>' +
      '<div class="tabs">' +
        '<button class="tab ' + (F.expenseTab === 'apply' ? 'active' : '') + '" data-tab="apply">填写报销单</button>' +
        '<button class="tab ' + (F.expenseTab === 'ledger' ? 'active' : '') + '" data-tab="ledger">报销台账</button>' +
      '</div><div id="expense-body"></div>';
    U.$all('.tab', view).forEach(function (b) { b.addEventListener('click', function () { F.expenseTab = b.getAttribute('data-tab'); renderExpense(); }); });
    if (F.expenseTab === 'apply') renderExpenseApply(); else renderExpenseLedger();
  }
  function renderExpenseApply() {
    const body = U.el('expense-body');
    body.innerHTML = '<div class="form-card"><h4>报销单</h4><div id="exp-form-mount"></div></div>';
    U.el('exp-form-mount').appendChild(buildInlineForm([
      { name: 'category', label: '费用类别', type: 'select', required: true, value: C.EXPENSE_CATS[0], options: C.EXPENSE_CATS },
      { name: 'amount', label: '金额（元）', type: 'number', required: true, value: '', placeholder: '如 1280' },
      { name: 'apply_date', label: '发生日期', type: 'date', required: true, value: '2026-07-18' },
      { name: 'note', label: '摘要', type: 'textarea', required: true, value: '' },
      { name: 'approver', label: '审批人', type: 'select', required: true, value: 'OLV001', options: HR.employees.map(function (e) { return { value: e.emp_id, label: U.empName(e.emp_id) + '（' + e.dept + '）' }; }) },
    ], '提交报销', function (v) {
      const rec = {
        id: nextId('RB', AdminState.reimbursements, 'id'), emp_id: curUser(),
        apply_date: v.apply_date, category: v.category, amount: Number(v.amount),
        status: '待审批', note: v.note,
      };
      AdminState.reimbursements.push(rec);
      U.toast('已提交，单号 ' + rec.id, 'success');
      F.expenseTab = 'ledger'; renderExpense();
      return true;
    }));
  }
  function renderExpenseLedger() {
    const body = U.el('expense-body');
    body.innerHTML = '<div class="toolbar-right"><button class="btn btn--ghost" id="exp-export">导出 CSV</button></div>' +
      '<div class="table-wrap" id="exp-table"></div>';
    U.el('exp-export').addEventListener('click', function () { exportCSV('报销台账.csv', AdminState.reimbursements); });
    let rows = AdminState.reimbursements.slice();
    if (AppState.role === '员工') rows = rows.filter(function (r) { return r.emp_id === curUser(); });
    let html = '<table class="table"><thead><tr><th>单号</th><th>申请人</th><th>类别</th><th>金额</th><th>提交日期</th><th>摘要</th><th>状态</th>' +
      (canManage() ? '<th>操作</th>' : '') + '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="8" class="empty-cell">暂无记录</td></tr>';
    rows.forEach(function (r) {
      html += '<tr><td>' + r.id + '</td><td>' + U.escapeHtml(U.empName(r.emp_id)) + '</td><td>' + U.escapeHtml(r.category) + '</td>' +
        '<td>' + U.fmtYuan(r.amount) + '</td><td>' + U.escapeHtml(r.apply_date) + '</td><td>' + U.escapeHtml(r.note) + '</td><td>' + statusTag(r.status) + '</td>';
      if (canManage()) html += '<td class="ops">' + approveOps(r, AdminState.reimbursements, 'exp-table') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    U.el('exp-table').innerHTML = html;
    bindApproveOps('exp-table');
  }

  /* ============================ 用章管理 ============================ */
  function renderSeal() {
    const view = U.el('view');
    view.innerHTML =
      '<div class="page-head"><div><h2 class="page-title">用章管理</h2>' + demoNote() + '</div></div>' +
      '<div class="tabs">' +
        '<button class="tab ' + (F.sealTab === 'apply' ? 'active' : '') + '" data-tab="apply">用章申请</button>' +
        '<button class="tab ' + (F.sealTab === 'record' ? 'active' : '') + '" data-tab="record">用章记录</button>' +
      '</div><div id="seal-body"></div>';
    U.$all('.tab', view).forEach(function (b) { b.addEventListener('click', function () { F.sealTab = b.getAttribute('data-tab'); renderSeal(); }); });
    if (F.sealTab === 'apply') renderSealApply(); else renderSealRecord();
  }
  function renderSealApply() {
    const body = U.el('seal-body');
    body.innerHTML = '<div class="form-card"><h4>用章申请</h4><div id="seal-form-mount"></div></div>';
    U.el('seal-form-mount').appendChild(buildInlineForm([
      { name: 'seal_type', label: '用章类型', type: 'select', required: true, value: C.SEAL_TYPES[0], options: C.SEAL_TYPES },
      { name: 'purpose', label: '用章事由', type: 'textarea', required: true, value: '' },
      { name: 'file_name', label: '文件名称', type: 'text', required: true, value: '' },
      { name: 'use_date', label: '使用日期', type: 'date', required: true, value: '2026-07-20' },
      { name: 'approver', label: '审批人', type: 'select', required: true, value: 'OLV001', options: HR.employees.map(function (e) { return { value: e.emp_id, label: U.empName(e.emp_id) + '（' + e.dept + '）' }; }) },
    ], '提交申请', function (v) {
      const rec = {
        id: nextId('SE', AdminState.seals, 'id'), emp_id: curUser(),
        apply_date: v.use_date, seal_type: v.seal_type, purpose: v.purpose, status: '待审批',
      };
      AdminState.seals.push(rec);
      U.toast('已提交，单号 ' + rec.id, 'success');
      F.sealTab = 'record'; renderSeal();
      return true;
    }));
  }
  function renderSealRecord() {
    const body = U.el('seal-body');
    let rows = AdminState.seals.slice();
    if (AppState.role === '员工') rows = rows.filter(function (r) { return r.emp_id === curUser(); });
    let html = '<div class="table-wrap"><table class="table"><thead><tr><th>单号</th><th>申请人</th><th>用章类型</th><th>事由</th><th>日期</th><th>状态</th>' +
      (canManage() ? '<th>操作</th>' : '') + '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="7" class="empty-cell">暂无记录</td></tr>';
    rows.forEach(function (r) {
      html += '<tr><td>' + r.id + '</td><td>' + U.escapeHtml(U.empName(r.emp_id)) + '</td><td>' + U.escapeHtml(r.seal_type) + '</td>' +
        '<td>' + U.escapeHtml(r.purpose) + '</td><td>' + U.escapeHtml(r.apply_date) + '</td><td>' + statusTag(r.status) + '</td>';
      if (canManage()) html += '<td class="ops">' + approveOps(r, AdminState.seals, 'seal-table') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    body.innerHTML = html;
    bindApproveOps('seal-table');
  }

  /* ============================ 会议安排 ============================ */
  function renderMeeting() {
    const view = U.el('view');
    // 本周（以 2026-07-20 周一为示例基准）
    const weekStart = new Date('2026-07-20');
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dayDates = [];
    for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); dayDates.push(d.toISOString().slice(0, 10)); }
    let roomHtml = '<div class="room-list">' + AdminState.rooms.map(function (r) {
      return '<div class="room-card"><div class="room-card__name">' + U.escapeHtml(r.name) + '</div>' +
        '<div class="room-card__cap">容量 ' + r.cap + ' 人</div><div class="tag-row">' +
        r.equip.map(function (e) { return '<span class="tag tag--info">' + U.escapeHtml(e) + '</span>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
    let calHtml = '<div class="week-cal">';
    dayDates.forEach(function (ds, i) {
      const items = AdminState.meetings.filter(function (m) { return m.date === ds; });
      calHtml += '<div class="week-day"><div class="week-day__head">' + days[i] + '<br><span>' + ds.slice(5) + '</span></div><div class="week-day__body">' +
        items.map(function (m) { return '<div class="meet-chip"><b>' + U.escapeHtml(m.title) + '</b><span>' + U.escapeHtml(m.room) + ' · ' + U.escapeHtml(U.empName(m.owner)) + '</span></div>'; }).join('') +
        '</div></div>';
    });
    calHtml += '</div>';
    view.innerHTML =
      '<div class="page-head"><div><h2 class="page-title">会议安排</h2>' + demoNote() + '</div>' +
      (canManage() ? '<button class="btn btn--primary" id="meet-add">+ 新增会议</button>' : '') + '</div>' +
      '<div class="meeting-layout"><div class="meeting-left"><h4>会议室</h4>' + roomHtml + '</div>' +
      '<div class="meeting-right"><h4>本周会议日历</h4>' + calHtml + '</div></div>';
    const add = U.el('meet-add');
    if (add) add.addEventListener('click', openMeetingForm);
  }
  function openMeetingForm() {
    U.openFormModal({
      title: '新增会议', submitText: '添加',
      fields: [
        { name: 'title', label: '会议主题', type: 'text', required: true, value: '' },
        { name: 'date', label: '日期', type: 'date', required: true, value: '2026-07-21' },
        { name: 'room', label: '会议室', type: 'select', required: true, value: AdminState.rooms[0].name, options: AdminState.rooms.map(function (r) { return r.name; }) },
        { name: 'attend', label: '参与人', type: 'text', required: true, value: '' },
      ],
      onSubmit: function (v) {
        AdminState.meetings.push({ title: v.title, date: v.date, room: v.room, owner: curUser(), attend: v.attend });
        U.toast('已添加会议', 'success'); renderMeeting();
      },
    });
  }

  /* ============================ 通用：审批操作 / 内联表单 / 导出 ============================ */
  function approveOps(rec, list, tableId) {
    if (rec.status !== '待审批') return '<span class="muted">—</span>';
    return '<button class="link link--success" data-ok="' + rec.id + '" data-t="' + tableId + '">通过</button>' +
      '<button class="link link--danger" data-no="' + rec.id + '" data-t="' + tableId + '">驳回</button>';
  }
  function bindApproveOps(tableId) {
    const tbl = U.el(tableId);
    if (!tbl) return;
    U.$all('[data-ok]', tbl).forEach(function (b) { b.addEventListener('click', function () { doApprove(b, '通过', tableId); }); });
    U.$all('[data-no]', tbl).forEach(function (b) { b.addEventListener('click', function () { doApprove(b, '驳回', tableId); }); });
  }
  function doApprove(btn, decision, tableId) {
    const id = btn.getAttribute('data-ok') || btn.getAttribute('data-no');
    const opinion = window.prompt(decision === '通过' ? '审批意见（可选）：' : '驳回原因（驳回必填）：', '');
    if (opinion === null) return;
    if (decision === '驳回' && !opinion.trim()) { U.toast('驳回需填写原因', 'error'); return; }
    [AdminState.leaves, AdminState.reimbursements, AdminState.seals].forEach(function (list) {
      const r = list.find(function (x) { return x.id === id; }); if (r) r.status = decision;
    });
    U.toast('已' + decision + '：' + id, decision === '通过' ? 'success' : 'warn');
    // 重新渲染当前子页
    if (tableId === 'leave-table') renderLeaveList();
    else if (tableId === 'exp-table') renderExpenseLedger();
    else renderSealRecord();
  }

  // 内联表单（复用 openFormModal 的字段渲染，但挂载到指定容器而非弹窗）
  function buildInlineForm(fields, submitText, onSubmit) {
    const wrap = document.createElement('div');
    wrap.className = 'inline-form';
    fields.forEach(function (f) {
      const row = document.createElement('div');
      row.className = 'form-row'; row.setAttribute('data-field', f.name);
      let ctrl = '';
      if (f.type === 'select') {
        ctrl = '<select name="' + f.name + '">' + (f.options || []).map(function (o) {
          const val = (typeof o === 'object') ? o.value : o; const lbl = (typeof o === 'object') ? o.label : o;
          return '<option value="' + U.escapeHtml(val) + '"' + (val === f.value ? ' selected' : '') + '>' + U.escapeHtml(lbl) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        ctrl = '<textarea name="' + f.name + '" rows="3" placeholder="' + U.escapeHtml(f.placeholder || '') + '">' + U.escapeHtml(f.value || '') + '</textarea>';
      } else {
        const t = f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : 'text');
        const step = f.type === 'number' ? ' step="0.01"' : '';
        ctrl = '<input type="' + t + '" name="' + f.name + '" value="' + U.escapeHtml(f.value || '') + '" placeholder="' + U.escapeHtml(f.placeholder || '') + '"' + step + ' />';
      }
      row.innerHTML = '<label>' + U.escapeHtml(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>' + ctrl +
        (f.hint ? '<div class="form-hint">' + U.escapeHtml(f.hint) + '</div>' : '') + '<div class="form-err"></div>';
      wrap.appendChild(row);
    });
    const btn = document.createElement('button');
    btn.className = 'btn btn--primary'; btn.textContent = submitText;
    wrap.appendChild(btn);
    function sync() {
      fields.forEach(function (f) {
        if (!f.dependsOn) return;
        const row = wrap.querySelector('[data-field="' + f.name + '"]');
        const src = wrap.querySelector('[name="' + f.dependsOn.field + '"]');
        if (row && src) row.style.display = (String(src.value) === String(f.dependsOn.showWhen)) ? '' : 'none';
      });
    }
    fields.forEach(function (f) { const n = wrap.querySelector('[name="' + f.name + '"]'); if (n) n.addEventListener('change', sync); });
    sync();
    btn.addEventListener('click', function () {
      const vals = {}; let ok = true;
      fields.forEach(function (f) {
        const row = wrap.querySelector('[data-field="' + f.name + '"]');
        const input = wrap.querySelector('[name="' + f.name + '"]'); if (!input) return;
        const v = input.value; const err = row.querySelector('.form-err'); err.textContent = '';
        const hidden = row.style.display === 'none';
        if (f.required && !hidden && !String(v).trim()) { err.textContent = '该项为必填'; ok = false; return; }
        if (f.type === 'number' && String(v).trim() && Number(v) <= 0) { err.textContent = '需大于 0'; ok = false; return; }
        vals[f.name] = v;
      });
      if (!ok) return;
      const done = onSubmit(vals);
      if (done === false) return; // 校验未过，保留表单
    });
    return wrap;
  }

  function exportCSV(name, rows) {
    const headers = ['id', 'emp_id', 'apply_date', 'category', 'amount', 'status', 'note', 'seal_type', 'purpose'];
    const cols = headers.filter(function (h) { return h in (rows[0] || {}); });
    let csv = '﻿' + cols.join(',') + '\n';
    rows.forEach(function (r) {
      csv += cols.map(function (h) { return '"' + String(r[h] == null ? '' : r[h]).replace(/"/g, '""') + '"'; }).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    URL.revokeObjectURL(a.href);
    U.toast('已导出 ' + rows.length + ' 条', 'success');
  }

  global.Admin = {
    renderAsset: renderAsset, renderLeave: renderLeave, renderExpense: renderExpense,
    renderSeal: renderSeal, renderMeeting: renderMeeting,
  };
})(window);

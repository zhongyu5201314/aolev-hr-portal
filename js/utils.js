/* =========================================================================
 * utils.js — 全局常量、状态、工具函数、图表注册表、通用弹窗/Toast
 * 奥乐V 人事行政系统（纯静态，无构建步骤）
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ---------- 业务常量（前端固化，无需后端） ---------- */
  const CONST = {
    PRIMARY: '#5B5BD6',
    PALETTE: ['#5B5BD6', '#2D8CF0', '#8B5CF6', '#18A058', '#F0A020', '#E5484D'],
    // 绩效四级固定配色（以设计文档 9.1 为准）
    PERF_COLORS: { '金': '#F0A020', '银': '#8C8C8C', '铜': '#B87333', '待改进': '#E5484D' },
    REVENUE_CHALLENGE: 184000000, // 年营收挑战目标 1.84 亿
    REVENUE_FLOOR: 100000000,     // 年营收保底目标 1.0 亿
    WORK_DAYS: 21.75,             // 月应出勤天数（默认）
    // 部门口径已对齐真实花名册（2026-07 更新）
    DEPTS: ['管理层', '人事行政部', '仓储部', '品控部', '客服部', '市场部', '电商运营部', '财务部'],
    LEVELS: ['P1', 'P2', 'P3', 'P4', 'M1', 'M2'],
    LEAVE_TYPES: ['事假', '病假', '年假', '调休'],
    SEAL_TYPES: ['公章', '合同章', '财务章'],
    ASSET_STATUS: ['在用', '闲置', '维修', '报废'],
    ASSET_CATS: ['IT设备', '办公家具', '直播设备', '生产设备', '交通工具', '其他'],
    EXPENSE_CATS: ['差旅', '招待', '办公用品', '采购', '交通', '通讯', '培训', '福利'],
    PERF_LEVELS: ['金', '银', '铜', '待改进'],
    // 真实数据月份：薪酬覆盖 4/5/6 月；考勤覆盖 1–6 月
    COMP_MONTHS: ['2026-04', '2026-05', '2026-06'],
    ATT_MONTHS: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
    CURRENT_MONTH: '2026-06',
  };

  /* ---------- 全局状态 ---------- */
  const AppState = {
    role: 'HR', // 'HR' | '负责人' | '员工'
    filters: { dept: '全部', month: CONST.CURRENT_MONTH },
    currentView: 'dashboard',
  };

  /* ---------- ECharts 实例注册表（路由切换/筛选时统一销毁） ---------- */
  let _charts = [];
  function registerChart(c) { _charts.push(c); return c; }
  function disposeCharts() {
    _charts.forEach(function (c) { try { c.dispose(); } catch (e) {} });
    _charts = [];
  }
  function resizeCharts() { _charts.forEach(function (c) { try { c.resize(); } catch (e) {} }); }

  /* ---------- DOM 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- 数据关联：员工查找 / 部门派生 / 姓名脱敏 ---------- */
  const _empMap = {};
  (global.HR_DATA ? global.HR_DATA.employees : []).forEach(function (e) { _empMap[e.emp_id] = e; });

  function getEmp(empId) { return _empMap[empId] || null; }

  function maskName(name) {
    if (!name) return '—';
    // HR / 部门负责人 角色可见完整姓名；员工角色脱敏为「陈**」
    if (AppState.role === 'HR' || AppState.role === '负责人') return name;
    if (name.length <= 1) return name;
    return name.charAt(0) + '**';
  }

  function empName(empId) {
    const e = getEmp(empId);
    return e ? maskName(e.name) : (empId || '—');
  }

  function empDept(empId) {
    const e = getEmp(empId);
    return e ? e.dept : '公司公用';
  }

  function ownerName(ownerId) {
    if (!ownerId) return '公司公用';
    return empName(ownerId);
  }

  /* ---------- 格式化 ---------- */
  function fmtInt(n) { return (Number(n) || 0).toLocaleString('zh-CN'); }
  function fmtMoney(n) { return '¥' + fmtInt(Math.round(Number(n) || 0)); }
  function fmtWan(n) { return (Number(n) / 10000).toFixed(1) + '万'; }
  function fmtYuan(n) { return (Number(n) || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + ' 元'; }
  function pct(v, d) { return (Number(v) * 100).toFixed(d === undefined ? 1 : d) + '%'; }

  /* ---------- Toast 轻提示 ---------- */
  function toast(msg, type) {
    let box = el('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.style.cssText = 'position:fixed;top:72px;right:18px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    const colors = { success: '#18A058', error: '#E5484D', info: '#5B5BD6', warn: '#F0A020' };
    t.style.cssText = 'background:' + (colors[type] || '#5B5BD6') + ';color:#fff;padding:9px 14px;border-radius:6px;' +
      'font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.18);opacity:0;transform:translateY(-6px);transition:.2s;max-width:320px;';
    t.textContent = msg;
    box.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateY(-6px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, 2400);
  }

  /* ---------- 通用表单弹窗（基于字段描述生成） ---------- */
  // fields: [{name,label,type,options,required,value,placeholder,hint,dependsOn:{field,showWhen}}]
  function openFormModal(cfg) {
    cfg = cfg || {};
    const fields = cfg.fields || [];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const panel = document.createElement('div');
    panel.className = 'modal-panel';
    let html = '<div class="modal-head"><span>' + escapeHtml(cfg.title || '表单') + '</span>' +
      '<button class="modal-close" aria-label="关闭">×</button></div>';
    html += '<div class="modal-body">';
    fields.forEach(function (f) {
      const req = f.required ? ' <span class="req">*</span>' : '';
      html += '<div class="form-row" data-field="' + escapeHtml(f.name) + '">' +
        '<label>' + escapeHtml(f.label) + req + '</label>';
      if (f.type === 'select') {
        html += '<select name="' + f.name + '">';
        (f.options || []).forEach(function (o) {
          const val = (typeof o === 'object') ? o.value : o;
          const lbl = (typeof o === 'object') ? o.label : o;
          const sel = (val === f.value) ? ' selected' : '';
          html += '<option value="' + escapeHtml(val) + '"' + sel + '>' + escapeHtml(lbl) + '</option>';
        });
        html += '</select>';
      } else if (f.type === 'textarea') {
        html += '<textarea name="' + f.name + '" placeholder="' + escapeHtml(f.placeholder || '') + '" rows="3">' +
          escapeHtml(f.value || '') + '</textarea>';
      } else {
        const t = f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : 'text');
        const step = f.type === 'number' ? ' step="0.01"' : '';
        html += '<input type="' + t + '" name="' + f.name + '" value="' + escapeHtml(f.value || '') +
          '" placeholder="' + escapeHtml(f.placeholder || '') + '"' + step + ' />';
      }
      if (f.hint) html += '<div class="form-hint">' + escapeHtml(f.hint) + '</div>';
      html += '<div class="form-err"></div></div>';
    });
    html += '</div>';
    html += '<div class="modal-foot"><button class="btn btn--ghost" data-act="cancel">取消</button>' +
      '<button class="btn btn--primary" data-act="ok">' + escapeHtml(cfg.submitText || '提交') + '</button></div>';
    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function syncDeps() {
      const vals = {};
      fields.forEach(function (f) { const n = panel.querySelector('[name="' + f.name + '"]'); if (n) vals[f.name] = n.value; });
      fields.forEach(function (f) {
        if (f.dependsOn) {
          const row = panel.querySelector('[data-field="' + f.name + '"]');
          if (!row) return;
          const show = String(vals[f.dependsOn.field]) === String(f.dependsOn.showWhen);
          row.style.display = show ? '' : 'none';
        }
      });
    }
    fields.forEach(function (f) {
      const n = panel.querySelector('[name="' + f.name + '"]');
      if (n) n.addEventListener('change', syncDeps);
    });
    syncDeps();

    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    panel.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    panel.querySelector('[data-act="cancel"]').addEventListener('click', close);

    panel.querySelector('[data-act="ok"]').addEventListener('click', function () {
      const vals = {};
      let ok = true;
      fields.forEach(function (f) {
        const n = panel.querySelector('[data-field="' + f.name + '"]');
        const input = panel.querySelector('[name="' + f.name + '"]');
        if (!input) return;
        const v = input.value;
        const errBox = n.querySelector('.form-err');
        errBox.textContent = '';
        // 条件隐藏字段不参与校验
        const hidden = (n.style.display === 'none');
        if (f.required && !hidden && !String(v).trim()) {
          errBox.textContent = '该项为必填';
          ok = false; return;
        }
        if (f.type === 'number' && String(v).trim() && Number(v) <= 0) {
          errBox.textContent = '金额/数量需大于 0';
          ok = false; return;
        }
        vals[f.name] = v;
      });
      if (!ok) return;
      if (cfg.onSubmit) cfg.onSubmit(vals, close);
    });
    return { close: close };
  }

  /* ---------- 表格钻取弹窗 ---------- */
  function openTableModal(title, headers, rows, colFmt) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const panel = document.createElement('div');
    panel.className = 'modal-panel modal-panel--wide';
    let html = '<div class="modal-head"><span>' + escapeHtml(title) + '</span>' +
      '<button class="modal-close" aria-label="关闭">×</button></div>';
    html += '<div class="modal-body"><div class="table-wrap"><table class="table"><thead><tr>';
    headers.forEach(function (h) { html += '<th>' + escapeHtml(h) + '</th>'; });
    html += '</tr></thead><tbody>';
    if (!rows.length) {
      html += '<tr><td colspan="' + headers.length + '" class="empty-cell">暂无数据</td></tr>';
    } else {
      rows.forEach(function (r) {
        html += '<tr>';
        headers.forEach(function (h, i) {
          const v = r[h];
          const disp = colFmt && colFmt[h] ? colFmt[h](v, r) : escapeHtml(v);
          html += '<td>' + disp + '</td>';
        });
        html += '</tr>';
      });
    }
    html += '</tbody></table></div></div>';
    html += '<div class="modal-foot"><button class="btn btn--primary" data-act="close">关闭</button></div>';
    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    panel.querySelector('.modal-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    panel.querySelector('[data-act="close"]').addEventListener('click', function () { overlay.remove(); });
  }

  global.CONST = CONST;
  global.AppState = AppState;
  global.U = {
    $: $, $all: $all, el: el, escapeHtml: escapeHtml,
    getEmp: getEmp, maskName: maskName, empName: empName, empDept: empDept, ownerName: ownerName,
    fmtInt: fmtInt, fmtMoney: fmtMoney, fmtWan: fmtWan, fmtYuan: fmtYuan, pct: pct,
    toast: toast, openFormModal: openFormModal, openTableModal: openTableModal,
    registerChart: registerChart, disposeCharts: disposeCharts, resizeCharts: resizeCharts,
  };
})(window);

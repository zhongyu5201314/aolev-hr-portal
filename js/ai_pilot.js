/* =========================================================================
 * ai_pilot.js — 数字员工 v1 技能组件（阶段三·M1/M2/M3 落地）
 *   原型技能（2 个）：
 *     1) 简历初筛助手：读《招聘初筛 SOP》规则，规则引擎输出匹配度建议 + 置信度
 *     2) 绩效初评助手：读《绩效评估 SOP》4 级口径，规则引擎输出初评建议 + 置信度
 *   作用域前缀：.ap（深色科技风 #0f0f1a 系）
 *   边界（严守方案风险对策）：原型标注"人工兜底、AI 不直接涉薪涉裁决策"；
 *        所有输出前端可审计留痕；规则引擎为可解释启发式，非黑箱。
 *   阶段三增强：
 *     · 置信度（高/中/低）输出
 *     · 人工决策标注（采纳AI建议 / 修正为X）→ case 回流，落地 localStorage
 *     · 进化指标面板（采纳率/准确率/修正率/高置信占比）
 *     · 全局 API：run / quickAssess / recordDecision / ensureLoaded（供主流程嵌合调用）
 * ========================================================================= */
(function (global) {
  'use strict';
  var U = global.U;

  var TAB = 'resume'; // resume | perf
  var CASES = loadCases(); // 结构化回流 case [{ts,operator,kind,input,aiVerdict,aiConfidence,humanDecision,humanNote,consistent}]

  var CSS =
    '.ap{--ap-bg:#0f0f1a;--ap-panel:rgba(30,30,56,.55);--ap-card:#1a1a32;--ap-card-hover:#222244;--ap-border:rgba(255,255,255,.10);--ap-line:rgba(74,158,255,.40);--ap-accent:#4a9eff;--ap-accent2:#8b5cf6;--ap-ink:#e8e8f0;--ap-muted:#8888aa;color:var(--ap-ink);font-size:14px}' +
    '.ap *{box-sizing:border-box}' +
    '.ap-page{background:var(--ap-bg);margin:-18px -22px -40px;padding:28px 22px 40px;min-height:calc(100vh - 56px)}' +
    '.ap-head h1{font-size:20px;font-weight:700;margin:0 0 4px;color:#fff}' +
    '.ap-head .sub{font-size:12px;color:var(--ap-muted);margin:0 0 16px}' +
    '.ap-warn{background:rgba(255,212,121,.10);border:1px solid rgba(255,212,121,.4);color:#ffd479;border-radius:10px;padding:10px 14px;font-size:12px;margin-bottom:16px;line-height:1.6}' +
    '.ap-tabs{display:flex;gap:6px;margin-bottom:16px}' +
    '.ap-tab{padding:8px 18px;border-radius:10px;cursor:pointer;color:var(--ap-muted);border:1px solid transparent;font-size:14px;font-weight:600;transition:.2s}' +
    '.ap-tab:hover{color:var(--ap-ink);background:var(--ap-card)}' +
    '.ap-tab.is-active{color:#fff;background:linear-gradient(135deg,var(--ap-accent),var(--ap-accent2))}' +
    '.ap-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}' +
    '@media(max-width:860px){.ap-cols{grid-template-columns:1fr}}' +
    '.ap-box{background:var(--ap-panel);border:1px solid var(--ap-border);border-radius:14px;padding:16px 18px}' +
    '.ap-box h3{margin:0 0 10px;font-size:15px;color:#fff}' +
    '.ap-rule{font-size:12px;color:var(--ap-muted);line-height:1.7;background:rgba(255,255,255,.03);border:1px solid var(--ap-border);border-radius:8px;padding:10px 12px;margin-bottom:12px}' +
    '.ap-field{margin:10px 0}' +
    '.ap-field label{display:block;font-size:12px;color:var(--ap-muted);margin-bottom:4px;font-weight:600}' +
    '.ap-field select,.ap-field input{width:100%;background:var(--ap-card);color:var(--ap-ink);border:1px solid var(--ap-border);border-radius:8px;padding:8px 10px;font-size:13px}' +
    '.ap-run{margin-top:6px;padding:9px 18px;border-radius:9px;border:none;background:linear-gradient(135deg,var(--ap-accent),var(--ap-accent2));color:#fff;font-weight:700;cursor:pointer;font-size:13px}' +
    '.ap-run.ghost{background:transparent;color:var(--ap-muted);border:1px solid var(--ap-border)}' +
    '.ap-run:hover{opacity:.9}' +
    '.ap-out{margin-top:14px}' +
    '.ap-verdict{display:inline-block;border-radius:10px;padding:8px 16px;font-size:15px;font-weight:800;margin-bottom:8px}' +
    '.ap-verdict--高匹配,.ap-verdict--金{color:#5be0a0;background:rgba(91,224,160,.14);border:1px solid rgba(91,224,160,.5)}' +
    '.ap-verdict--可培养,.ap-verdict--银{color:#4a9eff;background:rgba(74,158,255,.14);border:1px solid rgba(74,158,255,.5)}' +
    '.ap-verdict--铜{color:#ffd479;background:rgba(255,212,121,.14);border:1px solid rgba(255,212,121,.5)}' +
    '.ap-verdict--不匹配,.ap-verdict--待改进{color:#ff7a7a;background:rgba(255,122,122,.14);border:1px solid rgba(255,122,122,.5)}' +
    '.ap-reason{font-size:13px;line-height:1.7;color:var(--ap-ink)}' +
    '.ap-conf{display:inline-block;margin-left:8px;font-size:11px;font-weight:700;border-radius:999px;padding:2px 10px;border:1px solid}' +
    '.ap-conf--高{color:#5be0a0;border-color:rgba(91,224,160,.5);background:rgba(91,224,160,.12)}' +
    '.ap-conf--中{color:#4a9eff;border-color:rgba(74,158,255,.5);background:rgba(74,158,255,.12)}' +
    '.ap-conf--低{color:#ff7a7a;border-color:rgba(255,122,122,.5);background:rgba(255,122,122,.12)}' +
    '.ap-log{background:var(--ap-panel);border:1px solid var(--ap-border);border-radius:14px;padding:14px 16px;margin-top:16px}' +
    '.ap-log h3{margin:0 0 10px;font-size:14px;color:#fff}' +
    '.ap-log ul{list-style:none;margin:0;padding:0;max-height:220px;overflow:auto}' +
    '.ap-log li{font-size:12px;color:var(--ap-muted);padding:7px 0;border-top:1px dashed var(--ap-border);line-height:1.6}' +
    '.ap-log li b{color:var(--ap-ink)}' +
    /* 进化指标面板 */
    '.ap-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}' +
    '@media(max-width:860px){.ap-metrics{grid-template-columns:repeat(2,1fr)}}' +
    '.ap-metric{background:var(--ap-panel);border:1px solid var(--ap-border);border-radius:12px;padding:14px 16px}' +
    '.ap-metric b{display:block;font-size:22px;line-height:1.1;color:#fff}' +
    '.ap-metric span{font-size:11px;color:var(--ap-muted)}' +
    '.ap-metric small{display:block;font-size:10px;color:var(--ap-muted);margin-top:4px;opacity:.8}' +
    /* 人工决策标注条 */
    '.ap-decision{margin-top:12px;border:1px solid var(--ap-line);border-radius:10px;padding:10px 12px;background:rgba(74,158,255,.06)}' +
    '.ap-decision .dh{font-size:12px;color:var(--ap-ink);font-weight:700;margin-bottom:8px}' +
    '.ap-decision select,.ap-decision input{background:var(--ap-card);color:var(--ap-ink);border:1px solid var(--ap-border);border-radius:8px;padding:6px 10px;font-size:12px;margin:4px 0}' +
    '.ap-decision .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    /* 弹层 */
    '.ap-mask{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:60;display:none;align-items:center;justify-content:center;padding:20px}' +
    '.ap-mask.open{display:flex}' +
    '.ap-modal{width:520px;max-width:94vw;max-height:90vh;overflow:auto;background:#16162c;border:1px solid var(--ap-border);border-radius:16px;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.ap-modal h3{margin:0 0 4px;font-size:17px;color:#fff}' +
    '.ap-modal .ctx{font-size:12px;color:var(--ap-muted);margin-bottom:14px}' +
    '.ap-modal .ap-close{float:right;cursor:pointer;color:var(--ap-muted);font-size:20px;background:none;border:none}' +
    '.ap-link{display:inline-block;margin-top:10px;color:var(--ap-accent);font-size:12px;cursor:pointer}';

  function injectCss() {
    if (document.getElementById('aiPilotCss')) return;
    var s = document.createElement('style');
    s.id = 'aiPilotCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function loadCases() {
    try { return JSON.parse(localStorage.getItem('ai_pilot_cases_v1') || '[]'); } catch (e) { return []; }
  }
  function saveCases() {
    try { localStorage.setItem('ai_pilot_cases_v1', JSON.stringify(CASES)); } catch (e) {}
  }
  function operator() {
    try { return localStorage.getItem('ai_pilot_operator') || '喻哥（HRD）'; } catch (e) { return '喻哥（HRD）'; }
  }
  function conf(verdict) {
    if (verdict === '高匹配' || verdict === '金') return '高';
    if (verdict === '可培养' || verdict === '银' || verdict === '铜') return '中';
    return '低';
  }

  /* 从知识库读取 SOP 规则摘要（按 asset_id） */
  function sopSummary(assetId) {
    var list = global.KB_ARTICLES || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].asset_id === assetId) return list[i].summary || '';
    }
    return '';
  }

  // ---- 规则引擎：简历初筛 ----
  function resumeEngine(inp) {
    var reasons = [];
    if (inp.risk === '有') {
      return { verdict: '不匹配', reasons: ['命中风险红线（如虚假经历/竞业限制未解除等），一票否决。'], confidence: '低' };
    }
    var score = 0;
    if (inp.years >= 3) { score += 2; reasons.push('经验 ≥3 年，匹配岗位成熟度'); }
    else if (inp.years >= 1) { score += 1; reasons.push('经验 1–3 年，需带教'); }
    else { reasons.push('经验 <1 年，偏校招/实习'); }
    if (inp.rel === '是') { score += 2; reasons.push('岗位强相关'); }
    else { reasons.push('岗位弱相关，需评估转岗成本'); }
    if (inp.channel === '内推') { score += 1; reasons.push('内推渠道，可信度高'); }
    var verdict;
    if (score >= 4) verdict = '高匹配';
    else if (score >= 2) verdict = '可培养';
    else verdict = '不匹配';
    reasons.push(verdict === '高匹配' ? '建议进入面试快通道。' : verdict === '可培养' ? '建议面试+试用期验证。' : '综合匹配度不足，建议储备或不推进。');
    if (inp.risk === '待核') reasons.push('风险项待人工复核（未确认红线）。');
    return { verdict: verdict, reasons: reasons, confidence: conf(verdict) };
  }

  // ---- 规则引擎：绩效初评 ----
  function perfEngine(inp) {
    var reasons = [];
    if (inp.risk === '有') {
      return { verdict: '待改进', reasons: ['存在风险/违纪事项，须先复核处置，不进入等级评定。'], confidence: '低' };
    }
    reasons.push('月度 OGSM 完成率 ' + inp.ogsm + '%（权重 70%–85%）');
    var verdict;
    if (inp.ogsm >= 100 && inp.kr === '优') verdict = '金';
    else if (inp.ogsm >= 85 && (inp.kr === '优' || inp.kr === '良')) verdict = '银';
    else if (inp.ogsm >= 70) verdict = '铜';
    else verdict = '待改进';
    reasons.push(verdict === '金' ? 'OGSM 超额 + 关键结果优，建议金奖。' :
      verdict === '银' ? '达成稳定，建议银奖。' :
      verdict === '铜' ? '基本达成，建议铜奖，关注提升点。' : '完成率 <70%，建议待改进并制定改进计划。');
    if (inp.risk === '待核') reasons.push('风险项待人工复核（未确认红线）。');
    return { verdict: verdict, reasons: reasons, confidence: conf(verdict) };
  }

  // 全局可调用：运行技能
  function run(kind, inp) {
    return kind === 'resume' ? resumeEngine(inp) : perfEngine(inp);
  }

  // 全局可调用：记录人工决策 → 回流 case
  function recordDecision(kind, inp, ai, humanDecision, humanNote) {
    var consistent = (humanDecision === '采纳AI建议') || (humanDecision === ai.verdict);
    CASES.unshift({
      ts: nowTs(), operator: operator(), kind: kind, input: inp,
      aiVerdict: ai.verdict, aiConfidence: ai.confidence,
      humanDecision: humanDecision, humanNote: humanNote || '', consistent: consistent
    });
    if (CASES.length > 200) CASES.pop();
    saveCases();
    return metrics();
  }

  // 进化指标
  function metrics() {
    var n = CASES.length;
    if (!n) return { n: 0, adopt: 0, acc: 0, fix: 0, high: 0 };
    var adopt = 0, consistent = 0, high = 0;
    CASES.forEach(function (c) {
      if (c.humanDecision === '采纳AI建议') adopt++;
      if (c.consistent) consistent++;
      if (c.aiConfidence === '高') high++;
    });
    return {
      n: n,
      adopt: Math.round(adopt / n * 100),
      acc: Math.round(consistent / n * 100),
      fix: Math.round((n - adopt) / n * 100),
      high: Math.round(high / n * 100)
    };
  }

  function nowTs() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) +
      ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function verdictHtml(r) {
    return '<div class="ap-verdict ap-verdict--' + r.verdict + '">' + r.verdict +
      '<span class="ap-conf ap-conf--' + r.confidence + '">置信度·' + r.confidence + '</span></div>' +
      '<div class="ap-reason">' + r.reasons.map(function (x) { return '· ' + U.escapeHtml(x); }).join('<br>') + '</div>';
  }

  function metricsHtml() {
    var m = metrics();
    return '<div class="ap-section" style="margin-top:18px">' +
      '<h2 style="font-size:15px;color:#fff;margin:0 0 12px">📊 数字员工进化指标 <small style="font-size:11px;color:var(--ap-muted);font-weight:400">基于 case 回流（localStorage 持久化，逐月跟踪）</small></h2>' +
      '<div class="ap-metrics">' +
      '<div class="ap-metric"><b style="color:#4a9eff">' + m.n + '</b><span>累计回流 case</span><small>AI建议vs实际决策样本</small></div>' +
      '<div class="ap-metric"><b style="color:#5be0a0">' + m.adopt + '%</b><span>采纳率</span><small>人工采纳AI建议占比</small></div>' +
      '<div class="ap-metric"><b style="color:#8b5cf6">' + m.acc + '%</b><span>准确率</span><small>AI建议=人工决策占比</small></div>' +
      '<div class="ap-metric"><b style="color:#ffd479">' + m.high + '%</b><span>高置信占比</span><small>高置信建议占比</small></div>' +
      '</div></div>';
  }

  function monthTrend() {
    var cases = [];
    try { cases = JSON.parse(localStorage.getItem('ai_pilot_cases_v1') || '[]'); } catch (e) {}
    var now = new Date();
    var months = [];
    for (var i = 2; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.getFullYear() + '-' + (d.getMonth() + 1), label: (d.getMonth() + 1) + '月', cnt: 0 });
    }
    var max = 1;
    months.forEach(function (mo) {
      mo.cnt = cases.filter(function (c) {
        var dt = null;
        if (c.ts != null) { try { dt = new Date(String(c.ts).replace(' ', 'T')); } catch (e) {} if (!dt || isNaN(dt.getTime())) { dt = new Date(Number(c.ts)); } if (isNaN(dt.getTime())) dt = null; }
        return dt && (dt.getFullYear() + '-' + (dt.getMonth() + 1)) === mo.key;
      }).length;
      if (mo.cnt > max) max = mo.cnt;
    });
    var bars = months.map(function (mo) {
      var h = Math.round(mo.cnt / max * 80);
      if (mo.cnt > 0 && h < 4) h = 4;
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">' +
        '<div style="font-size:11px;color:#5be0a0;font-weight:700">' + mo.cnt + '</div>' +
        '<div style="width:60%;height:' + h + 'px;background:linear-gradient(180deg,#4a9eff,#8b5cf6);border-radius:6px 6px 0 0;min-height:2px"></div>' +
        '<div style="font-size:11px;color:var(--ap-muted)">' + mo.label + '</div>' +
      '</div>';
    }).join('');
    return '<div class="ap-section" style="margin-top:18px">' +
      '<h2 style="font-size:15px;color:#fff;margin:0 0 12px">📈 近 3 月回流趋势 <small style="font-size:11px;color:var(--ap-muted);font-weight:400">case 按月分布（驱动技能版本进化）</small></h2>' +
      '<div style="display:flex;align-items:flex-end;gap:10px;height:110px;padding:0 4px">' + bars + '</div>' +
      '</div>';
  }

  function logHtml() {
    if (!CASES.length) return '<div style="color:var(--ap-muted);font-size:12px">暂无回流 case（运行并标注人工决策后留存）</div>';
    return '<ul>' + CASES.slice(0, 30).map(function (c) {
      return '<li><b>[' + c.ts + '] ' + U.escapeHtml(c.kind === 'resume' ? '简历初筛' : '绩效初评') + '</b> ｜ AI：' + U.escapeHtml(c.aiVerdict) +
        '（' + c.aiConfidence + '） → 人工：' + U.escapeHtml(c.humanDecision) +
        (c.consistent ? ' ✓一致' : ' ⚠修正') +
        '<br><span style="opacity:.8">操作人：' + U.escapeHtml(c.operator) + '</span></li>';
    }).join('') + '</ul>';
  }

  function render() {
    injectCss();
    var view = U.el('view');
    if (!view) return;
    global.App.setBreadcrumb(['数字员工·AI 试点台']);

    var resumeRule = sopSummary('SOP-RECRUIT-SCREEN');
    var perfRule = sopSummary('SOP-PERF-EVAL');

    var resumePanel =
      '<div class="ap-box">' +
        '<h3>① 简历初筛助手 <span style="font-size:11px;color:var(--ap-muted)">v1·数字员工</span></h3>' +
        '<div class="ap-rule">规则源：《招聘初筛 SOP》' + (resumeRule ? ' — ' + U.escapeHtml(resumeRule.slice(0, 90)) + '…' : '') + '</div>' +
        '<div class="ap-field"><label>相关经验年限</label><select id="r-years"><option value="0">＜1 年</option><option value="2">1–3 年</option><option value="4">≥3 年</option></select></div>' +
        '<div class="ap-field"><label>岗位强相关</label><select id="r-rel"><option value="是">是</option><option value="否">否</option></select></div>' +
        '<div class="ap-field"><label>来源渠道</label><select id="r-ch"><option value="平台">招聘平台</option><option value="猎头">猎头</option><option value="内推">内推</option></select></div>' +
        '<div class="ap-field"><label>风险红线（虚假/竞业等）</label><select id="r-risk"><option value="无">无</option><option value="待核">待核</option><option value="有">有</option></select></div>' +
        '<button class="ap-run" id="r-run">运行初筛</button> <button class="ap-run ghost" id="r-sample">示例</button>' +
        '<div class="ap-out" id="r-out"></div>' +
      '</div>';

    var perfPanel =
      '<div class="ap-box">' +
        '<h3>② 绩效初评助手 <span style="font-size:11px;color:var(--ap-muted)">v1·数字员工</span></h3>' +
        '<div class="ap-rule">规则源：《绩效评估 SOP》' + (perfRule ? ' — ' + U.escapeHtml(perfRule.slice(0, 90)) + '…' : '') + '</div>' +
        '<div class="ap-field"><label>月度 OGSM 完成率(%)</label><input id="p-ogsm" type="number" value="88" min="0" max="150" /></div>' +
        '<div class="ap-field"><label>关键结果达成</label><select id="p-kr"><option value="优">优</option><option value="良">良</option><option value="中">中</option><option value="差">差</option></select></div>' +
        '<div class="ap-field"><label>风险/违纪事项</label><select id="p-risk"><option value="无">无</option><option value="待核">待核</option><option value="有">有</option></select></div>' +
        '<button class="ap-run" id="p-run">运行初评</button> <button class="ap-run ghost" id="p-sample">示例</button>' +
        '<div class="ap-out" id="p-out"></div>' +
      '</div>';

    view.innerHTML =
      '<div class="ap ap-page">' +
        '<div class="ap-head"><h1>数字员工 · AI 试点台</h1>' +
          '<div class="sub">阶段三·数字员工 v1 ｜ 2 个可调用技能组件（简历初筛 / 绩效初评）｜ 置信度 + 人工兜底 + case 回流</div></div>' +
        '<div class="ap-warn">⚠️ 技能边界：本台为可解释规则引擎（非黑箱），所有输出仅供人工参考，<b>不直接做涉薪、涉裁决策</b>；每次标注人工决策均回流为 case，驱动技能版本进化。</div>' +
        monthBadge() +
        '<div class="ap-cols">' + resumePanel + perfPanel + '</div>' +
        metricsHtml() + monthTrend() +
        '<div class="ap-log"><h3>审计留痕 / case 回流（最近 30 条）</h3>' + logHtml() + '</div>' +
        '<div style="margin-top:10px"><span class="ap-link" id="ap-clear">清空本机回流记录</span></div>' +
      '</div>';

    bind();
  }

  function monthBadge() {
    var cases = [];
    try { cases = JSON.parse(localStorage.getItem('ai_pilot_cases_v1') || '[]'); } catch (e) {}
    var now = new Date();
    var ym = now.getFullYear() + '-' + (now.getMonth() + 1);
    var cur = cases.filter(function (c) {
      var d = null;
      if (c.ts != null) {
        try { d = new Date(String(c.ts).replace(' ', 'T')); } catch (e) {}
        if (!d || isNaN(d.getTime())) { d = new Date(Number(c.ts)); }
        if (isNaN(d.getTime())) d = null;
      }
      return d && (d.getFullYear() + '-' + (d.getMonth() + 1)) === ym;
    });
    var adopt = cur.filter(function (c) { return c.humanDecision === '采纳AI建议'; }).length;
    var rate = cur.length ? Math.round(adopt / cur.length * 100) : 0;
    if (!cur.length) {
      return '<div style="margin:10px 0;padding:8px 12px;border-radius:10px;background:rgba(74,158,255,.12);border:1px solid rgba(74,158,255,.3);font-size:12px;color:var(--ap-muted)">📅 本月数字员工暂无回流 case ｜ 运行 AI 助手并标注人工决策即可积累，纳入 <a href="#/review" style="color:#4a9eff">年度审计</a> 跟踪</div>';
    }
    return '<div style="margin:10px 0;padding:8px 12px;border-radius:10px;background:rgba(74,158,255,.12);border:1px solid rgba(74,158,255,.3);font-size:12px;color:var(--ap-muted)">📅 本月数字员工回流 <b style="color:#fff">' + cur.length + '</b> 条 ｜ 采纳率 <b style="color:#5be0a0">' + rate + '%</b> ｜ 纳入 <a href="#/review" style="color:#4a9eff">年度审计</a> 跟踪</div>';
  }

  function bind() {
    var rr = U.el('r-run'), rs = U.el('r-sample');
    var pr = U.el('p-run'), ps = U.el('p-sample');
    var clr = U.el('ap-clear');
    if (rr) rr.onclick = function () { runAndDecide('resume'); };
    if (rs) rs.onclick = function () {
      U.el('r-years').value = '4'; U.el('r-rel').value = '是'; U.el('r-ch').value = '内推'; U.el('r-risk').value = '无';
      runAndDecide('resume');
    };
    if (pr) pr.onclick = function () { runAndDecide('perf'); };
    if (ps) ps.onclick = function () {
      U.el('p-ogsm').value = '92'; U.el('p-kr').value = '优'; U.el('p-risk').value = '无';
      runAndDecide('perf');
    };
    if (clr) clr.onclick = function () {
      CASES = []; saveCases(); U.toast('已清空本机回流记录', 'info'); render();
    };
  }

  // 运行 + 在本页结果区渲染「人工决策标注」条
  function runAndDecide(kind) {
    var inp = kind === 'resume'
      ? { years: parseInt(U.el('r-years').value, 10) || 0, rel: U.el('r-rel').value, channel: U.el('r-ch').value, risk: U.el('r-risk').value }
      : { ogsm: parseInt(U.el('p-ogsm').value, 10) || 0, kr: U.el('p-kr').value, risk: U.el('p-risk').value };
    var r = run(kind, inp);
    var box = U.el(kind === 'resume' ? 'r-out' : 'p-out');
    if (!box) return;
    box.innerHTML = verdictHtml(r) + decisionBar(kind, inp, r);
    bindDecision(box, kind, inp, r);
  }

  function decisionBar(kind, inp, ai) {
    var opts = kind === 'resume'
      ? ['采纳AI建议', '高匹配', '可培养', '不匹配']
      : ['采纳AI建议', '金', '银', '铜', '待改进'];
    var sel = opts.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('');
    return '<div class="ap-decision"><div class="dh">🧑‍⚖️ 人工最终决策（标注后回流为 case，驱动进化）</div>' +
      '<div class="row"><select id="d-dec">' + sel + '</select>' +
      '<input id="d-note" placeholder="决策备注（可选）" style="flex:1;min-width:140px" /></div>' +
      '<div class="row"><button class="ap-run" id="d-ok">确认并回流</button>' +
      '<span style="font-size:11px;color:var(--ap-muted)">操作人：' + U.escapeHtml(operator()) + '</span></div></div>';
  }

  function bindDecision(box, kind, inp, ai) {
    var ok = box.querySelector('#d-ok');
    if (ok) ok.onclick = function () {
      var dec = box.querySelector('#d-dec').value;
      var note = box.querySelector('#d-note').value;
      var m = recordDecision(kind, inp, ai, dec, note);
      U.toast('已回流：AI「' + ai.verdict + '」→ 人工「' + dec + '」', 'success');
      // 刷新指标 + 日志（不重置表单）
      var metricsBox = U.el('view').querySelector('.ap-section');
      if (metricsBox) metricsBox.outerHTML = metricsHtml();
      var logBox = U.el('view').querySelector('.ap-log');
      if (logBox) logBox.innerHTML = '<h3>审计留痕 / case 回流（最近 30 条）</h3>' + logHtml();
    };
  }

  /* ============ 全局 API：供主流程嵌合调用 ============ */

  // 动态加载 knowledge.js + 自身（若未就绪），返回 Promise
  function ensureLoaded() {
    return new Promise(function (resolve) {
      if (global.AiPilot && global.AiPilot.run && (global.KB_ARTICLES || global.AiPilot._kbOk)) {
        if (global.KB_ARTICLES) return resolve();
      }
      var files = [];
      if (!global.KB_ARTICLES) files.push('js/knowledge.js');
      files.push('js/ai_pilot.js');
      var i = 0;
      (function next() {
        if (i >= files.length) return resolve();
        var f = files[i++];
        var s = document.createElement('script');
        s.src = f;
        s.onload = next;
        s.onerror = next;
        document.head.appendChild(s);
      })();
    });
  }

  // 主流程嵌合：弹层运行 + 人工决策回流
  function quickAssess(kind, ctxTitle) {
    var kindName = kind === 'resume' ? '简历初筛助手' : '绩效初评助手';
    var fields = kind === 'resume'
      ? '<div class="ap-field"><label>相关经验年限</label><select id="q-years"><option value="0">＜1 年</option><option value="2">1–3 年</option><option value="4">≥3 年</option></select></div>' +
        '<div class="ap-field"><label>岗位强相关</label><select id="q-rel"><option value="是">是</option><option value="否">否</option></select></div>' +
        '<div class="ap-field"><label>来源渠道</label><select id="q-ch"><option value="平台">招聘平台</option><option value="猎头">猎头</option><option value="内推">内推</option></select></div>' +
        '<div class="ap-field"><label>风险红线</label><select id="q-risk"><option value="无">无</option><option value="待核">待核</option><option value="有">有</option></select></div>'
      : '<div class="ap-field"><label>月度 OGSM 完成率(%)</label><input id="q-ogsm" type="number" value="88" min="0" max="150" /></div>' +
        '<div class="ap-field"><label>关键结果达成</label><select id="q-kr"><option value="优">优</option><option value="良">良</option><option value="中">中</option><option value="差">差</option></select></div>' +
        '<div class="ap-field"><label>风险/违纪事项</label><select id="q-risk"><option value="无">无</option><option value="待核">待核</option><option value="有">有</option></select></div>';

    var mask = document.createElement('div');
    mask.className = 'ap-mask open';
    mask.innerHTML = '<div class="ap-modal">' +
      '<button class="ap-close" id="q-close">×</button>' +
      '<h3>🤖 ' + kindName + '</h3>' +
      '<div class="ctx">' + (ctxTitle ? U.escapeHtml(ctxTitle) + ' ｜ ' : '') + '数字员工 v1 ｜ 输出建议 + 置信度，人工确认后回流 case</div>' +
      fields +
      '<button class="ap-run" id="q-run" style="margin-top:10px">运行并查看建议</button>' +
      '<div class="ap-out" id="q-out"></div>' +
      '</div>';
    document.body.appendChild(mask);

    function close() { mask.remove(); }
    mask.querySelector('#q-close').onclick = close;
    mask.onclick = function (e) { if (e.target === mask) close(); };

    mask.querySelector('#q-run').onclick = function () {
      var inp = kind === 'resume'
        ? { years: parseInt(mask.querySelector('#q-years').value, 10) || 0, rel: mask.querySelector('#q-rel').value, channel: mask.querySelector('#q-ch').value, risk: mask.querySelector('#q-risk').value }
        : { ogsm: parseInt(mask.querySelector('#q-ogsm').value, 10) || 0, kr: mask.querySelector('#q-kr').value, risk: mask.querySelector('#q-risk').value };
      var r = run(kind, inp);
      var out = mask.querySelector('#q-out');
      out.innerHTML = verdictHtml(r) + decisionBar(kind, inp, r);
      var ok = out.querySelector('#d-ok');
      if (ok) ok.onclick = function () {
        var dec = out.querySelector('#d-dec').value;
        var note = out.querySelector('#d-note').value;
        recordDecision(kind, inp, r, dec, note);
        U.toast('已回流：AI「' + r.verdict + '」→ 人工「' + dec + '」', 'success');
        close();
      };
    };
  }

  global.AiPilot = {
    render: render,
    run: run,
    recordDecision: recordDecision,
    ensureLoaded: ensureLoaded,
    quickAssess: quickAssess,
    metrics: metrics
  };
})(window);

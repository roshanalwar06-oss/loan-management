/* ==========================================================================
   LENDFLOW — reports.js
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  renderStats();
  renderRevenueChart();
  renderDisbursementChart();
  renderRepaymentPerformance();
  renderLoanTypeDistribution();
  renderBorrowerGrowth();
  bindEvents();
});

function bindEvents() {
  document.querySelectorAll('[data-range]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-range]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      LF.toast('Showing report for ' + pill.textContent.trim() + '.', 'info');
    });
  });

  const exportBtn = document.getElementById('exportReportBtn');
  exportBtn && exportBtn.addEventListener('click', () => {
    exportBtn.disabled = true;
    const original = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Generating...';
    setTimeout(() => {
      exportBtn.disabled = false;
      exportBtn.innerHTML = original;
      LF.toast('Report generated successfully.', 'success');
    }, 900);
  });
}

function renderStats() {
  const loans = LF.get(LF.KEYS.loans, []);
  const repayments = LF.get(LF.KEYS.repayments, []);

  const totalPortfolio = loans.reduce((s, l) => s + Number(l.principal || 0), 0);
  const totalCollected = repayments.filter(r => r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
  const outstanding = loans.reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const overdueLoans = loans.filter(l => l.status === 'Overdue').length;
  const defaultRate = loans.length ? ((overdueLoans / loans.length) * 100).toFixed(1) : '0.0';

  setText('statTotalPortfolio', LF.formatINR(totalPortfolio));
  setText('statTotalCollected', LF.formatINR(totalCollected));
  setText('statOutstandingReport', LF.formatINR(outstanding));
  setText('statDefaultRate', defaultRate + '%');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderRevenueChart() {
  const el = document.getElementById('revenueChart');
  if (!el) return;
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const values = [5.2, 6.1, 6.8, 7.4, 8.1, 8.72];
  renderBarChart(el, months, values, 'L');
}

function renderDisbursementChart() {
  const el = document.getElementById('disbursementChart');
  if (!el) return;
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const values = [18, 22, 15, 28, 24, 30];
  renderBarChart(el, months, values, 'L');
}

function renderBarChart(el, labels, values, suffix) {
  const max = Math.max(...values);
  el.innerHTML = labels.map((m, i) => {
    const pct = Math.round((values[i] / max) * 100);
    return (
      '<div class="bar-col">' +
        '<div class="bar" style="height:' + pct + '%" title="' + values[i] + suffix + '"></div>' +
        '<div class="bar-label">' + m + '</div>' +
      '</div>'
    );
  }).join('');
}

function renderRepaymentPerformance() {
  const el = document.getElementById('repaymentPerformance');
  if (!el) return;
  const repayments = LF.get(LF.KEYS.repayments, []);
  const total = repayments.length || 1;
  const paid = repayments.filter(r => r.status === 'Paid').length;
  const pending = repayments.filter(r => r.status === 'Pending').length;
  const overdue = repayments.filter(r => r.status === 'Overdue').length;
  const partial = repayments.filter(r => r.status === 'Partial').length;

  const rows = [
    { label: 'Paid on time', value: paid, color: 'var(--success)' },
    { label: 'Pending', value: pending, color: 'var(--warning)' },
    { label: 'Overdue', value: overdue, color: 'var(--danger)' },
    { label: 'Partial', value: partial, color: 'var(--info)' }
  ];

  el.innerHTML = rows.map(r => {
    const pct = Math.round((r.value / total) * 100);
    return (
      '<div class="hbar-row">' +
        '<div class="hbar-top"><span class="hbar-name">' + r.label + '</span><span class="hbar-val">' + pct + '%</span></div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct + '%;background:' + r.color + '"></div></div>' +
      '</div>'
    );
  }).join('');
}

function renderLoanTypeDistribution() {
  const el = document.getElementById('loanTypeDistribution');
  if (!el) return;
  const loans = LF.get(LF.KEYS.loans, []);
  const types = ['Personal Loan', 'Business Loan', 'Vehicle Loan', 'Education Loan', 'Home Loan'];
  const colors = ['#10B981', '#34D399', '#3B82F6', '#F59E0B', '#0F172A'];
  const counts = types.map(t => loans.filter(l => l.loanType === t).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  let gradient = [];
  let cursor = 0;
  types.forEach((t, i) => {
    const slice = (counts[i] / total) * 360;
    gradient.push(colors[i] + ' ' + cursor + 'deg ' + (cursor + slice) + 'deg');
    cursor += slice;
  });

  el.innerHTML =
    '<div class="progress-ring-wrap">' +
      '<div style="width:130px;height:130px;border-radius:50%;background:conic-gradient(' + gradient.join(',') + ');flex-shrink:0;"></div>' +
      '<div class="legend" style="flex-direction:column;align-items:flex-start;margin-top:0;">' +
        types.map((t, i) => (
          '<div class="legend-item"><span class="legend-dot" style="background:' + colors[i] + '"></span>' + t + ' (' + counts[i] + ')</div>'
        )).join('') +
      '</div>' +
    '</div>';
}

function renderBorrowerGrowth() {
  const el = document.getElementById('borrowerGrowthChart');
  if (!el) return;
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const values = [78, 86, 94, 103, 114, 126];
  renderBarChart(el, months, values, '');
}

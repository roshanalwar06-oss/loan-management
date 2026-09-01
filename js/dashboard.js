/* ==========================================================================
   LENDFLOW — dashboard.js
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  renderPortfolioChart();
  renderRecentApplications();
  renderUpcomingRepayments();
  renderLoanDistribution();
  greetByTime();
});

function greetByTime() {
  const el = document.getElementById('greeting');
  if (!el) return;
  const hour = new Date().getHours();
  let greet = 'Good morning';
  if (hour >= 12 && hour < 17) greet = 'Good afternoon';
  else if (hour >= 17) greet = 'Good evening';
  el.textContent = greet + ', Admin 👋';
}

function renderPortfolioChart() {
  const el = document.getElementById('portfolioChart');
  if (!el) return;

  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const values = [28.4, 32.1, 35.8, 40.2, 44.5, 48.6];
  const max = Math.max(...values);

  el.innerHTML = months.map((m, i) => {
    const heightPct = Math.round((values[i] / max) * 100);
    return (
      '<div class="bar-col">' +
        '<div class="bar" style="height:' + heightPct + '%" title="₹' + values[i] + 'L"></div>' +
        '<div class="bar-label">' + m + '</div>' +
      '</div>'
    );
  }).join('');
}

function renderRecentApplications() {
  const tbody = document.getElementById('recentApplicationsBody');
  if (!tbody) return;

  const applications = LF.get(LF.KEYS.applications, []);
  const recent = applications.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="bi bi-inbox"></i><p>No applications yet.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(a => (
    '<tr>' +
      '<td class="cell-primary">' + a.applicant + '</td>' +
      '<td>' + a.loanType + '</td>' +
      '<td>' + LF.formatINR(a.amount) + '</td>' +
      '<td class="cell-secondary">' + LF.formatDate(a.appliedDate) + '</td>' +
      '<td>' + LF.statusBadge(a.status) + '</td>' +
    '</tr>'
  )).join('');
}

function renderUpcomingRepayments() {
  const tbody = document.getElementById('upcomingRepaymentsBody');
  if (!tbody) return;

  const repayments = LF.get(LF.KEYS.repayments, []);
  const upcoming = repayments.filter(r => r.status === 'Pending' || r.status === 'Overdue').slice(0, 5);

  if (upcoming.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="bi bi-calendar-check"></i><p>No upcoming repayments.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = upcoming.map(r => (
    '<tr>' +
      '<td class="cell-primary">' + r.borrower + '</td>' +
      '<td class="cell-secondary">' + r.loanId + '</td>' +
      '<td class="cell-secondary">' + LF.formatDate(r.dueDate) + '</td>' +
      '<td>' + LF.formatINR(r.amount) + '</td>' +
      '<td>' + LF.statusBadge(r.status) + '</td>' +
    '</tr>'
  )).join('');
}

function renderLoanDistribution() {
  const el = document.getElementById('loanDistribution');
  if (!el) return;

  const loans = LF.get(LF.KEYS.loans, []);
  const categories = ['Personal', 'Business', 'Vehicle', 'Education', 'Home'];
  const typeMap = { Personal: 'Personal Loan', Business: 'Business Loan', Vehicle: 'Vehicle Loan', Education: 'Education Loan', Home: 'Home Loan' };

  const totals = categories.map(c => {
    return loans.filter(l => l.loanType === typeMap[c]).reduce((sum, l) => sum + Number(l.principal || 0), 0);
  });
  const max = Math.max(...totals, 1);

  el.innerHTML = categories.map((c, i) => {
    const pct = Math.round((totals[i] / max) * 100);
    return (
      '<div class="hbar-row">' +
        '<div class="hbar-top"><span class="hbar-name">' + c + '</span><span class="hbar-val">' + LF.formatINR(totals[i]) + '</span></div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>'
    );
  }).join('');
}

/* ==========================================================================
   LENDFLOW — loans.js
   ========================================================================== */

let loanFilter = 'All';
let loanQuery = '';

document.addEventListener('DOMContentLoaded', function () {
  populateBorrowerSelect();
  renderStats();
  renderTable();
  bindEvents();
  bindEmiCalculator();
});

function populateBorrowerSelect() {
  const select = document.getElementById('loanBorrowerSelect');
  if (!select) return;
  const borrowers = LF.get(LF.KEYS.borrowers, []);
  select.innerHTML = '<option value="">Select borrower</option>' +
    borrowers.map(b => '<option value="' + b.name + '">' + b.name + '</option>').join('');
}

function bindEvents() {
  const searchInput = document.getElementById('loanSearch');
  searchInput && searchInput.addEventListener('input', (e) => {
    loanQuery = e.target.value;
    renderTable();
  });

  document.querySelectorAll('[data-loan-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-loan-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      loanFilter = pill.dataset.loanFilter;
      renderTable();
    });
  });

  const addBtn = document.getElementById('addLoanBtn');
  addBtn && addBtn.addEventListener('click', () => {
    const form = document.getElementById('loanForm');
    form.reset();
    LF.clearFormErrors(form);
    form.startDate.value = LF.todayISO();
    updateEmiPreview();
    LF.openModal('loanModal');
  });

  const form = document.getElementById('loanForm');
  form && form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!LF.validateForm(form)) {
      LF.toast('Please fill in all required fields correctly.', 'danger');
      return;
    }
    saveLoan(form);
  });
}

function bindEmiCalculator() {
  ['loanPrincipal', 'loanRate', 'loanTenure'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', updateEmiPreview);
  });
}

function updateEmiPreview() {
  const principal = document.getElementById('loanPrincipal').value;
  const rate = document.getElementById('loanRate').value;
  const tenure = document.getElementById('loanTenure').value;
  const result = LF.calcEMI(principal, rate, tenure);

  setText('emiPreview', LF.formatINR(result.emi));
  setText('emiInterest', LF.formatINR(result.totalInterest));
  setText('emiTotal', LF.formatINR(result.totalPayable));
}

function saveLoan(form) {
  const loans = LF.get(LF.KEYS.loans, []);
  const principal = Number(form.principal.value) || 0;
  const rate = Number(form.rate.value) || 0;
  const tenure = Number(form.tenure.value) || 0;
  const result = LF.calcEMI(principal, rate, tenure);

  const record = {
    id: LF.uid('LN'),
    borrower: form.borrower.value,
    loanType: form.loanType.value,
    principal: principal,
    rate: rate,
    tenure: tenure,
    startDate: form.startDate.value,
    frequency: form.frequency.value,
    emi: result.emi,
    outstanding: principal,
    nextDue: form.startDate.value,
    status: 'Active'
  };

  loans.unshift(record);
  LF.set(LF.KEYS.loans, loans);
  LF.toast('Loan created and disbursed successfully.', 'success');
  LF.closeModal('loanModal');
  renderStats();
  renderTable();
}

function setLoanStatus(id, status) {
  const loans = LF.get(LF.KEYS.loans, []);
  const idx = loans.findIndex(l => l.id === id);
  if (idx === -1) return;
  loans[idx].status = status;
  LF.set(LF.KEYS.loans, loans);
  LF.toast('Loan status updated to ' + status + '.', 'success');
  renderStats();
  renderTable();
}

function deleteLoan(id) {
  if (!confirm('Delete this loan record?')) return;
  let loans = LF.get(LF.KEYS.loans, []);
  loans = loans.filter(l => l.id !== id);
  LF.set(LF.KEYS.loans, loans);
  LF.toast('Loan record deleted.', 'info');
  renderStats();
  renderTable();
}

function renderStats() {
  const loans = LF.get(LF.KEYS.loans, []);
  const active = loans.filter(l => l.status === 'Active');
  const totalDisbursed = loans.reduce((s, l) => s + Number(l.principal || 0), 0);
  const outstanding = loans.reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const overdue = loans.filter(l => l.status === 'Overdue').length;

  setText('statActiveLoans', active.length);
  setText('statTotalDisbursed', LF.formatINR(totalDisbursed));
  setText('statOutstanding', LF.formatINR(outstanding));
  setText('statOverdueLoans', overdue);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getFiltered() {
  const loans = LF.get(LF.KEYS.loans, []);
  return loans.filter(l => {
    const matchesFilter = loanFilter === 'All' || l.status === loanFilter;
    const matchesSearch = LF.matchesQuery(l, ['borrower', 'id', 'loanType'], loanQuery);
    return matchesFilter && matchesSearch;
  });
}

function renderTable() {
  const tbody = document.getElementById('loansBody');
  if (!tbody) return;

  const items = getFiltered();

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="bi bi-cash-coin"></i><p>No loans match your search.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(l => (
    '<tr>' +
      '<td class="cell-primary">' + l.id + '</td>' +
      '<td>' + l.borrower + '</td>' +
      '<td>' + l.loanType + '</td>' +
      '<td>' + LF.formatINR(l.principal) + '</td>' +
      '<td>' + l.rate + '%</td>' +
      '<td>' + l.tenure + ' Months</td>' +
      '<td>' + LF.formatINR(l.emi) + '</td>' +
      '<td>' + LF.formatINR(l.outstanding) + '</td>' +
      '<td class="cell-secondary">' + (l.nextDue === '—' ? '—' : LF.formatDate(l.nextDue)) + '</td>' +
      '<td>' + LF.statusBadge(l.status) + '</td>' +
      '<td><div class="row-actions">' +
        (l.status === 'Active' ? '<button class="icon-action" title="Mark Completed" onclick="setLoanStatus(\'' + l.id + '\',\'Completed\')"><i class="bi bi-check-lg"></i></button>' : '') +
        '<button class="icon-action danger" title="Delete" onclick="deleteLoan(\'' + l.id + '\')"><i class="bi bi-trash3"></i></button>' +
      '</div></td>' +
    '</tr>'
  )).join('');
}

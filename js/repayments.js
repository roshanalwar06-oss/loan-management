/* ==========================================================================
   LENDFLOW — repayments.js
   ========================================================================== */

let pmtFilter = 'All';
let pmtQuery = '';

document.addEventListener('DOMContentLoaded', function () {
  populateLoanSelect();
  renderStats();
  renderTable();
  bindEvents();
});

function populateLoanSelect() {
  const select = document.getElementById('pmtLoanSelect');
  if (!select) return;
  const loans = LF.get(LF.KEYS.loans, []);
  select.innerHTML = '<option value="">Select loan</option>' +
    loans.map(l => '<option value="' + l.id + '" data-borrower="' + l.borrower + '">' + l.id + ' — ' + l.borrower + '</option>').join('');

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    const borrowerField = document.getElementById('pmtBorrowerField');
    if (borrowerField) borrowerField.value = opt ? (opt.dataset.borrower || '') : '';
  });
}

function bindEvents() {
  const searchInput = document.getElementById('pmtSearch');
  searchInput && searchInput.addEventListener('input', (e) => {
    pmtQuery = e.target.value;
    renderTable();
  });

  document.querySelectorAll('[data-pmt-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-pmt-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      pmtFilter = pill.dataset.pmtFilter;
      renderTable();
    });
  });

  const addBtn = document.getElementById('addPaymentBtn');
  addBtn && addBtn.addEventListener('click', () => {
    const form = document.getElementById('paymentForm');
    form.reset();
    LF.clearFormErrors(form);
    form.paymentDate.value = LF.todayISO();
    LF.openModal('paymentModal');
  });

  const form = document.getElementById('paymentForm');
  form && form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!LF.validateForm(form)) {
      LF.toast('Please fill in all required fields correctly.', 'danger');
      return;
    }
    savePayment(form);
  });
}

function savePayment(form) {
  const repayments = LF.get(LF.KEYS.repayments, []);
  const loanSelect = document.getElementById('pmtLoanSelect');
  const opt = loanSelect.options[loanSelect.selectedIndex];
  const borrower = opt ? (opt.dataset.borrower || '') : '';
  const amount = Number(form.amount.value) || 0;

  const record = {
    id: LF.uid('PMT'),
    loanId: form.loanId.value,
    borrower: borrower,
    dueDate: form.paymentDate.value,
    amount: amount,
    method: form.method.value,
    paymentDate: form.paymentDate.value,
    status: 'Paid'
  };

  repayments.unshift(record);
  LF.set(LF.KEYS.repayments, repayments);

  // Reflect in transactions
  const transactions = LF.get(LF.KEYS.transactions, []);
  transactions.unshift({
    id: LF.uid('TXN'),
    date: form.paymentDate.value,
    description: 'EMI repayment',
    borrower: borrower,
    type: 'Repayment',
    method: form.method.value,
    amount: amount,
    status: 'Completed'
  });
  LF.set(LF.KEYS.transactions, transactions);

  // Update loan outstanding
  const loans = LF.get(LF.KEYS.loans, []);
  const loanIdx = loans.findIndex(l => l.id === form.loanId.value);
  if (loanIdx > -1) {
    loans[loanIdx].outstanding = Math.max(0, Number(loans[loanIdx].outstanding || 0) - amount);
    LF.set(LF.KEYS.loans, loans);
  }

  LF.toast('Payment recorded successfully.', 'success');
  LF.closeModal('paymentModal');
  renderStats();
  renderTable();
}

function markPaid(id) {
  const repayments = LF.get(LF.KEYS.repayments, []);
  const idx = repayments.findIndex(r => r.id === id);
  if (idx === -1) return;
  repayments[idx].status = 'Paid';
  repayments[idx].paymentDate = LF.todayISO();
  if (repayments[idx].method === '—') repayments[idx].method = 'Cash';
  LF.set(LF.KEYS.repayments, repayments);
  LF.toast('Payment marked as paid.', 'success');
  renderStats();
  renderTable();
}

function renderStats() {
  const repayments = LF.get(LF.KEYS.repayments, []);
  const today = LF.todayISO();
  const todayCollections = repayments.filter(r => r.status === 'Paid' && r.paymentDate === today)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const thisMonthPrefix = today.slice(0, 7);
  const monthCollections = repayments.filter(r => r.status === 'Paid' && String(r.paymentDate).slice(0, 7) === thisMonthPrefix)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = repayments.filter(r => r.status === 'Pending').length;
  const overdue = repayments.filter(r => r.status === 'Overdue').length;

  setText('statTodayCollections', LF.formatINR(todayCollections));
  setText('statMonthCollections', LF.formatINR(monthCollections));
  setText('statPendingPayments', pending);
  setText('statOverduePayments', overdue);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getFiltered() {
  const repayments = LF.get(LF.KEYS.repayments, []);
  return repayments.filter(r => {
    const matchesFilter = pmtFilter === 'All' || r.status === pmtFilter;
    const matchesSearch = LF.matchesQuery(r, ['borrower', 'loanId', 'id'], pmtQuery);
    return matchesFilter && matchesSearch;
  });
}

function renderTable() {
  const tbody = document.getElementById('repaymentsBody');
  if (!tbody) return;

  const items = getFiltered();

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="bi bi-receipt"></i><p>No repayments match your search.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(r => (
    '<tr>' +
      '<td class="cell-primary">' + r.id + '</td>' +
      '<td>' + r.loanId + '</td>' +
      '<td>' + r.borrower + '</td>' +
      '<td class="cell-secondary">' + LF.formatDate(r.dueDate) + '</td>' +
      '<td>' + LF.formatINR(r.amount) + '</td>' +
      '<td>' + r.method + '</td>' +
      '<td class="cell-secondary">' + (r.paymentDate === '—' ? '—' : LF.formatDate(r.paymentDate)) + '</td>' +
      '<td>' + LF.statusBadge(r.status) + '</td>' +
      '<td>' + (r.status !== 'Paid' ? '<button class="icon-action" title="Mark Paid" onclick="markPaid(\'' + r.id + '\')"><i class="bi bi-check-lg"></i></button>' : '<span class="cell-secondary">—</span>') + '</td>' +
    '</tr>'
  )).join('');
}

/* ==========================================================================
   LENDFLOW — transactions.js
   ========================================================================== */

let txnFilter = 'All';
let txnQuery = '';

document.addEventListener('DOMContentLoaded', function () {
  renderStats();
  renderTable();
  bindEvents();
});

function bindEvents() {
  const searchInput = document.getElementById('txnSearch');
  searchInput && searchInput.addEventListener('input', (e) => {
    txnQuery = e.target.value;
    renderTable();
  });

  document.querySelectorAll('[data-txn-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-txn-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      txnFilter = pill.dataset.txnFilter;
      renderTable();
    });
  });
}

function renderStats() {
  const transactions = LF.get(LF.KEYS.transactions, []);
  const inflow = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outflow = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = inflow - outflow;
  const thisMonthPrefix = LF.todayISO().slice(0, 7);
  const monthTotal = transactions.filter(t => String(t.date).slice(0, 7) === thisMonthPrefix).length;

  setText('statInflow', LF.formatINR(inflow));
  setText('statOutflow', LF.formatINR(outflow));
  setText('statNetFlow', (net >= 0 ? '' : '-') + LF.formatINR(Math.abs(net)));
  setText('statThisMonth', monthTotal);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getFiltered() {
  const transactions = LF.get(LF.KEYS.transactions, []);
  return transactions.filter(t => {
    const matchesFilter = txnFilter === 'All' || t.type === txnFilter;
    const matchesSearch = LF.matchesQuery(t, ['description', 'borrower', 'id', 'type'], txnQuery);
    return matchesFilter && matchesSearch;
  });
}

function renderTable() {
  const tbody = document.getElementById('transactionsBody');
  if (!tbody) return;

  const items = getFiltered();

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-arrow-left-right"></i><p>No transactions match your search.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(t => {
    const isIncoming = t.amount >= 0;
    const amountClass = isIncoming ? 'text-success' : 'text-danger';
    const amountText = (isIncoming ? '+' : '−') + LF.formatINR(Math.abs(t.amount));
    return (
      '<tr>' +
        '<td class="cell-primary">' + t.id + '</td>' +
        '<td class="cell-secondary">' + LF.formatDate(t.date) + '</td>' +
        '<td>' + t.description + '</td>' +
        '<td>' + t.borrower + '</td>' +
        '<td>' + t.type + '</td>' +
        '<td>' + t.method + '</td>' +
        '<td class="fw-600 ' + amountClass + '">' + amountText + '</td>' +
        '<td>' + LF.statusBadge(t.status) + '</td>' +
      '</tr>'
    );
  }).join('');
}

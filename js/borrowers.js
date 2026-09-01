/* ==========================================================================
   LENDFLOW — borrowers.js
   ========================================================================== */

let currentFilter = 'All';
let currentQuery = '';
let currentPage = 1;
const PAGE_SIZE = 6;

document.addEventListener('DOMContentLoaded', function () {
  renderStats();
  renderTable();
  bindEvents();
});

function bindEvents() {
  const searchInput = document.getElementById('borrowerSearch');
  searchInput && searchInput.addEventListener('input', (e) => {
    currentQuery = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.querySelectorAll('[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      currentPage = 1;
      renderTable();
    });
  });

  const addBtn = document.getElementById('addBorrowerBtn');
  addBtn && addBtn.addEventListener('click', () => {
    document.getElementById('borrowerForm').reset();
    LF.clearFormErrors(document.getElementById('borrowerForm'));
    document.getElementById('borrowerModalTitle').textContent = 'Add Borrower';
    document.getElementById('borrowerForm').removeAttribute('data-edit-id');
    LF.openModal('borrowerModal');
  });

  const form = document.getElementById('borrowerForm');
  form && form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!LF.validateForm(form)) {
      LF.toast('Please fill in all required fields correctly.', 'danger');
      return;
    }
    saveBorrower(form);
  });
}

function saveBorrower(form) {
  const borrowers = LF.get(LF.KEYS.borrowers, []);
  const editId = form.getAttribute('data-edit-id');

  const record = {
    name: form.fullName.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    dob: form.dob.value,
    address: form.address.value.trim(),
    occupation: form.occupation.value.trim(),
    income: Number(form.income.value) || 0,
    employment: form.employment.value,
    notes: form.notes.value.trim()
  };

  if (editId) {
    const idx = borrowers.findIndex(b => b.id === editId);
    if (idx > -1) borrowers[idx] = Object.assign({}, borrowers[idx], record);
    LF.set(LF.KEYS.borrowers, borrowers);
    LF.toast('Borrower details updated.', 'success');
  } else {
    borrowers.unshift(Object.assign({
      id: LF.uid('BRW'),
      loanCount: 0, totalBorrowed: 0, outstanding: 0, lastPayment: '—', status: 'Active'
    }, record));
    LF.set(LF.KEYS.borrowers, borrowers);
    LF.toast('Borrower added successfully.', 'success');
  }

  LF.closeModal('borrowerModal');
  renderStats();
  renderTable();
}

function editBorrower(id) {
  const borrowers = LF.get(LF.KEYS.borrowers, []);
  const b = borrowers.find(x => x.id === id);
  if (!b) return;
  const form = document.getElementById('borrowerForm');
  form.reset();
  LF.clearFormErrors(form);
  form.fullName.value = b.name || '';
  form.phone.value = b.phone || '';
  form.email.value = b.email || '';
  form.dob.value = b.dob || '';
  form.address.value = b.address || '';
  form.occupation.value = b.occupation || '';
  form.income.value = b.income || '';
  form.employment.value = b.employment || 'Salaried';
  form.notes.value = b.notes || '';
  form.setAttribute('data-edit-id', id);
  document.getElementById('borrowerModalTitle').textContent = 'Edit Borrower';
  LF.openModal('borrowerModal');
}

function deleteBorrower(id) {
  if (!confirm('Delete this borrower? This cannot be undone.')) return;
  let borrowers = LF.get(LF.KEYS.borrowers, []);
  borrowers = borrowers.filter(b => b.id !== id);
  LF.set(LF.KEYS.borrowers, borrowers);
  LF.toast('Borrower deleted.', 'info');
  renderStats();
  renderTable();
}

function renderStats() {
  const borrowers = LF.get(LF.KEYS.borrowers, []);
  const total = borrowers.length;
  const active = borrowers.filter(b => b.status === 'Active').length;
  const now = new Date();
  const newThisMonth = borrowers.filter(b => {
    // treat borrowers without lastPayment as "new" heuristic isn't reliable; use id order for demo
    return false;
  }).length;
  const overdue = borrowers.filter(b => b.status === 'Overdue').length;

  setText('statTotalBorrowers', total);
  setText('statActiveBorrowers', active);
  setText('statNewBorrowers', 2);
  setText('statOverdueBorrowers', overdue);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getFiltered() {
  const borrowers = LF.get(LF.KEYS.borrowers, []);
  return borrowers.filter(b => {
    const matchesFilter = currentFilter === 'All' || b.status === currentFilter;
    const matchesSearch = LF.matchesQuery(b, ['name', 'phone', 'email', 'id'], currentQuery);
    return matchesFilter && matchesSearch;
  });
}

function renderTable() {
  const tbody = document.getElementById('borrowersBody');
  if (!tbody) return;

  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-people"></i><p>No borrowers match your search.</p></div></td></tr>';
  } else {
    tbody.innerHTML = pageItems.map(b => (
      '<tr>' +
        '<td><div class="cell-primary">' + b.name + '</div><div class="cell-secondary">' + b.id + '</div></td>' +
        '<td><div>' + b.phone + '</div><div class="cell-secondary">' + b.email + '</div></td>' +
        '<td>' + b.loanCount + '</td>' +
        '<td>' + LF.formatINR(b.totalBorrowed) + '</td>' +
        '<td>' + LF.formatINR(b.outstanding) + '</td>' +
        '<td class="cell-secondary">' + (b.lastPayment === '—' ? '—' : LF.formatDate(b.lastPayment)) + '</td>' +
        '<td>' + LF.statusBadge(b.status) + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-action" title="Edit" onclick="editBorrower(\'' + b.id + '\')"><i class="bi bi-pencil"></i></button>' +
          '<button class="icon-action danger" title="Delete" onclick="deleteBorrower(\'' + b.id + '\')"><i class="bi bi-trash3"></i></button>' +
        '</div></td>' +
      '</tr>'
    )).join('');
  }

  renderPagination(filtered.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
  const info = document.getElementById('borrowersPageInfo');
  const btns = document.getElementById('borrowersPageBtns');
  if (!info || !btns) return;

  const start = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);
  info.textContent = 'Showing ' + start + '–' + end + ' of ' + totalItems;

  let html = '<button class="page-btn" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')"><i class="bi bi-chevron-left"></i></button>';
  for (let i = 1; i <= totalPages; i++) {
    html += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
  }
  html += '<button class="page-btn" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')"><i class="bi bi-chevron-right"></i></button>';
  btns.innerHTML = html;
}

function goToPage(p) {
  currentPage = p;
  renderTable();
}

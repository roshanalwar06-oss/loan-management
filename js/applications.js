/* ==========================================================================
   LENDFLOW — applications.js
   ========================================================================== */

let appFilter = 'All';
let appQuery = '';

document.addEventListener('DOMContentLoaded', function () {
  populateBorrowerSelect();
  renderStats();
  renderTable();
  bindEvents();
});

function populateBorrowerSelect() {
  const select = document.getElementById('appBorrowerSelect');
  if (!select) return;
  const borrowers = LF.get(LF.KEYS.borrowers, []);
  select.innerHTML = '<option value="">Select borrower</option>' +
    borrowers.map(b => '<option value="' + b.name + '">' + b.name + '</option>').join('');
}

function bindEvents() {
  const searchInput = document.getElementById('appSearch');
  searchInput && searchInput.addEventListener('input', (e) => {
    appQuery = e.target.value;
    renderTable();
  });

  document.querySelectorAll('[data-app-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-app-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      appFilter = pill.dataset.appFilter;
      renderTable();
    });
  });

  const addBtn = document.getElementById('addApplicationBtn');
  addBtn && addBtn.addEventListener('click', () => {
    const form = document.getElementById('applicationForm');
    form.reset();
    LF.clearFormErrors(form);
    LF.openModal('applicationModal');
  });

  const form = document.getElementById('applicationForm');
  form && form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!LF.validateForm(form)) {
      LF.toast('Please fill in all required fields correctly.', 'danger');
      return;
    }
    saveApplication(form);
  });
}

function saveApplication(form) {
  const applications = LF.get(LF.KEYS.applications, []);
  const record = {
    id: LF.uid('APP'),
    applicant: form.borrower.value,
    loanType: form.loanType.value,
    amount: Number(form.amount.value) || 0,
    appliedDate: LF.todayISO(),
    creditScore: Number(form.creditScore.value) || 0,
    status: 'Pending',
    tenure: Number(form.tenure.value) || 0,
    purpose: form.purpose.value.trim(),
    income: Number(form.income.value) || 0,
    employment: form.employment.value,
    notes: form.notes.value.trim()
  };
  applications.unshift(record);
  LF.set(LF.KEYS.applications, applications);
  LF.toast('Application submitted successfully.', 'success');
  LF.closeModal('applicationModal');
  renderStats();
  renderTable();
}

function setAppStatus(id, status) {
  const applications = LF.get(LF.KEYS.applications, []);
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) return;
  applications[idx].status = status;
  LF.set(LF.KEYS.applications, applications);
  LF.toast('Application marked as ' + status + '.', status === 'Rejected' ? 'danger' : 'success');
  renderStats();
  renderTable();
}

function deleteApplication(id) {
  if (!confirm('Delete this application?')) return;
  let applications = LF.get(LF.KEYS.applications, []);
  applications = applications.filter(a => a.id !== id);
  LF.set(LF.KEYS.applications, applications);
  LF.toast('Application deleted.', 'info');
  renderStats();
  renderTable();
}

function renderStats() {
  const applications = LF.get(LF.KEYS.applications, []);
  setText('statTotalApps', applications.length);
  setText('statPendingApps', applications.filter(a => a.status === 'Pending' || a.status === 'Under Review').length);
  setText('statApprovedApps', applications.filter(a => a.status === 'Approved').length);
  setText('statRejectedApps', applications.filter(a => a.status === 'Rejected').length);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getFiltered() {
  const applications = LF.get(LF.KEYS.applications, []);
  return applications.filter(a => {
    const matchesFilter = appFilter === 'All' || a.status === appFilter;
    const matchesSearch = LF.matchesQuery(a, ['applicant', 'id', 'loanType'], appQuery);
    return matchesFilter && matchesSearch;
  });
}

function renderTable() {
  const tbody = document.getElementById('applicationsBody');
  if (!tbody) return;

  const items = getFiltered();

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-file-earmark-text"></i><p>No applications match your search.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => (
    '<tr>' +
      '<td class="cell-primary">' + a.id + '</td>' +
      '<td>' + a.applicant + '</td>' +
      '<td>' + a.loanType + '</td>' +
      '<td>' + LF.formatINR(a.amount) + '</td>' +
      '<td class="cell-secondary">' + LF.formatDate(a.appliedDate) + '</td>' +
      '<td>' + a.creditScore + '</td>' +
      '<td>' + LF.statusBadge(a.status) + '</td>' +
      '<td><div class="row-actions">' +
        (a.status === 'Pending' || a.status === 'Under Review'
          ? '<button class="icon-action" title="Approve" onclick="setAppStatus(\'' + a.id + '\',\'Approved\')"><i class="bi bi-check-lg"></i></button>' +
            '<button class="icon-action danger" title="Reject" onclick="setAppStatus(\'' + a.id + '\',\'Rejected\')"><i class="bi bi-x-lg"></i></button>'
          : '') +
        '<button class="icon-action danger" title="Delete" onclick="deleteApplication(\'' + a.id + '\')"><i class="bi bi-trash3"></i></button>' +
      '</div></td>' +
    '</tr>'
  )).join('');
}

/* ==========================================================================
   LENDFLOW — settings.js
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  bindSettingsNav();
  bindSaveButtons();
});

function loadSettings() {
  const s = LF.get(LF.KEYS.settings, {});

  setVal('orgName', s.orgName);
  setVal('orgPhone', s.orgPhone);
  setVal('orgEmail', s.orgEmail);
  setVal('orgWebsite', s.orgWebsite);
  setVal('orgAddress', s.orgAddress);
  setVal('orgCity', s.orgCity);
  setVal('orgCurrency', s.orgCurrency);

  setVal('firstName', s.firstName);
  setVal('lastName', s.lastName);
  setVal('adminEmail', s.adminEmail);
  setVal('adminPhone', s.adminPhone);
  setVal('role', s.role);

  setVal('defaultRate', s.defaultRate);
  setVal('minLoan', s.minLoan);
  setVal('maxLoan', s.maxLoan);
  setVal('defaultTenure', s.defaultTenure);
  setVal('lateFee', s.lateFee);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  days.forEach(day => {
    const bh = (s.businessHours && s.businessHours[day]) || { open: '09:00', close: '18:00', isOpen: true };
    setVal('open_' + day, bh.open);
    setVal('close_' + day, bh.close);
    setChecked('toggle_' + day, bh.isOpen);
  });

  const notifKeys = ['newApplication', 'loanApproval', 'paymentReceived', 'paymentDueReminder', 'overdueNotification', 'dailySummary'];
  notifKeys.forEach(k => setChecked('notif_' + k, s.notifications ? s.notifications[k] : false));

  const payKeys = ['cash', 'upi', 'bankTransfer', 'card'];
  payKeys.forEach(k => setChecked('pay_' + k, s.paymentPreferences ? s.paymentPreferences[k] : false));
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

function bindSettingsNav() {
  document.querySelectorAll('.settings-nav a').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.settings-nav a').forEach(a => a.classList.remove('active'));
      this.classList.add('active');
      const target = document.querySelector(this.getAttribute('href'));
      target && target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindSaveButtons() {
  document.querySelectorAll('[data-save-section]').forEach(btn => {
    btn.addEventListener('click', () => saveAllSettings());
  });

  const securityForm = document.getElementById('securityForm');
  securityForm && securityForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    if (newPass && newPass !== confirmPass) {
      LF.toast('New password and confirmation do not match.', 'danger');
      return;
    }
    LF.toast('Security settings updated.', 'success');
    securityForm.reset();
  });
}

function saveAllSettings() {
  const s = LF.get(LF.KEYS.settings, {});

  s.orgName = getVal('orgName');
  s.orgPhone = getVal('orgPhone');
  s.orgEmail = getVal('orgEmail');
  s.orgWebsite = getVal('orgWebsite');
  s.orgAddress = getVal('orgAddress');
  s.orgCity = getVal('orgCity');
  s.orgCurrency = getVal('orgCurrency');

  s.firstName = getVal('firstName');
  s.lastName = getVal('lastName');
  s.adminEmail = getVal('adminEmail');
  s.adminPhone = getVal('adminPhone');
  s.role = getVal('role');

  s.defaultRate = Number(getVal('defaultRate')) || 0;
  s.minLoan = Number(getVal('minLoan')) || 0;
  s.maxLoan = Number(getVal('maxLoan')) || 0;
  s.defaultTenure = Number(getVal('defaultTenure')) || 0;
  s.lateFee = Number(getVal('lateFee')) || 0;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  s.businessHours = s.businessHours || {};
  days.forEach(day => {
    s.businessHours[day] = {
      open: getVal('open_' + day),
      close: getVal('close_' + day),
      isOpen: isChecked('toggle_' + day)
    };
  });

  const notifKeys = ['newApplication', 'loanApproval', 'paymentReceived', 'paymentDueReminder', 'overdueNotification', 'dailySummary'];
  s.notifications = s.notifications || {};
  notifKeys.forEach(k => { s.notifications[k] = isChecked('notif_' + k); });

  const payKeys = ['cash', 'upi', 'bankTransfer', 'card'];
  s.paymentPreferences = s.paymentPreferences || {};
  payKeys.forEach(k => { s.paymentPreferences[k] = isChecked('pay_' + k); });

  LF.set(LF.KEYS.settings, s);
  LF.toast('Settings saved successfully.', 'success');
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function isChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

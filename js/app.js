/* ==========================================================================
   LENDFLOW — app.js
   Shared utilities: sidebar, topbar, toasts, seed data, formatting, modals
   ========================================================================== */

const LF = (function () {

  /* ---------------- Storage keys ---------------- */
  const KEYS = {
    borrowers: 'lf_borrowers',
    applications: 'lf_applications',
    loans: 'lf_loans',
    repayments: 'lf_repayments',
    transactions: 'lf_transactions',
    settings: 'lf_settings',
    seeded: 'lf_seeded_v1'
  };

  /* ---------------- Basic storage helpers ---------------- */
  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback !== undefined ? fallback : null);
    } catch (e) {
      console.error('LF storage read error', key, e);
      return fallback !== undefined ? fallback : null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LF storage write error', key, e);
    }
  }

  /* ---------------- Formatting ---------------- */
  function formatINR(amount) {
    const n = Number(amount) || 0;
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  /* ---------------- Toasts ---------------- */
  function ensureToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  const TOAST_ICONS = {
    success: 'bi-check-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    danger: 'bi-x-circle-fill',
    info: 'bi-info-circle-fill'
  };

  function toast(message, type) {
    type = type || 'success';
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML =
      '<i class="bi ' + (TOAST_ICONS[type] || TOAST_ICONS.success) + ' toast-icon"></i>' +
      '<div class="toast-text">' + message + '</div>' +
      '<button class="toast-close" aria-label="Dismiss"><i class="bi bi-x"></i></button>';
    container.appendChild(el);
    const remove = () => {
      el.classList.add('closing');
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, 4200);
  }

  /* ---------------- Sidebar / Topbar behavior ---------------- */
  function initShell() {
    const toggleBtns = document.querySelectorAll('[data-menu-toggle]');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    function openSidebar() {
      sidebar && sidebar.classList.add('open');
      overlay && overlay.classList.add('open');
    }
    function closeSidebar() {
      sidebar && sidebar.classList.remove('open');
      overlay && overlay.classList.remove('open');
    }

    toggleBtns.forEach(btn => btn.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    }));
    overlay && overlay.addEventListener('click', closeSidebar);

    // Active nav link based on current file name
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === path) link.classList.add('active');
      else link.classList.remove('active');
    });
  }

  /* ---------------- Modal helpers ---------------- */
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }
  function initModalDismiss() {
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    });
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const backdrop = btn.closest('.modal-backdrop');
        if (backdrop) backdrop.classList.remove('open');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(b => b.classList.remove('open'));
      }
    });
  }

  /* ---------------- Form validation ---------------- */
  function validateForm(formEl) {
    let valid = true;
    formEl.querySelectorAll('[required]').forEach(field => {
      const group = field.closest('.form-group') || field.parentElement;
      const val = (field.value || '').trim();
      let fieldValid = val.length > 0;

      if (fieldValid && field.type === 'email') {
        fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      }
      if (fieldValid && field.type === 'tel') {
        fieldValid = val.replace(/\D/g, '').length >= 10;
      }
      if (fieldValid && field.type === 'number') {
        fieldValid = !isNaN(parseFloat(val));
      }

      if (!fieldValid) {
        valid = false;
        group && group.classList.add('has-error');
      } else {
        group && group.classList.remove('has-error');
      }
    });
    return valid;
  }

  function clearFormErrors(formEl) {
    formEl.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
  }

  /* ---------------- EMI calculation ---------------- */
  function calcEMI(principal, annualRatePct, tenureMonths) {
    const P = Number(principal) || 0;
    const annualRate = Number(annualRatePct) || 0;
    const n = Number(tenureMonths) || 0;
    if (P <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalPayable: 0 };
    const r = annualRate / 12 / 100;
    let emi;
    if (r === 0) {
      emi = P / n;
    } else {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    const totalPayable = emi * n;
    const totalInterest = totalPayable - P;
    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayable: Math.round(totalPayable)
    };
  }

  /* ---------------- Search / filter helper ---------------- */
  function matchesQuery(record, fields, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return fields.some(f => String(record[f] || '').toLowerCase().includes(q));
  }

  /* ---------------- Status badge helper ---------------- */
  const STATUS_MAP = {
    Approved: 'success', Active: 'success', Paid: 'success', Completed: 'success', Open: 'success',
    Pending: 'warning', 'Under Review': 'warning', Partial: 'warning',
    Rejected: 'danger', Overdue: 'danger', Inactive: 'danger', Closed: 'danger',
    Paused: 'info', Info: 'info'
  };

  function statusBadge(status) {
    const cls = STATUS_MAP[status] || 'neutral';
    return '<span class="badge badge-' + cls + '">' + status + '</span>';
  }

  /* ---------------- Seed data ---------------- */
  function seedIfNeeded() {
    if (get(KEYS.seeded, false)) return;

    const borrowers = [
      { id: 'BRW-1001', name: 'Arun Kumar', phone: '+91 98765 43210', email: 'arun.kumar@example.com', dob: '1990-04-12', address: '14 MG Road, Chennai', occupation: 'Software Engineer', income: 75000, employment: 'Salaried', notes: '', loanCount: 2, totalBorrowed: 500000, outstanding: 210000, lastPayment: '2026-08-28', status: 'Active' },
      { id: 'BRW-1002', name: 'Priya Sharma', phone: '+91 98765 12345', email: 'priya.sharma@example.com', dob: '1988-11-02', address: '22 Anna Nagar, Chennai', occupation: 'Business Owner', income: 120000, employment: 'Self-Employed', notes: '', loanCount: 1, totalBorrowed: 350000, outstanding: 120000, lastPayment: '2026-08-25', status: 'Active' },
      { id: 'BRW-1003', name: 'Rahul Singh', phone: '+91 91234 56780', email: 'rahul.singh@example.com', dob: '1995-01-20', address: '9 Adyar, Chennai', occupation: 'Marketing Manager', income: 60000, employment: 'Salaried', notes: '', loanCount: 1, totalBorrowed: 750000, outstanding: 750000, lastPayment: '—', status: 'Active' },
      { id: 'BRW-1004', name: 'Sneha Reddy', phone: '+91 90000 11122', email: 'sneha.reddy@example.com', dob: '1992-06-18', address: '5 Jubilee Hills, Hyderabad', occupation: 'Doctor', income: 150000, employment: 'Salaried', notes: '', loanCount: 1, totalBorrowed: 200000, outstanding: 40000, lastPayment: '2026-08-20', status: 'Active' },
      { id: 'BRW-1005', name: 'Vikram Nair', phone: '+91 90111 22334', email: 'vikram.nair@example.com', dob: '1985-09-09', address: '18 Kochi Marine Drive, Kochi', occupation: 'Shop Owner', income: 55000, employment: 'Self-Employed', notes: '', loanCount: 1, totalBorrowed: 300000, outstanding: 300000, lastPayment: '2026-06-15', status: 'Overdue' },
      { id: 'BRW-1006', name: 'Kavya Iyer', phone: '+91 99887 76655', email: 'kavya.iyer@example.com', dob: '1998-03-27', address: '3 Indiranagar, Bengaluru', occupation: 'Designer', income: 65000, employment: 'Salaried', notes: '', loanCount: 0, totalBorrowed: 0, outstanding: 0, lastPayment: '—', status: 'Inactive' }
    ];

    const applications = [
      { id: 'APP-2001', applicant: 'Arun Kumar', loanType: 'Personal Loan', amount: 250000, appliedDate: '2026-09-01', creditScore: 742, status: 'Approved', tenure: 24, purpose: 'Home renovation', income: 75000, employment: 'Salaried', notes: '' },
      { id: 'APP-2002', applicant: 'Priya Sharma', loanType: 'Business Loan', amount: 500000, appliedDate: '2026-08-31', creditScore: 705, status: 'Pending', tenure: 36, purpose: 'Working capital', income: 120000, employment: 'Self-Employed', notes: '' },
      { id: 'APP-2003', applicant: 'Rahul Singh', loanType: 'Vehicle Loan', amount: 750000, appliedDate: '2026-08-30', creditScore: 688, status: 'Under Review', tenure: 60, purpose: 'Car purchase', income: 60000, employment: 'Salaried', notes: '' },
      { id: 'APP-2004', applicant: 'Sneha Reddy', loanType: 'Personal Loan', amount: 200000, appliedDate: '2026-08-27', creditScore: 761, status: 'Approved', tenure: 18, purpose: 'Medical expenses', income: 150000, employment: 'Salaried', notes: '' },
      { id: 'APP-2005', applicant: 'Meena Pillai', loanType: 'Education Loan', amount: 450000, appliedDate: '2026-08-24', creditScore: 650, status: 'Rejected', tenure: 48, purpose: 'Postgraduate study', income: 30000, employment: 'Salaried', notes: 'Low income to loan ratio' },
      { id: 'APP-2006', applicant: 'Vikram Nair', loanType: 'Business Loan', amount: 300000, appliedDate: '2026-08-19', creditScore: 610, status: 'Approved', tenure: 24, purpose: 'Shop expansion', income: 55000, employment: 'Self-Employed', notes: '' }
    ];

    const loans = [
      { id: 'LN-1001', borrower: 'Arun Kumar', loanType: 'Personal Loan', principal: 250000, rate: 10.5, tenure: 24, startDate: '2026-08-10', frequency: 'Monthly', emi: 11580, outstanding: 184200, nextDue: '2026-09-10', status: 'Active' },
      { id: 'LN-1002', borrower: 'Priya Sharma', loanType: 'Business Loan', principal: 350000, rate: 12.0, tenure: 36, startDate: '2026-05-15', frequency: 'Monthly', emi: 11624, outstanding: 120000, nextDue: '2026-09-15', status: 'Active' },
      { id: 'LN-1003', borrower: 'Rahul Singh', loanType: 'Vehicle Loan', principal: 750000, rate: 9.5, tenure: 60, startDate: '2026-08-30', frequency: 'Monthly', emi: 15733, outstanding: 750000, nextDue: '2026-09-30', status: 'Active' },
      { id: 'LN-1004', borrower: 'Sneha Reddy', loanType: 'Personal Loan', principal: 200000, rate: 11.0, tenure: 18, startDate: '2026-03-20', frequency: 'Monthly', emi: 12206, outstanding: 40000, nextDue: '2026-09-20', status: 'Active' },
      { id: 'LN-1005', borrower: 'Vikram Nair', loanType: 'Business Loan', principal: 300000, rate: 13.0, tenure: 24, startDate: '2026-04-15', frequency: 'Monthly', emi: 14265, outstanding: 300000, nextDue: '2026-08-15', status: 'Overdue' },
      { id: 'LN-1006', borrower: 'Meena Pillai', loanType: 'Home Loan', principal: 1800000, rate: 8.5, tenure: 180, startDate: '2025-01-10', frequency: 'Monthly', emi: 17726, outstanding: 1650000, nextDue: '2026-09-10', status: 'Active' },
      { id: 'LN-1007', borrower: 'Deepak Verma', loanType: 'Education Loan', principal: 450000, rate: 9.0, tenure: 48, startDate: '2024-06-01', frequency: 'Monthly', emi: 11205, outstanding: 0, nextDue: '—', status: 'Completed' }
    ];

    const repayments = [
      { id: 'PMT-3001', loanId: 'LN-1001', borrower: 'Arun Kumar', dueDate: '2026-08-10', amount: 11580, method: 'UPI', paymentDate: '2026-08-09', status: 'Paid' },
      { id: 'PMT-3002', loanId: 'LN-1002', borrower: 'Priya Sharma', dueDate: '2026-08-15', amount: 11624, method: 'Bank Transfer', paymentDate: '2026-08-15', status: 'Paid' },
      { id: 'PMT-3003', loanId: 'LN-1005', borrower: 'Vikram Nair', dueDate: '2026-08-15', amount: 14265, method: '—', paymentDate: '—', status: 'Overdue' },
      { id: 'PMT-3004', loanId: 'LN-1004', borrower: 'Sneha Reddy', dueDate: '2026-08-20', amount: 12206, method: 'Cash', paymentDate: '2026-08-20', status: 'Paid' },
      { id: 'PMT-3005', loanId: 'LN-1006', borrower: 'Meena Pillai', dueDate: '2026-09-10', amount: 17726, method: '—', paymentDate: '—', status: 'Pending' },
      { id: 'PMT-3006', loanId: 'LN-1001', borrower: 'Arun Kumar', dueDate: '2026-09-10', amount: 11580, method: '—', paymentDate: '—', status: 'Pending' },
      { id: 'PMT-3007', loanId: 'LN-1003', borrower: 'Rahul Singh', dueDate: '2026-09-30', amount: 8000, method: 'Card', paymentDate: '2026-08-30', status: 'Partial' }
    ];

    const transactions = [
      { id: 'TXN-4001', date: '2026-08-30', description: 'Loan disbursed — Vehicle Loan', borrower: 'Rahul Singh', type: 'Loan Disbursement', method: 'Bank Transfer', amount: -750000, status: 'Completed' },
      { id: 'TXN-4002', date: '2026-08-28', description: 'EMI repayment', borrower: 'Arun Kumar', type: 'Repayment', method: 'UPI', amount: 11580, status: 'Completed' },
      { id: 'TXN-4003', date: '2026-08-25', description: 'EMI repayment', borrower: 'Priya Sharma', type: 'Repayment', method: 'Bank Transfer', amount: 11624, status: 'Completed' },
      { id: 'TXN-4004', date: '2026-08-22', description: 'Processing fee', borrower: 'Sneha Reddy', type: 'Fee', method: 'UPI', amount: 2000, status: 'Completed' },
      { id: 'TXN-4005', date: '2026-08-20', description: 'EMI repayment', borrower: 'Sneha Reddy', type: 'Repayment', method: 'Cash', amount: 12206, status: 'Completed' },
      { id: 'TXN-4006', date: '2026-08-18', description: 'Late fee adjustment', borrower: 'Vikram Nair', type: 'Adjustment', method: 'Cash', amount: 500, status: 'Completed' },
      { id: 'TXN-4007', date: '2026-08-12', description: 'Refund — overpayment', borrower: 'Meena Pillai', type: 'Refund', method: 'Bank Transfer', amount: -1200, status: 'Completed' },
      { id: 'TXN-4008', date: '2026-08-10', description: 'Loan disbursed — Personal Loan', borrower: 'Arun Kumar', type: 'Loan Disbursement', method: 'Bank Transfer', amount: -250000, status: 'Completed' }
    ];

    const settings = {
      orgName: 'LendFlow Financial Services Pvt. Ltd.',
      orgPhone: '+91 44 4000 5000',
      orgEmail: 'contact@lendflow.in',
      orgWebsite: 'www.lendflow.in',
      orgAddress: '221 Anna Salai',
      orgCity: 'Chennai, Tamil Nadu',
      orgCurrency: 'INR (₹)',
      firstName: 'Admin',
      lastName: 'User',
      adminEmail: 'admin@lendflow.in',
      adminPhone: '+91 98400 12345',
      role: 'Administrator',
      defaultRate: 11.5,
      minLoan: 25000,
      maxLoan: 2000000,
      defaultTenure: 24,
      lateFee: 500,
      businessHours: {
        Monday: { open: '09:00', close: '18:00', isOpen: true },
        Tuesday: { open: '09:00', close: '18:00', isOpen: true },
        Wednesday: { open: '09:00', close: '18:00', isOpen: true },
        Thursday: { open: '09:00', close: '18:00', isOpen: true },
        Friday: { open: '09:00', close: '18:00', isOpen: true },
        Saturday: { open: '09:00', close: '14:00', isOpen: true },
        Sunday: { open: '09:00', close: '18:00', isOpen: false }
      },
      notifications: {
        newApplication: true, loanApproval: true, paymentReceived: true,
        paymentDueReminder: true, overdueNotification: true, dailySummary: false
      },
      paymentPreferences: { cash: true, upi: true, bankTransfer: true, card: false }
    };

    set(KEYS.borrowers, borrowers);
    set(KEYS.applications, applications);
    set(KEYS.loans, loans);
    set(KEYS.repayments, repayments);
    set(KEYS.transactions, transactions);
    set(KEYS.settings, settings);
    set(KEYS.seeded, true);
  }

  return {
    KEYS, get, set,
    formatINR, formatDate, todayISO, uid,
    toast, initShell, openModal, closeModal, initModalDismiss,
    validateForm, clearFormErrors, calcEMI, matchesQuery, statusBadge,
    seedIfNeeded
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  LF.seedIfNeeded();
  LF.initShell();
  LF.initModalDismiss();
});

/* app.js - Hospital Dashboard (cleaned & functional) */

/* ------------------------
   Utility & Safe DOM grabs
   ------------------------ */
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

/* DOM nodes (guarded) */
const navLinks = $$('.nav a') || [];
const views = $$('.view') || [];

const kpiPatientsEl = $('#kpiPatients');
const kpiApptsEl = $('#kpiAppts');
const kpiStaffEl = $('#kpiStaff');
const kpiBillsEl = $('#kpiBills');

const apptTableId = 'apptTable';
const recentPatientsId = 'recentPatients';
const patientsTableId = 'patientsTable';
const staffTableId = 'staffTable';
const billingTableId = 'billingTable';

const modalRoot = $('#modalRoot');
const modalContent = $('#modalContent');

const newPatientBtn = $('#newPatientBtn'); // may be null (code handles it)
const addPatientTop = $('#addPatientTop'); // may be null
const newApptBtn = $('#newAppt'); // appointment button

const apptModal = $('#apptModal');
const loginForm = $('#loginForm');
const registerForm = $('#registerForm');
const switchAuth = $('#switchAuth');
const authScreen = $('#authScreen');
const patientForm = $('#patientForm'); // may be null in some variants

/* ------------------------
   Sample / persisted data
   ------------------------ */
let patientsData = [
  { id: 1, name: "John Doe", age: 32, phone: "+91 783-4444", lastVisit: "2025-01-16" },
  { id: 2, name: "Anna Smith", age: 45, phone: "+91 777-5888", lastVisit: "2025-01-11" },
  { id: 3, name: "Michael Lee", age: 50, phone: "+91 801-6789", lastVisit: "2025-01-08" },
];

let appointments = [
  ["10:00 AM", "John Doe", "Dr. Patel", "Cardiology", "Scheduled"],
  ["11:30 AM", "Jane Smith", "Dr. Wilson", "Neurology", "Confirmed"],
  ["02:00 PM", "Michael Lee", "Dr. Brown", "Orthopedics", "Pending"],
];

let staff = [
  ["Dr. Patel", "Surgeon", "Cardiology", "+91 773-2222"],
  ["Dr. Wilson", "Neurosurgeon", "Neurology", "+91 772-9893"],
  ["Nurse Anita", "Senior Nurse", "ER", "+91 787-9987"],
];

let billing = [
  ["INV-001", "John Doe", "$430", "2025-01-20", "Pending"],
  ["INV-002", "Anna Smith", "$210", "2025-01-12", "Paid"],
];

/* Try to restore patients from localStorage */
try {
  const stored = localStorage.getItem('hospicare_patients_v1');
  if (stored) patientsData = JSON.parse(stored);
} catch (err) {
  console.warn('Could not read patients from localStorage', err);
}

/* ------------------------
   Helpers
   ------------------------ */
function savePatientsToStorage() {
  try {
    localStorage.setItem('hospicare_patients_v1', JSON.stringify(patientsData));
  } catch (err) {
    console.warn('Could not save patients to localStorage', err);
  }
}

function fillTable(id, rows) {
  const tbody = document.getElementById(id);
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    r.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/* Create patients table rows from patientsData */
function refreshPatientsTable() {
  const rows = patientsData.map(p => [
    p.id,
    p.name,
    p.age ?? '-',
    p.phone ?? '-',
    p.lastVisit ?? '-',
    '' // placeholder for action - will be inserted below
  ]);

  fillTable(patientsTableId, rows);

  // Add action buttons to last column
  const tbody = document.getElementById(patientsTableId);
  if (tbody) {
    Array.from(tbody.rows).forEach((tr, i) => {
      const td = document.createElement('td');
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn secondary';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => openPatientViewModal(patientsData[i]));
      td.appendChild(viewBtn);

      // optional delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.style.marginLeft = '6px';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete patient "${patientsData[i].name}"?`)) return;
        patientsData.splice(i, 1);
        savePatientsToStorage();
        refreshPatientsTable();
        updateKPIs();
      });
      td.appendChild(delBtn);

      // replace last cell
      if (tr.cells.length > 0) {
        if (tr.cells.length === 6) {
          tr.replaceChild(td, tr.cells[5]);
        } else {
          tr.appendChild(td);
        }
      } else {
        tr.appendChild(td);
      }
    });
  }

  // Also refresh recentPatients small list if present (show name, age, phone)
  const recentRows = patientsData.slice(-6).reverse().map(p => [p.name, p.age ?? '-', p.phone ?? '-', 'View']);
  fillTable(recentPatientsId, recentRows);
}

/* Simple modal for showing patient details or custom HTML */
function openModalHtml(html) {
  if (!modalRoot || !modalContent) return;
  modalContent.innerHTML = html;
  modalRoot.style.display = 'block';
  modalRoot.classList.add('show');
}

function closeModal() {
  if (!modalRoot || !modalContent) return;
  modalRoot.style.display = 'none';
  modalRoot.classList.remove('show');
  modalContent.innerHTML = '';
}

function openPatientViewModal(patient) {
  const html = `
    <div style="padding:16px">
      <h3>Patient: ${escapeHtml(patient.name)}</h3>
      <p><strong>ID:</strong> ${escapeHtml(patient.id)}</p>
      <p><strong>Age:</strong> ${escapeHtml(patient.age ?? '-')}</p>
      <p><strong>Phone:</strong> ${escapeHtml(patient.phone ?? '-')}</p>
      <p><strong>Last Visit:</strong> ${escapeHtml(patient.lastVisit ?? '-')}</p>
      <div style="margin-top:12px;text-align:right">
        <button class="btn secondary" id="closeModalBtn">Close</button>
      </div>
    </div>
  `;
  openModalHtml(html);
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
}

/* basic escaping to avoid injection when setting innerHTML */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Update KPI tiles */
function updateKPIs() {
  if (kpiPatientsEl) kpiPatientsEl.textContent = patientsData.length;
  if (kpiApptsEl) kpiApptsEl.textContent = appointments.length;
  if (kpiStaffEl) kpiStaffEl.textContent = staff.length;
  if (kpiBillsEl) kpiBillsEl.textContent = billing.length;
}

/* ------------------------
   Navigation between views
   ------------------------ */
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    // activate link
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // show matching view
    const id = link.dataset.view;
    views.forEach(v => {
      v.style.display = v.id === id ? 'block' : 'none';
    });
  });
});

/* ------------------------
   Populate initial tables
   ------------------------ */
fillTable(apptTableId, appointments);
fillTable(staffTableId, staff);
fillTable(billingTableId, billing);

/* Build patients table and recent list from patientsData */
refreshPatientsTable();

/* ------------------------
   Modal root backdrop close
   ------------------------ */
if (modalRoot) {
  modalRoot.addEventListener('click', e => {
    if (e.target === modalRoot) closeModal();
  });
}

/* ------------------------
   New patient modal/button handling (if present)
   ------------------------ */
function openNewPatientModal() {
  // If there's an embedded patient form (patientForm), prefer that UI
  if (patientForm) {
    // navigate to patients view
    const patientsLink = navLinks.find(l => l.dataset.view === 'patients');
    if (patientsLink) patientsLink.click();
    // scroll to form
    setTimeout(() => {
      patientForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const first = patientForm.querySelector('input, select, textarea');
      if (first) first.focus();
    }, 150);
    return;
  }

  // Otherwise show a small modal form
  const html = `
    <div style="padding:16px;max-width:420px">
      <h3>Add New Patient</h3>
      <form id="modalPatientForm">
        <label>Name</label><input name="name" required /><br/>
        <label>Age</label><input name="age" type="number" /><br/>
        <label>Phone</label><input name="phone" /><br/>
        <div style="margin-top:10px;text-align:right">
          <button type="button" class="btn secondary" id="modalCancel">Cancel</button>
          <button type="submit" class="btn">Add Patient</button>
        </div>
      </form>
    </div>
  `;
  openModalHtml(html);

  const modalPatientForm = document.getElementById('modalPatientForm');
  const modalCancel = document.getElementById('modalCancel');
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  if (modalPatientForm) {
    modalPatientForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(modalPatientForm).entries());
      addPatient({
        name: data.name || 'Unnamed',
        age: data.age ? Number(data.age) : undefined,
        phone: data.phone || undefined,
        lastVisit: new Date().toLocaleDateString()
      });
      closeModal();
    });
  }
}

/* Hook up global new patient buttons if they exist */
if (newPatientBtn) newPatientBtn.addEventListener('click', openNewPatientModal);
if (addPatientTop) addPatientTop.addEventListener('click', openNewPatientModal);

/* ------------------------
   Patient form submit (embedded form case)
   ------------------------ */
function addPatientToBackend(p) {
  fetch("/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p)
  })
  .then(res => res.json())
  .then(data => {
    console.log("Patient saved:", data);
    fetchPatients(); // refresh the table
  })
  .catch(err => console.error(err));
}

function fetchPatients() {
  fetch("/api/patients")
    .then(res => res.json())
    .then(data => {
      patientsData = data; // update global variable
      refreshPatientsTable();
      updateKPIs();
    });
}


/* If an embedded patient form exists, wire it to addPatient */
if (patientForm) {
  patientForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(patientForm).entries());
    addPatient({
      name: data.name,
      age: data.age ? Number(data.age) : undefined,
      phone: data.phone,
      lastVisit: new Date().toLocaleDateString()
    });
    // reset and scroll to table
    patientForm.reset();
    const patientsTbl = document.getElementById(patientsTableId);
    if (patientsTbl) patientsTbl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ------------------------
   Appointment modal handlers
   ------------------------ */
if (newApptBtn && apptModal) {
  newApptBtn.addEventListener('click', () => {
    apptModal.classList.remove('hidden');
    apptModal.style.display = 'block';
  });
}

if (apptModal) {
  // Close on clicking backdrop
  apptModal.addEventListener('click', e => {
    if (e.target === apptModal) {
      apptModal.classList.add('hidden');
      apptModal.style.display = 'none';
    }
  });

  // closeApptModal helper for inline onclick calls
  window.closeApptModal = function() {
    apptModal.classList.add('hidden');
    apptModal.style.display = 'none';
  };
}

/* ------------------------
   Auth (login/register toggle)
   ------------------------ */
if (switchAuth && loginForm && registerForm) {
  switchAuth.addEventListener('click', () => {
    const loginVisible = loginForm.style.display !== 'none';
    loginForm.style.display = loginVisible ? 'none' : 'block';
    registerForm.style.display = loginVisible ? 'block' : 'none';
    const authTitle = $('#authTitle');
    if (authTitle) authTitle.textContent = loginVisible ? 'Register' : 'Login';
    switchAuth.innerHTML = loginVisible
      ? `Already have an account? <span>Login</span>`
      : `Don't have an account? <span>Register</span>`;
  });
}

if (loginForm && authScreen) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    // Basic demo behavior: hide auth screen
    authScreen.style.display = 'none';

    // ensure dashboard view is visible
    const dashboardLink = navLinks.find(l => l.dataset.view === 'dashboard');
    if (dashboardLink) dashboardLink.click();
  });
}

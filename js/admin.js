/* ============================================================
   Lakshmi Fancy Store - admin.js (admin.html)
   ============================================================ */

let ADMIN_MODULE = "stock";
let STAFF_SUBTAB = "profiles";
let EXPENSE_SUBTAB = "log";
let EDIT_STOCK_ID = null;
let EDIT_RENTAL_ID = null;
let EDIT_STAFF_ID = null;
let EDIT_CUSTOMER_ID = null;

document.addEventListener("DOMContentLoaded", async () => {
  await LFS.init();
  LFS.scheduleAutoBackup();
  paintAdminHeader();
  if (LFS.isAuthed("lfs_auth_admin")) showAdminApp(); else showAdminLogin();
});

function paintAdminHeader() {
  const s = LFS.get("lfs_settings");
  document.title = (s.storeName || "Lakshmi Fancy Store") + " - Admin";
  const nameSlot = document.getElementById("adminStoreName");
  if (nameSlot) nameSlot.textContent = (s.storeName || "Lakshmi Fancy Store") + " · Admin Console";
}

function showAdminLogin() {
  document.getElementById("adminLoginScreen").classList.remove("hidden");
  document.getElementById("adminAppScreen").classList.add("hidden");
}
function showAdminApp() {
  document.getElementById("adminLoginScreen").classList.add("hidden");
  document.getElementById("adminAppScreen").classList.remove("hidden");
  renderAdminModule();
}
function attemptAdminLogin(e) {
  e.preventDefault();
  const pw = document.getElementById("adminLoginPassword").value;
  if (LFS.checkPassword(pw, "adminPassword")) {
    LFS.setAuthed("lfs_auth_admin");
    document.getElementById("adminLoginError").classList.add("hidden");
    showAdminApp();
  } else {
    document.getElementById("adminLoginError").classList.remove("hidden");
  }
}
function adminLogout() { LFS.logout("lfs_auth_admin"); showAdminLogin(); }

/* ---------- module switching ---------- */
function switchAdminModule(mod) {
  ADMIN_MODULE = mod;
  document.querySelectorAll(".tab-btn[data-mod]").forEach(b => b.classList.toggle("active", b.dataset.mod === mod));
  renderAdminModule();
}

const ADMIN_RENDERERS = {
  stock: renderStockModule,
  rentalInv: renderRentalInvModule,
  staff: renderStaffModule,
  expenses: renderExpensesModule,
  usage: renderUsageModule,
  salesReport: renderSalesReportModule,
  customers: renderCustomersModule,
  loyalty: renderLoyaltyModule,
  personalization: renderPersonalizationModule,
  security: renderSecurityModule,
  backup: renderBackupModule
};

function renderAdminModule() {
  document.getElementById("adminMain").innerHTML = ADMIN_RENDERERS[ADMIN_MODULE]();
  wireAdminEvents();
}

function wireAdminEvents() {
  document.querySelectorAll("[data-subtab-group]").forEach(b => {
    b.addEventListener("click", () => {
      const group = b.dataset.subtabGroup;
      if (group === "staff") STAFF_SUBTAB = b.dataset.sub;
      if (group === "expenses") EXPENSE_SUBTAB = b.dataset.sub;
      renderAdminModule();
    });
  });
  const forms = ["stockForm", "rentalInvForm", "staffForm", "attendanceForm", "expenseForm", "customerForm", "loyaltyForm", "personalizationForm", "securityForm"];
  forms.forEach(id => {
    const f = document.getElementById(id);
    if (f) f.addEventListener("submit", FORM_HANDLERS[id]);
  });
}

/* helpers */
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function readImageAsDataURL(input, cb) {
  if (!input.files || !input.files[0]) { cb(""); return; }
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(input.files[0]);
}

/* ============================================================
   STOCK MANAGEMENT (daily-sale items)
   ============================================================ */
function renderStockModule() {
  const items = LFS.get("lfs_inventory");
  const editing = EDIT_STOCK_ID ? items.find(i => i.id === EDIT_STOCK_ID) : null;
  return `
    <div class="card">
      <h2>${editing ? "Edit Stock Item" : "Add Stock Item"}</h2>
      <form id="stockForm">
        <input type="hidden" id="stkId" value="${editing ? editing.id : ""}">
        <div class="grid cols-2">
          <div class="field"><label>Item Name *</label><input type="text" id="stkName" required value="${editing ? escapeHtml(editing.itemName) : ""}"></div>
          <div class="field"><label>Item Code *</label><input type="text" id="stkCode" required value="${editing ? escapeHtml(editing.itemCode) : ""}"></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Category</label><select id="stkCategory">${LFS_CATEGORIES.map(c => `<option ${editing && editing.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>Item Type</label><select id="stkType">${LFS_ITEM_TYPES.map(t => `<option ${editing && editing.itemType === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        </div>
        <div class="grid cols-3">
          <div class="field"><label>Purchase Date</label><input type="date" id="stkPurchaseDate" value="${editing ? editing.purchaseDate : LFS.todayISO()}"></div>
          <div class="field"><label>Quantity Available *</label><input type="number" id="stkQty" min="0" required value="${editing ? editing.quantityAvailable : 0}"></div>
          <div class="field"><label>Price (₹) *</label><input type="number" id="stkPrice" min="0" required value="${editing ? editing.price : 0}"></div>
        </div>
        <div class="field"><label>Item Image</label><input type="file" id="stkImage" accept="image/*"></div>
        <div class="flex gap-8">
          <button class="btn btn-primary" type="submit">${editing ? "Save Changes" : "Add Item"}</button>
          ${editing ? `<button type="button" class="btn btn-outline" onclick="EDIT_STOCK_ID=null;renderAdminModule();">Cancel</button>` : ""}
        </div>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Stock List (${items.length})</h2><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printStockReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.exportModule('lfs_inventory')">Export JSON</button></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Code</th><th>Category</th><th>Qty</th><th>Price</th><th></th></tr></thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td>${escapeHtml(i.itemName)}</td><td class="mono">${i.itemCode}</td><td>${i.category}</td><td>${i.quantityAvailable}</td><td>${LFS.formatMoney(i.price)}</td>
                <td class="flex gap-8">
                  <button class="btn btn-outline btn-sm" onclick="EDIT_STOCK_ID='${i.id}';renderAdminModule();">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteStockItem('${i.id}')">Delete</button>
                </td>
              </tr>`).join("") || `<tr><td colspan="6" class="text-soft">No items yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function saveStockItem(e) {
  e.preventDefault();
  const items = LFS.get("lfs_inventory");
  const id = document.getElementById("stkId").value;
  const build = (imageDataUrl) => {
    const data = {
      id: id || LFS.uid("inv"),
      itemName: document.getElementById("stkName").value.trim(),
      itemCode: document.getElementById("stkCode").value.trim(),
      category: document.getElementById("stkCategory").value,
      itemType: document.getElementById("stkType").value,
      purchaseDate: document.getElementById("stkPurchaseDate").value,
      quantityAvailable: Number(document.getElementById("stkQty").value) || 0,
      price: Number(document.getElementById("stkPrice").value) || 0,
      imageDataUrl: imageDataUrl || (id ? (items.find(i => i.id === id) || {}).imageDataUrl : "") || ""
    };
    if (id) {
      const idx = items.findIndex(i => i.id === id);
      items[idx] = data;
    } else {
      items.push(data);
    }
    LFS.set("lfs_inventory", items);
    EDIT_STOCK_ID = null;
    toast("Stock item saved");
    renderAdminModule();
  };
  readImageAsDataURL(document.getElementById("stkImage"), build);
}
function printStockReport() {
  const items = LFS.get("lfs_inventory");
  const rows = items.map(i => `<tr><td>${escapeHtml(i.itemName)}</td><td>${i.itemCode}</td><td>${i.category}</td><td>${i.itemType}</td><td>${i.quantityAvailable}</td><td>${LFS.formatMoney(i.price)}</td></tr>`).join("") || `<tr><td colspan="6">No items.</td></tr>`;
  LFS.printReport("Stock Inventory Report", `<table><thead><tr><th>Item</th><th>Code</th><th>Category</th><th>Type</th><th>Qty</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function deleteStockItem(id) {
  if (!confirm("Delete this stock item?")) return;
  LFS.set("lfs_inventory", LFS.get("lfs_inventory").filter(i => i.id !== id));
  toast("Item deleted");
  renderAdminModule();
}

/* ============================================================
   RENTAL INVENTORY MANAGEMENT
   ============================================================ */
function renderRentalInvModule() {
  const items = LFS.get("lfs_rental_items");
  const editing = EDIT_RENTAL_ID ? items.find(i => i.id === EDIT_RENTAL_ID) : null;
  return `
    <div class="card">
      <h2>${editing ? "Edit Rental Item" : "Add Rental Jewellery Item"}</h2>
      <form id="rentalInvForm">
        <input type="hidden" id="rivId" value="${editing ? editing.id : ""}">
        <div class="grid cols-2">
          <div class="field"><label>Item Name *</label><input type="text" id="rivName" required value="${editing ? escapeHtml(editing.itemName) : ""}"></div>
          <div class="field"><label>Item Code *</label><input type="text" id="rivCode" required value="${editing ? escapeHtml(editing.itemCode) : ""}"></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Category</label><select id="rivCategory">${LFS_CATEGORIES.map(c => `<option ${editing && editing.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>Item Type</label><select id="rivType">${LFS_ITEM_TYPES.map(t => `<option ${editing && editing.itemType === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Daily Rental Rate (₹) *</label><input type="number" id="rivRate" min="0" required value="${editing ? editing.dailyRate : 0}"></div>
          <div class="field"><label>Deposit (₹) *</label><input type="number" id="rivDeposit" min="0" required value="${editing ? editing.deposit : 0}"></div>
        </div>
        <p class="text-soft">First-time purchase details (for records only)</p>
        <div class="grid cols-3">
          <div class="field"><label>Purchased From</label><input type="text" id="rivFrom" value="${editing ? escapeHtml(editing.purchasedFrom || "") : ""}"></div>
          <div class="field"><label>Purchase Date</label><input type="date" id="rivPurchaseDate" value="${editing ? editing.purchaseDate || "" : LFS.todayISO()}"></div>
          <div class="field"><label>Purchase Price (₹)</label><input type="number" id="rivPurchasePrice" min="0" value="${editing ? editing.purchasePrice || 0 : 0}"></div>
        </div>
        <div class="field"><label>Warranty</label><input type="text" id="rivWarranty" placeholder="e.g. None / 6 months" value="${editing ? escapeHtml(editing.warranty || "") : ""}"></div>
        <div class="field"><label>Item Image</label><input type="file" id="rivImage" accept="image/*"></div>
        <div class="field"><label>Status</label><select id="rivStatus"><option value="available" ${editing && editing.status === "available" ? "selected" : ""}>Available</option><option value="rented" ${editing && editing.status === "rented" ? "selected" : ""}>Rented</option></select></div>
        <div class="flex gap-8">
          <button class="btn btn-primary" type="submit">${editing ? "Save Changes" : "Add Item"}</button>
          ${editing ? `<button type="button" class="btn btn-outline" onclick="EDIT_RENTAL_ID=null;renderAdminModule();">Cancel</button>` : ""}
        </div>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Rental Master Data (${items.length})</h2><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printRentalInvReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.exportModule('lfs_rental_items')">Export JSON</button></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Code</th><th>Rate/Day</th><th>Deposit</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td>${escapeHtml(i.itemName)}</td><td class="mono">${i.itemCode}</td><td>${LFS.formatMoney(i.dailyRate)}</td><td>${LFS.formatMoney(i.deposit)}</td>
                <td><span class="badge ${i.status === 'available' ? 'badge-available' : 'badge-rented'}">${i.status}</span></td>
                <td class="flex gap-8">
                  <button class="btn btn-outline btn-sm" onclick="EDIT_RENTAL_ID='${i.id}';renderAdminModule();">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteRentalItem('${i.id}')">Delete</button>
                </td>
              </tr>`).join("") || `<tr><td colspan="6" class="text-soft">No items yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function saveRentalItem(e) {
  e.preventDefault();
  const items = LFS.get("lfs_rental_items");
  const id = document.getElementById("rivId").value;
  const existing = id ? items.find(i => i.id === id) : null;
  const build = (imageDataUrl) => {
    const data = {
      id: id || LFS.uid("rit"),
      itemName: document.getElementById("rivName").value.trim(),
      itemCode: document.getElementById("rivCode").value.trim(),
      category: document.getElementById("rivCategory").value,
      itemType: document.getElementById("rivType").value,
      dailyRate: Number(document.getElementById("rivRate").value) || 0,
      deposit: Number(document.getElementById("rivDeposit").value) || 0,
      status: document.getElementById("rivStatus").value,
      purchasedFrom: document.getElementById("rivFrom").value.trim(),
      purchaseDate: document.getElementById("rivPurchaseDate").value,
      purchasePrice: Number(document.getElementById("rivPurchasePrice").value) || 0,
      warranty: document.getElementById("rivWarranty").value.trim(),
      imageDataUrl: imageDataUrl || (existing ? existing.imageDataUrl : "") || "",
      timesRented: existing ? existing.timesRented || 0 : 0,
      totalEarned: existing ? existing.totalEarned || 0 : 0
    };
    if (id) { items[items.findIndex(i => i.id === id)] = data; } else { items.push(data); }
    LFS.set("lfs_rental_items", items);
    EDIT_RENTAL_ID = null;
    toast("Rental item saved");
    renderAdminModule();
  };
  readImageAsDataURL(document.getElementById("rivImage"), build);
}
function printRentalInvReport() {
  const items = LFS.get("lfs_rental_items");
  const rows = items.map(i => `<tr><td>${escapeHtml(i.itemName)}</td><td>${i.itemCode}</td><td>${LFS.formatMoney(i.dailyRate)}</td><td>${LFS.formatMoney(i.deposit)}</td><td>${i.status}</td></tr>`).join("") || `<tr><td colspan="5">No items.</td></tr>`;
  LFS.printReport("Rental Inventory Report", `<table><thead><tr><th>Item</th><th>Code</th><th>Rate/Day</th><th>Deposit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function deleteRentalItem(id) {
  if (!confirm("Delete this rental item?")) return;
  LFS.set("lfs_rental_items", LFS.get("lfs_rental_items").filter(i => i.id !== id));
  toast("Item deleted");
  renderAdminModule();
}

/* ============================================================
   STAFF MANAGEMENT (Profiles + Attendance/Leave payroll)
   ============================================================ */
function currentMonthStr(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}
function countLeaves(staffId, monthStr) {
  return LFS.get("lfs_attendance").filter(a => a.staffId === staffId && a.type === "leave" && a.date.slice(0, 7) === monthStr).length;
}
function payrollFor(staff, monthStr) {
  const leaves = countLeaves(staff.id, monthStr);
  const perDay = staff.monthlySalary / 30;
  const excess = Math.max(0, leaves - 4);
  const deduction = Math.round(excess * perDay);
  const finalSalary = Math.max(0, Math.round(staff.monthlySalary - deduction));
  return { leaves, perDay: Math.round(perDay), excess, deduction, finalSalary };
}

function renderStaffModule() {
  return `
    <div class="subtab-nav" style="padding:0 0 12px;">
      <button class="subtab-btn ${STAFF_SUBTAB === "profiles" ? "active" : ""}" data-subtab-group="staff" data-sub="profiles">Employee Profiles</button>
      <button class="subtab-btn ${STAFF_SUBTAB === "attendance" ? "active" : ""}" data-subtab-group="staff" data-sub="attendance">Attendance &amp; Leave</button>
    </div>
    ${STAFF_SUBTAB === "profiles" ? renderStaffProfiles() : renderStaffAttendance()}
  `;
}

function renderStaffProfiles() {
  const staff = LFS.get("lfs_staff");
  const editing = EDIT_STAFF_ID ? staff.find(s => s.id === EDIT_STAFF_ID) : null;
  return `
    <div class="card">
      <h2>${editing ? "Edit Employee" : "Add Employee"}</h2>
      <form id="staffForm">
        <input type="hidden" id="stfId" value="${editing ? editing.id : ""}">
        <div class="grid cols-2">
          <div class="field"><label>Name *</label><input type="text" id="stfName" required value="${editing ? escapeHtml(editing.name) : ""}"></div>
          <div class="field"><label>Phone</label><input type="tel" id="stfPhone" maxlength="10" value="${editing ? editing.phone : ""}"></div>
        </div>
        <div class="grid cols-3">
          <div class="field"><label>Role</label><input type="text" id="stfRole" value="${editing ? escapeHtml(editing.role || "") : "Sales Associate"}"></div>
          <div class="field"><label>Monthly Salary (₹) *</label><input type="number" id="stfSalary" min="0" required value="${editing ? editing.monthlySalary : 0}"></div>
          <div class="field"><label>Join Date</label><input type="date" id="stfJoinDate" value="${editing ? editing.joinDate : LFS.todayISO()}"></div>
        </div>
        <div class="field"><label><input type="checkbox" id="stfActive" ${!editing || editing.active ? "checked" : ""} style="width:auto;display:inline-block;margin-right:6px;">Active employee</label></div>
        <div class="flex gap-8">
          <button class="btn btn-primary" type="submit">${editing ? "Save Changes" : "Add Employee"}</button>
          ${editing ? `<button type="button" class="btn btn-outline" onclick="EDIT_STAFF_ID=null;renderAdminModule();">Cancel</button>` : ""}
        </div>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Employees (${staff.length})</h2><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printStaffReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.exportModule('lfs_staff')">Export JSON</button></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${staff.map(s => `
              <tr>
                <td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.role || "")}</td><td>${s.phone || "-"}</td><td>${LFS.formatMoney(s.monthlySalary)}</td>
                <td><span class="badge ${s.active ? 'badge-available' : 'badge-neutral'}">${s.active ? "Active" : "Inactive"}</span></td>
                <td class="flex gap-8">
                  <button class="btn btn-outline btn-sm" onclick="EDIT_STAFF_ID='${s.id}';renderAdminModule();">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Delete</button>
                </td>
              </tr>`).join("") || `<tr><td colspan="6" class="text-soft">No employees yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function saveStaff(e) {
  e.preventDefault();
  const staff = LFS.get("lfs_staff");
  const id = document.getElementById("stfId").value;
  const data = {
    id: id || LFS.uid("stf"),
    name: document.getElementById("stfName").value.trim(),
    phone: document.getElementById("stfPhone").value.trim(),
    role: document.getElementById("stfRole").value.trim(),
    monthlySalary: Number(document.getElementById("stfSalary").value) || 0,
    joinDate: document.getElementById("stfJoinDate").value,
    active: document.getElementById("stfActive").checked
  };
  if (id) staff[staff.findIndex(s => s.id === id)] = data; else staff.push(data);
  LFS.set("lfs_staff", staff);
  EDIT_STAFF_ID = null;
  toast("Employee saved");
  renderAdminModule();
}
function printStaffReport() {
  const staff = LFS.get("lfs_staff");
  const rows = staff.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.role || "")}</td><td>${s.phone || "-"}</td><td>${LFS.formatMoney(s.monthlySalary)}</td><td>${s.active ? "Active" : "Inactive"}</td></tr>`).join("") || `<tr><td colspan="5">No employees.</td></tr>`;
  LFS.printReport("Employee Profiles Report", `<table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function deleteStaff(id) {
  if (!confirm("Remove this employee record?")) return;
  LFS.set("lfs_staff", LFS.get("lfs_staff").filter(s => s.id !== id));
  toast("Employee removed");
  renderAdminModule();
}

function renderStaffAttendance() {
  const staff = LFS.get("lfs_staff");
  const thisMonth = currentMonthStr(0);
  const lastMonth = currentMonthStr(-1);
  return `
    <div class="card">
      <h2>Log a Leave Day</h2>
      <form id="attendanceForm">
        <div class="grid cols-3">
          <div class="field"><label>Employee</label><select id="attStaff">${staff.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Date</label><input type="date" id="attDate" value="${LFS.todayISO()}"></div>
          <div class="field"><label>Reason</label><input type="text" id="attReason" placeholder="e.g. Sick, Personal"></div>
        </div>
        <button class="btn btn-primary" type="submit">Log Leave</button>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Leave &amp; Salary Summary</h2><button class="btn btn-outline btn-sm" onclick="printAttendanceReport()">Print</button></div>
      <p class="text-soft">Employees may take up to 4 leave days per month without deduction. Beyond that, each extra day is deducted at (monthly salary ÷ 30) per day.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Leaves - ${lastMonth}</th><th>Leaves - ${thisMonth}</th><th>Per-day Rate</th><th>Deduction (this month)</th><th>Final Salary (this month)</th></tr></thead>
          <tbody>
            ${staff.map(s => {
              const cur = payrollFor(s, thisMonth);
              const lastLeaves = countLeaves(s.id, lastMonth);
              return `<tr>
                <td>${escapeHtml(s.name)}</td>
                <td>${lastLeaves}</td>
                <td>${cur.leaves}${cur.excess > 0 ? ` <span class="badge badge-rented">${cur.excess} over limit</span>` : ""}</td>
                <td>${LFS.formatMoney(cur.perDay)}</td>
                <td>${LFS.formatMoney(cur.deduction)}</td>
                <td style="font-weight:700;color:var(--maroon);">${LFS.formatMoney(cur.finalSalary)}</td>
              </tr>`;
            }).join("") || `<tr><td colspan="6" class="text-soft">No employees yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function printAttendanceReport() {
  const staff = LFS.get("lfs_staff");
  const thisMonth = currentMonthStr(0);
  const rows = staff.map(s => {
    const p = payrollFor(s, thisMonth);
    return `<tr><td>${escapeHtml(s.name)}</td><td>${LFS.formatMoney(s.monthlySalary)}</td><td>${p.leaves}</td><td>${LFS.formatMoney(p.deduction)}</td><td>${LFS.formatMoney(p.finalSalary)}</td></tr>`;
  }).join("") || `<tr><td colspan="5">No employees.</td></tr>`;
  LFS.printReport(`Leave &amp; Salary Summary - ${thisMonth}`, `<table><thead><tr><th>Employee</th><th>Base Salary</th><th>Leaves Taken</th><th>Deduction</th><th>Payable</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function saveAttendance(e) {
  e.preventDefault();
  const att = LFS.get("lfs_attendance");
  att.push({
    id: LFS.uid("att"),
    staffId: document.getElementById("attStaff").value,
    date: document.getElementById("attDate").value || LFS.todayISO(),
    type: "leave",
    reason: document.getElementById("attReason").value.trim()
  });
  LFS.set("lfs_attendance", att);
  toast("Leave logged");
  renderAdminModule();
}

/* ============================================================
   EXPENSES TRACKING
   ============================================================ */
function renderExpensesModule() {
  return `
    <div class="subtab-nav" style="padding:0 0 12px;">
      <button class="subtab-btn ${EXPENSE_SUBTAB === "log" ? "active" : ""}" data-subtab-group="expenses" data-sub="log">Log Store Monthly Expense</button>
      <button class="subtab-btn ${EXPENSE_SUBTAB === "upcoming" ? "active" : ""}" data-subtab-group="expenses" data-sub="upcoming">Upcoming Expenses</button>
    </div>
    ${EXPENSE_SUBTAB === "log" ? renderExpenseLog() : renderUpcomingExpenses()}
  `;
}
function renderExpenseLog() {
  const expenses = LFS.get("lfs_expenses").slice().reverse();
  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return `
    <div class="card">
      <h2>Log Expense</h2>
      <form id="expenseForm">
        <div class="grid cols-3">
          <div class="field"><label>Category</label><select id="expCategory"><option>Rent</option><option>Electricity</option><option>Tax</option><option>Salaries</option><option>Maintenance</option><option>Others</option></select></div>
          <div class="field"><label>Amount (₹) *</label><input type="number" id="expAmount" min="0" required></div>
          <div class="field"><label>Date</label><input type="date" id="expDate" value="${LFS.todayISO()}"></div>
        </div>
        <div class="field"><label>Description</label><input type="text" id="expDesc" placeholder="e.g. July shop rent"></div>
        <button class="btn btn-primary" type="submit">Save Expense</button>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Expense Log</h2><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printExpensesReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('expenses.csv', LFS.get('lfs_expenses'))">Export CSV</button></div></div>
      <div class="stat-box mt-8" style="max-width:220px;"><div class="num">${LFS.formatMoney(total)}</div><div class="lbl">Total Logged</div></div>
      <div class="table-wrap mt-16">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${expenses.map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${escapeHtml(e.description)}</td><td>${LFS.formatMoney(e.amount)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-soft">No expenses logged.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}
function saveExpense(e) {
  e.preventDefault();
  const expenses = LFS.get("lfs_expenses");
  const date = document.getElementById("expDate").value || LFS.todayISO();
  expenses.push({
    id: LFS.uid("exp"),
    category: document.getElementById("expCategory").value,
    description: document.getElementById("expDesc").value.trim(),
    amount: Number(document.getElementById("expAmount").value) || 0,
    date, month: date.slice(0, 7)
  });
  LFS.set("lfs_expenses", expenses);
  toast("Expense saved");
  renderAdminModule();
}
function printExpensesReport() {
  const expenses = LFS.get("lfs_expenses").slice().reverse();
  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const rows = expenses.map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${escapeHtml(e.description)}</td><td>${LFS.formatMoney(e.amount)}</td></tr>`).join("") || `<tr><td colspan="4">No expenses.</td></tr>`;
  LFS.printReport("Store Expense Log", `<table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:10px;font-weight:700;">Total: ${LFS.formatMoney(total)}</p>`);
}
function renderUpcomingExpenses() {
  const thisMonth = currentMonthStr(0);
  const staff = LFS.get("lfs_staff").filter(s => s.active);
  const recurring = LFS.get("lfs_expenses").filter(e => e.month === thisMonth);
  const payroll = staff.map(s => ({ s, p: payrollFor(s, thisMonth) }));
  const salaryTotal = payroll.reduce((sum, r) => sum + r.p.finalSalary, 0);
  const recurringTotal = recurring.reduce((sum, e) => sum + Number(e.amount), 0);
  return `
    <div class="card">
      <h2>Upcoming Expenses - ${thisMonth}</h2>
      <div class="grid cols-3">
        <div class="stat-box"><div class="num">${LFS.formatMoney(recurringTotal)}</div><div class="lbl">Logged This Month</div></div>
        <div class="stat-box"><div class="num">${LFS.formatMoney(salaryTotal)}</div><div class="lbl">Payroll Due (leave-adjusted)</div></div>
        <div class="stat-box"><div class="num">${LFS.formatMoney(recurringTotal + salaryTotal)}</div><div class="lbl">Projected Total</div></div>
      </div>
      <h3 class="mt-16">Payroll Breakdown</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Base Salary</th><th>Leaves Taken</th><th>Deduction</th><th>Payable</th></tr></thead>
          <tbody>${payroll.map(r => `<tr><td>${escapeHtml(r.s.name)}</td><td>${LFS.formatMoney(r.s.monthlySalary)}</td><td>${r.p.leaves}</td><td>${LFS.formatMoney(r.p.deduction)}</td><td style="font-weight:700;">${LFS.formatMoney(r.p.finalSalary)}</td></tr>`).join("") || `<tr><td colspan="5" class="text-soft">No active staff.</td></tr>`}</tbody>
        </table>
      </div>
      <h3 class="mt-16">Other Logged Expenses This Month</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${recurring.map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${escapeHtml(e.description)}</td><td>${LFS.formatMoney(e.amount)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-soft">Nothing logged yet this month.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ============================================================
   JEWELLERY USAGE REPORT
   ============================================================ */
function renderUsageModule() {
  const items = LFS.get("lfs_rental_items").slice().sort((a, b) => (b.timesRented || 0) - (a.timesRented || 0));
  return `
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Jewellery Usage &amp; Earnings</h2><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printUsageReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('jewellery_usage.csv', LFS.get('lfs_rental_items').map(i=>({item:i.itemName,code:i.itemCode,timesRented:i.timesRented||0,totalEarned:i.totalEarned||0})))">Export CSV</button></div></div>
      <p class="text-soft">How often each imitation jewellery piece has gone out for rent, and total earnings generated.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Code</th><th>Times Rented</th><th>Total Earned</th><th>Current Status</th></tr></thead>
          <tbody>
            ${items.map(i => `<tr><td>${escapeHtml(i.itemName)}</td><td class="mono">${i.itemCode}</td><td>${i.timesRented || 0}</td><td>${LFS.formatMoney(i.totalEarned || 0)}</td><td><span class="badge ${i.status === 'available' ? 'badge-available' : 'badge-rented'}">${i.status}</span></td></tr>`).join("") || `<tr><td colspan="5" class="text-soft">No rental items yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function printUsageReport() {
  const items = LFS.get("lfs_rental_items").slice().sort((a, b) => (b.timesRented || 0) - (a.timesRented || 0));
  const rows = items.map(i => `<tr><td>${escapeHtml(i.itemName)}</td><td>${i.itemCode}</td><td>${i.timesRented || 0}</td><td>${LFS.formatMoney(i.totalEarned || 0)}</td><td>${i.status}</td></tr>`).join("") || `<tr><td colspan="5">No items.</td></tr>`;
  LFS.printReport("Jewellery Usage &amp; Earnings Report", `<table><thead><tr><th>Item</th><th>Code</th><th>Times Rented</th><th>Total Earned</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
}

/* ============================================================
   OVERALL SALES REPORT
   ============================================================ */
function renderSalesReportModule() {
  const sales = LFS.get("lfs_sales");
  const rentals = LFS.get("lfs_rentals");
  const salesTotal = sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const rentalTotal = rentals.reduce((s, x) => s + Number(x.total || 0), 0);
  const pendingBalance = rentals.filter(r => r.status === "active").reduce((s, x) => s + Number(x.balance || 0), 0);
  return `
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Overall Sales Overview</h2><button class="btn btn-outline btn-sm" onclick="printSalesOverviewReport()">Print Overview</button></div>
      <div class="grid cols-4">
        <div class="stat-box"><div class="num">${LFS.formatMoney(salesTotal)}</div><div class="lbl">Daily Sales Revenue</div></div>
        <div class="stat-box"><div class="num">${LFS.formatMoney(rentalTotal)}</div><div class="lbl">Rental Revenue</div></div>
        <div class="stat-box"><div class="num">${sales.length + rentals.length}</div><div class="lbl">Total Transactions</div></div>
        <div class="stat-box"><div class="num">${LFS.formatMoney(pendingBalance)}</div><div class="lbl">Pending Balances</div></div>
      </div>
    </div>
    <div class="card">
      <div class="flex-between"><h3 style="margin:0;">Daily Sales</h3><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printDailySalesReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('sales.csv', LFS.get('lfs_sales'))">Export CSV</button></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Customer</th><th>Total</th></tr></thead>
          <tbody>${sales.slice().reverse().slice(0, 50).map(s => `<tr><td>${s.date}</td><td>${escapeHtml(s.itemName)}</td><td>${s.quantity}</td><td>${escapeHtml(s.customerName || "Walk-in")}</td><td>${LFS.formatMoney(s.total)}</td></tr>`).join("") || `<tr><td colspan="5" class="text-soft">No sales yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="flex-between"><h3 style="margin:0;">Rentals</h3><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printRentalsReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('rentals.csv', LFS.get('lfs_rentals'))">Export CSV</button></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Customer</th><th>Status</th><th>Total</th><th>Balance</th></tr></thead>
          <tbody>${rentals.slice().reverse().slice(0, 50).map(r => `<tr><td>${r.rentalDate}</td><td>${escapeHtml(r.itemName)}</td><td>${escapeHtml(r.customerName)}</td><td>${r.status}</td><td>${LFS.formatMoney(r.total)}</td><td>${LFS.formatMoney(r.balance)}</td></tr>`).join("") || `<tr><td colspan="6" class="text-soft">No rentals yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function printSalesOverviewReport() {
  const sales = LFS.get("lfs_sales");
  const rentals = LFS.get("lfs_rentals");
  const salesTotal = sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const rentalTotal = rentals.reduce((s, x) => s + Number(x.total || 0), 0);
  const pendingBalance = rentals.filter(r => r.status === "active").reduce((s, x) => s + Number(x.balance || 0), 0);
  const body = `
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      <tr><td>Daily Sales Revenue</td><td>${LFS.formatMoney(salesTotal)}</td></tr>
      <tr><td>Rental Revenue</td><td>${LFS.formatMoney(rentalTotal)}</td></tr>
      <tr><td>Total Transactions</td><td>${sales.length + rentals.length}</td></tr>
      <tr><td>Pending Balances</td><td>${LFS.formatMoney(pendingBalance)}</td></tr>
    </tbody></table>`;
  LFS.printReport("Overall Sales Overview", body);
}

function printDailySalesReport() {
  const sales = LFS.get("lfs_sales").slice().reverse();
  const rows = sales.map(s => `<tr><td>${s.date}</td><td>${escapeHtml(s.itemName)}</td><td>${s.quantity}</td><td>${escapeHtml(s.customerName || "Walk-in")}</td><td>${LFS.formatMoney(s.total)}</td></tr>`).join("") || `<tr><td colspan="5">No sales.</td></tr>`;
  LFS.printReport("Daily Sales Report", `<table><thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Customer</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function printRentalsReport() {
  const rentals = LFS.get("lfs_rentals").slice().reverse();
  const rows = rentals.map(r => `<tr><td>${r.rentalDate}</td><td>${escapeHtml(r.itemName)}</td><td>${escapeHtml(r.customerName)}</td><td>${r.status}</td><td>${LFS.formatMoney(r.total)}</td><td>${LFS.formatMoney(r.balance)}</td></tr>`).join("") || `<tr><td colspan="6">No rentals.</td></tr>`;
  LFS.printReport("Rentals Report", `<table><thead><tr><th>Date</th><th>Item</th><th>Customer</th><th>Status</th><th>Total</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>`);
}

/* ============================================================
   CUSTOMER MANAGEMENT
   ============================================================ */
function renderCustomersModule() {
  const customers = LFS.get("lfs_customers");
  const editing = EDIT_CUSTOMER_ID ? customers.find(c => c.id === EDIT_CUSTOMER_ID) : null;
  return `
    <div class="card">
      <h2>${editing ? "Edit Customer" : "Add Customer"}</h2>
      <form id="customerForm">
        <input type="hidden" id="cusId" value="${editing ? editing.id : ""}">
        <div class="grid cols-2">
          <div class="field"><label>Name *</label><input type="text" id="cusName" required value="${editing ? escapeHtml(editing.name) : ""}"></div>
          <div class="field"><label>Phone *</label><input type="tel" id="cusPhone" maxlength="10" required value="${editing ? editing.phone : ""}"></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Address</label><input type="text" id="cusAddress" value="${editing ? escapeHtml(editing.address || "") : ""}"></div>
          <div class="field"><label>Region</label><select id="cusRegion">${LFS_REGIONS.map(r => `<option ${editing && editing.region === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        </div>
        <div class="grid cols-3">
          <div class="field"><label>Loyalty Points</label><input type="number" id="cusPoints" value="${editing ? editing.loyaltyPoints || 0 : 0}"></div>
          <div class="field"><label><input type="checkbox" id="cusRepeat" ${editing && editing.repeatCustomer ? "checked" : ""} style="width:auto;display:inline-block;margin-right:6px;">Repeat customer</label></div>
          <div class="field"><label><input type="checkbox" id="cusReview" ${editing && editing.reviewGiven ? "checked" : ""} style="width:auto;display:inline-block;margin-right:6px;">Gave online review</label></div>
        </div>
        <div class="field"><label>Review Platform</label><select id="cusReviewPlatform"><option value="">-</option><option ${editing && editing.reviewPlatform === "Google" ? "selected" : ""}>Google</option><option ${editing && editing.reviewPlatform === "Instagram" ? "selected" : ""}>Instagram</option><option ${editing && editing.reviewPlatform === "Facebook" ? "selected" : ""}>Facebook</option></select></div>
        <div class="flex gap-8">
          <button class="btn btn-primary" type="submit">${editing ? "Save Changes" : "Add Customer"}</button>
          ${editing ? `<button type="button" class="btn btn-outline" onclick="EDIT_CUSTOMER_ID=null;renderAdminModule();">Cancel</button>` : ""}
        </div>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Customers (${customers.length})</h2><div class="flex gap-8"><button class="btn btn-outline btn-sm" onclick="printCustomersReport()">Print</button><button class="btn btn-outline btn-sm" onclick="LFS.exportModule('lfs_customers')">Export JSON</button></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Region</th><th>Points</th><th>Repeat</th><th></th></tr></thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td>${escapeHtml(c.name)}</td><td class="mono">${c.phone}</td><td>${c.region || "-"}</td><td>${c.loyaltyPoints || 0}</td>
                <td>${c.repeatCustomer ? "Yes" : "No"}</td>
                <td class="flex gap-8">
                  <button class="btn btn-outline btn-sm" onclick="EDIT_CUSTOMER_ID='${c.id}';renderAdminModule();">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Delete</button>
                </td>
              </tr>`).join("") || `<tr><td colspan="6" class="text-soft">No customers yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function saveCustomer(e) {
  e.preventDefault();
  const phone = document.getElementById("cusPhone").value.trim();
  if (!LFS.isValidPhone(phone)) { toast("Enter a valid 10-digit phone number"); return; }
  const customers = LFS.get("lfs_customers");
  const id = document.getElementById("cusId").value;
  const data = {
    id: id || LFS.uid("cus"),
    name: document.getElementById("cusName").value.trim(),
    phone,
    address: document.getElementById("cusAddress").value.trim(),
    region: document.getElementById("cusRegion").value,
    loyaltyPoints: Number(document.getElementById("cusPoints").value) || 0,
    repeatCustomer: document.getElementById("cusRepeat").checked,
    reviewGiven: document.getElementById("cusReview").checked,
    reviewPlatform: document.getElementById("cusReviewPlatform").value,
    notes: id ? (customers.find(c => c.id === id) || {}).notes || "" : ""
  };
  if (id) customers[customers.findIndex(c => c.id === id)] = data; else customers.push(data);
  LFS.set("lfs_customers", customers);
  EDIT_CUSTOMER_ID = null;
  toast("Customer saved");
  renderAdminModule();
}
function printCustomersReport() {
  const customers = LFS.get("lfs_customers");
  const rows = customers.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${c.phone}</td><td>${c.region || "-"}</td><td>${c.loyaltyPoints || 0}</td><td>${c.repeatCustomer ? "Yes" : "No"}</td></tr>`).join("") || `<tr><td colspan="5">No customers.</td></tr>`;
  LFS.printReport("Customer Directory Report", `<table><thead><tr><th>Name</th><th>Phone</th><th>Region</th><th>Points</th><th>Repeat</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function deleteCustomer(id) {
  if (!confirm("Delete this customer?")) return;
  LFS.set("lfs_customers", LFS.get("lfs_customers").filter(c => c.id !== id));
  toast("Customer deleted");
  renderAdminModule();
}

/* ============================================================
   LOYALTY, DISCOUNTS & FLASH SALE
   ============================================================ */
function renderLoyaltyModule() {
  const l = LFS.get("lfs_loyalty");
  return `
    <div class="card">
      <h2>Loyalty Points &amp; Discount Rules</h2>
      <form id="loyaltyForm">
        <div class="grid cols-2">
          <div class="field"><label>Points earned per ₹100 spent</label><input type="number" id="loyPoints" min="0" value="${l.pointsPer100Rupees}"></div>
          <div class="field"><label>Repeat customer discount (%)</label><input type="number" id="loyRepeat" min="0" max="100" value="${l.repeatCustomerDiscountPercent}"></div>
        </div>
        <div class="field"><label>Discount for customers who left a review (₹)</label><input type="number" id="loyReview" min="0" value="${l.reviewDiscountAmount}"></div>
        <h3 class="mt-16">Flash Sale</h3>
        <div class="field"><label><input type="checkbox" id="loyFlashEnabled" ${l.flashSale && l.flashSale.enabled ? "checked" : ""} style="width:auto;display:inline-block;margin-right:6px;">Enable flash sale</label></div>
        <div class="grid cols-3">
          <div class="field"><label>Discount (%)</label><input type="number" id="loyFlashPct" min="0" max="100" value="${l.flashSale ? l.flashSale.discountPercent : 0}"></div>
          <div class="field"><label>From Date</label><input type="date" id="loyFlashFrom" value="${l.flashSale ? l.flashSale.fromDate : ""}"></div>
          <div class="field"><label>To Date</label><input type="date" id="loyFlashTo" value="${l.flashSale ? l.flashSale.toDate : ""}"></div>
        </div>
        <button class="btn btn-primary" type="submit">Save Loyalty Settings</button>
      </form>
    </div>
  `;
}
function saveLoyalty(e) {
  e.preventDefault();
  const data = {
    pointsPer100Rupees: Number(document.getElementById("loyPoints").value) || 0,
    repeatCustomerDiscountPercent: Number(document.getElementById("loyRepeat").value) || 0,
    reviewDiscountAmount: Number(document.getElementById("loyReview").value) || 0,
    flashSale: {
      enabled: document.getElementById("loyFlashEnabled").checked,
      discountPercent: Number(document.getElementById("loyFlashPct").value) || 0,
      fromDate: document.getElementById("loyFlashFrom").value,
      toDate: document.getElementById("loyFlashTo").value,
      appliesTo: "all"
    }
  };
  LFS.set("lfs_loyalty", data);
  toast("Loyalty settings saved");
  renderAdminModule();
}

/* ============================================================
   STORE PERSONALIZATION
   ============================================================ */
function renderPersonalizationModule() {
  const s = LFS.get("lfs_settings");
  return `
    <div class="card">
      <h2>Store Personalization</h2>
      <form id="personalizationForm">
        <div class="grid cols-2">
          <div class="field"><label>Store Name</label><input type="text" id="pStoreName" value="${escapeHtml(s.storeName || "")}"></div>
          <div class="field"><label>Branch</label><input type="text" id="pBranch" value="${escapeHtml(s.branch || "")}"></div>
        </div>
        <div class="field"><label>Business Type</label><input type="text" id="pBusinessType" value="${escapeHtml(s.businessType || "")}"></div>
        <div class="grid cols-2">
          <div class="field"><label>Address</label><input type="text" id="pAddress" value="${escapeHtml(s.address || "")}"></div>
          <div class="field"><label>Region</label><select id="pRegion">${LFS_REGIONS.map(r => `<option ${s.region === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label>Phone</label><input type="tel" id="pPhone" maxlength="10" value="${s.phone || ""}"></div>
          <div class="field"><label>Email</label><input type="email" id="pEmail" value="${escapeHtml(s.email || "")}"></div>
        </div>
        <div class="field"><label>GST Number</label><input type="text" id="pGST" value="${escapeHtml(s.gstNumber || "")}"></div>
        <h3 class="mt-16">Social Media</h3>
        <div class="grid cols-2">
          <div class="field"><label>Facebook</label><input type="text" id="pFacebook" value="${escapeHtml((s.social || {}).facebook || "")}"></div>
          <div class="field"><label>Instagram</label><input type="text" id="pInstagram" value="${escapeHtml((s.social || {}).instagram || "")}"></div>
          <div class="field"><label>Twitter / X</label><input type="text" id="pTwitter" value="${escapeHtml((s.social || {}).twitter || "")}"></div>
          <div class="field"><label>WhatsApp</label><input type="text" id="pWhatsapp" value="${escapeHtml((s.social || {}).whatsapp || "")}"></div>
        </div>
        <h3 class="mt-16">Logo</h3>
        <div class="field"><label>Upload Logo</label><input type="file" id="pLogo" accept="image/*"></div>
        <h3 class="mt-16">QR Codes (shown to customers during billing)</h3>
        <div class="grid cols-2">
          <div class="field"><label>Store Location QR</label><input type="file" id="pQrLocation" accept="image/*"></div>
          <div class="field"><label>GPay QR</label><input type="file" id="pQrGpay" accept="image/*"></div>
          <div class="field"><label>PhonePe QR</label><input type="file" id="pQrPhonepe" accept="image/*"></div>
          <div class="field"><label>Google Review QR</label><input type="file" id="pQrReview" accept="image/*"></div>
        </div>
        <button class="btn btn-primary" type="submit">Save Store Settings</button>
      </form>
    </div>
  `;
}
function savePersonalization(e) {
  e.preventDefault();
  const s = LFS.get("lfs_settings");
  const email = document.getElementById("pEmail").value.trim();
  if (email && !LFS.isValidEmail(email)) { toast("Enter a valid email address"); return; }
  const fields = ["pLogo", "pQrLocation", "pQrGpay", "pQrPhonepe", "pQrReview"];
  const reads = fields.map(id => new Promise(resolve => readImageAsDataURL(document.getElementById(id), resolve)));
  Promise.all(reads).then(([logo, qrLoc, qrGpay, qrPhonepe, qrReview]) => {
    const updated = {
      ...s,
      storeName: document.getElementById("pStoreName").value.trim(),
      branch: document.getElementById("pBranch").value.trim(),
      businessType: document.getElementById("pBusinessType").value.trim(),
      address: document.getElementById("pAddress").value.trim(),
      region: document.getElementById("pRegion").value,
      phone: document.getElementById("pPhone").value.trim(),
      email,
      gstNumber: document.getElementById("pGST").value.trim(),
      social: {
        facebook: document.getElementById("pFacebook").value.trim(),
        instagram: document.getElementById("pInstagram").value.trim(),
        twitter: document.getElementById("pTwitter").value.trim(),
        whatsapp: document.getElementById("pWhatsapp").value.trim()
      },
      logoDataUrl: logo || s.logoDataUrl,
      qrCodes: {
        storeLocation: qrLoc || (s.qrCodes || {}).storeLocation || "",
        gpay: qrGpay || (s.qrCodes || {}).gpay || "",
        phonepe: qrPhonepe || (s.qrCodes || {}).phonepe || "",
        googleReview: qrReview || (s.qrCodes || {}).googleReview || ""
      }
    };
    LFS.set("lfs_settings", updated);
    toast("Store settings saved");
    paintAdminHeader();
    renderAdminModule();
  });
}

/* ============================================================
   SECURITY (password reset)
   ============================================================ */
function renderSecurityModule() {
  return `
    <div class="card">
      <h2>Security &amp; Passwords</h2>
      <p class="text-soft">Both the Sales Person and Admin passwords can be reset here. Everyone will need to re-enter the new password the next time they open a protected tab.</p>
      <form id="securityForm">
        <div class="field"><label>Current Admin Password *</label><input type="password" id="secCurrentAdmin" required></div>
        <div class="grid cols-2">
          <div class="field"><label>New Sales Person Password</label><input type="password" id="secNewSales" placeholder="Leave blank to keep unchanged"></div>
          <div class="field"><label>New Admin Password</label><input type="password" id="secNewAdmin" placeholder="Leave blank to keep unchanged"></div>
        </div>
        <button class="btn btn-primary" type="submit">Update Passwords</button>
      </form>
    </div>
  `;
}
function saveSecurity(e) {
  e.preventDefault();
  const current = document.getElementById("secCurrentAdmin").value;
  if (!LFS.checkPassword(current, "adminPassword")) { toast("Current admin password is incorrect"); return; }
  const s = LFS.get("lfs_settings");
  const newSales = document.getElementById("secNewSales").value;
  const newAdmin = document.getElementById("secNewAdmin").value;
  if (newSales) s.salesPersonPassword = newSales;
  if (newAdmin) s.adminPassword = newAdmin;
  LFS.set("lfs_settings", s);
  document.getElementById("securityForm").reset();
  toast("Passwords updated");
}

/* ============================================================
   BACKUP, EXPORT / IMPORT
   ============================================================ */
function renderBackupModule() {
  const s = LFS.get("lfs_settings");
  const lastBackup = localStorage.getItem("lfs_last_backup") || "Never";
  return `
    <div class="card">
      <h2>Auto Backup</h2>
      <p class="text-soft">Automatically downloads a full backup JSON file to the sales device's Downloads folder at the configured interval. Save that file into your GitHub repo's <code>/data</code> folder workflow to restore it on next deploy.</p>
      <div class="field" style="max-width:220px;">
        <label>Auto-backup every (hours)</label>
        <input type="number" id="backupHours" min="0" value="${s.autoBackupHours || 0}" onchange="updateBackupHours(this.value)">
      </div>
      <p class="text-soft">Last full backup: ${lastBackup === "Never" ? "Never" : new Date(lastBackup).toLocaleString()}</p>
      <button class="btn btn-gold" onclick="LFS.exportFullBackup(); renderAdminModule();">Download Full Backup Now</button>
    </div>
    <div class="card">
      <h2>Restore from Backup</h2>
      <p class="text-soft">Importing a full backup replaces all module data in this browser with the file's contents.</p>
      <input type="file" id="restoreInput" accept="application/json">
      <button class="btn btn-outline mt-8" onclick="restoreFullBackup()">Restore</button>
    </div>
    <div class="card">
      <h2>Per-Module Export (for GitHub Pages seed data)</h2>
      <div class="grid cols-3">
        ${Object.keys(LFS.SEED_MAP).map(k => `<button class="btn btn-outline btn-sm" onclick="LFS.exportModule('${k}')">${LFS.SEED_MAP[k]}</button>`).join("")}
      </div>
    </div>
    <div class="card">
      <h2>CSV Export (for external billing / GST filing)</h2>
      <div class="grid cols-3">
        <button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('sales.csv', LFS.get('lfs_sales'))">Sales CSV</button>
        <button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('rentals.csv', LFS.get('lfs_rentals'))">Rentals CSV</button>
        <button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('customers.csv', LFS.get('lfs_customers'))">Customers CSV</button>
        <button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('expenses.csv', LFS.get('lfs_expenses'))">Expenses CSV</button>
        <button class="btn btn-outline btn-sm" onclick="LFS.downloadCSV('inventory.csv', LFS.get('lfs_inventory'))">Stock CSV</button>
      </div>
    </div>
  `;
}
function updateBackupHours(val) {
  const s = LFS.get("lfs_settings");
  s.autoBackupHours = Number(val) || 0;
  LFS.set("lfs_settings", s);
  toast("Auto-backup interval updated");
}
function restoreFullBackup() {
  const input = document.getElementById("restoreInput");
  if (!input.files[0]) { toast("Choose a backup file first"); return; }
  if (!confirm("This will overwrite current data in this browser. Continue?")) return;
  LFS.importFullBackup(input.files[0]).then(() => {
    toast("Backup restored");
    paintAdminHeader();
    renderAdminModule();
  }).catch(() => toast("Could not read that file"));
}

/* ---------- form handler map (wired in wireAdminEvents) ---------- */
const FORM_HANDLERS = {
  stockForm: saveStockItem,
  rentalInvForm: saveRentalItem,
  staffForm: saveStaff,
  attendanceForm: saveAttendance,
  expenseForm: saveExpense,
  customerForm: saveCustomer,
  loyaltyForm: saveLoyalty,
  personalizationForm: savePersonalization,
  securityForm: saveSecurity
};

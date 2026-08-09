/* ============================================================
   Lakshmi Fancy Store - app.js (Sales Person side, index.html)
   ============================================================ */

let CURRENT_TAB = "daily";
let CURRENT_RENTAL_SUBTAB = "new";
let SELECTED_RENTAL_ITEM = null;

document.addEventListener("DOMContentLoaded", async () => {
  await LFS.init();
  LFS.scheduleAutoBackup();
  paintHeader();
  if (LFS.isAuthed("lfs_auth_sales")) {
    showApp();
  } else {
    showLogin();
  }
});

/* ---------- header ---------- */
function paintHeader() {
  const s = LFS.get("lfs_settings");
  document.title = s.storeName || "Lakshmi Fancy Store";
  const logoSlot = document.getElementById("logoSlot");
  if (logoSlot) {
    logoSlot.innerHTML = s.logoDataUrl
      ? `<img class="logo" src="${s.logoDataUrl}" alt="logo">`
      : `<div class="logo-fallback">${(s.storeName || "L").charAt(0)}</div>`;
  }
  const nameSlot = document.getElementById("storeNameSlot");
  if (nameSlot) nameSlot.textContent = s.storeName || "Lakshmi Fancy Store";
  const subSlot = document.getElementById("storeSubSlot");
  if (subSlot) subSlot.textContent = s.branch || "";
}

/* ---------- login ---------- */
function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("appScreen").classList.add("hidden");
}

function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  renderTab();
}

function attemptLogin(e) {
  e.preventDefault();
  const pw = document.getElementById("loginPassword").value;
  if (LFS.checkPassword(pw, "salesPersonPassword")) {
    LFS.setAuthed("lfs_auth_sales");
    document.getElementById("loginError").classList.add("hidden");
    document.getElementById("loginPassword").value = "";
    showApp();
  } else {
    document.getElementById("loginError").classList.remove("hidden");
  }
}

function doLogout() {
  LFS.logout("lfs_auth_sales");
  showLogin();
}

/* ---------- tab switching ---------- */
function switchTab(tab) {
  CURRENT_TAB = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  renderTab();
}

function switchRentalSubtab(sub) {
  CURRENT_RENTAL_SUBTAB = sub;
  renderTab();
}

function renderTab() {
  const main = document.getElementById("mainContent");
  if (CURRENT_TAB === "daily") main.innerHTML = renderDailySales();
  else if (CURRENT_TAB === "rental") main.innerHTML = renderRentalTab();
  else if (CURRENT_TAB === "catalog") main.innerHTML = renderCatalog();
  wireTabEvents();
}

/* ============================================================
   DAILY SALES
   ============================================================ */
function renderDailySales() {
  const inv = LFS.get("lfs_inventory");
  const sales = LFS.get("lfs_sales").slice().reverse().slice(0, 25);
  const options = inv.map(i => `<option value="${i.id}">${i.itemName} (${i.itemCode}) - ${LFS.formatMoney(i.price)} - Qty ${i.quantityAvailable}</option>`).join("");
  return `
    <div class="card">
      <h2>Daily Sales Entry</h2>
      <p class="text-soft">Quick sale of small fancy items from current stock.</p>
      <form id="dailySaleForm">
        <div class="grid cols-2">
          <div class="field">
            <label>Customer Phone (optional)</label>
            <input type="tel" id="dsPhone" maxlength="10" placeholder="10-digit mobile number" oninput="lookupDailyCustomer()">
            <div class="error-msg hidden" id="dsPhoneErr">Enter a valid 10-digit number</div>
          </div>
          <div class="field">
            <label>Customer Name</label>
            <input type="text" id="dsName" placeholder="Walk-in customer">
          </div>
        </div>
        <div class="field">
          <label>Item</label>
          <select id="dsItem" onchange="updateDailySaleTotals()">
            <option value="">-- Select item --</option>
            ${options}
          </select>
        </div>
        <div class="grid cols-3">
          <div class="field">
            <label>Quantity</label>
            <input type="number" id="dsQty" min="1" value="1" oninput="updateDailySaleTotals()">
          </div>
          <div class="field">
            <label>Discount (₹)</label>
            <input type="number" id="dsDiscount" min="0" value="0" oninput="updateDailySaleTotals()">
          </div>
          <div class="field">
            <label>Total</label>
            <input type="text" id="dsTotal" readonly value="₹0">
          </div>
        </div>
        <button class="btn btn-primary" type="submit">Save Sale</button>
      </form>
    </div>
    <div class="card">
      <div class="flex-between"><h3 style="margin:0;">Recent Sales</h3><button class="btn btn-outline btn-sm" onclick="printDailySalesReportSales()">Print</button></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Customer</th><th>Total</th></tr></thead>
          <tbody>
            ${sales.map(s => `<tr><td>${s.date}</td><td>${s.itemName}</td><td>${s.quantity}</td><td>${s.customerName || "Walk-in"}</td><td>${LFS.formatMoney(s.total)}</td></tr>`).join("") || `<tr><td colspan="5" class="text-soft">No sales recorded yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function printDailySalesReportSales() {
  const sales = LFS.get("lfs_sales").slice().reverse();
  const rows = sales.map(s => `<tr><td>${s.date}</td><td>${escapeHtml(s.itemName)}</td><td>${s.quantity}</td><td>${escapeHtml(s.customerName || "Walk-in")}</td><td>${LFS.formatMoney(s.total)}</td></tr>`).join("") || `<tr><td colspan="5">No sales.</td></tr>`;
  LFS.printReport("Daily Sales Report", `<table><thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Customer</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`);
}

function lookupDailyCustomer() {
  const phone = document.getElementById("dsPhone").value.trim();
  const err = document.getElementById("dsPhoneErr");
  err.classList.toggle("hidden", phone.length === 0 || LFS.isValidPhone(phone));
  if (LFS.isValidPhone(phone)) {
    const cust = LFS.get("lfs_customers").find(c => c.phone === phone);
    if (cust) document.getElementById("dsName").value = cust.name;
  }
}

function updateDailySaleTotals() {
  const inv = LFS.get("lfs_inventory");
  const item = inv.find(i => i.id === document.getElementById("dsItem").value);
  const qty = Number(document.getElementById("dsQty").value) || 0;
  const discount = Number(document.getElementById("dsDiscount").value) || 0;
  const total = item ? Math.max(0, item.price * qty - discount) : 0;
  document.getElementById("dsTotal").value = LFS.formatMoney(total);
}

function submitDailySale(e) {
  e.preventDefault();
  const phone = document.getElementById("dsPhone").value.trim();
  if (phone && !LFS.isValidPhone(phone)) { toast("Please enter a valid 10-digit phone number"); return; }
  const inv = LFS.get("lfs_inventory");
  const itemId = document.getElementById("dsItem").value;
  const item = inv.find(i => i.id === itemId);
  if (!item) { toast("Please select an item"); return; }
  const qty = Number(document.getElementById("dsQty").value) || 1;
  if (qty > item.quantityAvailable) { toast(`Only ${item.quantityAvailable} in stock`); return; }
  const discount = Number(document.getElementById("dsDiscount").value) || 0;
  const total = Math.max(0, item.price * qty - discount);
  const s = JSON.parse(sessionStorage.getItem("lfs_settings_cache") || "{}");

  const sales = LFS.get("lfs_sales");
  sales.push({
    id: LFS.uid("sal"),
    date: LFS.todayISO(),
    itemId: item.id,
    itemName: item.itemName,
    quantity: qty,
    unitPrice: item.price,
    discount,
    total,
    customerPhone: phone,
    customerName: document.getElementById("dsName").value.trim() || "Walk-in",
    soldBy: "Sales Person"
  });
  LFS.set("lfs_sales", sales);

  item.quantityAvailable = Math.max(0, item.quantityAvailable - qty);
  LFS.set("lfs_inventory", inv);

  toast("Sale saved successfully");
  renderTab();
}

/* ============================================================
   RENTAL TAB (New / Historic / Customer Requirements)
   ============================================================ */
function renderRentalTab() {
  return `
    <div class="subtab-nav" style="padding:0 0 12px;">
      <button class="subtab-btn ${CURRENT_RENTAL_SUBTAB === "new" ? "active" : ""}" data-sub="new">New Rental</button>
      <button class="subtab-btn ${CURRENT_RENTAL_SUBTAB === "historic" ? "active" : ""}" data-sub="historic">Historic / Returns</button>
      <button class="subtab-btn ${CURRENT_RENTAL_SUBTAB === "requests" ? "active" : ""}" data-sub="requests">Customer Requirements</button>
    </div>
    <div id="rentalSubContent">
      ${CURRENT_RENTAL_SUBTAB === "new" ? renderNewRental() : CURRENT_RENTAL_SUBTAB === "historic" ? renderHistoricRentals() : renderCustomerRequests()}
    </div>
  `;
}

function renderNewRental() {
  const items = LFS.get("lfs_rental_items").filter(i => i.status === "available");
  const options = items.map(i => `<option value="${i.id}">${i.itemName} (${i.itemCode}) - ${LFS.formatMoney(i.dailyRate)}/day</option>`).join("");
  return `
    <div class="card">
      <h2>New Rental - POS Terminal</h2>
      <form id="rentalForm">
        <div class="grid cols-2">
          <div class="field">
            <label>Customer Phone *</label>
            <input type="tel" id="rnPhone" maxlength="10" required placeholder="10-digit mobile number" oninput="lookupRentalCustomer()">
            <div class="error-msg hidden" id="rnPhoneErr">Enter a valid 10-digit number</div>
          </div>
          <div class="field">
            <label>Customer Name *</label>
            <input type="text" id="rnName" required>
          </div>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>Customer Address</label>
            <input type="text" id="rnAddress">
          </div>
          <div class="field">
            <label>Region</label>
            <select id="rnRegion">${LFS_REGIONS.map(r => `<option>${r}</option>`).join("")}</select>
          </div>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>Jewellery Item *</label>
            <select id="rnItem" required onchange="onRentalItemChange()">
              <option value="">-- Select item --</option>
              ${options}
            </select>
          </div>
          <div class="field">
            <label>Event Type</label>
            <select id="rnEvent">${LFS_EVENT_TYPES.map(e => `<option>${e}</option>`).join("")}</select>
          </div>
        </div>
        <div id="rnItemPreview"></div>
        <div class="grid cols-3">
          <div class="field">
            <label>Rental Date</label>
            <input type="date" id="rnDate" value="${LFS.todayISO()}" onchange="recalcRental()">
          </div>
          <div class="field">
            <label>Number of Days</label>
            <input type="number" id="rnDays" min="1" value="1" oninput="recalcRental()">
          </div>
          <div class="field">
            <label>Expected Return</label>
            <input type="text" id="rnReturnDate" readonly>
          </div>
        </div>
        <div class="grid cols-3">
          <div class="field">
            <label>Daily Rate (₹)</label>
            <input type="number" id="rnRate" min="0" value="0" oninput="recalcRental()">
          </div>
          <div class="field">
            <label>Deposit (₹)</label>
            <input type="number" id="rnDeposit" min="0" value="0" oninput="recalcRental()">
          </div>
          <div class="field">
            <label>Discount (₹) <span class="text-soft" id="rnDiscountHint"></span></label>
            <input type="number" id="rnDiscount" min="0" value="0" oninput="recalcRental()">
          </div>
        </div>
        <div class="grid cols-3">
          <div class="field">
            <label>Advance Paid (₹)</label>
            <input type="number" id="rnAdvance" min="0" value="0" oninput="recalcRental()">
          </div>
          <div class="field">
            <label>Total ((Rate×Days)+Deposit)</label>
            <input type="text" id="rnTotal" readonly>
          </div>
          <div class="field">
            <label>Balance Pending</label>
            <input type="text" id="rnBalance" readonly>
          </div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-primary" type="submit">Save Rental &amp; Print Receipt</button>
        </div>
      </form>
    </div>
    <div id="receiptSlot"></div>
  `;
}

function lookupRentalCustomer() {
  const phone = document.getElementById("rnPhone").value.trim();
  const err = document.getElementById("rnPhoneErr");
  err.classList.toggle("hidden", phone.length === 0 || LFS.isValidPhone(phone));
  if (LFS.isValidPhone(phone)) {
    const cust = LFS.get("lfs_customers").find(c => c.phone === phone);
    if (cust) {
      document.getElementById("rnName").value = cust.name;
      document.getElementById("rnAddress").value = cust.address || "";
      if (cust.region) document.getElementById("rnRegion").value = cust.region;
    }
  }
  recalcRental();
}

function onRentalItemChange() {
  const items = LFS.get("lfs_rental_items");
  const item = items.find(i => i.id === document.getElementById("rnItem").value);
  SELECTED_RENTAL_ITEM = item || null;
  document.getElementById("rnRate").value = item ? item.dailyRate : 0;
  document.getElementById("rnDeposit").value = item ? item.deposit : 0;
  document.getElementById("rnItemPreview").innerHTML = item ? `
    <div class="flex gap-8 mt-8" style="margin-bottom:10px;">
      <div style="width:60px;height:60px;border-radius:8px;overflow:hidden;background:var(--ivory-dim);display:flex;align-items:center;justify-content:center;">
        ${item.imageDataUrl ? `<img src="${item.imageDataUrl}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="color:var(--gold);font-family:'Playfair Display',serif;">L</span>`}
      </div>
      <div>
        <div style="font-weight:700;">${item.itemName}</div>
        <div class="text-soft">${item.itemCode} · ${item.itemType}</div>
      </div>
    </div>` : "";
  recalcRental();
}

function recalcRental() {
  const days = Math.max(1, Number(document.getElementById("rnDays").value) || 1);
  const date = document.getElementById("rnDate").value || LFS.todayISO();
  const rate = Number(document.getElementById("rnRate").value) || 0;
  const deposit = Number(document.getElementById("rnDeposit").value) || 0;
  const advance = Number(document.getElementById("rnAdvance").value) || 0;
  let discount = Number(document.getElementById("rnDiscount").value) || 0;

  // Suggest discount based on loyalty rules (repeat customer / review / flash sale)
  const phone = document.getElementById("rnPhone").value.trim();
  const loyalty = LFS.get("lfs_loyalty");
  const cust = LFS.get("lfs_customers").find(c => c.phone === phone);
  let hints = [];
  if (cust && cust.repeatCustomer) hints.push(`Repeat customer discount available: ${loyalty.repeatCustomerDiscountPercent}%`);
  if (cust && cust.reviewGiven) hints.push(`Review discount available: ${LFS.formatMoney(loyalty.reviewDiscountAmount)}`);
  if (loyalty.flashSale && loyalty.flashSale.enabled) {
    const today = LFS.todayISO();
    if ((!loyalty.flashSale.fromDate || today >= loyalty.flashSale.fromDate) && (!loyalty.flashSale.toDate || today <= loyalty.flashSale.toDate)) {
      hints.push(`Flash sale active: ${loyalty.flashSale.discountPercent}% off`);
    }
  }
  document.getElementById("rnDiscountHint").textContent = hints.length ? "(" + hints.join(", ") + ")" : "";

  const returnDate = new Date(date);
  returnDate.setDate(returnDate.getDate() + days);
  document.getElementById("rnReturnDate").value = returnDate.toISOString().slice(0, 10);

  const total = (rate * days) + deposit;
  const balance = total - discount - advance;
  document.getElementById("rnTotal").value = LFS.formatMoney(total);
  document.getElementById("rnBalance").value = LFS.formatMoney(balance);
}

function submitRental(e) {
  e.preventDefault();
  const phone = document.getElementById("rnPhone").value.trim();
  if (!LFS.isValidPhone(phone)) { toast("Please enter a valid 10-digit phone number"); return; }
  const itemId = document.getElementById("rnItem").value;
  const items = LFS.get("lfs_rental_items");
  const item = items.find(i => i.id === itemId);
  if (!item) { toast("Please select a jewellery item"); return; }

  const days = Math.max(1, Number(document.getElementById("rnDays").value) || 1);
  const date = document.getElementById("rnDate").value || LFS.todayISO();
  const rate = Number(document.getElementById("rnRate").value) || 0;
  const deposit = Number(document.getElementById("rnDeposit").value) || 0;
  const discount = Number(document.getElementById("rnDiscount").value) || 0;
  const advance = Number(document.getElementById("rnAdvance").value) || 0;
  const total = (rate * days) + deposit;
  const balance = total - discount - advance;
  const returnDate = new Date(date); returnDate.setDate(returnDate.getDate() + days);

  const name = document.getElementById("rnName").value.trim();
  const address = document.getElementById("rnAddress").value.trim();
  const region = document.getElementById("rnRegion").value;

  // upsert customer
  const customers = LFS.get("lfs_customers");
  let cust = customers.find(c => c.phone === phone);
  if (!cust) {
    cust = { id: LFS.uid("cus"), name, phone, address, region, loyaltyPoints: 0, repeatCustomer: false, reviewGiven: false, reviewPlatform: "", notes: "" };
    customers.push(cust);
  } else {
    cust.name = name; cust.address = address; cust.region = region;
    cust.repeatCustomer = true;
  }
  const loyalty = LFS.get("lfs_loyalty");
  cust.loyaltyPoints = (cust.loyaltyPoints || 0) + Math.floor(total * (loyalty.pointsPer100Rupees || 0) / 100);
  LFS.set("lfs_customers", customers);

  const rentals = LFS.get("lfs_rentals");
  const record = {
    id: LFS.uid("ren"),
    rentalItemId: item.id,
    itemName: item.itemName,
    customerPhone: phone,
    customerName: name,
    customerAddress: address,
    eventType: document.getElementById("rnEvent").value,
    rentalDate: date,
    expectedReturnDate: returnDate.toISOString().slice(0, 10),
    actualReturnDate: "",
    days, dailyRate: rate, deposit, discount, advancePaid: advance,
    total, balance, status: "active", handledBy: "Sales Person"
  };
  rentals.push(record);
  LFS.set("lfs_rentals", rentals);

  item.status = "rented";
  LFS.set("lfs_rental_items", items);

  const s = LFS.get("lfs_settings");
  document.getElementById("receiptSlot").innerHTML = `
    <div class="card">
      <div class="receipt" id="printReceipt">
        <h3>${s.storeName}</h3>
        <div class="center text-soft">${s.address || ""}</div>
        <div class="center text-soft">${s.phone || ""}</div>
        <hr>
        ${item.imageDataUrl ? `<img class="item-img" src="${item.imageDataUrl}">` : ""}
        <div class="row"><span>Item</span><span>${item.itemName}</span></div>
        <div class="row"><span>Rental Date</span><span>${date}</span></div>
        <div class="row"><span>Return Due</span><span>${record.expectedReturnDate}</span></div>
        <div class="row"><span>Customer</span><span>${name}</span></div>
        <div class="row"><span>Phone</span><span>${phone}</span></div>
        <hr>
        <div class="row"><span>Daily Rate × Days</span><span>${LFS.formatMoney(rate * days)}</span></div>
        <div class="row"><span>Deposit</span><span>${LFS.formatMoney(deposit)}</span></div>
        <div class="row"><span>Discount</span><span>-${LFS.formatMoney(discount)}</span></div>
        <div class="row"><span>Advance Paid</span><span>-${LFS.formatMoney(advance)}</span></div>
        <hr>
        <div class="row total-row"><span>Balance Pending</span><span>${LFS.formatMoney(balance)}</span></div>
      </div>
      <div class="text-center mt-16"><button class="btn btn-gold" onclick="window.print()">Print Receipt</button></div>
    </div>
  `;

  toast("Rental saved. Receipt ready.");
  renderNewRentalReset();
}

function renderNewRentalReset() {
  // keep receipt visible; just refresh the form's item dropdown (item now rented)
  const formCard = document.querySelector("#rentalSubContent .card");
  if (formCard) formCard.outerHTML = renderNewRental().split('<div id="receiptSlot">')[0];
  wireTabEvents();
}

function renderHistoricRentals() {
  const rentals = LFS.get("lfs_rentals").slice().reverse();
  const active = rentals.filter(r => r.status === "active");
  const past = rentals.filter(r => r.status !== "active");
  return `
    <div class="card">
      <div class="flex-between"><h2 style="margin:0;">Active Rentals</h2><button class="btn btn-outline btn-sm" onclick="printRentalsReportSales()">Print</button></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Customer</th><th>Rented</th><th>Due</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            ${active.map(r => `
              <tr>
                <td>${r.itemName}</td>
                <td>${r.customerName}<br><span class="text-soft">${r.customerPhone}</span></td>
                <td>${r.rentalDate}</td>
                <td>${r.expectedReturnDate}</td>
                <td>${LFS.formatMoney(r.balance)}</td>
                <td><button class="btn btn-outline btn-sm" onclick="markReturned('${r.id}')">Mark Returned</button></td>
              </tr>`).join("") || `<tr><td colspan="6" class="text-soft">No active rentals.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h2>Rental History</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Customer</th><th>Rented</th><th>Returned</th><th>Total</th></tr></thead>
          <tbody>
            ${past.map(r => `<tr><td>${r.itemName}</td><td>${r.customerName}</td><td>${r.rentalDate}</td><td>${r.actualReturnDate}</td><td>${LFS.formatMoney(r.total)}</td></tr>`).join("") || `<tr><td colspan="5" class="text-soft">No history yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function printRentalsReportSales() {
  const rentals = LFS.get("lfs_rentals").slice().reverse();
  const rows = rentals.map(r => `<tr><td>${r.rentalDate}</td><td>${escapeHtml(r.itemName)}</td><td>${escapeHtml(r.customerName)}</td><td>${r.status}</td><td>${LFS.formatMoney(r.total)}</td><td>${LFS.formatMoney(r.balance)}</td></tr>`).join("") || `<tr><td colspan="6">No rentals.</td></tr>`;
  LFS.printReport("Rentals Report", `<table><thead><tr><th>Date</th><th>Item</th><th>Customer</th><th>Status</th><th>Total</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function markReturned(rentalId) {
  const rentals = LFS.get("lfs_rentals");
  const r = rentals.find(x => x.id === rentalId);
  if (!r) return;
  r.status = "returned";
  r.actualReturnDate = LFS.todayISO();
  LFS.set("lfs_rentals", rentals);

  const items = LFS.get("lfs_rental_items");
  const item = items.find(i => i.id === r.rentalItemId);
  if (item) {
    item.status = "available";
    item.timesRented = (item.timesRented || 0) + 1;
    item.totalEarned = (item.totalEarned || 0) + (r.total - r.deposit); // earnings excl. refundable deposit
    LFS.set("lfs_rental_items", items);
  }
  toast("Item marked as returned to stock");
  renderTab();
}

function renderCustomerRequests() {
  const reqs = LFS.get("lfs_customer_requests").slice().reverse();
  return `
    <div class="card">
      <h2>Log Customer Requirement / Comment</h2>
      <form id="reqForm">
        <div class="grid cols-2">
          <div class="field">
            <label>Customer Phone</label>
            <input type="tel" id="reqPhone" maxlength="10">
          </div>
          <div class="field">
            <label>Customer Name</label>
            <input type="text" id="reqName">
          </div>
        </div>
        <div class="field">
          <label>What did they ask for / feedback</label>
          <textarea id="reqComment" required placeholder="e.g. Wants more temple jewellery haaram sets for wedding season"></textarea>
        </div>
        <button class="btn btn-primary" type="submit">Save Note</button>
      </form>
    </div>
    <div class="card">
      <h3>Recent Customer Notes</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Customer</th><th>Comment</th></tr></thead>
          <tbody>
            ${reqs.map(r => `<tr><td>${r.date}</td><td>${r.customerName || "-"} <br><span class="text-soft">${r.customerPhone || ""}</span></td><td>${escapeHtml(r.comment)}</td></tr>`).join("") || `<tr><td colspan="3" class="text-soft">No notes yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function submitRequest(e) {
  e.preventDefault();
  const reqs = LFS.get("lfs_customer_requests");
  reqs.push({
    id: LFS.uid("req"),
    date: LFS.todayISO(),
    customerPhone: document.getElementById("reqPhone").value.trim(),
    customerName: document.getElementById("reqName").value.trim(),
    comment: document.getElementById("reqComment").value.trim(),
    loggedBy: "Sales Person"
  });
  LFS.set("lfs_customer_requests", reqs);
  toast("Note saved");
  renderTab();
}

/* ============================================================
   CATALOG / JEWELLERY STATUS
   ============================================================ */
let CATALOG_FILTER = { category: "", search: "" };

function renderCatalog() {
  const items = LFS.get("lfs_rental_items");
  const filtered = items.filter(i => {
    const matchCat = !CATALOG_FILTER.category || i.category === CATALOG_FILTER.category;
    const matchSearch = !CATALOG_FILTER.search || i.itemName.toLowerCase().includes(CATALOG_FILTER.search.toLowerCase()) || i.itemCode.toLowerCase().includes(CATALOG_FILTER.search.toLowerCase());
    return matchCat && matchSearch;
  });
  return `
    <div class="card">
      <div class="flex-between" style="flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;">Jewellery Status &amp; Catalog</h2>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          <input type="text" placeholder="Search item or code" style="width:180px;" value="${CATALOG_FILTER.search}" oninput="setCatalogFilter('search', this.value)">
          <select style="width:170px;" onchange="setCatalogFilter('category', this.value)">
            <option value="">All Categories</option>
            ${LFS_CATEGORIES.map(c => `<option ${CATALOG_FILTER.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <button class="btn btn-outline btn-sm" onclick="printCatalogReport()">Print</button>
        </div>
      </div>
    </div>
    <div class="grid cols-4">
      ${filtered.map(i => `
        <div class="catalog-card" onclick="openImageZoom('${i.id}')">
          <div class="img-wrap">${i.imageDataUrl ? `<img src="${i.imageDataUrl}">` : "L"}</div>
          <div class="info">
            <span class="badge ${i.status === 'available' ? 'badge-available' : 'badge-rented'}">${i.status === 'available' ? 'Available' : 'Rented Out'}</span>
            <h4>${i.itemName}</h4>
            <div class="text-soft">${i.itemCode}</div>
            <div class="price">${LFS.formatMoney(i.dailyRate)}/day</div>
          </div>
        </div>
      `).join("") || `<div class="text-soft">No items match your filters.</div>`}
    </div>
    <div id="zoomSlot"></div>
  `;
}

function printCatalogReport() {
  const items = LFS.get("lfs_rental_items");
  const rows = items.map(i => `<tr><td>${escapeHtml(i.itemName)}</td><td>${i.itemCode}</td><td>${i.category}</td><td>${LFS.formatMoney(i.dailyRate)}</td><td>${i.status === "available" ? "Available" : "Rented Out"}</td></tr>`).join("") || `<tr><td colspan="5">No items.</td></tr>`;
  LFS.printReport("Jewellery Status &amp; Catalog", `<table><thead><tr><th>Item</th><th>Code</th><th>Category</th><th>Rate/Day</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
}
function setCatalogFilter(key, value) {
  CATALOG_FILTER[key] = value;
  renderTab();
}

function openImageZoom(itemId) {
  const item = LFS.get("lfs_rental_items").find(i => i.id === itemId);
  if (!item) return;
  document.getElementById("zoomSlot").innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeZoom()">
      <div class="modal">
        <button class="modal-close" onclick="closeZoom()">&times;</button>
        <h3>${item.itemName}</h3>
        ${item.imageDataUrl ? `<img src="${item.imageDataUrl}">` : `<div class="img-wrap" style="height:220px;">L</div>`}
        <p class="text-soft mt-8">${item.itemCode} · ${item.itemType} · ${item.category}</p>
        <p><span class="badge ${item.status === 'available' ? 'badge-available' : 'badge-rented'}">${item.status === 'available' ? 'Available' : 'Rented Out'}</span></p>
        <div class="grid cols-2">
          <div class="stat-box"><div class="num">${LFS.formatMoney(item.dailyRate)}</div><div class="lbl">Daily Rate</div></div>
          <div class="stat-box"><div class="num">${LFS.formatMoney(item.deposit)}</div><div class="lbl">Deposit</div></div>
        </div>
      </div>
    </div>
  `;
}
function closeZoom() { document.getElementById("zoomSlot").innerHTML = ""; }

/* ---------- helpers ---------- */
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function wireTabEvents() {
  document.querySelectorAll(".subtab-btn").forEach(b => b.addEventListener("click", () => switchRentalSubtab(b.dataset.sub)));
  const f1 = document.getElementById("dailySaleForm"); if (f1) f1.addEventListener("submit", submitDailySale);
  const f2 = document.getElementById("rentalForm"); if (f2) f2.addEventListener("submit", submitRental);
  const f3 = document.getElementById("reqForm"); if (f3) f3.addEventListener("submit", submitRequest);
}

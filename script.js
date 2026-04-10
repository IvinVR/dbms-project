/* ============================================
   SCMS — SmartCampus Management System
   Application Logic & State Management
   (Database-backed version — all data via API)
   ============================================ */

// ═══════════════════════════════════════════
//  API BASE URL
// ═══════════════════════════════════════════

// Using a relative path allows the app to work seamlessly online and locally.
const API = '/api';

// ═══════════════════════════════════════════
//  LOCAL CACHE (populated from DB on load)
// ═══════════════════════════════════════════

const store = {
  users: [],
  inventory: [],
  reservations: [],
  notifications: [],
  announcements: [],
  scheduleData: {},
  session: {
    role: null,
    user: null,
    userId: null,
  },
};

// ═══════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════

async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

// ═══════════════════════════════════════════
//  SESSION HELPERS
// ═══════════════════════════════════════════

function getRole() {
  return sessionStorage.getItem("scms_role") || null;
}

function getUser() {
  return sessionStorage.getItem("scms_user") || null;
}

function getUserId() {
  return sessionStorage.getItem("scms_user_id") || null;
}

function setSession(role, user, userId) {
  sessionStorage.setItem("scms_role", role);
  sessionStorage.setItem("scms_user", user);
  sessionStorage.setItem("scms_user_id", userId);
  store.session.role = role;
  store.session.user = user;
  store.session.userId = userId;
}

function logout() {
  sessionStorage.removeItem("scms_role");
  sessionStorage.removeItem("scms_user");
  sessionStorage.removeItem("scms_user_id");
  window.location.href = "index.html";
}

// ═══════════════════════════════════════════
//  TOAST SYSTEM
// ═══════════════════════════════════════════

function showToast(msg, type = "default", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const iconMap = {
    success: "<i class='fas fa-check-circle'></i>",
    error:   "<i class='fas fa-times-circle'></i>",
    info:    "<i class='fas fa-info-circle'></i>",
    default: "<i class='fas fa-comment'></i>",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${iconMap[type] || iconMap.default}</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(60px)";
    toast.style.transition = "all .3s";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════
//  MODAL SYSTEM
// ═══════════════════════════════════════════

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay") && e.target.classList.contains("open")) {
    e.target.classList.remove("open");
  }
});

// ═══════════════════════════════════════════
//  SECTION / NAV MANAGEMENT
// ═══════════════════════════════════════════

let currentSection = null;
let currentNavId = null;

function showSection(sectionId, navId) {
  document.querySelectorAll(".dash-section").forEach((s) => s.classList.remove("active"));

  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  const navItem = document.getElementById(navId);
  if (navItem) navItem.classList.add("active");

  currentSection = sectionId;
  currentNavId = navId;

  if (navItem) {
    const label = navItem.querySelector(".nav-item-label");
    if (label) {
      document.getElementById("topbarTitle").textContent = label.textContent;
    }
  }
}

// ═══════════════════════════════════════════
//  NOTIFICATION BELL POPUP
// ═══════════════════════════════════════════

function toggleNotifPopup() {
  const popup = document.getElementById("notifPopup");
  if (popup) popup.classList.toggle("open");
}

async function markAllRead() {
  try {
    await api('/notifications/read-all', 'PUT');
    store.notifications.forEach((n) => (n.is_read = true));
    updateNotifBadge();
    renderNotifPopup();
    showToast("All notifications marked as read", "success");
  } catch (err) {
    showToast("Failed to mark notifications as read", "error");
  }
}

function updateNotifBadge() {
  const unread = store.notifications.filter((n) => !n.is_read).length;
  const dot = document.getElementById("notifBellDot");
  if (dot) {
    dot.classList.toggle("show", unread > 0);
  }
}

function renderNotifPopup() {
  const body = document.getElementById("notifPopupBody");
  if (!body) return;

  body.innerHTML = store.notifications
    .map(
      (n) => `
    <div class="notif-popup-item ${!n.is_read ? "unread" : ""}" onclick="markNotifRead(${n.id})">
      <div class="notif-popup-item-icon" style="${n.icon_bg || ""}">${n.icon || "<i class='fas fa-bell'></i>"}</div>
      <div class="notif-popup-item-content">
        <div class="notif-popup-item-title">${n.title}</div>
        <div class="notif-popup-item-desc">${n.description}</div>
      </div>
      <span class="notif-popup-item-time">${timeAgo(n.created_at)}</span>
    </div>`
    )
    .join("");
}

async function markNotifRead(id) {
  try {
    await api(`/notifications/${id}/read`, 'PUT');
    const notif = store.notifications.find((n) => n.id === id);
    if (notif) notif.is_read = true;
    updateNotifBadge();
    renderNotifPopup();
    renderNotifLists();
  } catch (err) {
    showToast("Failed to update notification", "error");
  }
}

// Close notif popup on outside click
document.addEventListener("click", (e) => {
  const wrap = document.getElementById("notifBellWrap");
  if (wrap && !wrap.contains(e.target)) {
    const popup = document.getElementById("notifPopup");
    if (popup) popup.classList.remove("open");
  }
});

// ═══════════════════════════════════════════
//  SIDEBAR NAV BUILDER
// ═══════════════════════════════════════════

const navConfig = {
  student: [
    { id: "navInventory",       icon: "<i class='fas fa-box'></i>", label: "Inventory",        section: "secInventory"       },
    { id: "navNotifications",   icon: "<i class='fas fa-bell'></i>", label: "Notifications",    section: "secNotifications"   },
    { id: "navSchedule",        icon: "<i class='fas fa-calendar-alt'></i>", label: "Faculty Schedule", section: "secSchedule"        },
    { id: "navMyReservations",  icon: "<i class='fas fa-ticket-alt'></i>", label: "My Reservations",  section: "secMyReservations"  },
    { id: "navAnnouncements",   icon: "<i class='fas fa-bullhorn'></i>", label: "Announcements",    section: "secAnnouncements"   },
  ],
  admin: [
    { id: "navAdminOverview",     icon: "<i class='fas fa-home'></i>", label: "Overview",       section: "secAdminOverview"     },
    { id: "navManageUsers",       icon: "<i class='fas fa-users-cog'></i>", label: "Manage Users",   section: "secManageUsers"       },
    { id: "navAdminInventory",    icon: "<i class='fas fa-box'></i>", label: "Inventory",      section: "secAdminInventory"    },
    { id: "navAdminReservations", icon: "<i class='fas fa-ticket-alt'></i>", label: "Reservations",   section: "secAdminReservations" },
    { id: "navAdminNotifs",       icon: "<i class='fas fa-bell'></i>", label: "Notifications",  section: "secAdminNotifs"       },
  ],
  faculty: [
    { id: "navFacOverview",  icon: "<i class='fas fa-home'></i>", label: "Overview",          section: "secFacOverview"  },
    { id: "navFacSchedule",  icon: "<i class='fas fa-calendar-alt'></i>", label: "My Schedule",      section: "secFacSchedule"  },
  ],
  subadmin: [
    { id: "navCROverview",   icon: "<i class='fas fa-home'></i>", label: "Overview",           section: "secCROverview"   },
    { id: "navCRAnnounce",   icon: "<i class='fas fa-bullhorn'></i>", label: "Announcements",      section: "secCRAnnounce"   },
    { id: "navCRNotif",      icon: "<i class='fas fa-bell'></i>", label: "Send Notifications", section: "secCRNotif"      },
    { id: "navCRInventory",  icon: "<i class='fas fa-box'></i>", label: "Browse Inventory",   section: "secCRInventory"  },
    { id: "navAdminReservations", icon: "<i class='fas fa-ticket-alt'></i>", label: "Manage Reservations", section: "secAdminReservations" },
  ],
};

const roleDefaults = {
  student:  { section: "secInventory",     nav: "navInventory"     },
  admin:    { section: "secAdminOverview",  nav: "navAdminOverview" },
  faculty:  { section: "secFacOverview",    nav: "navFacOverview"   },
  subadmin: { section: "secCROverview",     nav: "navCROverview"    },
};

function buildSidebar(role) {
  const navEl = document.getElementById("sidebarNav");
  if (!navEl) return;

  const items = navConfig[role] || [];
  const sectionLabel = role === "admin" ? "Administration" : role === "faculty" ? "Faculty Panel" : role === "subadmin" ? "CR Panel" : "Student Panel";

  navEl.innerHTML = `
    <div class="sidebar-nav-section">
      <div class="sidebar-nav-label">${sectionLabel}</div>
      ${items
        .map(
          (item) => `
        <div class="nav-item" id="${item.id}" onclick="showSection('${item.section}','${item.id}')">
          <span class="nav-item-icon">${item.icon}</span>
          <span class="nav-item-label">${item.label}</span>
        </div>`
        )
        .join("")}
    </div>
  `;
}

// ═══════════════════════════════════════════
//  INVENTORY RENDERING
// ═══════════════════════════════════════════

let activeCategory = "all";

function filterInventory(category, context) {
  activeCategory = category;

  const chipGroupId = context === "cr" ? "crInventoryChips" : "inventoryChips";
  const gridId = context === "cr" ? "crInventoryGrid" : "inventoryGrid";

  const chipGroup = document.getElementById(chipGroupId);
  if (chipGroup) {
    chipGroup.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.category === category);
    });
  }

  renderInventoryGrid(gridId, category);
}

function renderInventoryGrid(gridId, category) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const filtered = category === "all" ? store.inventory : store.inventory.filter((i) => i.category === category);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon"><i class="fas fa-box-open"></i></div>
        <div class="empty-state-text">No items found in this category.</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((item) => {
      const pct = item.total_qty > 0 ? Math.round((item.available_qty / item.total_qty) * 100) : 0;
      const barClass = pct < 25 ? "low" : pct < 50 ? "medium" : "";
      const canReserve = item.available_qty > 0;

      return `
      <div class="item-card">
        <div class="item-card-head">
          <div class="item-card-emoji">${item.icon}</div>
          <div>
            <div class="item-card-name">${item.name}</div>
            <div class="item-card-category">${item.category}</div>
          </div>
        </div>
        <div class="item-card-bar-wrap">
          <div class="item-card-bar-label">
            <span>${item.available_qty} available</span>
            <span>${item.total_qty} total</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill ${barClass}" style="width:${pct}%"></div>
          </div>
        </div>
        <button class="item-card-reserve-btn" ${canReserve ? "" : "disabled"} onclick="reserveItem(${item.id})">
          ${canReserve ? "Reserve" : "Out of Stock"}
        </button>
      </div>`;
    })
    .join("");
}

async function reserveItem(itemId) {
  const userId = getUserId();
  if (!userId) {
    showToast("Session error — please login again", "error");
    return;
  }

  try {
    const result = await api('/reservations', 'POST', {
      user_id: parseInt(userId),
      item_id: itemId,
      qty: 1,
      due_date: getFutureDate(7),
    });

    // Refresh data from DB
    await loadInventory();
    await loadReservations();

    renderInventoryGrid("inventoryGrid", activeCategory);
    renderInventoryGrid("crInventoryGrid", activeCategory);
    renderStudentReservations();
    renderAdminReservations();
    renderAdminInventory();
    updateAdminStats();

    showToast(`Reserved 1× ${result.item}`, "success");
  } catch (err) {
    showToast(err.message || "Failed to reserve item", "error");
  }
}

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ═══════════════════════════════════════════
//  TABLE RENDERERS
// ═══════════════════════════════════════════

/* ── Users Table ── */
function renderUsersTable() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  tbody.innerHTML = store.users
    .map(
      (u) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <div class="avatar avatar-sm avatar-green">${getInitials(u.name)}</div>
          ${u.name}
        </div>
      </td>
      <td>${u.email}</td>
      <td><span class="badge ${roleBadgeClass(u.role)}">${u.role}</span></td>
      <td>${u.batch}</td>
      <td><span class="badge ${u.status === "active" ? "badge-green" : "badge-grey"}">${u.status}</span></td>
      <td>
        <div class="table-actions">
          <button class="table-btn table-btn-edit" onclick="openEditUser(${u.id})">Edit</button>
          <button class="table-btn table-btn-promote" onclick="promoteUser(${u.id})">Promote</button>
          <button class="table-btn table-btn-delete" onclick="deleteUser(${u.id})">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

function roleBadgeClass(role) {
  const map = { Student: "badge-green", "Sub-Admin": "badge-amber", Faculty: "badge-blue", Admin: "badge-red" };
  return map[role] || "badge-grey";
}

function openEditUser(id) {
  const user = store.users.find((u) => u.id === id);
  if (!user) return;

  document.getElementById("editUserId").value = user.id;
  document.getElementById("editUserName").value = user.name;
  document.getElementById("editUserEmail").value = user.email;
  document.getElementById("editUserRole").value = user.role;
  document.getElementById("editUserBatch").value = user.batch;
  document.getElementById("editUserStatus").value = user.status;

  openModal("editUserModal");
}

async function saveEditUser() {
  const id = parseInt(document.getElementById("editUserId").value);

  try {
    await api(`/users/${id}`, 'PUT', {
      name:   document.getElementById("editUserName").value,
      email:  document.getElementById("editUserEmail").value,
      role:   document.getElementById("editUserRole").value,
      batch:  document.getElementById("editUserBatch").value,
      status: document.getElementById("editUserStatus").value,
    });

    closeModal("editUserModal");
    await loadUsers();
    renderUsersTable();
    updateAdminStats();
    showToast("User updated successfully — saved to database ✓", "success");
  } catch (err) {
    showToast(err.message || "Failed to update user", "error");
  }
}

async function promoteUser(id) {
  try {
    const result = await api(`/users/${id}/promote`, 'PUT');
    await loadUsers();
    renderUsersTable();
    showToast(`${result.name} promoted to ${result.role} — saved to database ✓`, "success");
  } catch (err) {
    showToast(err.message || "Failed to promote user", "error");
  }
}

async function deleteUser(id) {
  try {
    const result = await api(`/users/${id}`, 'DELETE');
    await loadUsers();
    renderUsersTable();
    updateAdminStats();
    showToast(`${result.name} removed — deleted from database ✓`, "error");
  } catch (err) {
    showToast(err.message || "Failed to delete user", "error");
  }
}

async function addUser() {
  const name  = document.getElementById("addUserName").value.trim();
  const email = document.getElementById("addUserEmail").value.trim();
  const role  = document.getElementById("addUserRole").value;
  const batch = document.getElementById("addUserBatch").value.trim();

  if (!name || !email) {
    showToast("Name and email are required", "error");
    return;
  }

  try {
    await api('/users', 'POST', { name, email, role, batch: batch || '-' });

    closeModal("addUserModal");
    document.getElementById("addUserName").value = "";
    document.getElementById("addUserEmail").value = "";
    document.getElementById("addUserBatch").value = "";

    await loadUsers();
    renderUsersTable();
    updateAdminStats();
    showToast(`${name} added successfully — saved to database ✓`, "success");
  } catch (err) {
    showToast(err.message || "Failed to add user", "error");
  }
}

/* ── Admin Inventory Table ── */
function renderAdminInventory() {
  const tbody = document.getElementById("adminInventoryBody");
  if (!tbody) return;

  tbody.innerHTML = store.inventory
    .map(
      (i) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span style="font-size:1.1rem">${i.icon}</span> ${i.name}
        </div>
      </td>
      <td><span class="badge badge-blue">${i.category}</span></td>
      <td>${i.total_qty}</td>
      <td>${i.available_qty}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn table-btn-edit" onclick="openEditItem(${i.id})">Edit</button>
          <button class="table-btn table-btn-delete" onclick="deleteItem(${i.id})">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

function openEditItem(id) {
  const item = store.inventory.find((i) => i.id === id);
  if (!item) return;

  document.getElementById("editItemId").value = item.id;
  document.getElementById("editItemName").value = item.name;
  document.getElementById("editItemIcon").value = item.icon;
  document.getElementById("editItemCategory").value = item.category;
  document.getElementById("editItemQty").value = item.total_qty;
  document.getElementById("editItemAvailable").value = item.available_qty;

  openModal("editItemModal");
}

async function saveEditItem() {
  const id = parseInt(document.getElementById("editItemId").value);

  try {
    await api(`/inventory/${id}`, 'PUT', {
      name:          document.getElementById("editItemName").value,
      icon:          document.getElementById("editItemIcon").value,
      category:      document.getElementById("editItemCategory").value,
      total_qty:     parseInt(document.getElementById("editItemQty").value) || 0,
      available_qty: parseInt(document.getElementById("editItemAvailable").value) || 0,
    });

    closeModal("editItemModal");
    await loadInventory();
    renderAdminInventory();
    renderInventoryGrid("inventoryGrid", activeCategory);
    renderInventoryGrid("crInventoryGrid", activeCategory);
    updateAdminStats();
    showToast("Item updated successfully — saved to database ✓", "success");
  } catch (err) {
    showToast(err.message || "Failed to update item", "error");
  }
}

async function deleteItem(id) {
  try {
    const result = await api(`/inventory/${id}`, 'DELETE');
    await loadInventory();
    renderAdminInventory();
    renderInventoryGrid("inventoryGrid", activeCategory);
    renderInventoryGrid("crInventoryGrid", activeCategory);
    updateAdminStats();
    showToast(`${result.name} removed from inventory — deleted from database ✓`, "error");
  } catch (err) {
    showToast(err.message || "Failed to delete item", "error");
  }
}

async function addItem() {
  const name     = document.getElementById("addItemName").value.trim();
  const icon     = document.getElementById("addItemIcon").value.trim() || "<i class='fas fa-box'></i>";
  const category = document.getElementById("addItemCategory").value;
  const total_qty = parseInt(document.getElementById("addItemQty").value) || 1;

  if (!name) {
    showToast("Item name is required", "error");
    return;
  }

  try {
    await api('/inventory', 'POST', { name, icon, category, total_qty });

    closeModal("addItemModal");
    document.getElementById("addItemName").value = "";
    document.getElementById("addItemIcon").value = "";

    await loadInventory();
    renderAdminInventory();
    renderInventoryGrid("inventoryGrid", activeCategory);
    renderInventoryGrid("crInventoryGrid", activeCategory);
    updateAdminStats();
    showToast(`${name} added to inventory — saved to database ✓`, "success");
  } catch (err) {
    showToast(err.message || "Failed to add item", "error");
  }
}

/* ── Reservations ── */
function renderStudentReservations() {
  const tbody = document.getElementById("studentReservationsBody");
  if (!tbody) return;

  const userId = parseInt(getUserId());
  const myRes = store.reservations.filter((r) => r.user_id === userId);

  if (myRes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="empty-state-icon"><i class="fas fa-ticket-alt"></i></div><div>No reservations yet.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = myRes
    .map(
      (r) => {
        let timer = "";
        if (r.status === "active") {
          const dDiff = Math.ceil((new Date(r.due_date) - new Date()) / (1000 * 60 * 60 * 24));
          timer = dDiff >= 0 ? ` <small>(${dDiff} days left)</small>` : ` <small class="text-danger">(Overdue)</small>`;
        }
        return `
    <tr>
      <td>${r.item}</td>
      <td>${r.qty}</td>
      <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span></td>
      <td>${formatDate(r.due_date)}${timer}</td>
      <td>
        ${
          r.status !== "expired"
            ? `<button class="table-btn table-btn-cancel" onclick="cancelReservation(${r.id})">Cancel</button>`
            : `<span style="color:var(--text-3);font-size:.82rem">—</span>`
        }
      </td>
    </tr>`;
      }
    )
    .join("");
}

function renderAdminReservations() {
  const tbody = document.getElementById("adminReservationsBody");
  if (!tbody) return;

  tbody.innerHTML = store.reservations
    .map(
      (r) => {
        let timer = "";
        if (r.status === "active") {
          const dDiff = Math.ceil((new Date(r.due_date) - new Date()) / (1000 * 60 * 60 * 24));
          timer = dDiff >= 0 ? ` <small>(${dDiff} days left)</small>` : ` <small>(Overdue)</small>`;
        }
        return `
    <tr>
      <td>${r.item}</td>
      <td>${r.student}</td>
      <td>${r.qty}</td>
      <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span></td>
      <td>${formatDate(r.due_date)}${timer}</td>
      <td>
        ${
          r.status !== "expired"
            ? `<button class="table-btn table-btn-cancel" onclick="cancelReservation(${r.id})">Cancel</button>`
            : `<span style="color:var(--text-3);font-size:.82rem">—</span>`
        }
      </td>
    </tr>`;
      }
    )
    .join("");

  // Recent reservations on overview
  const recentBody = document.getElementById("adminRecentResBody");
  if (recentBody) {
    const recent = store.reservations.slice(0, 5);
    recentBody.innerHTML = recent
      .map(
        (r) => `
      <tr>
        <td>${r.item}</td>
        <td>${r.student}</td>
        <td>${r.qty}</td>
        <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span></td>
        <td>${formatDate(r.due_date)}</td>
      </tr>`
      )
      .join("");
  }
}

async function cancelReservation(id) {
  try {
    const result = await api(`/reservations/${id}/cancel`, 'PUT');

    await loadReservations();
    await loadInventory();

    renderStudentReservations();
    renderAdminReservations();
    renderInventoryGrid("inventoryGrid", activeCategory);
    renderInventoryGrid("crInventoryGrid", activeCategory);
    renderAdminInventory();
    updateAdminStats();

    showToast(`Reservation for ${result.item} cancelled — updated in database ✓`, "info");
  } catch (err) {
    showToast(err.message || "Failed to cancel reservation", "error");
  }
}

function statusBadgeClass(status) {
  const map = { active: "badge-green", pending: "badge-amber", expired: "badge-grey" };
  return map[status] || "badge-grey";
}

/* ── Faculty Students ── */
function renderFacStudents() {
  const tbody = document.getElementById("facStudentsBody");
  if (!tbody) return;

  const students = store.users.filter((u) => u.role === "Student");

  tbody.innerHTML = students
    .map(
      (s) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <div class="avatar avatar-sm avatar-blue">${getInitials(s.name)}</div>
          ${s.name}
        </div>
      </td>
      <td>${s.email}</td>
      <td>${s.batch}</td>
      <td><span class="badge ${s.status === "active" ? "badge-green" : "badge-grey"}">${s.status}</span></td>
    </tr>`
    )
    .join("");
}

// ═══════════════════════════════════════════
//  NOTIFICATION LIST RENDERING
// ═══════════════════════════════════════════

function renderNotifLists() {
  const lists = ["studentNotifList", "adminNotifList", "facNotifList", "crNotifList"];

  lists.forEach((listId) => {
    const el = document.getElementById(listId);
    if (!el) return;

    if (store.notifications.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-bell-slash"></i></div>
          <div class="empty-state-text">No notifications.</div>
        </div>`;
      return;
    }

    el.innerHTML = store.notifications
      .map(
        (n) => `
      <div class="notif-item ${!n.is_read ? "unread" : ""}" onclick="markNotifRead(${n.id})">
        <div class="notif-item-icon" style="${n.icon_bg || ""}">${n.icon || "<i class='fas fa-bell'></i>"}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-desc">${n.description}</div>
          <div class="notif-item-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`
      )
      .join("");
  });
}

// ═══════════════════════════════════════════
//  ANNOUNCEMENTS RENDERING
// ═══════════════════════════════════════════

function renderAnnouncements() {
  const lists = ["studentAnnouncementsList", "crAnnouncementsList"];

  lists.forEach((listId) => {
    const el = document.getElementById(listId);
    if (!el) return;

    el.innerHTML = store.announcements
      .map(
        (a) => `
      <div class="announce-card ${a.type === "urgent" ? "urgent" : a.type === "info" ? "info" : ""}">
        <div class="announce-card-title">${a.title}</div>
        <div class="announce-card-body">${a.body}</div>
        <div class="announce-card-meta">
          <span><i class="fas fa-user"></i> ${a.author || 'Unknown'}</span>
          <span><i class="fas fa-clock"></i> ${timeAgo(a.created_at)}</span>
          <span><i class="fas fa-bullseye"></i> ${a.target_audience}</span>
        </div>
      </div>`
      )
      .join("");
  });
}

async function postAnnouncement() {
  const title  = document.getElementById("announceTitle").value.trim();
  const body   = document.getElementById("announceBody").value.trim();
  const type   = document.getElementById("announceType").value;
  const target = document.getElementById("announceTarget").value.trim() || "All";

  if (!title || !body) {
    showToast("Title and body are required", "error");
    return;
  }

  try {
    await api('/announcements', 'POST', {
      title, body, type,
      target_audience: target,
      author_id: parseInt(getUserId()) || null,
    });

    closeModal("postAnnouncementModal");
    document.getElementById("announceTitle").value = "";
    document.getElementById("announceBody").value = "";
    document.getElementById("announceTarget").value = "";

    await loadAnnouncements();
    renderAnnouncements();
    showToast("Announcement posted — saved to database ✓", "success");
  } catch (err) {
    showToast(err.message || "Failed to post announcement", "error");
  }
}

// ═══════════════════════════════════════════
//  SEND NOTIFICATION
// ═══════════════════════════════════════════

async function sendNotification() {
  const title = document.getElementById("sendNotifTitle").value.trim();
  const desc  = document.getElementById("sendNotifDesc").value.trim();

  if (!title || !desc) {
    showToast("Title and description required", "error");
    return;
  }

  try {
    await api('/notifications', 'POST', {
      title,
      description: desc,
      icon: "<i class='fas fa-envelope-open-text'></i>",
      icon_bg: 'background:var(--accent-lt);color:var(--accent)',
      created_by: parseInt(getUserId()) || null,
    });

    closeModal("sendNotifModal");
    document.getElementById("sendNotifTitle").value = "";
    document.getElementById("sendNotifDesc").value = "";

    await loadNotifications();
    updateNotifBadge();
    renderNotifPopup();
    renderNotifLists();
    showToast("Notification sent — saved to database ✓", "success");
  } catch (err) {
    showToast(err.message || "Failed to send notification", "error");
  }
}

// ═══════════════════════════════════════════
//  SCHEDULE RENDERING
// ═══════════════════════════════════════════

const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

function renderScheduleGrid(gridId, canEdit = false) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const currentUserId = parseInt(getUserId());

  let html = `<div class="sch-header"></div>`;
  DAYS.forEach((d) => (html += `<div class="sch-header">${d}</div>`));

  TIMES.forEach((time) => {
    html += `<div class="sch-time">${time}</div>`;
    DAYS.forEach((day) => {
      let events = (store.scheduleData[day] || []).filter((e) => e.time === time);
      
      if (gridId === "facScheduleGrid" || gridId === "facOverviewScheduleGrid") {
         events = events.filter(e => e.faculty_id === currentUserId);
      }

      html += `<div class="sch-cell">`;
      events.forEach((ev) => {
        html += `<div class="sch-event ${ev.color}">
          <span class="sch-event-label">${ev.label}</span>
          <span class="sch-event-room">${ev.room}</span>`;
        if (canEdit) {
           html += `<div style="margin-top: 5px; display:flex; gap: 5px;"><button onclick="editSchedule(${ev.id})" style="font-size:0.7rem;background:rgba(255,255,255,0.2);border:none;color:currentColor;border-radius:3px;cursor:pointer;padding:2px 5px;">Edit</button><button onclick="deleteSchedule(${ev.id})" style="font-size:0.7rem;background:rgba(255,0,0,0.4);border:none;color:white;border-radius:3px;cursor:pointer;padding:2px 5px;">Del</button></div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    });
  });

  grid.innerHTML = html;
}

function renderStudentSchedule() {
  const fac = document.getElementById("studentFacultySelect")?.value;
  const grid = document.getElementById("studentScheduleGrid");
  if (!grid) return;
  if (!fac) {
    grid.innerHTML = `<div style="grid-column: 1/-1;text-align:center;padding:2rem;">Please select a faculty to view their schedule.</div>`;
    return;
  }

  const filtered = store.rawScheduleRows.filter(r => r.faculty_name === fac);

  const grouped = {};
  filtered.forEach((row) => {
    const day = row.day_of_week;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push({
      time: row.time_slot.substring(0, 5),
      label: row.subject,
      room: row.room,
      color: row.color_class,
      id: row.id
    });
  });

  let html = `<div class="sch-header"></div>`;
  DAYS.forEach((d) => (html += `<div class="sch-header">${d}</div>`));

  TIMES.forEach((time) => {
    html += `<div class="sch-time">${time}</div>`;
    DAYS.forEach((day) => {
      const events = (grouped[day] || []).filter((e) => e.time === time);
      html += `<div class="sch-cell" style="position:relative;">`;
      if (events.length === 0) {
        html += `<span style="color:#aaa;font-size:0.8rem;text-align:center;display:block;margin-top:.5rem;">Free</span>`;
      } else {
        events.forEach((ev) => {
          html += `<div class="sch-event ${ev.color}">
            <span class="sch-event-label">${ev.label}</span>
            <span class="sch-event-room">${ev.room} <span style="font-size:0.7em">(Busy)</span></span>
          </div>`;
        });
      }
      html += `</div>`;
    });
  });

  grid.innerHTML = html;
}

async function deleteSchedule(id) {
  if(!confirm("Are you sure you want to delete this schedule entry?")) return;
  try {
    await api('/schedule/' + id, 'DELETE');
    await loadSchedule();
    renderScheduleGrid("facScheduleGrid", true);
    renderScheduleGrid("facOverviewScheduleGrid");
    showToast("Schedule deleted successfully", "success");
  } catch(err) {
    showToast(err.message || "Failed to delete schedule", "error");
  }
}

async function editSchedule(id) {
  const item = store.rawScheduleRows.find(r => r.id === id);
  if (!item) {
    showToast("Schedule item not found", "error");
    return;
  }
  
  document.getElementById("editSchId").value = id;
  document.getElementById("editSchDay").value = item.day_of_week;
  document.getElementById("editSchTime").value = item.time_slot.substring(0, 5);
  document.getElementById("editSchLabel").value = item.subject;
  document.getElementById("editSchRoom").value = item.room;
  document.getElementById("editSchColor").value = item.color_class;

  openModal('editScheduleModal');
}

async function saveEditSchedule() {
  const id    = document.getElementById("editSchId").value;
  const day   = document.getElementById("editSchDay").value;
  const time  = document.getElementById("editSchTime").value;
  const label = document.getElementById("editSchLabel").value.trim();
  const room  = document.getElementById("editSchRoom").value.trim();
  const color = document.getElementById("editSchColor").value;

  if (!label || !room) {
    showToast("Subject and room are required", "error");
    return;
  }

  const formatted = time.substring(0, 2) + ":00:00";

  try {
    await api('/schedule/' + id, 'PUT', {
      day_of_week: day,
      time_slot: formatted,
      subject: label,
      room: room,
      color_class: color,
    });

    closeModal("editScheduleModal");

    await loadSchedule();
    renderStudentSchedule();
    renderScheduleGrid("facScheduleGrid", true);
    renderScheduleGrid("facOverviewScheduleGrid");

    showToast("Schedule updated successfully", "success");
  } catch (err) {
    showToast(err.message || "Failed to update schedule", "error");
  }
}

async function uploadSchedule() {
  const day   = document.getElementById("uploadSchDay").value;
  const time  = document.getElementById("uploadSchTime").value;
  const label = document.getElementById("uploadSchLabel").value.trim();
  const room  = document.getElementById("uploadSchRoom").value.trim();
  const color = document.getElementById("uploadSchColor").value;

  if (!label || !room) {
    showToast("Subject and room are required", "error");
    return;
  }

  const formatted = time.substring(0, 2) + ":00";

  try {
    await api('/schedule', 'POST', {
      faculty_id: parseInt(getUserId()) || null,
      day_of_week: day,
      time_slot: formatted + ':00',
      subject: label,
      room: room,
      color_class: color,
    });

    closeModal("uploadScheduleModal");
    document.getElementById("uploadSchLabel").value = "";
    document.getElementById("uploadSchRoom").value = "";

    await loadSchedule();
    renderStudentSchedule();
    renderScheduleGrid("facScheduleGrid", true);
    renderScheduleGrid("facOverviewScheduleGrid");

    showToast(`Added ${label} on ${day} at ${formatted} — saved to database ✓`, "success");
  } catch (err) {
    showToast(err.message || "Failed to upload schedule", "error");
  }
}

// ═══════════════════════════════════════════
//  STAT CARDS
// ═══════════════════════════════════════════

async function updateAdminStats() {
  const grid = document.getElementById("adminStatGrid");
  if (!grid) return;

  try {
    const stats = await api('/stats/admin');

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--accent-lt);color:var(--accent)"><i class="fas fa-users"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.totalUsers}</div>
          <div class="stat-card-label">Total Users</div>
          <div class="stat-card-delta up">↑ Active campus members</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--accent-2-lt);color:var(--accent-2)"><i class="fas fa-box"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.totalItems}</div>
          <div class="stat-card-label">Inventory Items</div>
          <div class="stat-card-delta up">↑ ${stats.totalAvailable} available</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--warn-lt);color:var(--warn)"><i class="fas fa-ticket-alt"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.activeReservations}</div>
          <div class="stat-card-label">Active Reservations</div>
          <div class="stat-card-delta warn">⚡ ${stats.pendingReservations} pending</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--danger-lt);color:var(--danger)"><i class="fas fa-bullhorn"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.totalAnnouncements}</div>
          <div class="stat-card-label">Announcements</div>
          <div class="stat-card-delta up">↑ Campus-wide</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

async function updateFacStats() {
  const grid = document.getElementById("facStatGrid");
  if (!grid) return;

  try {
    const stats = await api('/stats/faculty');

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--accent-lt);color:var(--accent)"><i class="fas fa-user-graduate"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.assignedStudents}</div>
          <div class="stat-card-label">Assigned Students</div>
          <div class="stat-card-delta up">↑ Active learners</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--accent-2-lt);color:var(--accent-2)"><i class="fas fa-book"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.todayClasses}</div>
          <div class="stat-card-label">Classes Today</div>
          <div class="stat-card-delta up">↑ On schedule</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load faculty stats:', err);
  }
}

async function updateCRStats() {
  const grid = document.getElementById("crStatGrid");
  if (!grid) return;

  try {
    const stats = await api('/stats/cr');

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--accent-lt);color:var(--accent)"><i class="fas fa-bullhorn"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.totalAnnouncements}</div>
          <div class="stat-card-label">Announcements</div>
          <div class="stat-card-delta up">↑ Active posts</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--accent-2-lt);color:var(--accent-2)"><i class="fas fa-bell"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.totalNotifications}</div>
          <div class="stat-card-label">Notifications Sent</div>
          <div class="stat-card-delta up">↑ Keeping connected</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--warn-lt);color:var(--warn)"><i class="fas fa-box"></i></div>
        <div class="stat-card-body">
          <div class="stat-card-value">${stats.itemsAvailable}</div>
          <div class="stat-card-label">Items Available</div>
          <div class="stat-card-delta up">↑ Campus resources</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load CR stats:', err);
  }
}

// ═══════════════════════════════════════════
//  UTILITY HELPERS
// ═══════════════════════════════════════════

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
}

// ═══════════════════════════════════════════
//  DATA LOADERS (fetch from API)
// ═══════════════════════════════════════════

async function loadUsers() {
  try {
    store.users = await api('/users');
  } catch (err) {
    console.error('Failed to load users:', err);
    store.users = [];
  }
}

async function loadInventory() {
  try {
    store.inventory = await api('/inventory');
  } catch (err) {
    console.error('Failed to load inventory:', err);
    store.inventory = [];
  }
}

async function loadReservations() {
  try {
    store.reservations = await api('/reservations');
  } catch (err) {
    console.error('Failed to load reservations:', err);
    store.reservations = [];
  }
}

async function loadNotifications() {
  try {
    store.notifications = await api(`/notifications?role=${store.session.role}`);
  } catch (err) {
    console.error('Failed to load notifications:', err);
    store.notifications = [];
  }
}

async function loadAnnouncements() {
  try {
    store.announcements = await api('/announcements');
  } catch (err) {
    console.error('Failed to load announcements:', err);
    store.announcements = [];
  }
}

async function loadSchedule() {
  try {
    const rows = await api('/schedule');
    store.rawScheduleRows = rows;
    
    const facSelect = document.getElementById('studentFacultySelect');
    if (facSelect) {
      const faculties = [...new Set(rows.map(r => r.faculty_name).filter(Boolean))];
      facSelect.innerHTML = `<option value="">Select Faculty...</option>` + 
        faculties.map(f => `<option value="${f}">${f}</option>`).join('');
    }

    // Transform flat rows into grouped format: { Mon: [...], Tue: [...], ... }
    store.scheduleData = {};
    rows.forEach((row) => {
      const day = row.day_of_week;
      if (!store.scheduleData[day]) store.scheduleData[day] = [];
      store.scheduleData[day].push({
        time: row.time_slot.substring(0, 5),  // "09:00:00" → "09:00"
        label: row.subject,
        room: row.room,
        color: row.color_class,
        id: row.id,
        faculty_id: row.faculty_id
      });
    });
  } catch (err) {
    console.error('Failed to load schedule:', err);
    store.scheduleData = {};
  }
}

async function loadAllData() {
  await Promise.all([
    loadUsers(),
    loadInventory(),
    loadReservations(),
    loadNotifications(),
    loadAnnouncements(),
    loadSchedule(),
  ]);
}

// ═══════════════════════════════════════════
//  PAGE INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  const isLogin = document.getElementById("loginPage");
  const isDashboard = document.getElementById("appShell");

  if (isLogin) initLogin();
  if (isDashboard) initDashboard();
});

// ── LOGIN PAGE INIT ──
function initLogin() {
  if (getRole()) {
    window.location.href = "dashboard.html";
    return;
  }

  let selectedRole = "student";
  let isSignUp = false;

  const tabs = document.querySelectorAll(".role-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      selectedRole = tab.dataset.role;
    });
  });

  const chips = document.querySelectorAll(".demo-chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (isSignUp) toggleAuthBtn.click(); // switch back to login mode if needed
      const email = chip.dataset.email;
      const pass  = chip.dataset.pass;
      const role  = chip.dataset.role;

      document.getElementById("loginEmail").value = email;
      document.getElementById("loginPassword").value = pass;

      tabs.forEach((t) => t.classList.remove("active"));
      const matchTab = document.querySelector(`.role-tab[data-role="${role}"]`);
      if (matchTab) matchTab.classList.add("active");
      selectedRole = role;

      showToast(`Demo credentials loaded for ${capitalize(role)}`, "info");
    });
  });

  const form = document.getElementById("loginForm");
  const btn  = document.getElementById("loginBtn");

  const btnText = document.getElementById("btnText");
  const nameField = document.getElementById("nameField");
  const retypePasswordField = document.getElementById("retypePasswordField");
  const toggleAuthPrefix = document.getElementById("toggleAuthPrefix");
  const toggleAuthBtn = document.getElementById("toggleAuthBtn");
  const loginName = document.getElementById("loginName");
  const loginRetypePassword = document.getElementById("loginRetypePassword");

  if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener("click", () => {
      isSignUp = !isSignUp;
      if (isSignUp) {
        nameField.style.display = "flex";
        retypePasswordField.style.display = "flex";
        loginName.required = true;
        loginRetypePassword.required = true;
        btnText.textContent = "Sign Up";
        toggleAuthPrefix.textContent = "Already have an account?";
        toggleAuthBtn.textContent = "Sign in";
      } else {
        nameField.style.display = "none";
        retypePasswordField.style.display = "none";
        loginName.required = false;
        loginRetypePassword.required = false;
        btnText.textContent = "Sign In";
        toggleAuthPrefix.textContent = "Don't have an account?";
        toggleAuthBtn.textContent = "Sign up";
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const pass  = document.getElementById("loginPassword").value.trim();

    if (!email || !pass) {
      showToast("Please enter email and password", "error");
      return;
    }

    if (isSignUp) {
      const name = document.getElementById("loginName").value.trim();
      const retypePass = document.getElementById("loginRetypePassword").value.trim();
      
      if (!name) {
        showToast("Please enter your name", "error");
        return;
      }
      if (pass !== retypePass) {
        showToast("Passwords do not match", "error");
        return;
      }
    }

    btn.disabled = true;
    btn.classList.add("loading");

    try {
      if (isSignUp) {
        const name = document.getElementById("loginName").value.trim();
        const dbRoleMap = { 'student': 'Student', 'faculty': 'Faculty', 'admin': 'Admin', 'subadmin': 'Sub-Admin' };
        
        await api('/users', 'POST', { name, email, password: pass, role: dbRoleMap[selectedRole] });
        
        showToast("Sign up successful! Please sign in.", "success");
        btn.disabled = false;
        btn.classList.remove("loading");
        
        toggleAuthBtn.click();
        document.getElementById("loginPassword").value = "";
        document.getElementById("loginRetypePassword").value = "";
      } else {
        const data = await api('/login', 'POST', { email, password: pass });

        if (data.success && data.user) {
          // Map DB role to session role key
          const roleMap = { 'Student': 'student', 'Faculty': 'faculty', 'Admin': 'admin', 'Sub-Admin': 'subadmin' };
          const sessionRole = roleMap[data.user.role] || selectedRole;

          setSession(sessionRole, data.user.email, data.user.id);
          showToast("Login successful! Credentials verified from database ✓", "success");

          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 500);
        }
      }
    } catch (err) {
      showToast(err.message || (isSignUp ? "Sign up failed" : "Login failed — check credentials"), "error");
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  });
}

// ── DASHBOARD PAGE INIT ──
async function initDashboard() {
  const role = getRole();
  const user = getUser();
  const userId = getUserId();

  if (!role || !user) {
    window.location.href = "index.html";
    return;
  }

  store.session.role = role;
  store.session.user = user;
  store.session.userId = userId;

  // Derive display name
  const userName = user.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = getInitials(userName);
  const greeting = getGreeting();

  // Update sidebar user info
  const sidebarAvatar   = document.getElementById("sidebarAvatar");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserRole = document.getElementById("sidebarUserRole");

  if (sidebarAvatar)   sidebarAvatar.textContent = initials;
  if (sidebarUserName) sidebarUserName.textContent = userName;
  if (sidebarUserRole) sidebarUserRole.textContent = capitalize(role);

  // Update topbar profile
  const profileAvatar = document.getElementById("profileChipAvatar");
  const profileName   = document.getElementById("profileChipName");

  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileName)   profileName.textContent = userName.split(" ")[0];

  if (role === 'faculty') {
    const notifBell = document.getElementById("notifBellWrap");
    if (notifBell) notifBell.style.display = 'none';
  }

  // Update greetings
  const greetingEls = {
    student:  document.getElementById("studentGreeting"),
    admin:    document.getElementById("adminGreeting"),
    faculty:  document.getElementById("facGreeting"),
    subadmin: document.getElementById("crGreeting"),
  };

  const greetingMessages = {
    student:  `${greeting}, ${userName.split(" ")[0]}`,
    admin:    `Welcome back, ${userName.split(" ")[0]}`,
    faculty:  `${greeting}, ${userName}`,
    subadmin: `Hey ${userName.split(" ")[0]}! Welcome back`,
  };

  if (greetingEls[role]) {
    greetingEls[role].textContent = greetingMessages[role];
  }

  // Build sidebar nav
  buildSidebar(role);

  // Show default section
  const defaults = roleDefaults[role];
  if (defaults) {
    showSection(defaults.section, defaults.nav);
  }

  // Load ALL data from database, then render
  await loadAllData();
  renderAll();
}

function renderAll() {
  renderInventoryGrid("inventoryGrid", "all");
  renderInventoryGrid("crInventoryGrid", "all");
  renderUsersTable();
  renderAdminInventory();
  renderStudentReservations();
  renderAdminReservations();
  renderNotifPopup();
  renderNotifLists();
  renderAnnouncements();
  renderStudentSchedule();
  renderScheduleGrid("facScheduleGrid", true);
  renderScheduleGrid("facOverviewScheduleGrid");
  renderFacStudents();
  updateNotifBadge();
  updateAdminStats();
  updateFacStats();
  updateCRStats();
}

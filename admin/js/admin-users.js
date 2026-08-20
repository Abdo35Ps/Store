// admin/js/admin-users.js — إدارة المستخدمين
import { requireAdmin } from "./admin-auth.js";
import { db, collection, getDocs, doc, updateDoc, query, where } from "../../store/js/firebase-config.js";
import { toast, confirmDialog, formatDate } from "../../store/js/main.js";

let users = [], orders = [];
const tbody = document.getElementById("users-tbody");
const searchInput = document.getElementById("search-users");
const modal = document.getElementById("user-modal");

requireAdmin().then(load);

async function load() {
  const [uSnap, oSnap] = await Promise.all([getDocs(collection(db, "users")), getDocs(collection(db, "orders"))]);
  users = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  orders = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
}

function render() {
  const s = searchInput.value.trim().toLowerCase();
  let list = users.filter(u => !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.phone?.includes(s));
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="state-box"><div class="state-box__icon">👥</div><h3>لا يوجد مستخدمون</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(u => {
    const orderCount = orders.filter(o => o.userId === u.id).length;
    return `
    <tr data-id="${u.id}">
      <td>${u.name || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.phone || "—"}</td>
      <td>${orderCount}</td>
      <td><span class="pill ${u.disabled ? "pill--off" : "pill--on"}">${u.disabled ? "معطّل" : "نشط"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn--ghost btn--sm" data-view>عرض الطلبات</button>
          <button class="btn ${u.disabled ? "btn--primary" : "btn--danger"} btn--sm" data-toggle>${u.disabled ? "تفعيل" : "تعطيل"}</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", async (e) => {
    const id = e.target.closest("tr").dataset.id;
    const u = users.find(x => x.id === id);
    const ok = await confirmDialog(u.disabled ? "تفعيل المستخدم" : "تعطيل المستخدم", u.disabled ? "سيتمكن المستخدم من استخدام حسابه مجددًا." : "لن يتمكن المستخدم من الدخول لحسابه.");
    if (!ok) return;
    try {
      await updateDoc(doc(db, "users", id), { disabled: !u.disabled });
      u.disabled = !u.disabled;
      toast("تم تحديث حالة المستخدم", "success");
      render();
    } catch (err) { toast("تعذر تحديث الحالة", "error"); }
  }));
  tbody.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", (e) => openUserOrders(e.target.closest("tr").dataset.id)));
}

searchInput.addEventListener("input", render);

function openUserOrders(id) {
  const u = users.find(x => x.id === id);
  const userOrders = orders.filter(o => o.userId === id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  document.getElementById("user-modal-title").textContent = `طلبات ${u.name || "المستخدم"}`;
  document.getElementById("user-modal-body").innerHTML = userOrders.length ? userOrders.map(o => `
    <div class="flex justify-between items-center" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <span>#${o.id.slice(0, 6).toUpperCase()} — ${formatDate(o.createdAt)}</span>
      <span>${(o.items || []).length} منتج</span>
    </div>`).join("") : `<p class="muted">لا توجد طلبات لهذا المستخدم</p>`;
  modal.classList.add("modal-overlay--show");
}
document.getElementById("user-modal-close").addEventListener("click", () => modal.classList.remove("modal-overlay--show"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("modal-overlay--show"); });

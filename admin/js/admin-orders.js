// admin/js/admin-orders.js — إدارة الطلبات (عرض، تفاصيل، تغيير الحالة) Realtime
import { requireAdmin } from "./admin-auth.js";
import { db, collection, doc, updateDoc, onSnapshot, orderBy, query } from "../../store/js/firebase-config.js";
import { money, formatDate, toast } from "../../store/js/main.js";

const STATUS_LABELS = {
  pending: ["قيد المراجعة", "pill--off"], confirmed: ["تم التأكيد", "pill--on"],
  processing: ["جاري التجهيز", "pill--on"], shipped: ["تم الشحن", "pill--on"],
  delivered: ["تم التسليم", "pill--on"], cancelled: ["تم الإلغاء", "pill--off"]
};

let orders = [];
const tbody = document.getElementById("orders-tbody");
const searchInput = document.getElementById("search-orders");
const statusFilter = document.getElementById("filter-status");
const modal = document.getElementById("order-modal");

requireAdmin().then(() => {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8"><div class="state-box state-box--error"><div class="state-box__icon">⚠️</div><h3>تعذر تحميل الطلبات</h3><p>${err.code || err.message || ""}</p></div></td></tr>`;
  });
});

function render() {
  const s = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  let list = orders.filter(o =>
    (!s || o.customerName?.toLowerCase().includes(s) || o.phone?.includes(s) || o.id.includes(s)) &&
    (!status || o.status === status)
  );
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="state-box"><div class="state-box__icon">🧾</div><h3>لا توجد طلبات</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(o => {
    const [label, cls] = STATUS_LABELS[o.status] || STATUS_LABELS.pending;
    return `
    <tr data-id="${o.id}">
      <td><strong>#${o.id.slice(0, 6).toUpperCase()}</strong></td>
      <td>${o.customerName || "—"}</td>
      <td>${o.phone || "—"}</td>
      <td>${formatDate(o.createdAt)}</td>
      <td>${(o.items || []).length} منتج</td>
      <td>${money(o.total)}</td>
      <td><span class="pill ${cls}">${label}</span></td>
      <td><button class="btn btn--ghost btn--sm" data-view>عرض التفاصيل</button></td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", (e) => openOrder(e.target.closest("tr").dataset.id)));
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

function openOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  document.getElementById("order-modal-title").textContent = `تفاصيل الطلب #${id.slice(0, 6).toUpperCase()}`;
  document.getElementById("order-modal-body").innerHTML = `
    <div class="field-row">
      <div><strong>العميل:</strong> ${o.customerName || "—"}</div>
      <div><strong>الهاتف:</strong> ${o.phone || "—"}</div>
    </div>
    <p><strong>البريد:</strong> ${o.email || "—"}</p>
    <p><strong>العنوان:</strong> ${o.governorate || ""} - ${o.city || ""} - ${o.address || ""}</p>
    ${o.notes ? `<p><strong>ملاحظات:</strong> ${o.notes}</p>` : ""}
    <p><strong>طريقة الدفع:</strong> ${o.paymentMethod === "cash" ? "الدفع عند الاستلام" : o.paymentMethod === "wallet" ? "محفظة إلكترونية" : "بطاقة"}</p>
    <hr style="border-color:var(--border);margin:14px 0">
    ${(o.items || []).map(i => `
      <div class="flex justify-between items-center" style="padding:8px 0">
        <div class="flex items-center gap-12"><img src="${i.image}" class="thumb"><span>${i.name} × ${i.qty}</span></div>
        <strong>${money(i.price * i.qty)}</strong>
      </div>`).join("")}
    <hr style="border-color:var(--border);margin:14px 0">
    <div class="flex justify-between"><span>الشحن</span><span>${money(o.shipping || 0)}</span></div>
    <div class="flex justify-between" style="font-weight:900;font-size:16px;margin-top:6px"><span>الإجمالي</span><span>${money(o.total)}</span></div>

    <div class="field" style="margin-top:20px">
      <label>تغيير حالة الطلب</label>
      <select id="order-status-select">
        ${Object.entries(STATUS_LABELS).map(([k, [label]]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </div>
    <button class="btn btn--primary" id="save-status-btn" style="width:100%">حفظ الحالة</button>
  `;
  document.getElementById("save-status-btn").addEventListener("click", async () => {
    const newStatus = document.getElementById("order-status-select").value;
    const btn = document.getElementById("save-status-btn");
    btn.disabled = true; btn.textContent = "جاري الحفظ...";
    try {
      await updateDoc(doc(db, "orders", id), { status: newStatus });
      toast("تم تحديث حالة الطلب", "success");
      closeOrder();
    } catch (err) {
      toast("تعذر تحديث الحالة", "error");
    } finally {
      btn.disabled = false; btn.textContent = "حفظ الحالة";
    }
  });
  modal.classList.add("modal-overlay--show");
}
function closeOrder() { modal.classList.remove("modal-overlay--show"); }
document.getElementById("order-modal-close").addEventListener("click", closeOrder);
modal.addEventListener("click", (e) => { if (e.target === modal) closeOrder(); });
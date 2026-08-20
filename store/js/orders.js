// js/orders.js — عرض طلبات المستخدم الحالي (Realtime)
import { db, collection, query, where, onSnapshot } from "./firebase-config.js";
import { requireAuth, money, formatDate, emptyState, skeletonCards, toast } from "./main.js";

const STATUS_LABELS = {
  pending: ["قيد المراجعة", "status--pending"],
  confirmed: ["تم التأكيد", "status--confirmed"],
  processing: ["جاري التجهيز", "status--processing"],
  shipped: ["تم الشحن", "status--shipped"],
  delivered: ["تم التسليم", "status--delivered"],
  cancelled: ["تم الإلغاء", "status--cancelled"]
};

const listEl = document.getElementById("orders-list");

function statusBadge(status) {
  const [label, cls] = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return `<span class="status ${cls}">${label}</span>`;
}

function renderOrders(orders) {
  if (!listEl) return;
  if (!orders.length) {
    emptyState(listEl, {
      icon: "📦", title: "لا توجد طلبات بعد",
      desc: "ابدأ التسوق الآن وستظهر طلباتك هنا.",
      actionHtml: `<a href="products.html" class="btn btn--primary">تصفح المنتجات</a>`
    });
    return;
  }
  listEl.innerHTML = orders.map((o) => `
    <div class="order-card">
      <div class="order-card__head">
        <span class="order-card__id">طلب #${o.id.slice(0, 8).toUpperCase()}</span>
        ${statusBadge(o.status)}
      </div>
      <div class="muted" style="font-size:13px;margin-bottom:8px">${formatDate(o.createdAt)}</div>
      <div class="order-card__items">
        ${(o.items || []).map((i) => `<img src="${i.image}" title="${i.name} × ${i.qty}">`).join("")}
      </div>
      <div class="order-card__foot">
        <span>${(o.items || []).length} منتج</span>
        <span style="font-weight:800;color:var(--text)">${money(o.total)}</span>
      </div>
    </div>`).join("");
}

if (listEl) {
  requireAuth("login.html?redirect=orders.html").then((user) => {
    skeletonCards(listEl, 3);
    const successId = new URLSearchParams(location.search).get("success");
    if (successId) toast("تم إنشاء طلبك بنجاح! رقم الطلب: " + successId.slice(0, 8).toUpperCase(), "success", 5000);

    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderOrders(orders);
    }, (err) => {
      console.error(err);
      emptyState(listEl, { icon: "⚠️", title: "تعذر تحميل الطلبات" });
    });
  });
}
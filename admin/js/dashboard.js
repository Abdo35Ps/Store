// admin/js/dashboard.js — لوحة الإحصائيات الرئيسية
import { requireAdmin } from "./admin-auth.js";
import { db, collection, getDocs, query, orderBy, limit } from "../../store/js/firebase-config.js";
import { money, formatDate } from "../../store/js/main.js";

const STATUS_LABELS = {
  pending: "قيد المراجعة", confirmed: "تم التأكيد", processing: "جاري التجهيز",
  shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "تم الإلغاء"
};

requireAdmin().then(async () => {
  const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "orders")),
    getDocs(collection(db, "users"))
  ]);
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const totalSales = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
  const newOrders = orders.filter(o => o.status === "pending").length;
  const processingOrders = orders.filter(o => ["confirmed", "processing", "shipped"].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === "delivered").length;
  const lowStock = products.filter(p => (p.stock ?? 0) <= 5).length;

  document.getElementById("stat-products").textContent = products.length;
  document.getElementById("stat-orders").textContent = orders.length;
  document.getElementById("stat-users").textContent = users.length;
  document.getElementById("stat-sales").textContent = money(totalSales);
  document.getElementById("stat-new-orders").textContent = newOrders;
  document.getElementById("stat-processing-orders").textContent = processingOrders;
  document.getElementById("stat-completed-orders").textContent = completedOrders;
  document.getElementById("stat-low-stock").textContent = lowStock;

  // آخر الطلبات
  const recentEl = document.getElementById("recent-orders");
  const recent = [...orders].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 6);
  recentEl.innerHTML = recent.length ? recent.map(o => `
    <div class="mini-list__row">
      <div class="mini-list__left">
        <strong>#${o.id.slice(0, 6).toUpperCase()}</strong>
        <span class="muted">${o.customerName || ""}</span>
      </div>
      <span>${money(o.total)}</span>
      <span class="muted">${STATUS_LABELS[o.status] || o.status}</span>
    </div>`).join("") : `<p class="muted">لا توجد طلبات بعد</p>`;

  // المنتجات الأكثر مبيعًا (تقديرية بناءً على العناصر ضمن الطلبات)
  const salesMap = {};
  orders.forEach(o => (o.items || []).forEach(i => { salesMap[i.name] = (salesMap[i.name] || 0) + i.qty; }));
  const topProducts = Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // مخطط المبيعات آخر 7 أيام
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const salesByDay = days.map(d => {
    const key = d.toDateString();
    return orders.filter(o => o.createdAt?.toDate && o.createdAt.toDate().toDateString() === key && o.status !== "cancelled")
      .reduce((s, o) => s + (o.total || 0), 0);
  });

  if (window.Chart) {
    new Chart(document.getElementById("salesChart"), {
      type: "line",
      data: {
        labels: days.map(d => d.toLocaleDateString("ar-EG", { weekday: "short" })),
        datasets: [{
          label: "المبيعات", data: salesByDay, borderColor: "#0E6B5C",
          backgroundColor: "rgba(14,107,92,.12)", fill: true, tension: .35, pointRadius: 3
        }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    new Chart(document.getElementById("topProductsChart"), {
      type: "bar",
      data: {
        labels: topProducts.map(p => p[0]),
        datasets: [{ label: "الكمية المباعة", data: topProducts.map(p => p[1]), backgroundColor: "#E8A33D", borderRadius: 6 }]
      },
      options: { indexAxis: "y", plugins: { legend: { display: false } } }
    });
  }
});

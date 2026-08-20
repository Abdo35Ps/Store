// js/checkout.js — إتمام الطلب وإنشاؤه في Firestore
import {
  db, auth, collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp
} from "./firebase-config.js";
import { getCart, clearCart, cartTotal, money, toast, requireAuth } from "./main.js";

const form = document.getElementById("checkout-form");
const reviewEl = document.getElementById("checkout-review");
const totalsEl = document.getElementById("checkout-totals");
let SETTINGS = { shippingFee: 0, minOrder: 0, currency: "ج.م" };

async function loadSettings() {
  try {
    const s = await getDoc(doc(db, "settings", "store"));
    if (s.exists()) SETTINGS = { ...SETTINGS, ...s.data() };
  } catch (e) { /* defaults */ }
}

function renderReview() {
  const cart = getCart();
  if (!cart.length) {
    location.href = "cart.html";
    return;
  }
  if (reviewEl) {
    reviewEl.innerHTML = cart.map((i) => `
      <div class="flex justify-between items-center" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="flex items-center gap-12">
          <img src="${i.image}" style="width:48px;height:48px;border-radius:8px;object-fit:cover">
          <div>
            <div style="font-weight:700;font-size:14px">${i.name}</div>
            <div class="muted" style="font-size:13px">الكمية: ${i.qty}</div>
          </div>
        </div>
        <div style="font-weight:800">${money(i.price * i.qty)}</div>
      </div>`).join("");
  }
  if (totalsEl) {
    const subtotal = cartTotal();
    const shipping = subtotal >= (SETTINGS.freeShippingOver || Infinity) ? 0 : (SETTINGS.shippingFee || 0);
    totalsEl.innerHTML = `
      <div class="summary-row"><span>المجموع الفرعي</span><span>${money(subtotal)}</span></div>
      <div class="summary-row"><span>الشحن</span><span>${money(shipping)}</span></div>
      <div class="summary-row summary-row--total"><span>الإجمالي</span><span>${money(subtotal + shipping)}</span></div>`;
  }
}

if (form) {
  requireAuth("login.html?redirect=checkout.html").then(async (user) => {
    await loadSettings();
    renderReview();

    // Prefill from user profile if available
    try {
      const uDoc = await getDoc(doc(db, "users", user.uid));
      if (uDoc.exists()) {
        const u = uDoc.data();
        if (u.name) form.querySelector("#co-name").value = u.name;
        if (u.phone) form.querySelector("#co-phone").value = u.phone;
        if (u.email) form.querySelector("#co-email").value = u.email;
      } else if (user.email) {
        form.querySelector("#co-email").value = user.email;
      }
    } catch (e) { /* ignore */ }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cart = getCart();
      if (!cart.length) { toast("السلة فارغة", "error"); return; }

      const subtotal = cartTotal();
      if (SETTINGS.minOrder && subtotal < SETTINGS.minOrder) {
        toast(`الحد الأدنى للطلب هو ${money(SETTINGS.minOrder)}`, "warning");
        return;
      }
      const shipping = subtotal >= (SETTINGS.freeShippingOver || Infinity) ? 0 : (SETTINGS.shippingFee || 0);
      const paymentMethod = form.querySelector('input[name="payment"]:checked')?.value || "cash";

      const order = {
        userId: user.uid,
        customerName: form.querySelector("#co-name").value.trim(),
        phone: form.querySelector("#co-phone").value.trim(),
        email: form.querySelector("#co-email").value.trim(),
        governorate: form.querySelector("#co-gov").value.trim(),
        city: form.querySelector("#co-city").value.trim(),
        address: form.querySelector("#co-address").value.trim(),
        notes: form.querySelector("#co-notes").value.trim(),
        items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
        subtotal, shipping, total: subtotal + shipping,
        paymentMethod,
        status: "pending", // قيد المراجعة
        createdAt: serverTimestamp()
      };

      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "جاري تنفيذ الطلب...";
      try {
        const ref = await addDoc(collection(db, "orders"), order);
        // تقليل المخزون لكل منتج
        for (const item of cart) {
          try { await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) }); } catch (e) {}
        }
        clearCart();
        sessionStorage.setItem("lastOrderId", ref.id);
        location.href = `orders.html?success=${ref.id}`;
      } catch (err) {
        console.error(err);
        toast("تعذر إتمام الطلب، حاول مرة أخرى", "error");
        btn.disabled = false; btn.textContent = "تأكيد الطلب";
      }
    });
  });
}

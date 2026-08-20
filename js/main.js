// js/main.js — أدوات مشتركة تُستخدم في كل صفحات المتجر
import { auth, onAuthStateChanged, signOut, db, doc, getDoc } from "./firebase-config.js";

/* ---------------- Toast Notifications ---------------- */
export function toast(message, type = "success", duration = 3200) {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  const icons = { success: "✓", error: "✕", info: "ℹ", warning: "!" };
  el.innerHTML = `<span class="toast__icon">${icons[type] || "ℹ"}</span><span class="toast__msg">${message}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast--show"));
  setTimeout(() => {
    el.classList.remove("toast--show");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ---------------- Confirm Dialog ---------------- */
export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-box">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn--ghost" data-act="cancel">إلغاء</button>
          <button class="btn btn--danger" data-act="ok">تأكيد</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("confirm-overlay--show"));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.dataset.act === "cancel") {
        overlay.remove(); resolve(false);
      } else if (e.target.dataset.act === "ok") {
        overlay.remove(); resolve(true);
      }
    });
  });
}

/* ---------------- Formatting ---------------- */
let CURRENCY = "ج.م";
export function setCurrency(c) { CURRENCY = c; }
export function money(n) {
  const num = Number(n) || 0;
  return `${num.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ${CURRENCY}`;
}
export function discountPct(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
export function formatDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch { return ""; }
}

/* ---------------- Loading / Empty / Error states ---------------- */
export function skeletonCards(container, count = 8) {
  container.innerHTML = Array.from({ length: count }).map(() => `
    <div class="card card--skeleton">
      <div class="skeleton skeleton--img"></div>
      <div class="skeleton skeleton--line" style="width:70%"></div>
      <div class="skeleton skeleton--line" style="width:40%"></div>
    </div>`).join("");
}
export function emptyState(container, { icon = "📦", title = "لا توجد بيانات", desc = "", actionHtml = "" }) {
  container.innerHTML = `
    <div class="state-box">
      <div class="state-box__icon">${icon}</div>
      <h3>${title}</h3>
      ${desc ? `<p>${desc}</p>` : ""}
      ${actionHtml}
    </div>`;
}
export function errorState(container, message = "حدث خطأ أثناء تحميل البيانات") {
  container.innerHTML = `
    <div class="state-box state-box--error">
      <div class="state-box__icon">⚠️</div>
      <h3>عذرًا!</h3>
      <p>${message}</p>
      <button class="btn btn--primary" onclick="location.reload()">إعادة المحاولة</button>
    </div>`;
}

/* ---------------- Theme (Dark / Light) ---------------- */
export function initTheme() {
  const saved = localStorage.getItem("store-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("store-theme", next);
    });
  });
}

/* ---------------- Mobile nav toggle ---------------- */
export function initMobileNav() {
  const btn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector(".nav");
  if (btn && nav) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      nav.classList.toggle("nav--open");
    });
    // إغلاق القائمة عند الضغط على أي رابط بداخلها
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") nav.classList.remove("nav--open");
    });
    // إغلاق القائمة عند الضغط خارجها
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("nav--open") && !nav.contains(e.target) && e.target !== btn) {
        nav.classList.remove("nav--open");
      }
    });
  }
}

/* ---------------- Cart badge (reads localStorage cart) ---------------- */
export function getCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
}
export function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}
export function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}
export function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}
export function updateCartBadge() {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    const c = cartCount();
    el.textContent = c;
    el.style.display = c > 0 ? "flex" : "none";
  });
}
export function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, product.stock ?? 99);
  } else {
    cart.push({
      id: product.id, name: product.name, price: product.price,
      image: product.images?.[0] || product.image || "", stock: product.stock ?? 99, qty
    });
  }
  saveCart(cart);
  toast("تمت إضافة المنتج إلى السلة", "success");
}
export function removeFromCart(id) {
  saveCart(getCart().filter((i) => i.id !== id));
}
export function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.qty = Math.max(1, Math.min(qty, item.stock ?? 99));
    saveCart(cart);
  }
}
export function clearCart() { saveCart([]); }

/* ---------------- Auth state header sync ---------------- */
export function initAuthHeader() {
  const loginArea = document.querySelector("[data-auth-area]");
  if (!loginArea) return;
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let displayName = user.displayName || "حسابي";
      loginArea.innerHTML = `
        <div class="user-menu">
          <button class="icon-btn" data-user-toggle title="${displayName}">👤</button>
          <div class="user-menu__drop" data-user-drop>
            <a href="account.html">حسابي</a>
            <a href="orders.html">طلباتي</a>
            <button data-logout>تسجيل الخروج</button>
          </div>
        </div>`;
      loginArea.querySelector("[data-user-toggle]").addEventListener("click", () => {
        loginArea.querySelector("[data-user-drop]").classList.toggle("user-menu__drop--open");
      });
      loginArea.querySelector("[data-logout]").addEventListener("click", async () => {
        await signOut(auth);
        toast("تم تسجيل الخروج", "info");
        setTimeout(() => location.href = "index.html", 600);
      });
    } else {
      loginArea.innerHTML = `<a href="login.html" class="btn btn--primary btn--sm">تسجيل الدخول</a>`;
    }
  });
}

export function requireAuth(redirectTo = "login.html") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) { location.href = redirectTo; }
      else resolve(user);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMobileNav();
  updateCartBadge();
  initAuthHeader();
});


// js/cart.js — منطق صفحة سلة المشتريات
import { getCart, removeFromCart, updateCartQty, cartTotal, money, emptyState, confirmDialog } from "./main.js";

const listEl = document.getElementById("cart-list");
const summaryEl = document.getElementById("cart-summary");

export function renderCart() {
  if (!listEl) return;
  const cart = getCart();
  if (!cart.length) {
    emptyState(listEl, {
      icon: "🛒", title: "سلتك فارغة",
      desc: "لم تقم بإضافة أي منتجات بعد.",
      actionHtml: `<a href="products.html" class="btn btn--primary">تسوّق الآن</a>`
    });
    if (summaryEl) summaryEl.style.display = "none";
    return;
  }
  if (summaryEl) summaryEl.style.display = "block";
  listEl.innerHTML = cart.map((item) => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image || 'https://via.placeholder.com/90'}" class="cart-item__img" alt="${item.name}">
      <div>
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__price">${money(item.price)}</div>
        <div class="qty-control" style="margin-top:8px">
          <button data-dec>−</button>
          <input type="number" min="1" max="${item.stock ?? 99}" value="${item.qty}" data-qty-input>
          <button data-inc>+</button>
        </div>
        <button class="cart-item__remove" data-remove>🗑 حذف</button>
      </div>
      <div class="cart-item__totals">${money(item.price * item.qty)}</div>
    </div>`).join("");

  renderSummary();
  bindEvents();
}

function renderSummary() {
  if (!summaryEl) return;
  const total = cartTotal();
  const shipping = window.__STORE_SETTINGS__?.shippingFee ?? 0;
  summaryEl.querySelector("[data-sum-subtotal]").textContent = money(total);
  summaryEl.querySelector("[data-sum-shipping]").textContent = money(shipping);
  summaryEl.querySelector("[data-sum-total]").textContent = money(total + shipping);
}

function bindEvents() {
  listEl.querySelectorAll(".cart-item").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector("[data-inc]").addEventListener("click", () => {
      const input = row.querySelector("[data-qty-input]");
      updateCartQty(id, Number(input.value) + 1);
      renderCart();
    });
    row.querySelector("[data-dec]").addEventListener("click", () => {
      const input = row.querySelector("[data-qty-input]");
      updateCartQty(id, Number(input.value) - 1);
      renderCart();
    });
    row.querySelector("[data-qty-input]").addEventListener("change", (e) => {
      updateCartQty(id, Number(e.target.value) || 1);
      renderCart();
    });
    row.querySelector("[data-remove]").addEventListener("click", async () => {
      const ok = await confirmDialog("حذف المنتج", "هل تريد حذف هذا المنتج من السلة؟");
      if (ok) { removeFromCart(id); renderCart(); }
    });
  });
}

document.addEventListener("DOMContentLoaded", renderCart);

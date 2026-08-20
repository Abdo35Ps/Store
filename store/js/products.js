// js/products.js — منطق عرض وجلب المنتجات والتصنيفات من Firestore
import {
  db, collection, getDocs, getDoc, doc, query, where, orderBy, onSnapshot
} from "./firebase-config.js";
import { money, discountPct, addToCart, skeletonCards, emptyState, errorState } from "./main.js";

/* جلب كل المنتجات (مرة واحدة) */
export async function fetchProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* الاستماع اللحظي للمنتجات (Realtime) — يُستخدم بالصفحة الرئيسية وصفحة المنتجات */
export function listenProducts(cb) {
  return onSnapshot(collection(db, "products"), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("listenProducts:", err));
}

export async function fetchProductById(id) {
  const s = await getDoc(doc(db, "products", id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function fetchCategories() {
  const snap = await getDocs(collection(db, "categories"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function listenCategories(cb) {
  return onSnapshot(collection(db, "categories"), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/* ---------------- Rendering ---------------- */
export function renderProductCard(p) {
  const disc = discountPct(p.price, p.oldPrice);
  const img = p.images?.[0] || p.image || "https://via.placeholder.com/400x400?text=Product";
  const available = p.available !== false && (p.stock ?? 0) > 0;
  return `
    <div class="card" data-id="${p.id}">
      <a href="product-details.html?id=${p.id}" class="card__img">
        <img src="${img}" alt="${p.name}" loading="lazy">
        ${disc > 0 ? `<span class="card__discount">خصم ${disc}%</span>` : ""}
        ${!available ? `<div class="card__unavailable">غير متوفر</div>` : ""}
      </a>
      <div class="card__body">
        <span class="card__cat">${p.categoryName || ""}</span>
        <a href="product-details.html?id=${p.id}"><h3 class="card__title">${p.name}</h3></a>
        ${p.rating ? `<span class="card__rating">${"★".repeat(Math.round(p.rating))}${"☆".repeat(5 - Math.round(p.rating))} <span class="muted">(${p.reviewsCount || 0})</span></span>` : ""}
        <div class="card__prices">
          <span class="card__price">${money(p.price)}</span>
          ${p.oldPrice ? `<span class="card__old-price">${money(p.oldPrice)}</span>` : ""}
        </div>
      </div>
      <div class="card__actions">
        <button class="btn btn--primary" data-add-cart ${!available ? "disabled" : ""}>${available ? "أضف إلى السلة" : "غير متوفر"}</button>
        <a href="product-details.html?id=${p.id}" class="btn btn--ghost">التفاصيل</a>
      </div>
    </div>`;
}

export function renderProductsGrid(container, products) {
  if (!products.length) {
    emptyState(container, { icon: "🔍", title: "لا توجد منتجات", desc: "جرّب تغيير كلمات البحث أو الفلاتر." });
    return;
  }
  container.innerHTML = products.map(renderProductCard).join("");
  container.querySelectorAll("[data-add-cart]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.closest(".card").dataset.id;
      const p = products.find((x) => x.id === id);
      if (p) addToCart(p, 1);
    });
  });
}

/* ---------------- Filtering / Sorting / Pagination helper ---------------- */
export function filterProducts(products, { search = "", category = "", sort = "" } = {}) {
  let list = [...products];
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((p) => p.name?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
  }
  if (category) list = list.filter((p) => p.categoryId === category);
  switch (sort) {
    case "price-asc": list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "newest": list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); break;
    case "discount": list.sort((a, b) => discountPct(b.price, b.oldPrice) - discountPct(a.price, a.oldPrice)); break;
    default: break;
  }
  return list;
}

export function paginate(list, page, perPage) {
  const start = (page - 1) * perPage;
  return list.slice(start, start + perPage);
}

export function renderPagination(container, total, perPage, current, onChange) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) { container.innerHTML = ""; return; }
  let html = `<button class="btn btn--ghost btn--sm" data-p="${current - 1}" ${current === 1 ? "disabled" : ""}>السابق</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="btn ${i === current ? "btn--primary" : "btn--ghost"} btn--sm" data-p="${i}">${i}</button>`;
  }
  html += `<button class="btn btn--ghost btn--sm" data-p="${current + 1}" ${current === pages ? "disabled" : ""}>التالي</button>`;
  container.innerHTML = html;
  container.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => onChange(Number(b.dataset.p))));
}

export { skeletonCards, errorState };

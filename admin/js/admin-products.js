// admin/js/admin-products.js — إدارة المنتجات (إضافة / تعديل / حذف / رفع صور)
import { requireAdmin } from "./admin-auth.js";
import {
  db, storage, collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, ref, uploadBytes, getDownloadURL, deleteObject
} from "../../store/js/firebase-config.js";
import { toast, confirmDialog, money } from "../../store/js/main.js";

let products = [], categories = [];
let pendingImages = []; // { file, previewUrl } للمنتج الجاري إضافته/تعديله
let existingImages = []; // روابط الصور الحالية عند التعديل
let editingId = null;

const tbody = document.getElementById("products-tbody");
const searchInput = document.getElementById("search-products");
const catFilter = document.getElementById("filter-category");
const modal = document.getElementById("product-modal");
const form = document.getElementById("product-form");

requireAdmin().then(load);

async function load() {
  const [pSnap, cSnap] = await Promise.all([getDocs(collection(db, "products")), getDocs(collection(db, "categories"))]);
  products = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  categories = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  catFilter.innerHTML = `<option value="">كل التصنيفات</option>` + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  document.getElementById("form-category").innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  render();
}

function render() {
  const s = searchInput.value.trim().toLowerCase();
  const cat = catFilter.value;
  let list = products.filter(p => (!s || p.name?.toLowerCase().includes(s)) && (!cat || p.categoryId === cat));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="state-box"><div class="state-box__icon">📦</div><h3>لا توجد منتجات</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr data-id="${p.id}">
      <td><img class="thumb" src="${p.images?.[0] || p.image || 'https://via.placeholder.com/44'}"></td>
      <td>${p.name}</td>
      <td>${p.categoryName || "—"}</td>
      <td>${money(p.price)}${p.oldPrice ? `<br><span class="muted" style="text-decoration:line-through;font-size:12px">${money(p.oldPrice)}</span>` : ""}</td>
      <td>${p.stock ?? 0}</td>
      <td><span class="pill ${p.featured ? "pill--on" : "pill--off"}">${p.featured ? "مميز" : "عادي"}</span></td>
      <td><span class="pill ${p.available !== false ? "pill--on" : "pill--off"}">${p.available !== false ? "متاح" : "غير متاح"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn--ghost btn--sm" data-edit>تعديل</button>
          <button class="btn btn--danger btn--sm" data-del>حذف</button>
        </div>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", (e) => openModal(e.target.closest("tr").dataset.id)));
  tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async (e) => {
    const id = e.target.closest("tr").dataset.id;
    const ok = await confirmDialog("حذف المنتج", "هل أنت متأكد من حذف هذا المنتج نهائيًا؟");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "products", id));
      products = products.filter(p => p.id !== id);
      toast("تم حذف المنتج", "success");
      render();
    } catch (err) { toast("تعذر حذف المنتج", "error"); }
  }));
}

searchInput.addEventListener("input", render);
catFilter.addEventListener("change", render);

/* ---------------- Modal open/close ---------------- */
document.getElementById("add-product-btn").addEventListener("click", () => openModal(null));
document.getElementById("modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function openModal(id) {
  editingId = id;
  pendingImages = [];
  existingImages = [];
  form.reset();
  document.getElementById("modal-title").textContent = id ? "تعديل منتج" : "إضافة منتج جديد";
  if (id) {
    const p = products.find(x => x.id === id);
    document.getElementById("form-name").value = p.name || "";
    document.getElementById("form-description").value = p.description || "";
    document.getElementById("form-price").value = p.price || 0;
    document.getElementById("form-old-price").value = p.oldPrice || "";
    document.getElementById("form-stock").value = p.stock ?? 0;
    document.getElementById("form-category").value = p.categoryId || "";
    document.getElementById("form-featured").checked = !!p.featured;
    document.getElementById("form-available").checked = p.available !== false;
    existingImages = [...(p.images || [])];
  }
  renderImagePreview();
  modal.classList.add("modal-overlay--show");
}
function closeModal() { modal.classList.remove("modal-overlay--show"); }

/* ---------------- Image upload ---------------- */
const uploadBox = document.getElementById("upload-box");
const fileInput = document.getElementById("form-images");
uploadBox.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  Array.from(fileInput.files).forEach(file => {
    pendingImages.push({ file, previewUrl: URL.createObjectURL(file) });
  });
  fileInput.value = "";
  renderImagePreview();
});

/* ---------------- Image via URL (works without Storage) ---------------- */
const imageUrlInput = document.getElementById("form-image-url");
document.getElementById("add-image-url-btn").addEventListener("click", () => {
  const url = imageUrlInput.value.trim();
  if (!url) return;
  existingImages.push(url);
  imageUrlInput.value = "";
  renderImagePreview();
});

function renderImagePreview() {
  const grid = document.getElementById("image-preview-grid");
  grid.innerHTML = "";
  existingImages.forEach((url, i) => {
    grid.innerHTML += `<div class="img-preview"><img src="${url}"><button data-remove-existing="${i}">✕</button></div>`;
  });
  pendingImages.forEach((img, i) => {
    grid.innerHTML += `<div class="img-preview"><img src="${img.previewUrl}"><button data-remove-pending="${i}">✕</button></div>`;
  });
  grid.querySelectorAll("[data-remove-existing]").forEach(b => b.addEventListener("click", () => {
    existingImages.splice(Number(b.dataset.removeExisting), 1); renderImagePreview();
  }));
  grid.querySelectorAll("[data-remove-pending]").forEach(b => b.addEventListener("click", () => {
    pendingImages.splice(Number(b.dataset.removePending), 1); renderImagePreview();
  }));
}

async function uploadPendingImages(productId) {
  const urls = [];
  for (const img of pendingImages) {
    try {
      const path = `products/${productId}/${Date.now()}-${img.file.name}`;
      const sref = ref(storage, path);
      await uploadBytes(sref, img.file);
      urls.push(await getDownloadURL(sref));
    } catch (err) {
      console.error("تعذر رفع الصورة (تأكد من تفعيل Storage في Firebase):", err);
      toast("تعذر رفع بعض الصور (Storage غير مفعّل) — استخدم خانة رابط الصورة بدلًا من ذلك", "warning");
    }
  }
  return urls;
}

/* ---------------- Save (create/update) ---------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "جاري الحفظ...";

  const catId = document.getElementById("form-category").value;
  const catName = categories.find(c => c.id === catId)?.name || "";

  const data = {
    name: document.getElementById("form-name").value.trim(),
    description: document.getElementById("form-description").value.trim(),
    price: Number(document.getElementById("form-price").value) || 0,
    oldPrice: Number(document.getElementById("form-old-price").value) || null,
    stock: Number(document.getElementById("form-stock").value) || 0,
    categoryId: catId,
    categoryName: catName,
    featured: document.getElementById("form-featured").checked,
    available: document.getElementById("form-available").checked,
  };

  try {
    let productId = editingId;
    if (!productId) {
      data.createdAt = serverTimestamp();
      data.rating = 0; data.reviewsCount = 0; data.images = [];
      const docRef = await addDoc(collection(db, "products"), data);
      productId = docRef.id;
    }
    const newUrls = await uploadPendingImages(productId);
    const finalImages = [...existingImages, ...newUrls];
    await updateDoc(doc(db, "products", productId), { ...data, images: finalImages, image: finalImages[0] || "" });

    toast(editingId ? "تم تحديث المنتج بنجاح" : "تمت إضافة المنتج بنجاح", "success");
    closeModal();
    await load();
  } catch (err) {
    console.error(err);
    toast("حدث خطأ أثناء حفظ المنتج", "error");
  } finally {
    btn.disabled = false; btn.textContent = "حفظ المنتج";
  }
});

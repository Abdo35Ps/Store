// admin/js/admin-categories.js — إدارة التصنيفات
import { requireAdmin } from "./admin-auth.js";
import {
  db, storage, collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, ref, uploadBytes, getDownloadURL
} from "../../store/js/firebase-config.js";
// (serverTimestamp مستوردة أعلاه وتُستخدم عند إنشاء تصنيف جديد)
import { toast, confirmDialog } from "../../store/js/main.js";

let categories = [], products = [];
let pendingImage = null;
let existingImage = "";
let editingId = null;

const grid = document.getElementById("categories-grid");
const modal = document.getElementById("category-modal");
const form = document.getElementById("category-form");

requireAdmin().then(load);

async function load() {
  const [cSnap, pSnap] = await Promise.all([getDocs(collection(db, "categories")), getDocs(collection(db, "products"))]);
  categories = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  products = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
}

function render() {
  if (!categories.length) {
    grid.innerHTML = `<div class="state-box"><div class="state-box__icon">🗂️</div><h3>لا توجد تصنيفات بعد</h3></div>`;
    return;
  }
  grid.innerHTML = categories.map(c => {
    const count = products.filter(p => p.categoryId === c.id).length;
    return `
      <div class="panel" style="text-align:center" data-id="${c.id}">
        <img src="${c.image || 'https://via.placeholder.com/80'}" style="width:70px;height:70px;border-radius:14px;object-fit:cover;margin:0 auto 10px">
        <h3 style="margin:0 0 4px">${c.name}</h3>
        <p class="muted" style="margin:0 0 14px">${count} منتج</p>
        <div class="flex gap-8" style="justify-content:center">
          <button class="btn btn--ghost btn--sm" data-edit>تعديل</button>
          <button class="btn btn--danger btn--sm" data-del>حذف</button>
        </div>
      </div>`;
  }).join("");

  grid.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", (e) => openModal(e.target.closest("[data-id]").dataset.id)));
  grid.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async (e) => {
    const id = e.target.closest("[data-id]").dataset.id;
    const count = products.filter(p => p.categoryId === id).length;
    const ok = await confirmDialog("حذف التصنيف", count > 0 ? `يحتوي هذا التصنيف على ${count} منتج، هل أنت متأكد من الحذف؟` : "هل أنت متأكد من حذف هذا التصنيف؟");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      categories = categories.filter(c => c.id !== id);
      toast("تم حذف التصنيف", "success");
      render();
    } catch (err) { toast("تعذر حذف التصنيف", "error"); }
  }));
}

document.getElementById("add-category-btn").addEventListener("click", () => openModal(null));
document.getElementById("modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function openModal(id) {
  editingId = id;
  pendingImage = null;
  form.reset();
  document.getElementById("modal-title").textContent = id ? "تعديل تصنيف" : "إضافة تصنيف";
  if (id) {
    const c = categories.find(x => x.id === id);
    document.getElementById("form-cat-name").value = c.name || "";
    existingImage = c.image || "";
  } else { existingImage = ""; }
  renderPreview();
  modal.classList.add("modal-overlay--show");
}
function closeModal() { modal.classList.remove("modal-overlay--show"); }

const fileInput = document.getElementById("form-cat-image");
document.getElementById("upload-box-cat").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) { pendingImage = file; existingImage = URL.createObjectURL(file); renderPreview(); }
});

/* ---------------- Image via URL (works without Storage) ---------------- */
const catImageUrlInput = document.getElementById("form-cat-image-url");
document.getElementById("add-cat-image-url-btn").addEventListener("click", () => {
  const url = catImageUrlInput.value.trim();
  if (!url) return;
  pendingImage = null;
  existingImage = url;
  catImageUrlInput.value = "";
  renderPreview();
});
function renderPreview() {
  const grid2 = document.getElementById("cat-image-preview");
  grid2.innerHTML = existingImage ? `<div class="img-preview"><img src="${existingImage}"></div>` : "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "جاري الحفظ...";
  try {
    let imageUrl = existingImage || "";
    const data = { name: document.getElementById("form-cat-name").value.trim() };
    let catId = editingId;
    if (!catId) {
      data.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, "categories"), data);
      catId = docRef.id;
    }
    if (pendingImage) {
      try {
        const sref = ref(storage, `categories/${catId}/${Date.now()}-${pendingImage.name}`);
        await uploadBytes(sref, pendingImage);
        imageUrl = await getDownloadURL(sref);
      } catch (err) {
        console.error("تعذر رفع الصورة (تأكد من تفعيل Storage في Firebase):", err);
        toast("تعذر رفع الصورة (Storage غير مفعّل) — استخدم خانة رابط الصورة بدلًا من ذلك", "warning");
        imageUrl = editingId ? (categories.find(c => c.id === editingId)?.image || "") : "";
      }
    }
    await updateDoc(doc(db, "categories", catId), { ...data, image: imageUrl });
    toast(editingId ? "تم تحديث التصنيف" : "تمت إضافة التصنيف", "success");
    closeModal();
    await load();
  } catch (err) {
    console.error(err);
    toast("تعذر حفظ التصنيف", "error");
  } finally {
    btn.disabled = false; btn.textContent = "حفظ التصنيف";
  }
});

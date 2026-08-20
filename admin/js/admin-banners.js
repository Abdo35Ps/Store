// admin/js/admin-banners.js — إدارة بانرات الصفحة الرئيسية
import { requireAdmin } from "./admin-auth.js";
import {
  db, storage, collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, ref, uploadBytes, getDownloadURL
} from "../../store/js/firebase-config.js";
import { toast, confirmDialog } from "../../store/js/main.js";

let banners = [];
let pendingImage = null, existingImage = "", editingId = null;

const grid = document.getElementById("banners-grid");
const modal = document.getElementById("banner-modal");
const form = document.getElementById("banner-form");

requireAdmin().then(load);

async function load() {
  const snap = await getDocs(collection(db, "banners"));
  banners = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
  render();
}

function render() {
  if (!banners.length) {
    grid.innerHTML = `<div class="state-box"><div class="state-box__icon">🖼️</div><h3>لا توجد بانرات بعد</h3><p>أضف بانر لعرضه في الصفحة الرئيسية للمتجر</p></div>`;
    return;
  }
  grid.innerHTML = banners.map(b => `
    <div class="panel" data-id="${b.id}">
      <img src="${b.image || 'https://via.placeholder.com/300x140'}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;margin-bottom:12px">
      <h3 style="margin:0 0 4px">${b.title || "بدون عنوان"}</h3>
      <p class="muted" style="margin:0 0 10px;font-size:13px">${b.subtitle || ""}</p>
      <div class="flex justify-between items-center">
        <span class="pill ${b.active !== false ? "pill--on" : "pill--off"}">${b.active !== false ? "مفعّل" : "متوقف"}</span>
        <div class="flex gap-8">
          <button class="btn btn--ghost btn--sm" data-edit>تعديل</button>
          <button class="btn btn--danger btn--sm" data-del>حذف</button>
        </div>
      </div>
    </div>`).join("");

  grid.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", (e) => openModal(e.target.closest("[data-id]").dataset.id)));
  grid.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async (e) => {
    const id = e.target.closest("[data-id]").dataset.id;
    const ok = await confirmDialog("حذف البانر", "هل أنت متأكد من حذف هذا البانر؟");
    if (!ok) return;
    await deleteDoc(doc(db, "banners", id));
    banners = banners.filter(x => x.id !== id);
    toast("تم حذف البانر", "success");
    render();
  }));
}

document.getElementById("add-banner-btn").addEventListener("click", () => openModal(null));
document.getElementById("modal-close").addEventListener("click", () => modal.classList.remove("modal-overlay--show"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("modal-overlay--show"); });

function openModal(id) {
  editingId = id; pendingImage = null; form.reset();
  document.getElementById("modal-title").textContent = id ? "تعديل بانر" : "إضافة بانر";
  if (id) {
    const b = banners.find(x => x.id === id);
    document.getElementById("form-title").value = b.title || "";
    document.getElementById("form-subtitle").value = b.subtitle || "";
    document.getElementById("form-link").value = b.link || "";
    document.getElementById("form-active").checked = b.active !== false;
    existingImage = b.image || "";
  } else { existingImage = ""; }
  document.getElementById("banner-image-preview").innerHTML = existingImage ? `<div class="img-preview"><img src="${existingImage}"></div>` : "";
  modal.classList.add("modal-overlay--show");
}

const fileInput = document.getElementById("form-banner-image");
document.getElementById("upload-box-banner").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    pendingImage = file;
    document.getElementById("banner-image-preview").innerHTML = `<div class="img-preview"><img src="${URL.createObjectURL(file)}"></div>`;
  }
});

/* ---------------- Image via URL (works without Storage) ---------------- */
const bannerImageUrlInput = document.getElementById("form-banner-image-url");
document.getElementById("add-banner-image-url-btn").addEventListener("click", () => {
  const url = bannerImageUrlInput.value.trim();
  if (!url) return;
  pendingImage = null;
  existingImage = url;
  bannerImageUrlInput.value = "";
  document.getElementById("banner-image-preview").innerHTML = `<div class="img-preview"><img src="${url}"></div>`;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "جاري الحفظ...";
  try {
    const data = {
      title: document.getElementById("form-title").value.trim(),
      subtitle: document.getElementById("form-subtitle").value.trim(),
      link: document.getElementById("form-link").value.trim(),
      active: document.getElementById("form-active").checked
    };
    let bannerId = editingId;
    let imageUrl = existingImage || "";
    if (!bannerId) {
      data.order = banners.length; data.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, "banners"), data);
      bannerId = docRef.id;
    }
    if (pendingImage) {
      try {
        const sref = ref(storage, `banners/${bannerId}/${Date.now()}-${pendingImage.name}`);
        await uploadBytes(sref, pendingImage);
        imageUrl = await getDownloadURL(sref);
      } catch (err) {
        console.error("تعذر رفع الصورة (تأكد من تفعيل Storage في Firebase):", err);
        toast("تعذر رفع الصورة (Storage غير مفعّل) — استخدم خانة رابط الصورة بدلًا من ذلك", "warning");
        imageUrl = editingId ? (banners.find(b => b.id === editingId)?.image || "") : "";
      }
    }
    await updateDoc(doc(db, "banners", bannerId), { ...data, image: imageUrl });
    toast(editingId ? "تم تحديث البانر" : "تمت إضافة البانر", "success");
    modal.classList.remove("modal-overlay--show");
    await load();
  } catch (err) {
    console.error(err);
    toast("تعذر حفظ البانر", "error");
  } finally {
    btn.disabled = false; btn.textContent = "حفظ البانر";
  }
});

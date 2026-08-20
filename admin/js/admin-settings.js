// admin/js/admin-settings.js — إعدادات المتجر العامة
import { requireAdmin } from "./admin-auth.js";
import {
  db, storage, doc, getDoc, setDoc, ref, uploadBytes, getDownloadURL
} from "../../store/js/firebase-config.js";
import { toast } from "../../store/js/main.js";

const form = document.getElementById("settings-form");
let pendingLogo = null;
let currentLogo = "";

requireAdmin().then(load);

async function load() {
  try {
    const snap = await getDoc(doc(db, "settings", "store"));
    const s = snap.exists() ? snap.data() : {};
    document.getElementById("s-name").value = s.name || "المتجر";
    document.getElementById("s-phone").value = s.phone || "";
    document.getElementById("s-email").value = s.email || "";
    document.getElementById("s-address").value = s.address || "";
    document.getElementById("s-description").value = s.description || "";
    document.getElementById("s-currency").value = s.currency || "ج.م";
    document.getElementById("s-shipping").value = s.shippingFee ?? 0;
    document.getElementById("s-min-order").value = s.minOrder ?? 0;
    document.getElementById("s-free-shipping").value = s.freeShippingOver ?? "";
    document.getElementById("s-footer-text").value = s.footerText || "";
    document.getElementById("s-social-facebook").value = s.social?.facebook || "";
    document.getElementById("s-social-instagram").value = s.social?.instagram || "";
    document.getElementById("s-social-twitter").value = s.social?.twitter || "";
    document.getElementById("s-social-whatsapp").value = s.social?.whatsapp || "";
    currentLogo = s.logo || "";
    renderLogo();
  } catch (e) { console.error(e); }
}

function renderLogo() {
  document.getElementById("logo-preview").innerHTML = currentLogo ? `<div class="img-preview"><img src="${currentLogo}"></div>` : "";
}

const fileInput = document.getElementById("s-logo-file");
document.getElementById("upload-box-logo").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) { pendingLogo = file; currentLogo = URL.createObjectURL(file); renderLogo(); }
});

/* ---------------- Logo via URL (works without Storage) ---------------- */
const logoUrlInput = document.getElementById("s-logo-url");
document.getElementById("add-logo-url-btn").addEventListener("click", () => {
  const url = logoUrlInput.value.trim();
  if (!url) return;
  pendingLogo = null;
  currentLogo = url;
  logoUrlInput.value = "";
  renderLogo();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "جاري الحفظ...";
  try {
    let logoUrl = currentLogo.startsWith("blob:") ? "" : currentLogo;
    if (pendingLogo) {
      try {
        const sref = ref(storage, `settings/logo-${Date.now()}-${pendingLogo.name}`);
        await uploadBytes(sref, pendingLogo);
        logoUrl = await getDownloadURL(sref);
      } catch (err) {
        console.error("تعذر رفع الشعار (تأكد من تفعيل Storage في Firebase):", err);
        toast("تعذر رفع الشعار (Storage غير مفعّل) — استخدم خانة رابط الصورة بدلًا من ذلك", "warning");
      }
    }
    const data = {
      name: document.getElementById("s-name").value.trim(),
      phone: document.getElementById("s-phone").value.trim(),
      email: document.getElementById("s-email").value.trim(),
      address: document.getElementById("s-address").value.trim(),
      description: document.getElementById("s-description").value.trim(),
      currency: document.getElementById("s-currency").value.trim() || "ج.م",
      shippingFee: Number(document.getElementById("s-shipping").value) || 0,
      minOrder: Number(document.getElementById("s-min-order").value) || 0,
      freeShippingOver: document.getElementById("s-free-shipping").value ? Number(document.getElementById("s-free-shipping").value) : null,
      footerText: document.getElementById("s-footer-text").value.trim(),
      social: {
        facebook: document.getElementById("s-social-facebook").value.trim(),
        instagram: document.getElementById("s-social-instagram").value.trim(),
        twitter: document.getElementById("s-social-twitter").value.trim(),
        whatsapp: document.getElementById("s-social-whatsapp").value.trim()
      },
      logo: logoUrl
    };
    await setDoc(doc(db, "settings", "store"), data, { merge: true });
    toast("تم حفظ إعدادات المتجر بنجاح", "success");
  } catch (err) {
    console.error(err);
    toast("تعذر حفظ الإعدادات", "error");
  } finally {
    btn.disabled = false; btn.textContent = "حفظ الإعدادات";
  }
});

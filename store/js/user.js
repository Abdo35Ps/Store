// js/user.js — صفحة الحساب: عرض وتعديل بيانات المستخدم
import { db, auth, doc, getDoc, updateDoc, updateProfile } from "./firebase-config.js";
import { requireAuth, toast } from "./main.js";

const form = document.getElementById("account-form");
if (form) {
  requireAuth("login.html?redirect=account.html").then(async (user) => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      form.querySelector("#acc-name").value = data.name || user.displayName || "";
      form.querySelector("#acc-phone").value = data.phone || "";
      form.querySelector("#acc-email").value = data.email || user.email || "";
      form.querySelector("#acc-email").disabled = true;
    } catch (e) { console.error(e); }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const name = form.querySelector("#acc-name").value.trim();
      const phone = form.querySelector("#acc-phone").value.trim();
      btn.disabled = true; btn.textContent = "جاري الحفظ...";
      try {
        await updateDoc(doc(db, "users", user.uid), { name, phone });
        await updateProfile(user, { displayName: name });
        toast("تم تحديث بياناتك بنجاح", "success");
      } catch (err) {
        console.error(err);
        toast("تعذر حفظ التعديلات", "error");
      } finally {
        btn.disabled = false; btn.textContent = "حفظ التعديلات";
      }
    });
  });
}

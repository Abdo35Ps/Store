// admin/js/admin-auth.js — تسجيل دخول الأدمن والتحقق من الصلاحيات
import {
  auth, db, onAuthStateChanged, signInWithEmailAndPassword, signOut, doc, getDoc
} from "../../store/js/firebase-config.js";
import { translateAuthError } from "../../store/js/auth.js";

/**
 * يتحقق أن المستخدم الحالي مسجل دخول وموجود في مجموعة admins
 * يُستخدم في بداية كل صفحة أدمن (عدا صفحة تسجيل الدخول)
 */
export function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { location.href = "login.html"; return; }
      try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (!adminDoc.exists()) {
          await signOut(auth);
          location.href = "login.html?denied=1";
          return;
        }
        resolve({ user, adminData: adminDoc.data() });
      } catch (e) {
        console.error(e);
        location.href = "login.html";
      }
    });
  });
}

export async function adminLogout() {
  await signOut(auth);
  location.href = "login.html";
}

/* ---------------- Login form (admin/login.html only) ---------------- */
const form = document.getElementById("admin-login-form");
if (form) {
  const msg = document.getElementById("auth-msg");
  const denied = new URLSearchParams(location.search).get("denied");
  if (denied) {
    msg.textContent = "هذا الحساب لا يملك صلاحية الوصول إلى لوحة التحكم";
    msg.className = "auth-msg auth-msg--show auth-msg--error";
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "جاري الدخول...";
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const adminDoc = await getDoc(doc(db, "admins", cred.user.uid));
      if (!adminDoc.exists()) {
        await signOut(auth);
        msg.textContent = "هذا الحساب لا يملك صلاحية الوصول إلى لوحة التحكم";
        msg.className = "auth-msg auth-msg--show auth-msg--error";
        return;
      }
      msg.textContent = "تم تسجيل الدخول بنجاح";
      msg.className = "auth-msg auth-msg--show auth-msg--success";
      setTimeout(() => location.href = "index.html", 500);
    } catch (err) {
      msg.textContent = translateAuthError(err.code);
      msg.className = "auth-msg auth-msg--show auth-msg--error";
    } finally {
      btn.disabled = false; btn.textContent = "تسجيل الدخول";
    }
  });
}

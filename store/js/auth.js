// js/auth.js — تسجيل / دخول / خروج المستخدمين
import {
  auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail, doc, setDoc, serverTimestamp
} from "./firebase-config.js";
import { toast } from "./main.js";

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `auth-msg auth-msg--show auth-msg--${type}`;
}

/* ---------------- Register form ---------------- */
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const msg = document.getElementById("auth-msg");
    const btn = registerForm.querySelector("button[type=submit]");

    if (password.length < 6) {
      showMsg(msg, "كلمة المرور يجب ألا تقل عن 6 أحرف", "error");
      return;
    }
    btn.disabled = true; btn.textContent = "جاري إنشاء الحساب...";
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), {
        name, phone, email, role: "user", disabled: false, createdAt: serverTimestamp()
      });
      showMsg(msg, "تم إنشاء الحساب بنجاح! جاري تحويلك...", "success");
      toast("مرحبًا بك في المتجر!", "success");
      setTimeout(() => location.href = "index.html", 1000);
    } catch (err) {
      showMsg(msg, translateAuthError(err.code), "error");
    } finally {
      btn.disabled = false; btn.textContent = "إنشاء حساب";
    }
  });
}

/* ---------------- Login form ---------------- */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const msg = document.getElementById("auth-msg");
    const btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "جاري الدخول...";
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMsg(msg, "تم تسجيل الدخول بنجاح!", "success");
      const redirect = new URLSearchParams(location.search).get("redirect") || "index.html";
      setTimeout(() => location.href = redirect, 600);
    } catch (err) {
      showMsg(msg, translateAuthError(err.code), "error");
    } finally {
      btn.disabled = false; btn.textContent = "تسجيل الدخول";
    }
  });
}

/* ---------------- Forgot password ---------------- */
const forgotBtn = document.getElementById("forgot-password");
if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    if (!email) { toast("أدخل بريدك الإلكتروني أولًا", "warning"); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      toast("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك", "success");
    } catch (err) {
      toast(translateAuthError(err.code), "error");
    }
  });
}

export function translateAuthError(code) {
  const map = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مستخدم بالفعل",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة",
    "auth/weak-password": "كلمة المرور ضعيفة جدًا",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/invalid-credential": "بيانات الدخول غير صحيحة",
    "auth/too-many-requests": "محاولات كثيرة، حاول لاحقًا",
    "auth/user-disabled": "تم تعطيل هذا الحساب من قِبل الإدارة"
  };
  return map[code] || "حدث خطأ، حاول مرة أخرى";
}

// js/notifications.js — إشعارات العميل بتغيّر حالة الطلب (Realtime)
// يعرض جرس إشعارات في الهيدر + عداد غير مقروء + Toast لحظي عند وصول إشعار جديد
import {
  db, auth, onAuthStateChanged,
  collection, query, where, orderBy, limit, onSnapshot,
  doc, updateDoc, writeBatch
} from "./firebase-config.js";
import { formatDate, toast } from "./main.js";

const STATUS_ICONS = {
  pending: "🕓", confirmed: "✅", processing: "📦",
  shipped: "🚚", delivered: "🎉", cancelled: "✕"
};

export function initNotifications() {
  const area = document.querySelector("[data-notif-area]");
  if (!area) return;

  area.innerHTML = `
    <div class="notif-menu">
      <button class="icon-btn" data-notif-toggle title="الإشعارات" style="display:none">
        🔔<span class="badge" data-notif-count style="display:none">0</span>
      </button>
      <div class="notif-menu__drop" data-notif-drop>
        <div class="notif-menu__head">
          <strong>الإشعارات</strong>
          <button type="button" class="link-btn" data-notif-read-all>تعليم الكل كمقروء</button>
        </div>
        <div class="notif-menu__list" data-notif-list>
          <div class="notif-empty">لا توجد إشعارات بعد</div>
        </div>
      </div>
    </div>`;

  const toggleBtn = area.querySelector("[data-notif-toggle]");
  const dropEl = area.querySelector("[data-notif-drop]");
  const countEl = area.querySelector("[data-notif-count]");
  const listEl = area.querySelector("[data-notif-list]");
  const readAllBtn = area.querySelector("[data-notif-read-all]");

  let notifications = [];
  let isFirstLoad = true;
  let unsubscribe = null;

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropEl.classList.toggle("notif-menu__drop--open");
  });
  document.addEventListener("click", (e) => {
    if (!area.contains(e.target)) dropEl.classList.remove("notif-menu__drop--open");
  });

  readAllBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  });

  function render() {
    const unreadCount = notifications.filter((n) => !n.read).length;
    countEl.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    countEl.style.display = unreadCount > 0 ? "flex" : "none";

    if (!notifications.length) {
      listEl.innerHTML = `<div class="notif-empty">لا توجد إشعارات بعد</div>`;
      return;
    }
    listEl.innerHTML = notifications.map((n) => `
      <div class="notif-item ${n.read ? "" : "notif-item--unread"}" data-id="${n.id}">
        <span class="notif-item__icon">${STATUS_ICONS[n.status] || "🔔"}</span>
        <div class="notif-item__body">
          <div class="notif-item__title">${n.title || "تحديث الطلب"}</div>
          <div class="notif-item__msg">${n.message || ""}</div>
          <div class="notif-item__date">${formatDate(n.createdAt)}</div>
        </div>
      </div>`).join("");

    listEl.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", async () => {
        const id = el.dataset.id;
        const n = notifications.find((x) => x.id === id);
        dropEl.classList.remove("notif-menu__drop--open");
        if (n && !n.read) {
          try { await updateDoc(doc(db, "notifications", id), { read: true }); }
          catch (err) { console.error(err); }
        }
        if (!location.pathname.endsWith("orders.html")) location.href = "orders.html";
      });
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    notifications = [];
    render();

    if (!user) {
      toggleBtn.style.display = "none";
      return;
    }
    toggleBtn.style.display = "flex";
    isFirstLoad = true;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    unsubscribe = onSnapshot(q, (snap) => {
      // Toast لحظي فقط للإشعارات الجديدة اللي توصل بعد التحميل الأول (مش وقت فتح الصفحة)
      if (!isFirstLoad) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const n = change.doc.data();
            toast(n.message || "لديك تحديث جديد على طلبك", "info", 5000);
          }
        });
      }
      notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
      isFirstLoad = false;
    }, (err) => console.error(err));
  });
}

document.addEventListener("DOMContentLoaded", initNotifications);

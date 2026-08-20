# 🛍️ المتجر الإلكتروني — Store + Admin Dashboard

مشروع متجر إلكتروني متكامل مبني بـ **HTML + CSS + Vanilla JavaScript** ومتصل بالكامل بـ **Firebase**
(Authentication + Firestore + Storage)، بدون أي Framework وبدون أي Backend خارجي.

---

## 📁 هيكل المشروع

```
/store                 → واجهة المستخدم (المتجر)
  index.html            الصفحة الرئيسية
  products.html         كل المنتجات (بحث/فلترة/ترتيب/صفحات)
  product-details.html  تفاصيل المنتج
  cart.html             السلة
  checkout.html         إتمام الطلب
  login.html / register.html
  account.html          بيانات الحساب
  orders.html           طلباتي (Realtime)
  /css                  style.css, responsive.css, auth.css, cart.css
  /js                   firebase-config.js, auth.js, products.js, cart.js,
                         checkout.js, orders.js, user.js, main.js

/admin                 → لوحة تحكم الأدمن (منفصلة تمامًا)
  login.html            دخول الأدمن
  index.html            الإحصائيات + الرسوم البيانية
  products.html         إدارة المنتجات (CRUD + رفع صور)
  categories.html       إدارة التصنيفات
  orders.html           إدارة الطلبات وتغيير الحالة (Realtime)
  users.html            إدارة المستخدمين (تفعيل/تعطيل)
  banners.html          إدارة بانرات الصفحة الرئيسية
  settings.html         إعدادات المتجر العامة
  /css                  admin.css, dashboard.css
  /js                   admin-auth.js, dashboard.js, admin-products.js,
                         admin-categories.js, admin-orders.js,
                         admin-users.js, admin-banners.js, admin-settings.js

firestore.rules         قواعد أمان قاعدة البيانات
storage.rules            قواعد أمان التخزين
README.md               هذا الملف
```

> ملاحظة: بيانات Firebase الخاصة بمشروعك (`store-216af`) موضوعة بالفعل في
> `store/js/firebase-config.js` كما أرسلتها. لوحة الأدمن تستورد نفس الملف من
> `store/js/firebase-config.js` حتى تبقى نقطة إعداد واحدة فقط لكل المشروع.

---

## 🚀 خطوات التشغيل والنشر خطوة بخطوة

### 1️⃣ إنشاء / التأكد من مشروع Firebase
مشروعك جاهز بالفعل (`store-216af`). إن أردت مشروعًا جديدًا:
Firebase Console → Add project → اتبع الخطوات → فعّل Google Analytics (اختياري).

### 2️⃣ تفعيل Authentication
1. من القائمة الجانبية: **Build → Authentication → Get started**.
2. من تبويب **Sign-in method** فعّل **Email/Password**.
3. احفظ.

### 3️⃣ إنشاء Firestore Database
1. **Build → Firestore Database → Create database**.
2. اختر **Production mode** (سنضع قواعد الأمان بأنفسنا).
3. اختر أقرب Region لك (مثلاً `eur3` أو `me-central1`).
4. لا تحتاج لإنشاء المجموعات يدويًا؛ سيتم إنشاؤها تلقائيًا أول مرة تُضاف فيها بيانات
   (`products`, `categories`, `orders`, `users`, `reviews`, `settings`, `banners`, `admins`).

### 4️⃣ إنشاء Storage
1. **Build → Storage → Get started**.
2. اختر نفس الـ Region واستمر بالإعدادات الافتراضية.

### 5️⃣ إضافة Firebase Config
تم بالفعل ✅ — الإعداد موجود في `store/js/firebase-config.js` بنفس البيانات التي أرسلتها.
إذا غيّرت مشروع Firebase مستقبلًا، عدّل فقط هذا الملف (نقطة إعداد واحدة للمتجر وللأدمن معًا).

### 6️⃣ نشر قواعد الأمان (Security Rules)
1. **Firestore Database → Rules** → الصق محتوى ملف `firestore.rules` → **Publish**.
2. **Storage → Rules** → الصق محتوى ملف `storage.rules` → **Publish**.
   > ملاحظة: بعض حسابات Firebase تحتاج تفعيل خاصية *Cross-service rules* لتتمكن
   > قواعد Storage من قراءة مجموعة `admins` في Firestore عبر `firestore.exists(...)`.
   > إن ظهرت مشكلة، أبسط حل بديل هو تخزين صلاحية الأدمن كـ Custom Claim (خطوة متقدمة)
   > أو تبسيط قاعدة الكتابة مؤقتًا إلى `allow write: if request.auth != null;` أثناء التطوير فقط.

### 7️⃣ إنشاء أول حساب أدمن (خطوة مهمة جدًا)
لوحة التحكم تسمح بالدخول فقط لمن له مستند في مجموعة `admins`. لإنشاء أول أدمن:

**الطريقة الأسهل:**
1. افتح `store/register.html` في المتصفح وأنشئ حسابًا عاديًا (بريد + كلمة مرور).
2. من Firebase Console → Authentication، انسخ الـ **User UID** الخاص بهذا الحساب.
3. من Firestore Database → ابدأ مجموعة جديدة باسم `admins`.
4. أنشئ مستندًا جديدًا واجعل **Document ID = نفس الـ UID** الذي نسخته.
5. أضف الحقول التالية داخل المستند:
   - `role` (string) = `super_admin`
   - `name` (string) = اسمك
   - `createdAt` (timestamp) = الآن
6. احفظ. الآن هذا الحساب أصبح أدمن ويمكنه الدخول من `admin/login.html`.

### 8️⃣ تحديد صلاحيات الأدمن
كل حساب له مستند في `admins/{uid}` يُعتبر أدمن كامل الصلاحيات في هذا الإصدار
(يمكن التوسع لاحقًا بإضافة حقل `permissions: { products: true, orders: true, ... }`
والتحقق منه داخل ملفات `admin-*.js` عند الحاجة لصلاحيات متدرجة).

### 9️⃣ رفع المنتجات والتصنيفات الأولى
1. سجّل دخولك في `admin/login.html`.
2. من **التصنيفات** أضف تصنيفًا أو أكثر (مطلوب لإضافة منتجات مرتبطة بتصنيف).
3. من **المنتجات** أضف منتجاتك (صور، سعر، مخزون...).
4. من **إعدادات المتجر** أضف اسم المتجر، الشعار، رسوم الشحن، الحد الأدنى للطلب... إلخ.
5. من **البانرات** أضف بانر أو أكثر للصفحة الرئيسية (اختياري).

### 🔟 اختبار الربط الكامل بين الواجهتين
1. افتح `store/index.html` — يجب أن تظهر المنتجات والتصنيفات التي أضفتها فورًا.
2. أنشئ حساب مستخدم وجرّب: إضافة للسلة → إتمام الطلب → تأكيد الطلب.
3. ارجع للوحة الأدمن → **الطلبات** — يجب أن يظهر الطلب الجديد فورًا (Realtime، بدون Refresh).
4. غيّر حالة الطلب من الأدمن → افتح `store/orders.html` بحساب نفس المستخدم — الحالة تتحدث فورًا.
5. جرّب تعديل سعر منتج من الأدمن ولاحظ تحديثه في `products.html` بالمتجر.

---

## 🌍 النشر (Deployment)

يمكنك رفع المشروع (وهو ملفات Static بالكامل) على أي من:
- **Firebase Hosting** (الأنسب لأنه من نفس المنصة):
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase init hosting   # اختر مجلد المشروع كـ public directory
  firebase deploy
  ```
- أو أي استضافة Static أخرى (Netlify, Vercel, GitHub Pages...).

> تذكّر إضافة نطاق الاستضافة النهائي إلى: Authentication → Settings → Authorized domains.

---

## 🧩 نقاط قابلة للتوسع مستقبلًا
- بوابات دفع إلكتروني (Stripe / Paymob / Fawry) — تُضاف داخل `checkout.js` بسهولة.
- شركات شحن ومزامنة تتبع الشحنات.
- إشعارات فورية (Push Notifications) عبر Firebase Cloud Messaging.
- صلاحيات أدمن متدرجة (مدير منتجات فقط / مدير طلبات فقط...).
- قائمة أمنيات (Wishlist) كاملة — البنية التحتية جاهزة بالفعل في `localStorage` بنفس أسلوب السلة.

---

## ⚠️ ملاحظات أمان مهمة
- **لا تعتمد فقط على إخفاء صفحات `/admin`** — الحماية الحقيقية في `firestore.rules` و `storage.rules`.
- تأكد من نشر ملفي القواعد (Rules) قبل إطلاق المتجر فعليًا.
- لا تشارك ملف `firebase-config.js` كسر — القيم فيه ليست سرية (public API keys) لكن الحماية الحقيقية تأتي من الـ Security Rules.

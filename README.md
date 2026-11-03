# DevAI Studio — AI Website & App Builder

منصة أولية عملية لبناء وتعديل مشاريع الويب بمساعدة الذكاء الاصطناعي. الواجهة تعمل كتطبيق React، وتدعم ملفات HTML/CSS/JavaScript، محرر Monaco، معاينة معزولة، استيراد ZIP، تنزيل ZIP، وربط Firebase اختياري.

> هذه نسخة MVP قابلة للتشغيل والتطوير. لا تدّعي تشغيل React/Next.js داخل المتصفح، ولا تنفّذ أكواد المستخدم على الخادم. تشغيل المشاريع المعقدة وGitHub OAuth والنشر بضغطة واحدة مراحل لاحقة.

## 1) المتطلبات

- Node.js 20 أو أحدث.
- حساب GitHub.
- (اختياري) مشروع Firebase.
- (اختياري للذكاء الاصطناعي) حساب مزود API يدعم OpenAI-compatible Chat Completions، وحساب Cloudflare.

## 2) تشغيل الواجهة محلياً

```bash
npm install
cp .env.example .env
npm run dev
```

افتح عنوان Vite الذي يظهر في الطرفية. على الهاتف يمكن تشغيل بيئة التطوير على الكمبيوتر وفتح عنوان الشبكة المحلي من الهاتف، أو استخدام GitHub Codespaces.

## 3) تفعيل الذكاء الاصطناعي الحقيقي

1. انشر الخادم الموجود داخل `worker/` على Cloudflare Workers.
2. اتبع `worker/README.md`.
3. ضع مفتاح المزود كـ Worker secret باسم `AI_API_KEY` باستخدام `wrangler secret put AI_API_KEY`.
4. اضبط `AI_BASE_URL` و`AI_MODEL` في `worker/wrangler.toml` حسب مزودك.
5. بعد النشر، انسخ عنوان Worker الأساسي.
6. افتح إعدادات DevAI Studio والصق العنوان، أو عيّن `VITE_AI_API_URL` في `.env` ثم أعد البناء.

الواجهة ترسل الملفات الحالية والطلب إلى Worker، ويعيد النموذج وصفاً وتغييرات كاملة للملفات. لا تضع مفتاح المزود في `.env` الخاص بالواجهة أو داخل GitHub.

## 4) تفعيل Firebase

1. أنشئ مشروعاً في Firebase.
2. فعّل Authentication ثم Email/Password.
3. أنشئ Firestore Database.
4. انسخ إعدادات تطبيق Web إلى `.env` وفق أسماء المتغيرات في `.env.example`.
5. انشر قواعد `firebase/firestore.rules` من Firebase Console.
6. أعد تشغيل `npm run dev` أو أعد البناء.

إعدادات Firebase الخاصة بتطبيق الويب ليست مفاتيح خدمة إدارية. لا تضع Service Account JSON أو مفاتيح Admin SDK في الواجهة. قواعد Firestore في هذا المشروع تقصر كل مستخدم على مسار مشاريعه.

**تنبيه:** حفظ المشاريع محلياً متاح دون Firebase. حفظ المحادثات في Firestore غير مطبق بعد في هذه النسخة.

## 5) البناء

```bash
npm run build
npm run preview
```

ناتج البناء داخل `dist/`.

## 6) النشر على GitHub Pages

1. أنشئ مستودعاً جديداً باسم `devai-studio`.
2. ارفع كل محتويات هذا المجلد إلى جذر المستودع.
3. من Settings → Pages اختر GitHub Actions أو Deploy from a branch حسب إعداداتك.
4. في حال استخدام GitHub Actions، أنشئ workflow لبناء Vite ونشر `dist/`، أو استخدم إعداد Pages الموصى به من GitHub.
5. عنوان المشروع سيكون عادة `https://USERNAME.github.io/devai-studio/`.
6. قيمة `base: './'` في `vite.config.ts` مضبوطة لتناسب GitHub Pages project site.

GitHub Pages يستضيف ملفات الواجهة الثابتة فقط. يجب نشر Worker بشكل منفصل حتى يعمل AI API.

## 7) المزايا الموجودة في MVP

- واجهة عربية RTL متجاوبة مع الهاتف والكمبيوتر.
- وضع داكن وفاتح.
- مشاريع وملفات قابلة للإضافة والتعديل والحذف.
- محرر Monaco مع تلوين بناءً على امتداد الملف.
- معاينة HTML/CSS/JS داخل iframe مع sandbox.
- استيراد ملفات ZIP أو ملف منفرد.
- تنزيل المشروع ZIP وتنزيل الملف الحالي.
- ربط اختياري بـ Firebase Authentication وFirestore لحفظ المشاريع.
- نقطة اتصال AI عبر Cloudflare Worker مع إبقاء مفتاح المزود على الخادم.
- رسائل أخطاء واضحة عند غياب إعداد API.

## 8) حدود النسخة الحالية وما لم يُنفّذ بعد

- لا يوجد تنفيذ فعلي لمشاريع Node/React/Next.js داخل بيئة تشغيل معزولة.
- لا يوجد GitHub OAuth أو استيراد/رفع مباشر إلى المستودعات بعد.
- لا يوجد نظام فروق إصدارات (Diff) أو استرجاع نسخ تاريخية بعد.
- لا يوجد حفظ سحابي للمحادثات بعد.
- لا يوجد نظام اشتراكات أو صلاحيات Admin.
- لا يوجد اختبار أمني شامل أو تحديد حصص للـ Worker. أضف rate limiting وتقييد CORS والمصادقة قبل الإنتاج.
- المعاينة تشغّل JavaScript داخل iframe sandbox، لكنها ليست بديلاً عن بيئة تشغيل حقيقية أو مراجعة أمنية.

## 9) هيكل المشروع

```text
devai-studio/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── .env.example
├── src/
│   ├── App.tsx
│   ├── firebase.ts
│   ├── main.tsx
│   └── styles.css
├── firebase/
│   └── firestore.rules
└── worker/
    ├── wrangler.toml
    ├── README.md
    └── src/index.js
```

## 10) فحص المشروع

بعد فك الضغط نفّذ `npm install` ثم `npm run build`. إذا ظهر خطأ TypeScript أو بناء، راجع نسخة Node.js والحزم. لا تضع أسرار API أو بيانات Service Account في مستودع GitHub.

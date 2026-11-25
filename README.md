<div align="center">

# کالری‌شمار روزمره | KaloriShomar `v1.4.0`

**ردیاب سریع، کاملاً آفلاین و هوشمند کالری، درشت‌مغذی، فیبر، آب و وزن برای غذاهای خانگی و بسته‌بندی ایرانی**
*Fast, 100% offline-first, mobile-first Persian Calorie & Nutrition Tracker built for Iranian home-cooked meals and real kitchen units.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsoroushse7o%2Fpersian-calorie-tracker&project-name=persian-calorie-tracker&repository-name=persian-calorie-tracker&env=VITE_SITE_URL&envDescription=Canonical%20public%20HTTPS%20URL%20for%20OpenGraph%20and%20sitemap)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/github/soroushse7o/persian-calorie-tracker)

[🌐 Live on Vercel](https://persian-calorie-tracker.vercel.app) • [🌐 Live on Railway](https://persian-calorie-tracker-production.up.railway.app/)

[Changelog](./CHANGELOG.md) • [MIT License](./LICENSE) • [GitHub (@soroushse7o)](https://github.com/soroushse7o)

</div>

---

<div dir="rtl">

## نسخه فارسی

### معرفی
**کالری‌شمار روزمره (`v1.4.0`)** یک وب‌اپلیکیشن فوق‌سبک، متن‌باز (MIT) و **۱۰۰٪ آفلاین (Offline-First PWA)** ویژه فرهنگ غذایی ایران است. فونت فارسی (`Vazirmatn Variable`) به‌صورت محلی میزبانی می‌شود، نمودارها با **SVG بومی و صفر وابستگی خارجی** رندر می‌شوند و تمام داده‌ها با پشتوانهٔ دوگانه (`IndexedDB` + `localStorage`) صرفاً روی دستگاه خود کاربر ذخیره می‌گردند (**بدون ثبت‌نام و بدون هیچ اسکریپت ردیابی**).

> **سلب مسئولیت سلامت:** این برنامه صرفاً یک ابزار آموزشی برای **برآورد تقریبی** کالری، درشت‌مغذی‌ها و فیبر است و جایگزین پزشک یا متخصص تغذیه نیست. محاسبه‌گر کالری (TDEE) فقط برای بزرگسالان **۱۸+** فعال است، برای اهداف دستی زیر `۱٬۲۰۰` کالری هشدار نرم سلامت نمایش می‌دهد و در شرایط بارداری، شیردهی، سن زیر ۱۸ سال یا سابقه اختلالات خوردن باید حتماً با متخصص مشورت شود.

### امکانات کلیدی (`v1.4.0`)
- **عملکرد فوق‌سریع و نمودارهای بومی SVG (حذف کامل `recharts`):**
  - جایگزینی کتابخانه سنگین نمودار با کامپوننت‌های SVG بومی واکنش‌گرا (`CalorieBarChart` و `WeightLineChart`) همراه با کنترل خودکار بودجه حجم باندل در CI (`npm run check:budget`).
- **تکمیل خودکار آنی، ورودی صوتی فارسی و بارکدخوان سری `۶۲۶` ایران:**
  - **پیشنهاد تکمیل خودکار زنده (`Inline Autocomplete`):** نمایش آنی غذاهای منطبق حین تایپ (با کلید `Tab` یا لمس چیپ) با حفظ عدد و واحد قبلی.
  - **اصلاح‌گرهای پخت خانگی در پارسر:** پشتیبانی هوشمند از عبارات واقعی آشپزخانه مثل `کم‌روغن`، `بدون روغن`، `رژیمی`، `ایرفرایر`، `بخارپز`، `پرچرب` و `با کره` با تعدیل شفاف چربی و کالری.
  - **ثبت صوتی فارسی (`Web Speech API fa-IR`)** و **بارکدخوان محصولات سوپرمارکتی ایران (`۶۲۶` EAN-13)** با اسکن دوربین (`BarcodeDetector`)، ورود دستی و تعریف تک‌کلیکی بارکد جدید.
- **ردیابی فیبر، حالت ماه رمضان / فستینگ و تقویم شمسی تعاملی:**
  - نمایش پیشرفت **فیبر روزانه (`فیبر`)** در کنار پروتئین، کربوهیدرات و چربی.
  - **حالت برنامه وعده رمضان / روزه‌داری (`سحری / افطاری / شام`)** به همراه نمایش راهنمای سهم پیشنهادی کالری هر وعده.
  - **تقویم ماهانه شمسی (جلالی)** با نشانگر روزهای ثبت‌شده و امکان **کپی وعده از هر روز دلخواه قبلی**.
- **دستور پخت‌های قابل‌ویرایش با ضریب پخت (`Cooking Yield ٪`):**
  - ذخیره ترکیب مواد اولیه و درصد تغییر وزن پس از پخت (تبخیر آب در خورش/کباب یا جذب آب در برنج/حبوبات) با قابلیت ویرایش مجدد دستور پخت در هر زمان.
- **ایمنی داده نسل سوم (`IndexedDB` + رمزنگاری `AES-256-GCM` + یادآور محلی):**
  - بازیابی خودکار از `IndexedDB` هنگام راه‌اندازی در صورت پاک شدن `localStorage` مرورگر.
  - **خروجی و بازیابی بکاپ رمزنگاری‌شده با رمز عبور** مبتنی بر استاندارد Web Crypto (`PBKDF2-SHA256` با ۱۰۰٬۰۰۰ دور + `AES-256-GCM`) در کنار بکاپ JSON معمولی با پیش‌نمایش و Snapshot خودکار.
  - **یادآور محلی اختیاری** ثبت شام و نوشیدن آب از طریق اعلان مرورگر بدون سرور خارجی.

### اجرای محلی و تست‌ها

```bash
git clone https://github.com/soroushse7o/persian-calorie-tracker.git
cd persian-calorie-tracker
npm ci                                               # نیاز به Node.js >= 22 (فیلد engines، CI و Docker)
cp .env.example .env.local   # شامل VITE_SITE_URL برای بیلد محلی
npm run dev
```

```bash
npm run lint                                               # بررسی کیفیت کد با oxlint (۰ خطا / ۰ هشدار)
npm run test:coverage                                      # اجرای تست‌های واحد و طلایی با بررسی آستانه پوشش کد
VITE_SITE_URL="https://example.com" npm run build          # تایپ‌چک، تولید متادیتای مطلق، sitemap و بیلد
npm run check:budget                                       # کنترل بودجه حجم Gzip باندل production (JS/CSS + فونت)
npx playwright install chromium                            # نصب یکبار مرورگر Chromium مورد نیاز تست E2E
npm run test:e2e                                           # تست E2E آفلاین با Playwright و Service Worker
```

> **مهم درباره `VITE_SITE_URL`:** طبق سیاست سخت‌گیرانه تولید، متغیر `VITE_SITE_URL` در زمان `npm run build` **اجباری** است و پیش‌فرض پنهان ندارد تا تگ‌های `og:image`، `og:url`، `canonical` و `sitemap.xml` همیشه با آدرس مطلق دامنه واقعی تولید شوند.

---

### نصب آفلاین روی موبایل (PWA)
فونت و اجرای برنامه ۱۰۰٪ آفلاین است. برای باز شدن تمامصفحه و کارکرد آنی بدون اینترنت، برنامه را به صفحه اصلی گوشی اضافه کنید.

#### راهنمای نصب در آیفون (iOS — Safari)
1. آدرس برنامه را در **Safari** باز کنید.
2. دکمه اشتراکگذاری (**Share**) در نوار پایین را لمس کنید.
3. گزینه **Add to Home Screen** و سپس **Add** را انتخاب کنید.

#### راهنمای نصب در اندروید (Google Chrome)
1. آدرس برنامه را در **Google Chrome** باز کنید (از طریق HTTPS).
2. منوی سهنقطه بالای سمت راست Chrome را باز کنید.
3. گزینه **Install app** (یا **Add to Home screen**) را بزنید.
4. نام میانبر را تأیید کرده و **Install** را لمس کنید.

اگر گزینهٔ نصب در اندروید دیده نمیشود، Chrome را بهروز کنید و مطمئن شوید صفحه با HTTPS باز شده است.

### راهنمای استقرار (Deployment Guide)

**نسخه‌های زنده (Live):** [Vercel](https://persian-calorie-tracker.vercel.app) • [Railway](https://persian-calorie-tracker-production.up.railway.app/)

#### ۱. استقرار روی Vercel (پیشنهادی)
1. در [vercel.com/new](https://vercel.com/new) مخزن GitHub را انتخاب کنید.
2. در بخش **Environment Variables** متغیر الزامی `VITE_SITE_URL` را برابر دامنه عمومی پروژه قرار دهید.
3. روی **Deploy** کلیک کنید. فایل [`vercel.json`](./vercel.json) هدرهای `CSP`، `HSTS (preload)` و کشینگ PWA را اعمال می‌کند.

#### ۲. دامنه اختصاصی پشت Cloudflare و تست اپراتورهای ایران
برای پایداری کامل دسترسی روی اپراتورهای داخل ایران، اتصال دامنه اختصاصی پشت Cloudflare توصیه می‌شود.

#### ۳. استقرار روی Cloudflare Pages (فایل‌های `_headers` / `_redirects`)
1. در [Cloudflare Dashboard](https://dash.cloudflare.com/) گزینه **Workers & Pages ← Create ← Pages ← Connect to Git** را انتخاب و فورک مخزن را متصل کنید.
2. تنظیمات بیلد: فرمان `npm run build`، پوشه خروجی `dist` و متغیر محیطی الزامی `VITE_SITE_URL` (آدرس نهایی دامنه).
3. فایل‌های [`public/_headers`](./public/_headers) و [`public/_redirects`](./public/_redirects) بهطور خودکار توسط Cloudflare Pages اعمال میشوند: هدرهای `CSP` (شامل `upgrade-insecure-requests`)، `HSTS (preload)` و کشینگ PWA از `_headers` و SPA fallback (`/index.html 200`) از `_redirects`. نیازی به کپی تنظیمات `vercel.json` نیست.

#### ۴. استقرار روی Railway (کانتینر Docker + Caddy غیرریشه)
1. در [railway.com](https://railway.com) گزینه **New Project ← Deploy from GitHub repo** را بزنید.
2. متغیر الزامی `VITE_SITE_URL` را تنظیم کرده و سلامت کانتینر را از مسیر `/health` بررسی نمایید.

</div>

---

## English Documentation

### Overview
**KaloriShomar (کالری‌شمار روزمره) v1.4.0** is an ultra-lightweight, open-source (MIT), 100% offline-first Persian Calorie & Nutrition Tracker PWA built for Iranian home-cooked meals, supermarket barcodes (`626`), and real household units (`کفگیر`, `کف دست`, `لیوان`, `سیخ`, `کاسه`, `ملاقه`, `اسکوپ`). The Persian font (`Vazirmatn Variable`) is self-hosted, charts are rendered with dependency-free native SVG, and all data stays on the user's own device (`IndexedDB` + `localStorage`) — **no sign-up and no tracking scripts**. Two disclosed exceptions: browser voice recognition may send audio to the browser vendor's cloud, and the optional online barcode lookup sends only that barcode to OpenFoodFacts (both are described in the in-app privacy card).

> **Health disclaimer:** This app is an educational tool for **approximate estimates** of calories, macronutrients, and fiber; it is not a substitute for a doctor or registered dietitian. The calorie calculator (TDEE) is available only to adults **18+**, shows a soft health warning for manual goals below `1,200` kcal, and professional consultation is required during pregnancy, breastfeeding, under age 18, or with a history of eating disorders.

### Key Highlights (`v1.4.0`)
- **Fast, zero-dependency native SVG charts + CI bundle budget:** Replaced the heavy `recharts` library with responsive RTL SVG components (`CalorieBarChart`, `WeightLineChart`), guarded by an automatic gzipped bundle-budget check in CI (`npm run check:budget`).
- **Live autocomplete, Persian voice input, and Iranian `626` barcodes:** Instant food suggestions while typing (`Tab` or tap to accept, keeping quantity and unit), smart kitchen preparation modifiers (`کمروغن`, `بدون روغن`, `رژیمی`, `ایرفرایر`, `بخارپز`, `پرچرب`, `با کره`) with transparent fat/calorie adjustment, `fa-IR` Web Speech dictation, and `626` EAN-13 barcode lookup by camera or manual entry with one-click custom product creation.
- **Fiber tracking, Ramadan / fasting mode, and an interactive Jalali calendar:** Daily fiber progress beside protein, carbs, and fat; `سحری / افطاری / شام` schedule mode with per-meal calorie budget hints; a Shamsi (Jalali) monthly calendar with logged-day markers and copying meals from any earlier day.
- **Editable recipes with cooking-yield factor:** Save ingredient lists plus post-cooking weight change (`ضریب پخت ٪`) for water evaporation (stews, kebabs) or absorption (rice, legumes), and edit recipes at any time.
- **Third-generation data safety (`IndexedDB` + `AES-256-GCM` + local reminders):** Automatic startup recovery from `IndexedDB` if `localStorage` is cleared, password-encrypted backup export/import using Web Crypto (`PBKDF2-SHA256`, 100,000 iterations + `AES-256-GCM`) alongside plain JSON backups with preview and automatic snapshots, and optional browser-notification reminders for logging dinner and drinking water — with no external server.

### Local Development & Tests

```bash
git clone https://github.com/soroushse7o/persian-calorie-tracker.git
cd persian-calorie-tracker
npm ci                                               # Requires Node.js >= 22 (engines field; CI & Docker use Node 22)
cp .env.example .env.local   # includes VITE_SITE_URL for local builds
npm run dev
```

```bash
npm run lint                                               # oxlint (0 errors / 0 warnings)
npm run test:coverage                                      # unit + golden tests with coverage thresholds
VITE_SITE_URL="https://example.com" npm run build          # type-check, absolute metadata, sitemap, build
npm run check:budget                                       # gzipped JS/CSS + self-hosted font download budget
npx playwright install chromium                            # one-time install of the Chromium browser for Playwright E2E
npm run test:e2e                                           # offline Playwright + Service Worker test
```

> **Important about `VITE_SITE_URL`:** under the strict production policy, `VITE_SITE_URL` is **required** at `npm run build` time and has no hidden fallback, so `og:image`, `og:url`, `canonical`, and `sitemap.xml` always use the absolute URL of the real production domain.

### Offline Mobile Installation (PWA)
The app and its self-hosted font run 100% offline. For full-screen, instant launching without internet, add it to your phone's home screen.

**iPhone / iPad (Safari)**
1. Open the app URL in **Safari**.
2. Tap the **Share** button at the bottom.
3. Choose **Add to Home Screen**, then **Add**.

**Android (Google Chrome)**
1. Open the app URL in **Google Chrome** (over HTTPS).
2. Open Chrome's three-dot menu at the top right.
3. Tap **Install app** (or **Add to Home screen**).
4. Confirm the shortcut name and tap **Install**.

If the install option is missing on Android, update Chrome and make sure the page is served over HTTPS.

### Deployment Guide

**Live deployments:** [Vercel](https://persian-calorie-tracker.vercel.app) • [Railway](https://persian-calorie-tracker-production.up.railway.app/)

**1. Vercel (recommended)**
1. Select the GitHub repository at [vercel.com/new](https://vercel.com/new).
2. In **Environment Variables**, set the required `VITE_SITE_URL` to your public domain.
3. Click **Deploy**. [`vercel.json`](./vercel.json) applies `CSP`, `HSTS (preload)`, and PWA caching headers.

**2. Custom domain behind Cloudflare (for Iranian operators)**
For reliable access from inside Iran, put a custom domain behind Cloudflare with a `CNAME` record to Vercel/Railway (orange-cloud proxy on, SSL/TLS set to **Full (strict)**), set `VITE_SITE_URL` exactly to `https://your-domain.com`, and redeploy so `canonical`, `og:image`, and `sitemap.xml` use the final domain. Note that the `HSTS` header contains `preload` — verify every subdomain has valid HTTPS before submitting to `hstspreload.org`.

**3. Cloudflare Pages (static hosting; uses `public/_headers` and `public/_redirects`)**
1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), choose **Workers & Pages → Create → Pages → Connect to Git** and select this fork.
2. Build command `npm run build`, output directory `dist`, and the required `VITE_SITE_URL` environment variable set to the final public domain.
3. [`public/_headers`](./public/_headers) and [`public/_redirects`](./public/_redirects) are applied automatically by Cloudflare Pages: `_headers` carries the `CSP` (including `upgrade-insecure-requests`), `HSTS (preload)`, and PWA caching rules, while `_redirects` provides the SPA fallback (`/index.html 200`). No `vercel.json` equivalent is needed. Both files are intentionally kept in the repo for this deployment target.

**4. Railway (Docker container + non-root Caddy)**
1. In [railway.com](https://railway.com), choose **New Project ← Deploy from GitHub repo**.
2. Set the required `VITE_SITE_URL` variable and check container health at `/health`.

### Configuration & contributor notes

- **Node.js:** `package.json` declares `"engines": { "node": ">=22" }`, matching CI (`actions/setup-node` with Node 22) and the Docker `node:22-alpine` builder. Use Node 22 or newer locally; see [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup, test commands and PR checklist.
- **Android Digital Asset Links (placeholder removed):** `public/.well-known/assetlinks.json` is intentionally an **empty array (`[]`)**. It previously shipped an all-zero SHA-256 fingerprint and `package_name: ir.kalorishomar.twa`, which conflicted with the Capacitor `appId` (`ir.kalorishomar.app`) and would have falsely advertised a TWA association. **No Android app association is active.** To enable one later, publish a real statement with the release signing certificate's fingerprint and a `package_name` matching the signed app. See [SECURITY.md](./SECURITY.md); never add unverified fingerprints.
- **Lighthouse CI:** `lighthouserc.json` marks all four categories (performance, accessibility, best-practices, SEO) as `error`, matching the strict CI step name. The performance floor is a realistic `0.85` because CI-run Lighthouse scores fluctuate, while the other three stay at `0.9`. The CI workflow is owned by the security agent and needs no rename.
- **Railway Caddy configuration:** the `CSP` in the `Caddyfile` now includes `upgrade-insecure-requests`, identical to `vercel.json` and `public/_headers`. `auto_https off` is deliberate: Railway terminates TLS at its edge and forwards plaintext HTTP to the container on `$PORT`, which has no public IP and cannot complete an ACME challenge; HSTS plus the CSP directive enforce HTTPS at the edge. `trusted_proxies static 0.0.0.0/0 ::/0` is also deliberate — Railway does not publish static proxy IP ranges, so a narrower allow-list would break forwarded-header handling as its proxy fleet rotates. Self-hosted deployments with known proxy CIDRs should replace it with an explicit list.
- **Bundle budget:** `npm run check:budget` resolves the entry chunk from `dist/index.html` (instead of guessing an `index-*` filename) and **fails if no entry can be resolved**. It also counts the raw bytes of the self-hosted Vazirmatn woff2 fonts in the total-download budget (JS gzip + CSS gzip + fonts), so renamed chunks or added fonts cannot silently pass.

**یادداشتهای پیکربندی (خلاصه):** فیلد `engines` در `package.json` نیاز به **Node.js >= ۲۲** را مشخص میکند (همانند CI و Docker). فایل `assetlinks.json` عمدتاً **آرایه خالی** است و هیچ ارتباط TWA فعالی وجود ندارد (اثر انگشت all-zero حذف شد). CSP در `Caddyfile` اکنون شامل `upgrade-insecure-requests` است؛ `auto_https off` بهدلیل خاتمه TLS در لبه Railway است و `trusted_proxies` گسترده بهدلیل نبود رنجهای ثابت پروکسی Railway لازم است. بودجه باندل ورودی را از `dist/index.html` پیدا میکند و فونتهای محلی را هم محاسبه مینماید.

### License & Author
Licensed under the [MIT License](./LICENSE) — Copyright (c) 2026 [soroushse7o](https://github.com/soroushse7o) ([Repository](https://github.com/soroushse7o/persian-calorie-tracker)).


---

## Upgrade Notes / یادداشت ارتقا

Four audited defects were fixed, each with regression tests:

1. **Small portions keep their weight** (`src/store/entryMath.ts`): switching a sub-10 g household portion to grams no longer inflates it to 10 g. A 4 g / 25 kcal walnut now stays 4 g / 25 kcal.
2. **TDEE input validation** (`src/utils/calorieCalculator.ts`): non-finite height/weight and invalid sex/activity/goal return `ok:false` with a Persian message instead of producing `NaN` goals.
3. **Light theme coverage** (`src/index.css` + `src/styles/lightThemeCoverage.test.ts`): every hardcoded dark utility surface now has a light override, and a test prevents future gaps.
4. **First hydration reminder** (`src/utils/localReminders.ts` + `src/utils/localReminders.test.ts`): a newly enabled user now gets a first water reminder instead of waiting forever.

Verification: `npm test` (279 tests), `npm run lint`, `npm run build`, `npm run check:budget` — all passing.

چهار باگ تأییدشده همراه با تست رگرسیون برطرف شدند: حفظ وزن وعدههای کمتر از ۱۰ گرم هنگام تبدیل واحد، رد ورودیهای نامعتبر محاسبهگر TDEE بهجای خروجی `NaN`، پوشش کامل رنگهای تم روشن، و اجرای اولین یادآور نوشیدن آب.

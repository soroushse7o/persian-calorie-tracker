<div align="center">

# کالری‌شمار روزمره | KaloriShomar `v1.4.0`

**ردیاب سریع، کاملاً آفلاین و هوشمند کالری، درشت‌مغذی، فیبر، آب و وزن برای غذاهای خانگی و بسته‌بندی ایرانی**
*Fast, 100% offline-first, mobile-first Persian Calorie & Nutrition Tracker built for Iranian home-cooked meals and real kitchen units.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsoroushse7o%2Fpersian-calorie-tracker&project-name=persian-calorie-tracker&repository-name=persian-calorie-tracker&env=VITE_SITE_URL&envDescription=Canonical%20public%20HTTPS%20URL%20for%20OpenGraph%20and%20sitemap)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fsoroushse7o%2Fpersian-calorie-tracker)

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
npm ci
cp .env.example .env.local   # شامل VITE_SITE_URL برای بیلد محلی
npm run dev
```

```bash
npm run lint                                               # بررسی کیفیت کد با oxlint (۰ خطا / ۰ هشدار)
npm run test:coverage                                      # اجرای تست‌های واحد و طلایی با بررسی آستانه پوشش کد
VITE_SITE_URL="https://example.com" npm run build          # تایپ‌چک، تولید متادیتای مطلق، sitemap و بیلد
npm run check:budget                                       # کنترل بودجه حجم Gzip باندل تولیدی
npm run test:e2e                                           # تست E2E آفلاین با Playwright و Service Worker
```

> **مهم درباره `VITE_SITE_URL`:** طبق سیاست سخت‌گیرانه تولید، متغیر `VITE_SITE_URL` در زمان `npm run build` **اجباری** است و پیش‌فرض پنهان ندارد تا تگ‌های `og:image`، `og:url`، `canonical` و `sitemap.xml` همیشه با آدرس مطلق دامنه واقعی تولید شوند.

---

### راهنمای استقرار (Deployment Guide)

**نسخه‌های زنده (Live):** [Vercel](https://persian-calorie-tracker.vercel.app) • [Railway](https://persian-calorie-tracker-production.up.railway.app/)

#### ۱. استقرار روی Vercel (پیشنهادی)
1. در [vercel.com/new](https://vercel.com/new) مخزن GitHub را انتخاب کنید.
2. در بخش **Environment Variables** متغیر الزامی `VITE_SITE_URL` را برابر دامنه عمومی پروژه قرار دهید.
3. روی **Deploy** کلیک کنید. فایل [`vercel.json`](./vercel.json) هدرهای `CSP`، `HSTS (preload)` و کشینگ PWA را اعمال می‌کند.

#### ۲. دامنه اختصاصی پشت Cloudflare و تست اپراتورهای ایران
برای پایداری کامل دسترسی روی اپراتورهای داخل ایران، اتصال دامنه اختصاصی پشت Cloudflare توصیه می‌شود.

#### ۳. استقرار روی Railway (کانتینر Docker + Caddy غیرریشه)
1. در [railway.com](https://railway.com) گزینه **New Project ← Deploy from GitHub repo** را بزنید.
2. متغیر الزامی `VITE_SITE_URL` را تنظیم کرده و سلامت کانتینر را از مسیر `/health` بررسی نمایید.

</div>

---

## English Documentation

### Overview
**KaloriShomar (کالری‌شمار روزمره) v1.4.0** is an ultra-lightweight, open-source (MIT), 100% offline-first Persian Calorie & Nutrition Tracker PWA built for Iranian home-cooked meals, supermarket barcodes (`626`), and real household units (`کفگیر`, `کف دست`, `لیوان`, `سیخ`, `کاسه`, `ملاقه`, `اسکوپ`). The Persian font (`Vazirmatn Variable`) is self-hosted, charts are rendered with dependency-free native SVG, and all data stays on the user's own device (`IndexedDB` + `localStorage`) — **no sign-up and no tracking scripts**.

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
npm ci
cp .env.example .env.local   # includes VITE_SITE_URL for local builds
npm run dev
```

```bash
npm run lint                                               # oxlint (0 errors / 0 warnings)
npm run test:coverage                                      # unit + golden tests with coverage thresholds
VITE_SITE_URL="https://example.com" npm run build          # type-check, absolute metadata, sitemap, build
npm run check:budget                                       # gzipped production bundle budget
npm run test:e2e                                           # offline Playwright + Service Worker test
```

> **Important about `VITE_SITE_URL`:** under the strict production policy, `VITE_SITE_URL` is **required** at `npm run build` time and has no hidden fallback, so `og:image`, `og:url`, `canonical`, and `sitemap.xml` always use the absolute URL of the real production domain.

### Deployment Guide

**Live deployments:** [Vercel](https://persian-calorie-tracker.vercel.app) • [Railway](https://persian-calorie-tracker-production.up.railway.app/)

**1. Vercel (recommended)**
1. Select the GitHub repository at [vercel.com/new](https://vercel.com/new).
2. In **Environment Variables**, set the required `VITE_SITE_URL` to your public domain.
3. Click **Deploy**. [`vercel.json`](./vercel.json) applies `CSP`, `HSTS (preload)`, and PWA caching headers.

**2. Custom domain behind Cloudflare (for Iranian operators)**
For reliable access from inside Iran, put a custom domain behind Cloudflare with a `CNAME` record to Vercel/Railway (orange-cloud proxy on, SSL/TLS set to **Full (strict)**), set `VITE_SITE_URL` exactly to `https://your-domain.com`, and redeploy so `canonical`, `og:image`, and `sitemap.xml` use the final domain. Note that the `HSTS` header contains `preload` — verify every subdomain has valid HTTPS before submitting to `hstspreload.org`.

**3. Railway (Docker container + non-root Caddy)**
1. In [railway.com](https://railway.com), choose **New Project ← Deploy from GitHub repo**.
2. Set the required `VITE_SITE_URL` variable and check container health at `/health`.

### License & Author
Licensed under the [MIT License](./LICENSE) — Copyright (c) 2026 [soroushse7o](https://github.com/soroushse7o) ([Repository](https://github.com/soroushse7o/persian-calorie-tracker)).

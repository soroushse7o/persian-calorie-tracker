<div align="center">

# کالری‌شمار روزمره | KaloriShomar `v1.4.0`

**ردیاب سریع، کاملاً آفلاین و هوشمند کالری، درشت‌مغذی، فیبر، آب و وزن برای غذاهای خانگی و بسته‌بندی ایرانی**
*Fast, 100% offline-first, mobile-first Persian Calorie & Nutrition Tracker built for Iranian home-cooked meals and real kitchen units.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsoroushse7o%2Fpersian-calorie-tracker&project-name=persian-calorie-tracker&repository-name=persian-calorie-tracker&env=VITE_SITE_URL&envDescription=Canonical%20public%20HTTPS%20URL%20for%20OpenGraph%20and%20sitemap)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fsoroushse7o%2Fpersian-calorie-tracker)

[نسخه فارسی (Persian)](#-نسخه-فارسی) • [English Documentation](#-english-documentation) • [اعتبارسنجی داده‌ها](./docs/FOOD_DATA_VALIDATION.md) • [Changelog](./CHANGELOG.md) • [MIT License](./LICENSE) • [GitHub (@soroushse7o)](https://github.com/soroushse7o)

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

#### ۱. استقرار روی Vercel (پیشنهادی)
1. در [vercel.com/new](https://vercel.com/new) مخزن GitHub را انتخاب کنید.
2. در بخش **Environment Variables** متغیر الزامی `VITE_SITE_URL` را برابر دامنه عمومی پروژه قرار دهید.
3. روی **Deploy** کلیک کنید. فایل [`vercel.json`](./vercel.json) هدرهای `CSP`، `HSTS (preload)` و کشینگ PWA را اعمال می‌کند.

#### ۲. دامنه اختصاصی پشت Cloudflare و تست اپراتورهای ایران
برای پایداری کامل دسترسی روی اپراتورهای داخل ایران، اتصال دامنه اختصاصی پشت Cloudflare توصیه می‌شود. جزئیات تنظیمات و چک‌لیست دسترس‌پذیری در [`docs/A11Y_AND_DEPLOY_CHECKLIST.md`](./docs/A11Y_AND_DEPLOY_CHECKLIST.md) مستند شده است.

#### ۳. استقرار روی Railway (کانتینر Docker + Caddy غیرریشه)
1. در [railway.com](https://railway.com) گزینه **New Project ← Deploy from GitHub repo** را بزنید.
2. متغیر الزامی `VITE_SITE_URL` را تنظیم کرده و سلامت کانتینر را از مسیر `/health` بررسی نمایید.

</div>

---

## English Documentation

### Overview
**KaloriShomar (کالری‌شمار روزمره) v1.4.0** is an ultra-lightweight, open-source (MIT), 100% offline-first Persian Calorie & Nutrition Tracker PWA built for Iranian home-cooked meals, supermarket barcodes (`626`), and real household units (`کفگیر`, `کف دست`, `لیوان`, `سیخ`, `کاسه`, `ملاقه`, `اسکوپ`).

### Key Highlights (`v1.4.0`)
- **Zero-Dependency Native SVG Charts & CI Bundle Budget:** Replaced `recharts` (removing 39 packages) with responsive RTL native SVG charts (`CalorieBarChart`, `WeightLineChart`) enforced by `scripts/check-bundle-budget.mjs` in CI.
- **Inline Autocomplete, Cooking Modifiers, Persian Voice & `626` Barcode Lookup:** Real-time trailing-segment autocomplete (`Tab` / tap), smart cooking preparation modifiers (`کم‌روغن`, `ایرفرایر`, `با کره`), `fa-IR` Web Speech dictation, and camera/manual `626` EAN-13 barcode lookup.
- **Dietary Fiber, Ramadan/Fasting Mode, Editable Yield-Aware Recipes & Jalali Calendar:** Full fiber tracking across 322 foods, `سحری / افطاری` schedule mode with per-meal calorie budgets, editable multi-ingredient recipes with cooking weight yield (`ضریب پخت ٪`), interactive Shamsi monthly calendar picker, and arbitrary past-day meal copying.
- **Resilient Storage & AES-256-GCM Encrypted Backups:** Automatic startup recovery from `IndexedDB` (`idbGetMany`), Web Crypto `PBKDF2-SHA256` + `AES-256-GCM` password-encrypted backups, and opt-in local meal/hydration notification reminders.

### Required Build Environment Variable
```bash
VITE_SITE_URL="https://your-domain.com" npm run build
```

### License & Author
Licensed under the [MIT License](./LICENSE) — Copyright (c) 2026 [soroushse7o](https://github.com/soroushse7o) ([Repository](https://github.com/soroushse7o/persian-calorie-tracker)).

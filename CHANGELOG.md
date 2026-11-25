# Changelog

All notable changes to **KaloriShomar (کالری‌شمار روزمره)** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-11-24

### Added & Improved
- **Complete Light Mode Design Tokens & SVG Contrast (#1):** Replaced hardcoded dark surfaces and SVG axis colors with theme-aware CSS variables (`--chart-label`, `--chart-label-strong`, and full Light Mode surface/border overrides in `src/index.css`) for crisp WCAG AA contrast in daylight.
- **Sex- & Age-Personalized Micronutrient DRIs + Dynamic TDEE Fiber (#2):** Added `getPersonalizedDailyRef` (`8 mg` Iron for adult men & women 51+ vs. `18 mg` for women 18–50; adjusted Zinc, Magnesium, Potassium, Calcium, Vitamin A/C/D) and automatic `14g / 1000 kcal` fiber calculation in `evaluateTdeeGoals`.
- **Composite Iranian Dish Expander & Low-Sodium Modifier (#3):** Added `expandCompositeDishSegment` (`چلوکباب کوبیده`, `چلوجوجه`, `چلوکباب برگ`, `چلوقورمه`, `چلوقیمه`, `چلوفسنجان`, `نون و پنیر و گردو`) and `کم‌نمک / بی‌نمک` modifier (`-65%` sodium, combinable with `کم‌روغن`).
- **Modular Settings Architecture & Category Navigation (#4):** Split the 1,649-line `SettingsTab.tsx` into 4 focused modules under `src/components/settings/*` with a 1-tap section filter bar (`همه بخش‌ها | اهداف و محاسبه‌گر | پشتیبان و داده‌ها | ظاهر، یادآور و نصب | منابع و بازخورد`).
- **7-Point Moving Average & Target Weight Line + Per-Meal Protein Badges (#5):** Upgraded `WeightLineChart` with a smoothed Moving Average trendline (filtering out daily water noise) and optional `targetWeightKg` reference line, and added sky-blue per-meal protein badges in `TodayMealsList`.
- **Nutritional Smart Filters & 1-Tap Rich Food Explorer (#6):** Added `پروتئین بالا`, `فیبر بالا`, `غنی از آهن / کلسیم / پتاسیم / ویتامین C / D`, `کم‌سدیم`, and `کم‌کالری` filters/sorting in `FoodDatabaseTab` with direct 1-tap navigation from any micronutrient in `MicronutrientPanel`.
- **Enriched Medical/Dietitian CSV & Share Reports (#7):** Added Fiber, Iron, Calcium, Sodium, Vitamin C, Vitamin D, per-meal protein, and schedule-aware meal labels (`سحری/افطاری` & `فستینگ ۱۶/۸`) to `buildEntriesCsv` and `dailySummaryShare.ts`.
- **Mobile Home Ergonomics & Pure Jalali Dates (#8):** Switched `DailySummaryCard` mobile ring + macro bars to a compact side-by-side row (saving ~120px vertical scroll), labeled the permanent onboarding dismiss button, and replaced raw Gregorian dates in meal copy dropdowns with pure Jalali dates.
- **Opt-In Privacy-Preserving `OpenFoodFacts` Barcode Lookup & Header Policy Fix (#9):** Added explicit user-initiated online barcode lookup in `VoiceAndBarcodeControls` (with 1-click permanent save to local offline catalog) and updated `Permissions-Policy` (`camera=(self), microphone=(self)`) + `connect-src` across `vercel.json`, `public/_headers`, and `Caddyfile`.
- **Intermittent Fasting (`16:8`) Schedule Mode (#10):** Added `'fasting_16_8'` (`وعده اول / وعده اصلی / وعده پایانی پنجره`) alongside `standard` and `ramadan`.

## [1.3.0] - 2026-11-24

### Added
- **Complete Interactive Macronutrient Charts:** Added zero-dependency SVG `MacroDonutChart` (exact Atwater `4/4/9 kcal/g` caloric share `%` vs. user goal `%` + interactive hover/tap readout + fiber strip) and `MacroStackedBarChart` (daily stacked Protein/Carbs/Fat energy composition across 7-day and 30-day trends) in `src/components/charts/NativeCharts.tsx`.
- **10-Micronutrient Database & Interactive Inspector (`ریزمغزی‌ها`):**
  - Added per-100g profiles across all 322 built-in foods (`CATALOG_VERSION = 2026.11.3`, `src/data/foods/micronutrientRegistry.ts`) covering **Iron (`آهن`), Calcium (`کلسیم`), Potassium (`پتاسیم`), Magnesium (`منیزیم`), Zinc (`روی`), Vitamin C, Vitamin D, Vitamin B12, Vitamin A**, and **Sodium (`سدیم` daily upper-limit ceiling)**.
  - Added `MicronutrientRadarChart` (9-axis SVG balance spider chart) and `MicronutrientPanel` (`src/components/MicronutrientPanel.tsx`) with Vitamin/Mineral filters, `% DV` progress bars, upper-limit warnings for Sodium (`2300 mg`), tap-to-inspect **Top Contributing Foods** from logged meals, and rich Iranian food source hints.
  - Wired into both `DailySummaryCard` (3-tab switcher on Home: `خلاصه انرژی` / `نمودار درشت‌مغذی` / `ریزمغزی‌ها`), `WeeklyTrendsTab` (7-day & 30-day period averages), `RecipeBuilderForm` (automatic ingredient micronutrient summation), and `SingleFoodForm` (collapsible nutrition-label micronutrient inputs), with seamless retroactive fallback for previously logged meals.

## [1.2.0] - 2026-11-24

### Added
- **Zero-Dependency Native SVG Charts & Bundle Budget Gate (#1 & #9):** Replaced `recharts` (removing 39 npm packages) with custom RTL-native SVG `CalorieBarChart` and `WeightLineChart` (`src/components/charts/NativeCharts.tsx`), and enforced strict gzipped bundle budgets via `scripts/check-bundle-budget.mjs` in GitHub Actions CI.
- **Bidirectional `IndexedDB` Startup Recovery (#2):** Added `idbGetMany` batch transaction reader (`src/storage/idbAdapter.ts`) and automatic startup recovery + backfill in `useNutritionStore` if `localStorage` keys are evicted.
- **Live Inline Autocomplete in QuickEntryBar (#3):** Added real-time trailing-segment Persian food suggestions (`getInlineFoodAutocomplete`) with `Tab` key and 1-tap completion while preserving typed quantities, units, and earlier meal segments.
- **Iranian Cooking Preparation Modifiers in Parser (#4):** Added `extractCookingModifier` & `applyCookingModifierToPer100g` (`کم‌روغن`, `بدون روغن`, `رژیمی`, `ایرفرایر`, `بخارپز`, `پرچرب`, `با کره`) with transparent fat/kcal adjustment and UI badges while preserving 100% compatibility on built-in catalog items.
- **Persian Voice Input (`fa-IR`) & Iranian `626` Barcode Scanner (#5):** Added `VoiceAndBarcodeControls` supporting Web Speech API dictation, `BarcodeDetector` camera scanning, manual `626` EAN-13 lookup across popular Iranian packaged items, and 1-click custom barcode product creation.
- **Editable Multi-Ingredient Recipes with Cooking Weight Yield (#6):** Persisted `recipeIngredients` and `cookingYieldPct` (`ضریب پخت ٪`) on custom recipes so users can re-open and edit ingredients and water evaporation/absorption yield at any time.
- **Visual Jalali (Shamsi) Monthly Calendar & Arbitrary Past-Day Meal Copy (#7):** Added accessible `JalaliCalendarPopover` (`src/utils/jalaliCalendar.ts`) with emerald logged-day dots and expanded meal copying to select from any past logged day.
- **Dietary Fiber Tracking & Ramadan / Fasting Schedule Mode (#8):** Added `fiber` across all 322 foods (with curated values for breads, legumes, stews, nuts, fruits, and vegetables), daily fiber goal & progress bar, per-meal calorie budget hints, and `سحری / افطاری / شام` schedule mode.
- **Password-Encrypted Backups (`AES-256-GCM`) & Opt-in Local Reminders (#10):** Added Web Crypto `PBKDF2-SHA256` (100k iterations) + `AES-256-GCM` backup encryption/decryption (`src/utils/cryptoBackup.ts`) and opt-in local evening meal & daytime hydration reminders (`src/utils/localReminders.ts`).

## [1.1.0] - 2026-11-24

### Added
- **Phase 0 — Release Blockers Resolved:**
  - **User-Layer Food Catalog (`Schema v3` + `CATALOG_VERSION = 2026.11.2`):** Persist only user-created `customFoods` and explicit `foodOverrides` in `localStorage`, loading built-in foods directly from code so calorie refinements reach existing users and non-destructive catalog sync never wipes user edits.
  - **67 Reference-Validated High-Consumption Foods:** Added `source` and `verified` fields to every `FoodItem`, cross-checked 67 staple foods against USDA SR Legacy (`NDB #`) and the Iranian Food Composition Table (NNFTRI), while keeping «برآورد تقریبی» wording.
  - **Safe Backup Preview, Merge/Replace & Auto Pre-Import Snapshot:** Added `analyzeBackupJson` preview (meal count, Jalali date range, custom foods/overrides, weights/water presence), `merge` vs. `replace` import selector (clearing stale water/weight data on `replace` when absent in legacy backups), and automatic pre-import rollback snapshot.
  - **Complete Sanitization & `ErrorBoundary` Safe Mode:** Added sanitizers for `weights`, `templates`, `waterByDate`, and `foodOverrides` on hydration, cross-tab sync, and import, plus crash-proof raw `localStorage` dump + 2-step reset in `ErrorBoundary`.
  - **iOS Add-to-Home-Screen Guide & IndexedDB Adapter:** Added `detectIosDevice` + step-by-step Safari A2HS instructions, tiered gentle/urgent backup reminders showing exact unbacked entry counts, and `src/storage/idbAdapter.ts`.
  - **Strict Build-Time `VITE_SITE_URL`, Canonical & Sitemap:** Enforced `VITE_SITE_URL` at build time (fails fast if unset) to inject absolute `canonical`, `og:url`, `og:image`, and `twitter:image` tags and generate `dist/sitemap.xml` and `dist/robots.txt`.
  - **Health Safety & Feedback Channels:** Added soft health warning for manual goals below `1,200 kcal`, supportive non-pressuring Streak & Weight copy, `soroushse7o` MIT license attribution, and prefilled GitHub Issue templates (`.github/ISSUE_TEMPLATE/*`) for missing/wrong foods and feedback.
- **Phase 1 — Pre-Launch Quality & Modular Architecture:**
  - Fixed `updateEntry` rounding drift via `recomputeUpdatedEntry` (`per100g × grams` always).
  - Split `persianFoodParser.ts` into `src/utils/parser/*` and `FoodDatabaseTab.tsx` into `src/components/foodDatabase/*`.
  - Added 3-step guided `OnboardingCard`, enforced v8 coverage thresholds in `vite.config.ts`, and removed `continue-on-error` from Lighthouse CI in `.github/workflows/ci.yml`.
- **Phase 2 — Privacy-First Local Beta Instrumentation:**
  - Added `src/utils/localMetrics.ts` to compute local-only parser unmatched rate, PII-scrubbed unmatched phrases, active days, and anonymous user-exportable Markdown reports.
- **Phase 3 — Growth, Sharing & Store Packaging:**
  - Added Recent & Frequent food 1-tap chips in `QuickEntryBar`, instant History Search and 7-day Weekly Report in `WeeklyTrendsTab`, client-side `1080×1080` Canvas PNG export for Daily & Weekly summary cards, and TWA (`assetlinks.json`) + Capacitor (`capacitor.config.json`) templates for Cafe Bazaar & Myket.

## [1.0.0] - 2026-11-22

### Added
- **Self-hosted Vazirmatn Variable Font (`@fontsource-variable/vazirmatn`):** Eliminated Google Fonts external dependency for 100% offline reliability and zero blocking risk inside Iran.
- **315+ Iranian & Everyday Food Database:** Expanded across stews, regional Iranian specialties, kebabs, rice/breads, fast foods, dairy, traditional sweets, nuts/dried fruits, seasonal produce, Persian drinks, and packaged supermarket staples, with transparent source attribution (Iranian Food Composition Table & USDA) and approximate labeling.
- **Parser Disambiguation & 200+ Golden Test Corpus:** Added ambiguity and low-confidence match detection with 1-tap alternative food swapping on chips, smart food-name extraction for 1-click custom food creation, and a 210+ sentence golden parser test suite.
- **Health Safety & Legal Compliance:** Enforced strict **18+ age gate** in the Mifflin-St Jeor TDEE calculator, added prominent Persian health disclaimers, added an on-device Privacy & Sources section, and published under the **MIT License**.
- **Data Safety & Multi-Tab Reliability:** Added schema versioning (`v2`) with safe `v1 → v2` migration, visible quota/storage error alerts with instant emergency JSON backup, `navigator.storage.persist()` durable storage requests, weekly backup reminders, and real-time cross-tab synchronization via the `storage` event.
- **PWA Assets & Safe Service Worker Updates:** Generated crisp PNG icons (`192×192`, `512×512`, separate `maskable` 512px, `180×180` iOS `apple-touch-icon`) and `1200×630` Open Graph preview image (`og-image.png`).
- **CI/CD & Hosting Configs:** Added `vercel.json`, Cloudflare Pages `_headers`/`_redirects`, Railway `Dockerfile`/`Caddyfile`/`railway.json`, `lighthouserc.json`, Dependabot, and GitHub Actions CI.

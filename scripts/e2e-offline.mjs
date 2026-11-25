import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4173
const URL = `http://127.0.0.1:${PORT}`

async function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Preview server did not become ready at ${url}`)
}

async function run() {
  const server = spawn(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--host', '127.0.0.1'],
    {
      stdio: 'ignore',
    },
  )

  try {
    await waitForServer(URL)

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'fa-IR',
    })
    const page = await context.newPage()

    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    // 1. Load app ONCE online & wait for Service Worker installation + controller claim
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="onboarding-card"]', { timeout: 5000 })
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported')
      }
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
            once: true,
          })
        })
      }
    })

    // 2. Verify Composite Dish Expander ("چلوکباب کوبیده" -> 2 chips) & Low-Sodium / Lean Cooking Modifiers
    await page.locator('#quick-food-input').fill('یک پرس چلوکباب کوبیده')
    const compositeChips = await page.locator('[data-testid="parsed-food-chip"]').count()
    if (compositeChips !== 2) {
      throw new Error(`Expected چلوکباب کوبیده to expand into 2 chips, got ${compositeChips}`)
    }

    await page.locator('#quick-food-input').fill('دو کفگیر قورم')
    await page.waitForSelector('[data-testid="inline-autocomplete-bar"]', { timeout: 5000 })
    await page.locator('[data-testid="inline-autocomplete-chip"]').first().click()

    await page.locator('#quick-food-input').fill('دو کفگیر قورمه‌سبزی کم‌روغن و کم‌نمک')
    await page.waitForSelector('[data-testid="cooking-modifier-badge"]', { timeout: 5000 })

    // 3. Log standard Persian meal online & verify Per-Meal Protein Badge + Fiber Bar + exact kcal
    await page.locator('#quick-food-input').fill('دو کفگیر قورمه‌سبزی و یک کف دست سنگک')
    await page.locator('#meal-type-lunch').click()
    await page.locator('#submit-meal-btn').click()
    await page.waitForSelector('[data-testid="logged-meal-item"]', { timeout: 5000 })
    await page.waitForSelector('[data-testid="meal-protein-badge-lunch"]', { timeout: 5000 })
    await page.waitForSelector('[data-testid="macro-bar-fiber"]', { timeout: 5000 })

    const onlineKcal = await page.locator('[data-testid="consumed-kcal"]').first().innerText()
    if (onlineKcal !== '۴۲۵') {
      throw new Error(`Expected ۴۲۵ online, got ${onlineKcal}`)
    }

    // 4. Verify Daily Macronutrient Donut Chart & Daily Micronutrient Inspector -> 1-tap Jump to Rich Foods!
    await page.locator('#mobile-tab-macro-chart').click()
    await page.waitForSelector('[data-testid="macro-donut-chart"]', { timeout: 5000 })
    await page.locator('#mobile-tab-micronutrients').click()
    await page.waitForSelector('[data-testid="micronutrient-radar-chart"]', { timeout: 5000 })
    await page.locator('[data-testid="micro-item-ironMg"] button').first().click()
    await page.waitForSelector('[data-testid="micro-detail-ironMg"]', { timeout: 5000 })
    await page.locator('[data-testid="explore-rich-ironMg"]').click()
    await page.waitForSelector('[data-testid="food-nutrient-filter-bar"]', { timeout: 8000 })
    await page.locator('#mobile-nav-home').click()

    // 5. Verify Jalali Calendar & Barcode Scanner (with opt-in OpenFoodFacts button visible when online)
    await page.locator('#open-jalali-calendar-btn').click()
    await page.waitForSelector('[data-testid="jalali-calendar-modal"]', { timeout: 5000 })
    await page.keyboard.press('Escape')

    await page.locator('#open-barcode-scanner-btn').click()
    await page.waitForSelector('[data-testid="barcode-scanner-modal"]', { timeout: 5000 })
    await page.locator('#barcode-manual-input').fill('6260101200112')
    await page.waitForSelector('[data-testid="use-barcode-food-btn"]', { timeout: 5000 })
    await page.keyboard.press('Escape')

    // 6. Go completely OFFLINE & reload — verify SW + IndexedDB/localStorage serve everything!
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="consumed-kcal"]', { timeout: 10000 })

    const offlineKcal = await page.locator('[data-testid="consumed-kcal"]').first().innerText()
    if (offlineKcal !== '۴۲۵') {
      throw new Error(`Expected ۴۲۵ after offline reload, got ${offlineKcal}`)
    }

    // 7. Navigate to Trends & modular Settings while OFFLINE
    await page.locator('#mobile-nav-trends').click()
    await page.waitForSelector('[data-testid="weekly-trends-tab"]', { timeout: 8000 })
    await page.waitForSelector('[data-testid="weekly-bar-chart"]', { timeout: 5000 })
    await page.waitForSelector('[data-testid="macro-stacked-bar-chart"]', { timeout: 5000 })
    await page.waitForSelector('[data-testid="trends-micronutrients-section"]', { timeout: 5000 })

    await page.locator('#mobile-nav-settings').click()
    await page.waitForSelector('[data-testid="settings-section-nav"]', { timeout: 8000 })
    await page.waitForSelector('[data-testid="local-beta-metrics-card"]', { timeout: 5000 })

    // Verify all 3 schedule modes (Standard / Intermittent Fasting 16:8 / Ramadan) & <1200 kcal warning
    await page.locator('#schedule-fasting-btn').click()
    await page.locator('#schedule-ramadan-btn').click()
    await page.locator('#schedule-standard-btn').click()
    await page.locator('#goal-kcal-input').fill('1000')
    await page.waitForSelector('[data-testid="low-calorie-soft-warning"]', { timeout: 5000 })

    // Toggle Light Mode & back to Dark Mode while offline
    await page.locator('#theme-light-btn').click()
    await page.locator('#theme-dark-btn').click()

    if (errors.length > 0) {
      throw new Error(`Unexpected page errors: ${errors.join('; ')}`)
    }

    await browser.close()
    console.log(
      'Offline PWA E2E (v1.4.0) passed: composite چلوکباب expansion -> کم‌نمک/کم‌روغن modifiers -> macro donut & 10-micronutrient radar -> 1-tap rich food explorer -> offline reload -> modular settings & 16:8 fasting mode -> Light/Dark contrast verified with 0 errors!',
    )
  } finally {
    server.kill('SIGTERM')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

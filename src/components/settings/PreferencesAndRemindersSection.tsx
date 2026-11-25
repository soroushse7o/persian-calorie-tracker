import { Bell, Moon, RefreshCw, Share, Smartphone, Sun } from 'lucide-react'
import { useState } from 'react'
import type { ThemeMode } from '../../types/nutrition'
import {
  readReminderSettings,
  requestNotificationPermissionIfNeeded,
  writeReminderSettings,
  type LocalReminderSettings,
} from '../../utils/localReminders'
import { formatFaNumber } from '../../utils/persianFormat'
import type { PwaStatus } from '../../utils/pwa'

interface PreferencesAndRemindersSectionProps {
  theme: ThemeMode
  pwaStatus: PwaStatus
  onThemeChange: (next: ThemeMode) => void
}

export function PreferencesAndRemindersSection({
  theme,
  pwaStatus,
  onThemeChange,
}: PreferencesAndRemindersSectionProps) {
  const [reminderSettings, setReminderSettings] =
    useState<LocalReminderSettings>(readReminderSettings)
  const [notifStatusText, setNotifStatusText] = useState<string | null>(null)
  const [showIosGuide, setShowIosGuide] = useState(() => pwaStatus.isIosInstallable)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)

  const handleToggleReminders = async () => {
    const nextEnabled = !reminderSettings.enabled
    let permNote: string | null = null
    if (nextEnabled) {
      const perm = await requestNotificationPermissionIfNeeded()
      permNote =
        perm === 'granted'
          ? 'اعلان مرورگر فعال شد.'
          : 'اعلان درون‌برنامه‌ای فعال شد (بدون سرور خارجی).'
    }
    const next: LocalReminderSettings = {
      ...reminderSettings,
      enabled: nextEnabled,
      lastWaterRemindedAt: Date.now(),
    }
    setReminderSettings(next)
    writeReminderSettings(next)
    setNotifStatusText(permNote)
  }

  const handleUpdateReminderField = (patch: Partial<LocalReminderSettings>) => {
    setReminderSettings((prev) => {
      const next = { ...prev, ...patch }
      writeReminderSettings(next)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">ظاهر برنامه (کنتراست استاندارد روز و شب)</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              حالت تاریک پیش‌فرض برای مطالعه راحت شبانه؛ حالت روشن با کنتراست بهینه برای نور روز
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A]">
            <button
              type="button"
              id="theme-dark-btn"
              onClick={() => onThemeChange('dark')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-emerald-500 text-[#051B11] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>تاریک</span>
            </button>
            <button
              type="button"
              id="theme-light-btn"
              onClick={() => onThemeChange('light')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-emerald-500 text-[#051B11] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>روشن</span>
            </button>
          </div>
        </div>

        <div className="pt-3.5 border-t border-[#222227] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-semibold text-zinc-100">
                  یادآور محلی نوشیدن آب و ثبت شام (بدون سرور پوش)
                </div>
                <div className="text-[11px] text-zinc-400">
                  فقط روی همین مرورگر اجرا می‌شود و هیچ داده‌ای ارسال نمی‌کند
                </div>
              </div>
            </div>
            <button
              type="button"
              id="toggle-local-reminders-btn"
              onClick={() => void handleToggleReminders()}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                reminderSettings.enabled
                  ? 'bg-emerald-500 text-[#051B11]'
                  : 'bg-[#1E1E22] border border-[#2E2E36] text-zinc-300'
              }`}
            >
              {reminderSettings.enabled ? 'فعال است' : 'فعال‌سازی یادآور'}
            </button>
          </div>

          {reminderSettings.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-[#0C0C0D] border border-[#26262E] px-3 py-2">
                <span className="text-zinc-400">ساعت یادآور ثبت شام:</span>
                <select
                  aria-label="ساعت یادآور شام"
                  value={reminderSettings.dinnerHour}
                  onChange={(e) =>
                    handleUpdateReminderField({ dinnerHour: Number(e.target.value) })
                  }
                  className="bg-[#1E1E22] rounded-lg px-2 py-1 text-zinc-100 tabular-nums-fa"
                >
                  {[19, 20, 21, 22].map((h) => (
                    <option key={h} value={h}>
                      ساعت {formatFaNumber(h)}:۰۰
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#0C0C0D] border border-[#26262E] px-3 py-2">
                <span className="text-zinc-400">فاصله یادآور آب:</span>
                <select
                  aria-label="فاصله یادآور آب"
                  value={reminderSettings.waterIntervalMin}
                  onChange={(e) =>
                    handleUpdateReminderField({ waterIntervalMin: Number(e.target.value) })
                  }
                  className="bg-[#1E1E22] rounded-lg px-2 py-1 text-zinc-100 tabular-nums-fa"
                >
                  <option value={0}>غیرفعال</option>
                  <option value={60}>هر ۱ ساعت</option>
                  <option value={120}>هر ۲ ساعت</option>
                  <option value={180}>هر ۳ ساعت</option>
                </select>
              </div>
            </div>
          )}

          {notifStatusText && <p className="text-[11px] text-emerald-400">{notifStatusText}</p>}
        </div>
      </section>

      {/* PWA Install & iOS Safari Guide */}
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-[220px]">
            <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-zinc-100">نصب آفلاین روی موبایل (PWA)</h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    pwaStatus.isOnline
                      ? 'bg-emerald-500/12 text-emerald-300'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {pwaStatus.isOnline ? 'فونت و اجرا ۱۰۰٪ آفلاین' : 'در حال اجرا در حالت آفلاین'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {pwaStatus.isInstalled
                  ? 'برنامه روی صفحه اصلی شما نصب شده و کاملاً آفلاین کار می‌کند.'
                  : 'برای باز شدن تمام‌صفحه و کارکرد آنی بدون اینترنت، برنامه را به صفحه اصلی گوشی اضافه کنید.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pwaStatus.hasUpdate && (
              <button
                type="button"
                onClick={pwaStatus.applyUpdate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-[#1A1202] font-bold text-xs px-3.5 py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>به‌روزرسانی نسخه</span>
              </button>
            )}
            {pwaStatus.canInstall && (
              <button
                type="button"
                id="pwa-install-btn"
                onClick={() => void pwaStatus.promptInstall()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs px-4 py-2.5 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>نصب اپلیکیشن</span>
              </button>
            )}
            {!pwaStatus.isInstalled && !pwaStatus.canInstall && (
              <button
                type="button"
                id="toggle-ios-a2hs-btn"
                onClick={() => {
                  setShowIosGuide((v) => !v)
                  setShowAndroidGuide(false)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] text-zinc-200 font-semibold text-xs px-3 py-2"
              >
                <Share className="w-3.5 h-3.5 text-sky-400" />
                <span>راهنمای نصب در آیفون (iOS)</span>
              </button>
            )}
            {!pwaStatus.isInstalled && !pwaStatus.canInstall && (
              <button
                type="button"
                id="toggle-android-a2hs-btn"
                onClick={() => {
                  setShowAndroidGuide((v) => !v)
                  setShowIosGuide(false)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] text-zinc-200 font-semibold text-xs px-3 py-2"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>راهنمای نصب در اندروید (Google Chrome)</span>
              </button>
            )}
          </div>
        </div>

        {!pwaStatus.isInstalled && showIosGuide && (
          <div
            data-testid="ios-a2hs-guide"
            className="rounded-xl bg-[#0C0C0D] border border-[#26262E] p-3.5 text-xs space-y-1.5 leading-relaxed"
          >
            <div className="font-semibold text-sky-300">
              مراحل افزودن به صفحه اصلی در آیفون و آیپد (مرورگر Safari):
            </div>
            <ol className="list-decimal list-inside text-zinc-300 space-y-1">
              <li>
                این صفحه را در مرورگر <strong>Safari</strong> باز کنید.
              </li>
              <li>
                روی دکمه اشتراک‌گذاری (<strong>Share</strong> در نوار پایین صفحه) بزنید.
              </li>
              <li>
                گزینه <strong>Add to Home Screen</strong> را انتخاب کرده و در بالا{' '}
                <strong>Add</strong> را لمس کنید.
              </li>
            </ol>
          </div>
        )}

        {!pwaStatus.isInstalled && showAndroidGuide && (
          <div
            data-testid="android-a2hs-guide"
            className="rounded-xl bg-[#0C0C0D] border border-[#26262E] p-3.5 text-xs space-y-1.5 leading-relaxed"
          >
            <div className="font-semibold text-emerald-300">
              مراحل نصب در اندروید (مرورگر Google Chrome):
            </div>
            <ol className="list-decimal list-inside text-zinc-300 space-y-1">
              <li>
                آدرس برنامه را در <strong>Google Chrome</strong> باز کنید (از طریق HTTPS).
              </li>
              <li>
                روی منوی سهنقطه در بالای سمت راست Chrome بزنید.
              </li>
              <li>
                گزینه <strong>Install app</strong> (یا <strong>Add to Home screen</strong>) را انتخاب کنید.
              </li>
              <li>
                نام میانبر را تأیید کرده و <strong>Install</strong> را لمس کنید تا آیکون به صفحه اصلی اضافه شود.
              </li>
            </ol>
            <p className="text-[11px] text-zinc-400">
              اگر گزینهٔ نصب نمایش داده نشد، مطمئن شوید از نسخهٔ بهروز Chrome استفاده میکنید و صفحه
              با HTTPS باز شده است. پس از نصب، برنامه تمامصفحه و بدون نیاز به اینترنت اجرا میشود.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

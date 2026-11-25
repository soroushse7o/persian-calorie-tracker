import {
  Download,
  FileSpreadsheet,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type {
  BackupAnalysisResult,
  BackupImportMode,
  BackupPreview,
} from '../../store/backup'
import type { LoggedFoodEntry } from '../../types/nutrition'
import {
  decryptBackupJson,
  encryptBackupJson,
  isEncryptedBackupEnvelope,
} from '../../utils/cryptoBackup'
import {
  dateFromKey,
  formatFaNumber,
  formatJalaliDate,
  getLocalDateKey,
} from '../../utils/persianFormat'

interface BackupAndDataSectionProps {
  foodsCount: number
  customFoodsCount: number
  overridesCount: number
  entries: LoggedFoodEntry[]
  lastBackupAt: number | null
  preImportSavedAt: number | null
  persistenceState: 'checking' | 'persisted' | 'not_persisted' | 'unsupported'
  onExportJson: () => string
  onExportCsv: () => string
  onPreviewBackupJson: (raw: string) => BackupAnalysisResult
  onImportJson: (
    raw: string,
    mode: BackupImportMode,
  ) => { ok: boolean; error?: string; stats?: { foods: number; entries: number } }
  onRestorePreImportSnapshot: () => boolean
  onResetDefaultFoods: (options?: { clearOverrides?: boolean }) => void
  onClearAllEntries: () => void
}

export function BackupAndDataSection({
  foodsCount,
  customFoodsCount,
  overridesCount,
  entries,
  lastBackupAt,
  preImportSavedAt,
  persistenceState,
  onExportJson,
  onExportCsv,
  onPreviewBackupJson,
  onImportJson,
  onRestorePreImportSnapshot,
  onResetDefaultFoods,
  onClearAllEntries,
}: BackupAndDataSectionProps) {
  const [encryptOpen, setEncryptOpen] = useState(false)
  const [encryptPassword, setEncryptPassword] = useState('')
  const [pendingEncryptedRaw, setPendingEncryptedRaw] = useState<string | null>(null)
  const [decryptPassword, setDecryptPassword] = useState('')
  const [pendingImport, setPendingImport] = useState<{
    rawJson: string
    preview: BackupPreview
    mode: BackupImportMode
  } | null>(null)
  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmResetFoods, setConfirmResetFoods] = useState(false)
  const [alsoClearOverrides, setAlsoClearOverrides] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const triggerDownload = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    triggerDownload(
      onExportJson(),
      'application/json;charset=utf-8',
      `kalorishomar-backup-${getLocalDateKey()}.json`,
    )
    setBackupMessage({
      type: 'success',
      text: 'فایل پشتیبان کامل (JSON) با موفقیت دانلود شد.',
    })
  }

  const handleExportEncryptedJson = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const plain = onExportJson()
      const encrypted = await encryptBackupJson(plain, encryptPassword)
      triggerDownload(
        encrypted,
        'application/json;charset=utf-8',
        `kalorishomar-encrypted-${getLocalDateKey()}.enc.json`,
      )
      setEncryptPassword('')
      setEncryptOpen(false)
      setBackupMessage({
        type: 'success',
        text: 'پشتیبان رمزنگاری‌شده (AES-256-GCM) با موفقیت دانلود شد.',
      })
    } catch (err) {
      setBackupMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در رمزنگاری فایل پشتیبان.',
      })
    }
  }

  const handleExportCsv = () => {
    if (entries.length === 0) {
      setBackupMessage({
        type: 'error',
        text: 'هنوز وعده‌ای برای خروجی CSV ثبت نشده است.',
      })
      return
    }
    triggerDownload(
      onExportCsv(),
      'text/csv;charset=utf-8',
      `kalorishomar-meals-${getLocalDateKey()}.csv`,
    )
    setBackupMessage({
      type: 'success',
      text: 'فایل اکسل (CSV شامل درشت‌مغذی‌ها، فیبر و ریزمغزی‌ها) با موفقیت دانلود شد.',
    })
  }

  const stagePlainBackupForPreview = (plainText: string) => {
    const res = onPreviewBackupJson(plainText)
    if (!res.ok) {
      setPendingImport(null)
      setBackupMessage({ type: 'error', text: res.error })
    } else {
      setBackupMessage(null)
      setPendingImport({
        rawJson: plainText,
        preview: res.bundle.preview,
        mode: entries.length > 0 ? 'merge' : 'replace',
      })
    }
  }

  const handleSelectImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      if (isEncryptedBackupEnvelope(text)) {
        setPendingImport(null)
        setBackupMessage(null)
        setDecryptPassword('')
        setPendingEncryptedRaw(text)
        return
      }
      setPendingEncryptedRaw(null)
      stagePlainBackupForPreview(text)
    } catch {
      setBackupMessage({
        type: 'error',
        text: 'امکان خواندن فایل انتخاب‌شده وجود ندارد.',
      })
    } finally {
      e.target.value = ''
    }
  }

  const handleDecryptPendingImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingEncryptedRaw) return
    const res = await decryptBackupJson(pendingEncryptedRaw, decryptPassword)
    if (!res.ok) {
      setBackupMessage({ type: 'error', text: res.error })
      return
    }
    setPendingEncryptedRaw(null)
    setDecryptPassword('')
    stagePlainBackupForPreview(res.plainJson)
  }

  const handleConfirmImport = () => {
    if (!pendingImport) return
    const res = onImportJson(pendingImport.rawJson, pendingImport.mode)
    setPendingImport(null)
    if (res.ok && res.stats) {
      setBackupMessage({
        type: 'success',
        text: `پشتیبان با موفقیت ${pendingImport.mode === 'merge' ? 'ادغام' : 'جایگزین'} شد: ${formatFaNumber(res.stats.entries)} وعده فعال.`,
      })
    } else {
      setBackupMessage({
        type: 'error',
        text: res.error ?? 'خطا در بازیابی فایل پشتیبان.',
      })
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/12 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                پشتیبان‌گیری، رمزنگاری و خروجی پزشکی CSV
              </h2>
              <p className="text-[11px] text-zinc-400 tabular-nums-fa">
                {formatFaNumber(foodsCount)} غذا ({formatFaNumber(customFoodsCount)} شخصی ·{' '}
                {formatFaNumber(overridesCount)} ویرایش‌شده) · {formatFaNumber(entries.length)} وعده
                {lastBackupAt
                  ? ` · آخرین پشتیبان: ${formatJalaliDate(new Date(lastBackupAt), 'short')}`
                  : ' · هنوز پشتیبان نگرفته‌اید'}
              </p>
            </div>
          </div>

          <span
            data-testid="storage-persistence-badge"
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              persistenceState === 'persisted'
                ? 'bg-emerald-500/12 text-emerald-300'
                : 'bg-[#1E1E22] text-zinc-400'
            }`}
          >
            {persistenceState === 'persisted'
              ? 'حافظه پایدار + بازیابی IndexedDB فعال'
              : 'پشتیبان‌گیری هفتگی توصیه می‌شود'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            id="export-json-btn"
            onClick={handleExportJson}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>خروجی JSON</span>
          </button>

          <button
            type="button"
            id="toggle-encrypted-export-btn"
            onClick={() => setEncryptOpen((v) => !v)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>پشتیبان رمزدار</span>
          </button>

          <button
            type="button"
            id="export-csv-btn"
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
            <span>خروجی اکسل CSV</span>
          </button>

          <button
            type="button"
            id="import-json-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <Upload className="w-4 h-4 text-sky-400 shrink-0" />
            <span>بازیابی پشتیبان</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleSelectImportFile}
            className="hidden"
          />
        </div>

        {encryptOpen && (
          <form
            onSubmit={(e) => void handleExportEncryptedJson(e)}
            data-testid="encrypted-export-form"
            className="rounded-xl bg-[#0C0C0D] border border-emerald-500/30 p-3.5 space-y-2.5 text-xs animate-fade-up"
          >
            <div className="font-semibold text-emerald-300">
              رمزنگاری پیشرفته با کلید شخصی (AES-256-GCM در مرورگر)
            </div>
            <p className="text-[11px] text-zinc-400">
              مناسب ذخیره امن در تلگرام، ایمیل یا فضای ابری؛ بدون این رمز عبور هیچ‌کس قادر به باز کردن
              فایل نخواهد بود.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                required
                minLength={4}
                value={encryptPassword}
                onChange={(e) => setEncryptPassword(e.target.value)}
                placeholder="رمز عبور دلخواه (حداقل ۴ نویسه)"
                className="flex-1 rounded-xl bg-[#161618] border border-[#2E2E36] px-3 py-2 text-xs text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 text-[#051B11] font-bold px-3.5 py-2 text-xs shrink-0"
              >
                رمزنگاری و دانلود
              </button>
            </div>
          </form>
        )}

        {pendingEncryptedRaw && (
          <form
            onSubmit={(e) => void handleDecryptPendingImport(e)}
            data-testid="encrypted-import-prompt"
            className="rounded-xl bg-[#0C0C0D] border border-sky-500/35 p-3.5 space-y-2.5 text-xs animate-fade-up"
          >
            <div className="font-semibold text-sky-300">
              فایل پشتیبان رمزنگاری‌شده شناسایی شد — رمز عبور را وارد کنید:
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                required
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
                placeholder="رمز عبور فایل پشتیبان"
                className="flex-1 rounded-xl bg-[#161618] border border-[#2E2E36] px-3 py-2 text-xs text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-sky-500 text-[#041824] font-bold px-3.5 py-2 text-xs shrink-0"
              >
                رمزگشایی و پیش‌نمایش
              </button>
              <button
                type="button"
                onClick={() => setPendingEncryptedRaw(null)}
                className="rounded-xl bg-[#222228] text-zinc-300 px-3 py-2 text-xs"
              >
                لغو
              </button>
            </div>
          </form>
        )}

        {pendingImport && (
          <div
            data-testid="backup-import-preview"
            className="rounded-2xl bg-[#0C0C0D] border border-sky-500/35 p-4 space-y-3 text-xs animate-fade-up"
          >
            <div className="font-bold text-sky-300">پیش‌نمایش فایل پشتیبان پیش از اعمال</div>
            <ul className="space-y-1 text-zinc-300 tabular-nums-fa">
              <li>
                • تعداد وعده‌ها: <strong>{formatFaNumber(pendingImport.preview.entriesCount)}</strong>
                {pendingImport.preview.minDateKey && pendingImport.preview.maxDateKey && (
                  <span>
                    {' '}
                    (بازه تاریخ:{' '}
                    {formatJalaliDate(dateFromKey(pendingImport.preview.minDateKey), 'short')} تا{' '}
                    {formatJalaliDate(dateFromKey(pendingImport.preview.maxDateKey), 'short')})
                  </span>
                )}
              </li>
              <li>
                • غذاهای شخصی:{' '}
                <strong>{formatFaNumber(pendingImport.preview.customFoodsCount)}</strong> · ویرایش‌های
                کاتالوگ: <strong>{formatFaNumber(pendingImport.preview.overridesCount)}</strong>
              </li>
            </ul>

            <div className="space-y-2 pt-1">
              <span className="block text-zinc-400 font-medium">روش بازیابی را انتخاب کنید:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  id="import-mode-merge-btn"
                  onClick={() => setPendingImport((p) => (p ? { ...p, mode: 'merge' } : null))}
                  className={`rounded-xl border p-2.5 text-right transition-colors ${
                    pendingImport.mode === 'merge'
                      ? 'bg-emerald-500/14 border-emerald-500/45 text-zinc-100'
                      : 'bg-[#161618] border-[#2A2A32] text-zinc-400'
                  }`}
                >
                  <div className="font-bold text-xs">ادغام با داده‌های فعلی (پیشنهادی)</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    وعده‌ها و غذاهای فعلی حفظ و موارد جدید اضافه می‌شوند
                  </div>
                </button>
                <button
                  type="button"
                  id="import-mode-replace-btn"
                  onClick={() => setPendingImport((p) => (p ? { ...p, mode: 'replace' } : null))}
                  className={`rounded-xl border p-2.5 text-right transition-colors ${
                    pendingImport.mode === 'replace'
                      ? 'bg-amber-500/14 border-amber-500/45 text-zinc-100'
                      : 'bg-[#161618] border-[#2A2A32] text-zinc-400'
                  }`}
                >
                  <div className="font-bold text-xs">جایگزینی کامل</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    تمام داده‌های فعلی با محتوای همین فایل جایگزین می‌شوند
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                id="confirm-backup-import-btn"
                onClick={handleConfirmImport}
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold py-2.5 text-xs transition-colors"
              >
                تأیید و اعمال پشتیبان
              </button>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="rounded-xl bg-[#222228] text-zinc-300 px-4 py-2.5 text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        )}

        {preImportSavedAt && !pendingImport && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0C0C0D] border border-[#25252C] px-3 py-2 text-[11px] text-zinc-400">
            <span>
              نسخه خودکار پیش از آخرین بازیابی (
              {formatJalaliDate(new Date(preImportSavedAt), 'short')}) موجود است:
            </span>
            <button
              type="button"
              onClick={() => {
                if (onRestorePreImportSnapshot()) {
                  setBackupMessage({
                    type: 'success',
                    text: 'وضعیت پیش از آخرین بازیابی با موفقیت برگردانده شد.',
                  })
                }
              }}
              className="text-sky-300 hover:underline font-semibold"
            >
              بازگردانی به قبل از ایمپورت
            </button>
          </div>
        )}

        {backupMessage && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-xs ${
              backupMessage.type === 'success'
                ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/25'
                : 'bg-rose-500/12 text-rose-300 border border-rose-500/25'
            }`}
          >
            {backupMessage.text}
          </div>
        )}
      </section>

      {/* Safe Non-Destructive Reset Controls */}
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-400">مدیریت داده‌های محلی</h2>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="text-xs text-zinc-300">
            همگام‌سازی کاتالوگ پیش‌فرض (غذاهای شخصی و ویرایش‌های شما حفظ می‌شوند)
          </div>
          {!confirmResetFoods ? (
            <button
              type="button"
              onClick={() => {
                setAlsoClearOverrides(false)
                setConfirmResetFoods(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2C2C33] px-3 py-1.5 text-xs text-zinc-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>همگام‌سازی پیش‌فرض‌ها</span>
            </button>
          ) : (
            <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
              {overridesCount > 0 && (
                <label className="inline-flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoClearOverrides}
                    onChange={(e) => setAlsoClearOverrides(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>
                    پاک کردن ویرایش‌های من روی غذاهای پیش‌فرض ({formatFaNumber(overridesCount)}{' '}
                    مورد)
                  </span>
                </label>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetDefaultFoods({ clearOverrides: alsoClearOverrides })
                    setConfirmResetFoods(false)
                    setBackupMessage({
                      type: 'success',
                      text: alsoClearOverrides
                        ? 'کاتالوگ پیش‌فرض بازنشانی شد (غذاهای شخصی شما حفظ شدند).'
                        : 'کاتالوگ پیش‌فرض بدون حذف غذاهای شخصی و ویرایش‌های شما همگام‌سازی شد.',
                    })
                  }}
                  className="rounded-xl bg-amber-500 text-[#1A1202] font-bold px-3 py-1.5 text-xs"
                >
                  تایید همگام‌سازی
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetFoods(false)}
                  className="rounded-xl bg-[#25252B] text-zinc-300 px-3 py-1.5 text-xs"
                >
                  لغو
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#222227]">
          <div className="text-xs text-zinc-300">
            پاک کردن تمام وعده‌ها، گزارش آب و وزن‌های ثبت‌شده
          </div>
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاک‌سازی تاریخچه</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAllEntries()
                  setConfirmClear(false)
                }}
                className="rounded-xl bg-rose-500 text-white font-bold px-3 py-1.5 text-xs"
              >
                بله، پاک شود
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-xl bg-[#25252B] text-zinc-300 px-3 py-1.5 text-xs"
              >
                انصراف
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

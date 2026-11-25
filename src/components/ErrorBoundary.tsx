import { AlertTriangle, Download, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { idbClearAll } from '../storage/idbAdapter'
import {
  clearAllKaloriShomarStorage,
  dumpRawKaloriShomarStorage,
} from '../utils/storageMigration'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
  confirmSafeReset: boolean
  rawDownloaded: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    confirmSafeReset: false,
    rawDownloaded: false,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error.message || 'خطای غیرمنتظره در نمایش برنامه',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('KaloriShomar ErrorBoundary caught an error:', error, info)
  }

  private handleDownloadRawStorage = (): boolean => {
    try {
      const payload = dumpRawKaloriShomarStorage()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kalorishomar-safe-mode-raw-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      this.setState({ rawDownloaded: true })
      return true
    } catch {
      return false
    }
  }

  private handleSafeModeReset = async () => {
    // Always download raw data first so nothing is lost before clearing
    this.handleDownloadRawStorage()
    clearAllKaloriShomarStorage()
    await idbClearAll()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        dir="rtl"
        data-testid="error-boundary-safe-mode"
        className="min-h-dvh bg-[#0C0C0D] text-[#FAFAFA] flex items-center justify-center p-4"
      >
        <div className="card-surface rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/12 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100">مشکلی در اجرای برنامه پیش آمد</h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              داده‌های شما روی همین دستگاه باقی مانده است. ابتدا خروجی خام حافظه را دانلود کنید و
              سپس بارگذاری مجدد یا بازنشانی حالت ایمن را انجام دهید.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs py-2.5 px-4 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>بارگذاری مجدد</span>
            </button>
            <button
              type="button"
              id="safe-mode-download-raw-btn"
              onClick={this.handleDownloadRawStorage}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E35] text-zinc-200 font-semibold text-xs py-2.5 px-4 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>{this.state.rawDownloaded ? 'خروجی خام دانلود شد' : 'دانلود دادهٔ خام'}</span>
            </button>
          </div>

          {/* Safe Mode Recovery Section */}
          <div className="pt-3 border-t border-[#24242A] text-right space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>حالت ایمن (در صورت تکرار خطا پس از بارگذاری مجدد)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              با انتخاب بازنشانی حالت ایمن، ابتدا یک نسخهٔ کامل از تمام داده‌های خام در دستگاه شما
              دانلود می‌شود و سپس حافظهٔ معیوب پاک‌سازی خواهد شد.
            </p>

            {!this.state.confirmSafeReset ? (
              <button
                type="button"
                id="safe-mode-reset-trigger-btn"
                onClick={() => this.setState({ confirmSafeReset: true })}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 font-semibold text-xs py-2 px-3 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>دانلود دادهٔ خام و بازنشانی حالت ایمن</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="safe-mode-reset-confirm-btn"
                  onClick={() => void this.handleSafeModeReset()}
                  className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs py-2 px-3 transition-colors"
                >
                  تأیید دانلود خام و ریست کامل
                </button>
                <button
                  type="button"
                  onClick={() => this.setState({ confirmSafeReset: false })}
                  className="rounded-xl bg-[#25252B] text-zinc-300 text-xs py-2 px-3"
                >
                  انصراف
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { inventoryService } from '@/services/inventory.service'
import { getErrorMessage } from '@/utils/error'
import {
  ErrorState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'
import type { ResolveItemResult } from '@/services/inventory.service'

export function InventoryScanPage() {
  const navigate = useNavigate()
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResolveItemResult | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processedRef = useRef(false)

  const lookup = async (raw: string) => {
    const code = raw.trim().toUpperCase()
    if (!code) return
    setBusy(true)
    setError(null)
    try {
      const { data } = await inventoryService.resolve(code)
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(getErrorMessage(err, 'Item not found'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner) {
        scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            scannerRef.current = null
          })
      }
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    processedRef.current = false
    try {
      const scanner = new Html5Qrcode('eml-qr-reader')
      scannerRef.current = scanner
      setScanning(true)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (processedRef.current) return
          processedRef.current = true
          void lookup(decoded)
          void stopCamera()
        },
        () => undefined,
      )
    } catch {
      setScanning(false)
      setError(
        'Camera unavailable. Allow camera permission or enter the item code manually.',
      )
    }
  }

  const stopCamera = async () => {
    const scanner = scannerRef.current
    if (!scanner) {
      setScanning(false)
      return
    }
    try {
      await scanner.stop()
    } catch {
      /* ignore */
    }
    scannerRef.current = null
    setScanning(false)
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          <Link to="/inventory" className="text-teal-700 hover:underline">
            Inventory
          </Link>{' '}
          / Scan
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Scan or enter code</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use the camera for QR/barcodes, or type the item code.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Camera scan</h2>
          <div
            id="eml-qr-reader"
            className="overflow-hidden rounded-lg bg-slate-100 min-h-48"
          />
          <div className="flex gap-2">
            {!scanning ? (
              <button type="button" className={primaryButtonClassName()} onClick={() => void startCamera()}>
                Start camera
              </button>
            ) : (
              <button type="button" className={secondaryButtonClassName()} onClick={() => void stopCamera()}>
                Stop camera
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Manual entry</h2>
          <label className="block">
            <span className={labelClassName()}>Item code</span>
            <input
              className={fieldClassName() + ' font-mono uppercase'}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. SAR-001"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void lookup(manualCode)
                }
              }}
            />
          </label>
          <button
            type="button"
            className={primaryButtonClassName()}
            disabled={busy || !manualCode.trim()}
            onClick={() => void lookup(manualCode)}
          >
            {busy ? 'Looking up…' : 'Look up'}
          </button>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {result ? (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-semibold text-teal-900">
                {result.item.itemCode}
              </p>
              <h3 className="text-lg font-medium text-slate-900">{result.item.name}</h3>
              <p className="text-sm text-slate-600">
                Status: {result.item.status.replaceAll('_', ' ')} · ₹{result.item.rentalPrice}
              </p>
            </div>
            <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-700 border border-slate-200">
              Suggested: {result.suggestedAction}
            </span>
          </div>
          {result.activeRental ? (
            <p className="text-sm text-slate-700">
              Active rental{' '}
              <Link
                to={`/rentals/${result.activeRental.id}`}
                className="text-teal-700 hover:underline"
              >
                {result.activeRental.rentalNumber}
              </Link>{' '}
              ({result.activeRental.status}) — {result.activeRental.customer?.name}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClassName()}
              onClick={() => navigate(`/inventory/${result.item.id}`)}
            >
              Open item
            </button>
            {result.suggestedAction === 'RENT' ? (
              <Link
                to={`/rentals/new?itemId=${result.item.id}`}
                className={secondaryButtonClassName() + ' inline-flex no-underline'}
              >
                Start rental
              </Link>
            ) : null}
            {result.activeRental && result.suggestedAction === 'RETURN' ? (
              <Link
                to={`/returns/new?rentalId=${result.activeRental.id}`}
                className={secondaryButtonClassName() + ' inline-flex no-underline'}
              >
                Process return
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type QrCodeImageProps = {
  value: string
  size?: number
  className?: string
  alt?: string
}

export function QrCodeImage({
  value,
  size = 160,
  className,
  alt = 'QR code',
}: QrCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={alt}
      className={className}
    />
  )
}

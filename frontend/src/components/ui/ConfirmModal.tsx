import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const variantColors = {
    danger: { bg: 'var(--danger)', hover: '#d85a30' },
    warning: { bg: 'var(--warning)', hover: '#ef9f27' },
    info: { bg: 'var(--info)', hover: '#3b8bd4' },
  }

  const color = variantColors[variant]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 24,
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {variant === 'danger' && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} color="var(--danger)" />
              </div>
            )}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="btn btn-ghost"
            style={{ padding: '10px 20px', fontSize: 14 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn"
            style={{
              padding: '10px 20px',
              fontSize: 14,
              background: color.bg,
              color: '#fff',
              border: 'none',
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = color.hover }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = color.bg }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

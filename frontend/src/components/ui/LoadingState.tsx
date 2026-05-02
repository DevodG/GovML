import { Loader2 } from 'lucide-react'

export type LoadingType = 'card' | 'table' | 'list' | 'text'

interface LoadingStateProps {
  type: LoadingType
  count?: number
  message?: string
}

export function LoadingState({ type = 'card', count = 3, message }: LoadingStateProps) {
  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 36, width: '100%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {[...Array(4)].map((_, i) => (
                <th key={i}>
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(count)].map((_, i) => (
              <tr key={i}>
                {[...Array(4)].map((_, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: 16, width: '70%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--gov)' }} />
        {message && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>}
      </div>
    )
  }

  return null
}

import { useState } from 'react'
import { Search, X, Filter, ChevronDown } from 'lucide-react'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'date-range'
  options?: FilterOption[]
  placeholder?: string
}

interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  onClear?: () => void
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const handleFilterChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value })
  }

  const handleClear = () => {
    const clearedValues: Record<string, any> = {}
    filters.forEach((filter) => {
      clearedValues[filter.key] = ''
    })
    onChange(clearedValues)
    onClear?.()
  }

  const hasActiveFilters = Object.values(values).some((v) => v !== '' && v !== undefined && v !== null)

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search..."
            value={values.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: 14,
            }}
          />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost"
          style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Filter size={14} />
          Filters
          <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="btn btn-ghost"
            style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {filters.map((filter) => (
            <div key={filter.key}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                {filter.label}
              </label>
              {filter.type === 'text' && (
                <input
                  type="text"
                  placeholder={filter.placeholder}
                  value={values[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="input"
                  style={{ fontSize: 13 }}
                />
              )}
              {filter.type === 'select' && (
                <select
                  value={values[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="input"
                  style={{ fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">All</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {filter.type === 'date' && (
                <input
                  type="date"
                  value={values[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="input"
                  style={{ fontSize: 13 }}
                />
              )}
              {filter.type === 'date-range' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="date"
                    placeholder="From"
                    value={values[`${filter.key}_from`] || ''}
                    onChange={(e) => handleFilterChange(`${filter.key}_from`, e.target.value)}
                    className="input"
                    style={{ fontSize: 13, flex: 1 }}
                  />
                  <input
                    type="date"
                    placeholder="To"
                    value={values[`${filter.key}_to`] || ''}
                    onChange={(e) => handleFilterChange(`${filter.key}_to`, e.target.value)}
                    className="input"
                    style={{ fontSize: 13, flex: 1 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

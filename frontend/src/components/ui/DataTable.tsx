import { useState } from 'react'
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

export interface Action<T> {
  label: string
  onClick: (row: T) => void
  variant?: 'primary' | 'ghost' | 'danger'
  icon?: React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  actions?: (row: T) => Action<T>[]
  emptyMessage?: string
  rowKey?: keyof T | ((row: T) => string)
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  actions,
  emptyMessage = 'No data available',
  rowKey = 'id',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return

    const key = String(column.key)

    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }

  const getSortedData = () => {
    if (!sortColumn) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      if (aVal === bVal) return 0

      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row)
    }
    return String(row[rowKey] || Math.random())
  }

  const sortedData = getSortedData()

  if (loading) {
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              {actions && <th style={{ width: '60px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((_col, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: 20, width: '80%' }} />
                  </td>
                ))}
                {actions && <td></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (sortedData.length === 0) {
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              {actions && <th style={{ width: '60px' }}></th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{emptyMessage}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  width: col.width,
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: col.sortable ? 'none' : 'auto',
                }}
                onClick={() => col.sortable && handleSort(col)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {col.label}
                  {col.sortable && sortColumn === String(col.key) && (
                    sortDirection === 'asc' ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )
                  )}
                </div>
              </th>
            ))}
            {actions && <th style={{ width: '60px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {col.render ? col.render(row[col.key as keyof T], row) : String(row[col.key as keyof T] || '-')}
                </td>
              ))}
              {actions && (
                <td>
                  <div style={{ position: 'relative' }}>
                    <button
                      style={{
                        padding: 4,
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Previous
            </button>
            {[...Array(Math.ceil(pagination.total / pagination.pageSize))].map((_, i) => {
              const pageNum = i + 1
              const isCurrent = pageNum === pagination.page
              const isNearCurrent = Math.abs(pageNum - pagination.page) <= 1

              if (!isNearCurrent && pageNum !== 1 && pageNum !== Math.ceil(pagination.total / pagination.pageSize)) {
                return null
              }

              if (!isNearCurrent && pageNum === 1 && pagination.page > 3) {
                return (
                  <span key={pageNum} style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>
                    ...
                  </span>
                )
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: isCurrent ? 'var(--gov)' : 'transparent',
                    color: isCurrent ? '#fff' : 'var(--text-secondary)',
                    border: isCurrent ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

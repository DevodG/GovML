import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TransactionResult, TransactionStatus } from '../lib/contracts'

export interface Transaction {
  id: string
  hash: string
  description: string
  status: TransactionStatus
  timestamp: number
  blockNumber?: number
  error?: string
}

interface TransactionState {
  transactions: Transaction[]
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void
  getTransaction: (hash: string) => Transaction | undefined
  clearHistory: () => void
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (tx) => {
        const newTx: Transaction = {
          ...tx,
          id: `${tx.hash}-${Date.now()}`,
          timestamp: Date.now(),
        }

        set((state) => ({
          transactions: [newTx, ...state.transactions].slice(0, 50), // Keep last 50
        }))

        return newTx
      },

      updateTransaction: (hash, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.hash === hash ? { ...tx, ...updates } : tx
          ),
        }))
      },

      getTransaction: (hash) => {
        return get().transactions.find((tx) => tx.hash === hash)
      },

      clearHistory: () => {
        set({ transactions: [] })
      },
    }),
    {
      name: 'govchain-transactions',
    }
  )
)

// Helper to track transaction with toast notifications
export function trackTransaction(
  description: string,
  txPromise: Promise<TransactionResult>
): Promise<TransactionResult> {
  const { addTransaction } = useTransactionStore.getState()

  // Show initial loading toast (contracts.ts handles visible toasts)
  // Note: We'll let the contracts.ts handle the actual toast notifications
  // This is just for tracking in the store

  return txPromise.then((result) => {
    if (result.hash) {
      addTransaction({
        hash: result.hash,
        description,
        status: result.status,
        blockNumber: result.blockNumber,
        error: result.error,
      })
    }
    return result
  })
}

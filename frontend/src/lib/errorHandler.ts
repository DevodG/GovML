import { toast } from 'sonner'

/**
 * Determines if an error should show a user-facing toast notification
 * Returns true only for actual errors (network, server, auth)
 * Returns false for expected states (empty data, 404 for optional resources)
 */
export function shouldShowErrorToast(error: any): boolean {
  if (!error) return false

  const message = error.message?.toLowerCase() || ''

  // Don't show toast for these cases:
  // - Empty results (not an error)
  // - 404 on optional resources
  // - Cancelled requests
  if (
    message.includes('no data') ||
    message.includes('not found') ||
    message.includes('cancelled') ||
    message.includes('aborted')
  ) {
    return false
  }

  // Show toast for actual errors:
  // - Network errors
  // - Server errors (5xx)
  // - Auth errors (401, 403)
  // - Validation errors (400)
  return true
}

/**
 * Handles API errors with smart toast notifications
 * Only shows toasts for actual errors, not empty data
 */
export function handleApiError(error: any, context?: string) {
  // Always log to console for debugging
  console.error(context ? `${context}:` : 'API Error:', error)

  // Only show toast for actual errors
  if (shouldShowErrorToast(error)) {
    const message = error.message || 'An unexpected error occurred'
    
    // Customize message based on error type
    if (message.includes('network') || message.includes('fetch')) {
      toast.error('Unable to connect to server. Please check your connection.')
    } else if (message.includes('401') || message.includes('authentication')) {
      toast.error('Please sign in to continue.')
    } else if (message.includes('403') || message.includes('permission')) {
      toast.error('You don\'t have permission to perform this action.')
    } else if (message.includes('500') || message.includes('server')) {
      toast.error('Server error. Please try again later.')
    } else {
      // Generic error message
      toast.error(message)
    }
  }
}

/**
 * Wraps an async function with error handling
 * Usage: await withErrorHandling(() => api.getData(), 'Loading data')
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    handleApiError(error, context)
    return null
  }
}

/**
 * Creates a safe API call wrapper for React components
 * Handles loading state and errors automatically
 */
export function createSafeApiCall<T>(
  apiCall: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
    context?: string
    showToast?: boolean
  } = {}
) {
  return async () => {
    try {
      const data = await apiCall()
      options.onSuccess?.(data)
      return data
    } catch (error) {
      options.onError?.(error)
      
      if (options.showToast !== false) {
        handleApiError(error, options.context)
      }
      
      return null
    }
  }
}

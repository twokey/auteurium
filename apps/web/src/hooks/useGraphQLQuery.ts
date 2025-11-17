import { useCallback, useEffect, useMemo, useState } from 'react'

import { getClient } from '../services/graphql'

const getOperationName = (graphQLDocument: string): string => {
  const match = /\b(query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(graphQLDocument)
  return match?.[2] ?? 'anonymous'
}

interface UseGraphQLQueryOptions<TVariables = Record<string, unknown>> {
  variables?: TVariables
  skip?: boolean
  pollInterval?: number
}

interface UseGraphQLQueryResult<TData> {
  data: TData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useGraphQLQuery = <TData = unknown, TVariables = Record<string, unknown>>(
  query: string,
  options: UseGraphQLQueryOptions<TVariables> = {}
): UseGraphQLQueryResult<TData> => {
  const { variables, skip = false, pollInterval } = options
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const operationName = useMemo(() => getOperationName(query), [query])

  const extractErrorMessage = useCallback((unknownError: unknown): string => {
    if (unknownError instanceof Error && unknownError.message) {
      return unknownError.message
    }

    if (unknownError && typeof unknownError === 'object') {
      const errorObject = unknownError as {
        message?: unknown
        code?: unknown
        errors?: { message?: unknown }[]
        recoverySuggestion?: unknown
      }

      if (Array.isArray(errorObject.errors) && errorObject.errors.length > 0) {
        const messages = errorObject.errors
          .map((err) => {
            if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
              return err.message
            }
            return null
          })
          .filter((msg): msg is string => Boolean(msg))

        if (messages.length > 0) {
          return messages.join(', ')
        }
      }

      if (typeof errorObject.message === 'string' && errorObject.message.trim() !== '') {
        return errorObject.code && typeof errorObject.code === 'string'
          ? `[${errorObject.code}] ${errorObject.message}`
          : errorObject.message
      }

      if (typeof errorObject.recoverySuggestion === 'string' && errorObject.recoverySuggestion.trim() !== '') {
        return errorObject.recoverySuggestion
      }
    }

    return 'An unknown error occurred'
  }, [])

  // Stabilize variables to prevent unnecessary re-renders
  const stableVariables = useMemo(
    () => JSON.stringify(variables),
    [variables]
  )

  const fetchData = useCallback(async () => {
    if (skip) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestVariables = stableVariables ? JSON.parse(stableVariables) as Record<string, unknown> : undefined
      const startedAt = performance.now()

      console.info('[GraphQL Query] request', {
        operation: operationName,
        variables: requestVariables
      })

      const result = await getClient().graphql({
        query,
        variables: requestVariables
      })

      // Check if result has errors property (GraphQLResult vs GraphqlSubscriptionResult)
      if ('errors' in result && result.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((err: { message: string }) => err.message).join(', ')
        throw new Error(errorMessage)
      }

      // Extract data safely
      const responseData = 'data' in result ? result.data : null
      setData(responseData as TData)

      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100
      console.info('[GraphQL Query] success', {
        operation: operationName,
        durationMs,
        hasData: Boolean(responseData)
      })
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      setError(new Error(errorMessage))
      console.error('[GraphQL Query] error', {
        operation: operationName,
        message: errorMessage,
        originalError: err
      })
    } finally {
      setLoading(false)
    }
  }, [extractErrorMessage, operationName, query, stableVariables, skip])

  useEffect(() => {
    void fetchData()

    if (pollInterval && pollInterval > 0 && !skip) {
      const interval = setInterval(() => {
        void fetchData()
      }, pollInterval)

      return () => {
        clearInterval(interval)
      }
    }
  }, [fetchData, pollInterval, skip])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

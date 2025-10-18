import { useCallback, useEffect, useMemo, useState } from 'react'

import { client } from '../services/graphql'

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
      const result = await client.graphql({
        query,
        variables: (stableVariables ? JSON.parse(stableVariables) : undefined) as Record<string, unknown>
      })

      // Check if result has errors property (GraphQLResult vs GraphqlSubscriptionResult)
      if ('errors' in result && result.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((err: { message: string }) => err.message).join(', ')
        throw new Error(errorMessage)
      }

      // Extract data safely
      const responseData = 'data' in result ? result.data : null
      setData(responseData as TData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(new Error(errorMessage))
      console.error('GraphQL Query Error:', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [query, stableVariables, skip])

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

/**
 * Enhanced GraphQL Query hook with caching
 * Implements stale-while-revalidate pattern for better performance
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getClient } from '../../services/graphql'
import { GRAPHQL } from '../constants'

const getOperationName = (graphQLDocument: string): string => {
  const match = /\b(query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(graphQLDocument)
  return match?.[2] ?? 'anonymous'
}

interface CacheEntry<TData> {
  data: TData
  timestamp: number
}

// In-memory cache
const queryCache = new Map<string, CacheEntry<unknown>>()

interface UseGraphQLQueryWithCacheOptions<TVariables = Record<string, unknown>> {
  variables?: TVariables
  skip?: boolean
  pollInterval?: number
  cacheTime?: number // How long to keep data in cache (default: 1 minute)
  staleTime?: number // How long to consider data fresh (default: 30 seconds)
}

interface UseGraphQLQueryWithCacheResult<TData> {
  data: TData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isFetching: boolean
  isStale: boolean
}

function getCacheKey(query: string, variables?: Record<string, unknown>): string {
  return `${query}-${JSON.stringify(variables || {})}`
}

export const useGraphQLQueryWithCache = <TData = unknown, TVariables = Record<string, unknown>>(
  query: string,
  options: UseGraphQLQueryWithCacheOptions<TVariables> = {}
): UseGraphQLQueryWithCacheResult<TData> => {
  const { 
    variables, 
    skip = false, 
    pollInterval,
    cacheTime = GRAPHQL.CACHE_TTL,
    staleTime = GRAPHQL.CACHE_TTL / 2
  } = options
  
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState<boolean>(!skip)
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState<boolean>(false)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const operationName = useMemo(() => getOperationName(query), [query])

  // Stabilize variables to prevent unnecessary re-renders
  const stableVariables = useMemo(
    () => JSON.stringify(variables),
    [variables]
  )

  const cacheKey = useMemo(
    () => getCacheKey(query, stableVariables ? JSON.parse(stableVariables) : undefined),
    [query, stableVariables]
  )

  // Check if cached data is fresh
  const isCacheFresh = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < staleTime
  }, [staleTime])

  // Check if cache is still valid
  const isCacheValid = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < cacheTime
  }, [cacheTime])

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

  const fetchData = useCallback(async (useCache = true) => {
    if (skip) {
      return
    }

    // Check cache first
    if (useCache) {
      const cached = queryCache.get(cacheKey) as CacheEntry<TData> | undefined
      if (cached && isCacheValid(cached.timestamp)) {
        setData(cached.data)
        setLoading(false)
        setIsStale(!isCacheFresh(cached.timestamp))
        
        // If stale, fetch in background
        if (!isCacheFresh(cached.timestamp)) {
          setIsFetching(true)
        } else {
          return // Fresh cache, no need to fetch
        }
      }
    }

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    if (!data) {
      setLoading(true)
    }
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

      // Check if result has errors property
      if ('errors' in result && result.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((err: { message: string }) => err.message).join(', ')
        throw new Error(errorMessage)
      }

      // Extract data safely
      const responseData = 'data' in result ? result.data : null
      const typedData = responseData as TData

      // Update cache
      queryCache.set(cacheKey, {
        data: typedData,
        timestamp: Date.now()
      })

      setData(typedData)
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100
      console.info('[GraphQL Query] success', {
        operation: operationName,
        durationMs,
        cacheKey
      })
      setIsStale(false)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Request was aborted, don't update state
      }
      
      const errorMessage = extractErrorMessage(err)
      setError(new Error(errorMessage))
      console.error('[GraphQL Query] error', {
        operation: operationName,
        message: errorMessage,
        originalError: err
      })
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [cacheKey, data, extractErrorMessage, isCacheFresh, isCacheValid, operationName, query, skip, stableVariables])

  useEffect(() => {
    void fetchData()

    if (pollInterval && pollInterval > 0 && !skip) {
      const interval = setInterval(() => {
        void fetchData(false) // Don't use cache for polling
      }, pollInterval)

      return () => {
        clearInterval(interval)
      }
    }
  }, [fetchData, pollInterval, skip])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchData(false) // Force fresh fetch
  }, [fetchData])

  return { data, loading, error, refetch, isFetching, isStale }
}

// Utility to clear cache
export const clearQueryCache = (query?: string, variables?: Record<string, unknown>) => {
  if (query) {
    const key = getCacheKey(query, variables)
    queryCache.delete(key)
  } else {
    queryCache.clear()
  }
}

// Utility to invalidate cache entries matching a pattern
export const invalidateQueries = (pattern: string) => {
  const keysToDelete: string[] = []
  queryCache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => queryCache.delete(key))
}


import { useCallback, useState } from 'react'

import { getClient } from '../services/graphql'

const getOperationName = (graphQLDocument: string): string => {
  const match = /\b(mutation|query|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(graphQLDocument)
  return match?.[2] ?? 'anonymous'
}

interface UseGraphQLMutationOptions {
  onCompleted?: (data: unknown) => void
  onError?: (error: Error) => void
}

interface UseGraphQLMutationResult<TData, TVariables> {
  mutate: (options: { variables: TVariables }) => Promise<TData | null>
  data: TData | null
  loading: boolean
  error: Error | null
  reset: () => void
}

export const useGraphQLMutation = <TData = unknown, TVariables = Record<string, unknown>>(
  mutation: string,
  options: UseGraphQLMutationOptions = {}
): UseGraphQLMutationResult<TData, TVariables> => {
  const { onCompleted, onError } = options
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const operationName = getOperationName(mutation)

  const mutate = useCallback(
    async (mutationOptions: { variables: TVariables }): Promise<TData | null> => {
      setLoading(true)
      setError(null)

      try {
        const startedAt = performance.now()

        console.info('[GraphQL Mutation] request', {
          operation: operationName,
          variables: mutationOptions.variables
        })

        const result = await getClient().graphql({
          query: mutation,
          variables: mutationOptions.variables as Record<string, unknown>
        })

        // Check if result has errors property (GraphQLResult vs GraphqlSubscriptionResult)
        if ('errors' in result && result.errors && result.errors.length > 0) {
          const errorMessage = result.errors.map((err: { message: string }) => err.message).join(', ')
          throw new Error(errorMessage)
        }

        // Extract data safely
        const mutationData = ('data' in result ? result.data : null) as TData
        setData(mutationData)

        if (onCompleted) {
          onCompleted(mutationData)
        }

        const durationMs = Math.round((performance.now() - startedAt) * 100) / 100
        console.info('[GraphQL Mutation] success', {
          operation: operationName,
          durationMs
        })

        return mutationData
      } catch (err) {
        // Extract error message from various error formats
        let errorMessage = 'An unknown error occurred'

        if (err instanceof Error) {
          errorMessage = err.message
        } else if (err && typeof err === 'object') {
          // Check for GraphQL errors property
          if ('errors' in err && Array.isArray((err as any).errors)) {
            const errors = (err as any).errors
            // Check if any error has validation details
            const validationDetails = errors
              .filter((e: any) => e.extensions?.details)
              .flatMap((e: any) => e.extensions.details)

            if (validationDetails.length > 0) {
              // Format validation errors nicely
              errorMessage = validationDetails
                .map((detail: any) => `${detail.field}: ${detail.message}`)
                .join(', ')
            } else {
              errorMessage = errors.map((e: any) => e.message || String(e)).join(', ')
            }
          } else if ('message' in err) {
            errorMessage = String((err as any).message)
          } else {
            errorMessage = JSON.stringify(err)
          }
        } else if (err) {
          errorMessage = String(err)
        }

        const errorObj = new Error(errorMessage)
        setError(errorObj)
        console.error('[GraphQL Mutation] error', {
          operation: operationName,
          message: errorMessage,
          originalError: err,
          errorType: err?.constructor?.name || typeof err,
          fullError: JSON.stringify(err, null, 2)
        })

        if (onError) {
          onError(errorObj)
        }

        return null
      } finally {
        setLoading(false)
      }
    },
    [mutation, onCompleted, onError, operationName]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { mutate, data, loading, error, reset }
}

import { useCallback, useState } from 'react'

import { getClient } from '../services/graphql'
import { isGraphQLError } from '../types/graphql'

import type { GraphQLError, ValidationDetail } from '../types/graphql'

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

  const stringifyAwsJsonFields = useCallback((value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(stringifyAwsJsonFields)
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, val]) => {
        if (key === 'content' && val && typeof val === 'object' && !Array.isArray(val)) {
          acc[key] = JSON.stringify(val)
          return acc
        }

        acc[key] = stringifyAwsJsonFields(val)
        return acc
      }, {})
    }

    return value
  }, [])

  const mutate = useCallback(
    async (mutationOptions: { variables: TVariables }): Promise<TData | null> => {
      setLoading(true)
      setError(null)

      try {
        // const startedAt = performance.now()

        // console.info('[GraphQL Mutation] request', {
        //   operation: operationName,
        //   variables: mutationOptions.variables
        // })

        // Define minimal client interface to avoid unsafe call on any
        const client = getClient() as {
          graphql: (options: { query: string; variables?: Record<string, unknown> }) => Promise<unknown>
        }

        const variablesWithAwsJson = stringifyAwsJsonFields(mutationOptions.variables) as Record<string, unknown>

        const result = (await client.graphql({
          query: mutation,
          variables: variablesWithAwsJson
        })) as { data?: TData; errors?: GraphQLError[] }

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

        // const durationMs = Math.round((performance.now() - startedAt) * 100) / 100
        // console.info('[GraphQL Mutation] success', {
        //   operation: operationName,
        //   durationMs
        // })

        return mutationData
      } catch (err: unknown) {
        // Extract error message from various error formats
        let errorMessage = 'An unknown error occurred'

        if (err instanceof Error) {
          errorMessage = err.message
        } else if (isGraphQLError(err)) {
          // Use type guard for GraphQL errors
          const errors: GraphQLError[] = err.errors

          // Check if any error has validation details
          const validationDetails: ValidationDetail[] = errors
            .filter((e) => e.extensions?.details)
            .flatMap((e) => e.extensions?.details ?? [])

          if (validationDetails.length > 0) {
            // Format validation errors nicely
            errorMessage = validationDetails
              .map((detail) => `${detail.field}: ${detail.message}`)
              .join(', ')
          } else {
            errorMessage = errors.map((e) => e.message || JSON.stringify(e)).join(', ')
          }
        } else if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = String(err.message)
        } else if (err && typeof err === 'object') {
          errorMessage = JSON.stringify(err)
        } else if (err) {
          errorMessage = JSON.stringify(err)
        }

        const errorObj = new Error(errorMessage)
        setError(errorObj)
        console.error('[GraphQL Mutation] error', {
          operation: operationName,
          message: errorMessage,
          originalError: err,
          errorType:
            err && typeof err === 'object' && 'constructor' in err && err.constructor
              ? err.constructor.name
              : typeof err,
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
    [mutation, onCompleted, onError, operationName, stringifyAwsJsonFields]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { mutate, data, loading, error, reset }
}

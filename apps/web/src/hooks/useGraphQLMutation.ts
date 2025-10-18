import { useCallback, useState } from 'react'

import { client } from '../services/graphql'

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

  const mutate = useCallback(
    async (mutationOptions: { variables: TVariables }): Promise<TData | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await client.graphql({
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

        return mutationData
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('An unknown error occurred')
        setError(errorObj)
        console.error('GraphQL Mutation Error:', errorObj.message)

        if (onError) {
          onError(errorObj)
        }

        return null
      } finally {
        setLoading(false)
      }
    },
    [mutation, onCompleted, onError]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { mutate, data, loading, error, reset }
}

/**
 * Cache Invalidation Helper Utilities
 * Provides standardized patterns for mutations with consistent cache behavior
 *
 * CONVENTION:
 * - Use mutateWithInvalidate() for mutations that change LIST SHAPE
 *   Examples: create snippet, delete snippet, create/delete connection
 *
 * - Use mutateOptimisticOnly() for mutations that change EXISTING FIELDS
 *   Examples: update snippet content/title, update position
 */

import { invalidateQueries } from '../hooks/useGraphQLQueryWithCache'

/**
 * Mutation wrapper that automatically invalidates specified query patterns
 * Use this for operations that change the list structure (add/remove items)
 *
 * @param mutationFn - The async mutation function to execute
 * @param queryPatterns - Array of query pattern strings to invalidate (e.g., ['ProjectWithSnippets', 'ProjectConnections'])
 * @returns Promise with the mutation result
 *
 * @example
 * // Create a new snippet - need to refetch entire list
 * await mutateWithInvalidate(
 *   () => createSnippetMutation({ variables: {...} }),
 *   ['ProjectWithSnippets']
 * )
 *
 * @example
 * // Create connection - need to refetch connections list
 * await mutateWithInvalidate(
 *   () => createConnectionMutation({ variables: {...} }),
 *   ['ProjectConnections']
 * )
 */
export async function mutateWithInvalidate<T>(
  mutationFn: () => Promise<T>,
  queryPatterns: string[]
): Promise<T> {
  try {
    const result = await mutationFn()
    // Invalidate specified queries after successful mutation
    queryPatterns.forEach((pattern) => {
      invalidateQueries(pattern)
    })
    return result
  } catch (error) {
    // On failure, don't invalidate - let optimistic update rollback handle it
    throw error
  }
}

/**
 * Optimistic-only mutation wrapper (no cache invalidation)
 * Use this for operations that only change existing fields via optimistic updates
 * The optimistic update in the UI layer already shows the changes
 *
 * @param mutationFn - The async mutation function to execute
 * @returns Promise with the mutation result
 *
 * @example
 * // Update snippet content - optimistic update already shows changes
 * await mutateOptimisticOnly(
 *   () => updateSnippetMutation({
 *     variables: {
 *       projectId,
 *       id,
 *       input: { content: { mainText: { value: newValue } } }
 *     }
 *   })
 * )
 *
 * @example
 * // Update position - React Flow state already shows new position
 * await mutateOptimisticOnly(
 *   () => updateSnippetMutation({
 *     variables: { projectId, id, input: { position: { x, y } } }
 *   })
 * )
 */
export async function mutateOptimisticOnly<T>(mutationFn: () => Promise<T>): Promise<T> {
  // No cache invalidation - optimistic update already visible
  // If mutation fails, optimistic update will rollback in the calling code
  return mutationFn()
}

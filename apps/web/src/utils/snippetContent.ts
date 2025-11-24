import type { Snippet, SnippetField } from '../types'

export interface RenderableField {
  key: string
  label: string
  value: string
  type?: string
  isSystem: boolean
  order?: number
}

/**
 * Sort content fields into a deterministic, render-friendly order:
 * 1. system fields first
 * 2. ascending order value when provided
 * 3. alphabetical key fallback
 */
export const getRenderableFields = (snippet: Pick<Snippet, 'content'>): RenderableField[] => {
  return Object.entries(snippet.content ?? {})
    .map(([key, field]) => ({
      key,
      label: field.label ?? key,
      value: field.value,
      type: field.type,
      isSystem: Boolean(field.isSystem),
      order: field.order
    }))
    .sort((a, b) => {
      if (a.isSystem !== b.isSystem) {
        return a.isSystem ? -1 : 1
      }

      const orderA = a.order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) {
        return orderA - orderB
      }

      return a.key.localeCompare(b.key)
    })
}

/**
 * Return the primary text content for a snippet, using the ordered renderable
 * fields to select the first available value.
 */
export const getPrimaryFieldValue = (snippet: Pick<Snippet, 'content'>): { key: string; field: SnippetField } | null => {
  const ordered = getRenderableFields(snippet)
  if (ordered.length === 0) {
    return null
  }

  const first = ordered[0]
  return {
    key: first.key,
    field: snippet.content[first.key]
  }
}

export const getPrimaryTextValue = (snippet: Pick<Snippet, 'content'>): string => {
  const primary = getPrimaryFieldValue(snippet)
  return primary?.field?.value ?? ''
}

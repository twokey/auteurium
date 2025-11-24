import type { SnippetField } from '../types'

export const IMAGE_SNIPPET_FIELD_CONFIG = [
  { key: 'subject', label: 'Subject', order: 1 },
  { key: 'background', label: 'Background', order: 2 },
  { key: 'style', label: 'Style', order: 3 },
  { key: 'composition', label: 'Composition', order: 4 },
  { key: 'cameraPosition', label: 'Camera Position', order: 5 },
  { key: 'focusLens', label: 'Focus & Lens', order: 6 },
  { key: 'lighting', label: 'Lighting', order: 7 },
  { key: 'filmType', label: 'Film Type', order: 8 }
] as const

export type ImageSnippetFieldKey = typeof IMAGE_SNIPPET_FIELD_CONFIG[number]['key']

type ImageValues = Partial<Record<ImageSnippetFieldKey, string>> & { mainText?: string }

const normalizeField = (
  label: string,
  order: number,
  existing?: SnippetField,
  value?: string
): SnippetField => ({
  label: existing?.label ?? label,
  value: value ?? existing?.value ?? '',
  type: existing?.type ?? 'longText',
  isSystem: existing?.isSystem ?? true,
  order: existing?.order ?? order
})

const normalizeMainText = (existing?: SnippetField, value?: string): SnippetField => ({
  label: existing?.label ?? 'mainText',
  value: value ?? existing?.value ?? '',
  type: existing?.type ?? 'longText',
  isSystem: existing?.isSystem ?? true,
  order: existing?.order ?? 0
})

export const buildDefaultImageContent = (
  values: ImageValues = {},
  options?: { existing?: Record<string, SnippetField>; prompt?: string }
): Record<string, SnippetField> => {
  const existing = options?.existing ?? {}
  const content: Record<string, SnippetField> = { ...existing }

  if (options?.prompt) {
    content.prompt = {
      label: existing.prompt?.label ?? 'Prompt',
      value: options.prompt,
      type: existing.prompt?.type ?? 'longText',
      isSystem: existing.prompt?.isSystem ?? true,
      order: existing.prompt?.order ?? 0
    }
  }

  content.mainText = normalizeMainText(existing.mainText, values.mainText)

  IMAGE_SNIPPET_FIELD_CONFIG.forEach(({ key, label, order }) => {
    content[key] = normalizeField(label, order, existing[key], values[key])
  })

  return content
}

export const extractImageFormData = (
  content: Record<string, SnippetField>
): Record<ImageSnippetFieldKey, string> =>
  IMAGE_SNIPPET_FIELD_CONFIG.reduce((acc, { key }) => {
    acc[key] = content[key]?.value ?? ''
    return acc
  }, {} as Record<ImageSnippetFieldKey, string>)

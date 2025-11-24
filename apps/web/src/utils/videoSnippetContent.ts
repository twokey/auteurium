import type { SnippetField } from '../types'

export const VIDEO_SNIPPET_FIELD_CONFIG = [
  { key: 'subject', label: 'Subject', order: 1 },
  { key: 'action', label: 'Action', order: 2 },
  { key: 'cameraMotion', label: 'Camera & Motion', order: 3 },
  { key: 'composition', label: 'Composition', order: 4 },
  { key: 'focusLens', label: 'Focus & Lens', order: 5 },
  { key: 'style', label: 'Style', order: 6 },
  { key: 'ambiance', label: 'Ambiance', order: 7 },
  { key: 'dialogue', label: 'Dialogue', order: 8 },
  { key: 'soundEffects', label: 'Sound Effects', order: 9 },
  { key: 'ambientNoise', label: 'Ambient Noise', order: 10 }
] as const

export type VideoSnippetFieldKey = typeof VIDEO_SNIPPET_FIELD_CONFIG[number]['key']

type VideoValues = Partial<Record<VideoSnippetFieldKey, string>> & { mainText?: string }

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

export const buildDefaultVideoContent = (
  values: VideoValues = {},
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

  VIDEO_SNIPPET_FIELD_CONFIG.forEach(({ key, label, order }) => {
    content[key] = normalizeField(label, order, existing[key], values[key])
  })

  return content
}

export const extractVideoFormData = (
  content: Record<string, SnippetField>
): Record<VideoSnippetFieldKey, string> =>
  VIDEO_SNIPPET_FIELD_CONFIG.reduce((acc, { key }) => {
    acc[key] = content[key]?.value ?? ''
    return acc
  }, {} as Record<VideoSnippetFieldKey, string>)

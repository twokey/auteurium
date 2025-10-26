import { useEffect, useMemo, useRef, useState } from 'react'

import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore'
import { useToast } from '../../shared/store/toastStore'

const MODE_LABEL: Record<'text' | 'image' | 'video', string> = {
  text: 'Text generation',
  image: 'Image generation',
  video: 'Video generation'
}

export const PromptDesignerPanel = () => {
  const toast = useToast()
  const isOpen = usePromptDesignerStore((state) => state.isOpen)
  const isGenerating = usePromptDesignerStore((state) => state.isGenerating)
  const snippetId = usePromptDesignerStore((state) => state.snippetId)
  const snippetTitle = usePromptDesignerStore((state) => state.snippetTitle)
  const mode = usePromptDesignerStore((state) => state.mode)
  const prompt = usePromptDesignerStore((state) => state.prompt)
  const connectedContent = usePromptDesignerStore((state) => state.connectedContent)
  const onGenerate = usePromptDesignerStore((state) => state.onGenerate)
  const close = usePromptDesignerStore((state) => state.close)
  const setPrompt = usePromptDesignerStore((state) => state.setPrompt)
  const setGenerating = usePromptDesignerStore((state) => state.setGenerating)

  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isOpen && isEditing) {
      setIsEditing(false)
    }
  }, [isOpen, isEditing])

  useEffect(() => {
    if (!isOpen || !isEditing) {
      return
    }

    const target = textareaRef.current
    target?.focus()
    const length = target?.value.length ?? 0
    target?.setSelectionRange(length, length)
  }, [isOpen, isEditing])

  const headerSubtitle = useMemo(() => {
    if (!mode) {
      return null
    }

    return MODE_LABEL[mode]
  }, [mode])

  if (!isOpen) {
    return null
  }

  const handleGenerate = async () => {
    if (!onGenerate) {
      toast.info('This generation flow is not available yet.')
      return
    }

    setGenerating(true)
    try {
      // Compute final prompt from connected content + snippet text
      const lines = connectedContent
        .map((item) => {
          const value = item.value?.trim()
          if (!value) {
            return null
          }

          if (item.type === 'text') {
            return value
          }

          return `Image: ${value}`
        })
        .filter((line): line is string => Boolean(line))

      const connectedText = lines.join('\n')
      const currentText = prompt.trim()

      // Combine connected content with current snippet's text
      let finalPrompt = ''
      if (connectedText && currentText) {
        finalPrompt = `${connectedText}\n\n${currentText}`
      } else {
        finalPrompt = connectedText || currentText || ''
      }

      // Log the complete prompt being sent to generation
      // eslint-disable-next-line no-console
      console.log('=== PromptDesigner: Sending Prompt to LLM ===')
      // eslint-disable-next-line no-console
      console.log('Complete Prompt:', finalPrompt)
      // eslint-disable-next-line no-console
      console.log('Prompt Length:', finalPrompt.length, 'characters')

      await Promise.resolve(onGenerate(finalPrompt))
      close()
    } catch (error) {
      console.error('Prompt designer generation failed:', error)
      const isHandled =
        typeof error === 'object' &&
        error !== null &&
        'handled' in (error as Record<string, unknown>) &&
        Boolean((error as { handled?: boolean }).handled)
      if (!isHandled) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to generate content', message)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="w-[320px] rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="flex items-start justify-between border-b border-gray-200 px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">Prompt designer</h3>
          {headerSubtitle && (
            <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide mt-0.5">
              {headerSubtitle}
            </p>
          )}
          {(snippetTitle || snippetId) && (
            <p className="text-xs text-gray-500 mt-1 truncate" title={snippetTitle ?? snippetId ?? ''}>
              Source: {snippetTitle ?? 'Untitled'}{snippetId ? ` (${snippetId})` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close prompt designer"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="px-3 py-3">
        {connectedContent.length > 0 && (
          <div className="mb-3">
            <p className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Content
            </p>
            <div className="mt-1 space-y-2">
              {connectedContent.map((item, index) => (
                <div key={`connected-${item.snippetId}-${index}-${item.type}`}>
                  <p className="text-[10px] text-gray-500 font-medium mb-0.5">
                    From: {item.snippetId}{item.snippetTitle ? ` - ${item.snippetTitle}` : ''}
                  </p>
                  <div className="overflow-hidden rounded border border-gray-200 bg-gray-50">
                    {item.type === 'text' ? (
                      <p className="px-2 py-1 text-xs text-gray-700 whitespace-pre-wrap">
                        {item.value}
                      </p>
                    ) : (
                      <img
                        src={item.value}
                        alt={`Connected from snippet ${item.snippetId}`}
                        className="block w-full h-auto max-h-48 object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-3">
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">
            From: {snippetId}{snippetTitle ? ` - ${snippetTitle}` : ''}
          </p>

          {isEditing ? (
            <textarea
              id="prompt-input"
              ref={textareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setIsEditing(false)
                }
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  setIsEditing(false)
                }
              }}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
              rows={Math.max(4, Math.min(12, prompt.split('\n').length + 1))}
            />
          ) : (
            <button
              id="prompt-input"
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full cursor-text rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-left transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300"
            >
              {prompt.trim() !== '' ? (
                <span className="whitespace-pre-wrap break-words text-xs text-gray-700">
                  {prompt}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Click to compose prompt...</span>
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            void handleGenerate()
          }}
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
        >
          {isGenerating ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>
      </div>
    </div>
  )
}

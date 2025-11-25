import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { Handle, Position } from 'reactflow'

import { Accordion } from '../../components/ui/Accordion'
import { useOptimisticUpdatesStore } from '../../features/canvas/store/optimisticUpdatesStore'
import { StarMenu } from '../../features/snippets/components/StarMenu'
import { usePromptDesignerStore, type PromptDesignerGeneratePayload } from '../../features/canvas/store/promptDesignerStore'
import { useToast } from '../../store/toastStore'
import { buildDefaultImageContent, extractImageFormData, ImageSnippetFieldKey } from '../../utils/imageSnippetContent'
import { IMAGE_GENERATION } from '../../constants'

import type { AvailableModel, ConnectedContentItem, SnippetField } from '../../types'
import { getPrimaryFieldValue } from '../../utils/snippetContent'

interface ImageSnippetNodeProps {
    id: string
    data: {
        snippet: {
            id: string
            title: string
            content: Record<string, SnippetField>
            connectedContent?: ConnectedContentItem[]
            imageUrl?: string | null
            imageS3Key?: string | null
            imageMetadata?: {
                width: number
                height: number
                aspectRatio: string
            } | null
        }
        onFocusSnippet: (snippetId: string) => void
        onUpdateContent: (
            snippetId: string,
            changes: Partial<{ title: string; content: Record<string, SnippetField | null> }>
        ) => Promise<void>
        imageModels?: AvailableModel[]
        isLoadingImageModels?: boolean
        onGenerateImage: (snippetId: string, modelId?: string, promptOverride?: string, meta?: any) => void
        isGeneratingImage: boolean
    }
}

type ImageFormData = Record<ImageSnippetFieldKey, string>

interface TextareaFieldProps {
    label: string
    placeholder: string
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    maxLength: number
    rows?: number
    disabled?: boolean
}

const TextareaField = ({
    label,
    placeholder,
    value,
    onChange,
    onBlur,
    maxLength,
    rows = 3,
    disabled = false
}: TextareaFieldProps) => {
    const handleSnippetSelect = (content: string) => {
        // Append content to the current value
        const separator = value.trim() ? ' ' : ''
        const newValue = value + separator + content
        // Truncate if exceeds maxLength
        onChange(newValue.slice(0, maxLength))
    }

    return (
        <div className="space-y-1">
            {/* Field Label - Updated to match Prompt Designer */}
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                {label}
            </div>

            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        className="w-full text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-gray-300 resize-none leading-relaxed transition-colors"
                        placeholder={placeholder}
                        rows={rows}
                        maxLength={maxLength}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                </div>
                <StarMenu fieldType={label} onSelect={handleSnippetSelect} />
            </div>
            <div className={`text-[10px] text-right ${value.length >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
                {value.length}/{maxLength}
            </div>
        </div>
    )
}

export const ImageSnippetNode = memo(({ data }: ImageSnippetNodeProps) => {
    const {
        snippet,
        onFocusSnippet,
        onUpdateContent,
        onGenerateImage,
        imageModels = []
    } = data
    const toast = useToast()
    const { markSnippetDirty, clearSnippetDirty, markSnippetSaving, clearSnippetSaving } = useOptimisticUpdatesStore()

    const openPromptDesigner = usePromptDesignerStore((state) => state.open)

    // Local state for all form fields (draft + persisted sync)
    const [draftFields, setDraftFields] = useState<ImageFormData>(() =>
        extractImageFormData(buildDefaultImageContent({}, { existing: snippet.content }))
    )
    const [activeField, setActiveField] = useState<ImageSnippetFieldKey | null>(null)
    const [savingField, setSavingField] = useState<ImageSnippetFieldKey | null>(null)

    // Accordion expanded states
    const [accordionStates, setAccordionStates] = useState({
        details: true, // Expanded by default
        technical: true // Expanded by default
    })

    // Editable title state
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [draftTitle, setDraftTitle] = useState(snippet.title)
    const [isSavingTitle, setIsSavingTitle] = useState(false)
    const titleInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (activeField) return
        setDraftFields(extractImageFormData(buildDefaultImageContent({}, { existing: snippet.content })))
    }, [snippet.content, activeField])

    // Sync draft title when snippet.title changes (if not editing)
    useEffect(() => {
        if (!isEditingTitle) {
            setDraftTitle(snippet.title)
        }
    }, [snippet.title, isEditingTitle])

    // Auto-focus title input when editing starts
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus()
            titleInputRef.current.select()
        }
    }, [isEditingTitle])

    const handleFieldChange = (field: ImageSnippetFieldKey) => (value: string) => {
        setActiveField(field)
        markSnippetDirty(snippet.id)
        setDraftFields((prev) => ({ ...prev, [field]: value }))
    }

    const handleAccordionToggle = (section: keyof typeof accordionStates) => (isExpanded: boolean) => {
        setAccordionStates((prev) => ({ ...prev, [section]: isExpanded }))
    }

    const handleIdClick = () => {
        onFocusSnippet(snippet.id)
    }

    // Combine all form fields into a single prompt
    const combineFormFieldsToPrompt = useCallback((fields: ImageFormData = draftFields) => {
        const promptParts: string[] = []
        const pushValue = (value?: string) => {
            const trimmed = value?.trim()
            if (trimmed) {
                promptParts.push(trimmed)
            }
        }

        pushValue(fields.subject)
        pushValue(fields.background)
        pushValue(fields.style)
        pushValue(fields.composition)
        pushValue(fields.cameraPosition)
        pushValue(fields.focusLens)
        pushValue(fields.lighting)
        pushValue(fields.filmType)

        return promptParts.join(' ')
    }, [draftFields])

    const persistField = useCallback(async (field: ImageSnippetFieldKey) => {
        const trimmedValue = draftFields[field].trim()
        const nextFields = { ...draftFields, [field]: trimmedValue }
        const combinedPrompt = combineFormFieldsToPrompt(nextFields)
        const currentValue = snippet.content[field]?.value ?? ''
        const currentMainText = snippet.content.mainText?.value ?? ''

        if (trimmedValue === currentValue && combinedPrompt === currentMainText) {
            clearSnippetDirty(snippet.id)
            setActiveField(null)
            return
        }

        setSavingField(field)
        markSnippetSaving(snippet.id)

        try {
            const updatedContent = buildDefaultImageContent(
                { ...nextFields, mainText: combinedPrompt },
                { existing: snippet.content }
            )

            await onUpdateContent(snippet.id, {
                content: updatedContent
            })
            clearSnippetDirty(snippet.id)
        } catch (error) {
            console.error('Failed to update image snippet field:', error)
            toast.error('Failed to save changes', error instanceof Error ? error.message : 'Unknown error')
            setDraftFields((prev) => ({
                ...prev,
                [field]: snippet.content[field]?.value ?? ''
            }))
            clearSnippetDirty(snippet.id)
        } finally {
            setSavingField(null)
            clearSnippetSaving(snippet.id)
            setActiveField(null)
        }
    }, [draftFields, combineFormFieldsToPrompt, snippet.content, snippet.id, onUpdateContent, toast, markSnippetSaving, clearSnippetSaving, clearSnippetDirty])

    const handleFieldBlur = useCallback(
        (field: ImageSnippetFieldKey) => () => {
            void persistField(field)
        },
        [persistField]
    )

    // Handle snippet click to open Prompt Designer
    const handleSnippetClick = useCallback(() => {
        const combinedPrompt = combineFormFieldsToPrompt()

        openPromptDesigner({
            snippetId: snippet.id,
            snippetTitle: snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Image Snippet',
            mode: 'image',
            initialPrompt: combinedPrompt,
            connectedContent: [], // Image generation usually doesn't take connected content in the same way video does, or maybe it does for img2img? For now empty.
            generationSettings: {
                type: 'image',
                settings: {
                    model: imageModels[0]?.id || IMAGE_GENERATION.DEFAULT_MODEL,
                    aspectRatio: '16:9',
                    numberOfImages: 1
                }
            },
            onGenerate: async (payload: PromptDesignerGeneratePayload) => {
                const finalPrompt = payload.fullPrompt

                // Update main text with the final prompt
                const primaryField = getPrimaryFieldValue({ content: snippet.content })
                const targetKey = primaryField?.key ?? 'mainText'
                const targetField = primaryField?.field ?? {
                    label: 'mainText',
                    value: '',
                    type: 'longText',
                    isSystem: true,
                    order: 1
                }

                await onUpdateContent(snippet.id, {
                    content: {
                        [targetKey]: {
                            ...targetField,
                            value: finalPrompt
                        }
                    }
                })

                const modelId = payload.settings?.type === 'image' ? payload.settings.settings.model : undefined

                // Trigger generation
                onGenerateImage(snippet.id, modelId, finalPrompt, { prompt: finalPrompt })
            }
        })
    }, [snippet.content, snippet.id, snippet.title, combineFormFieldsToPrompt, openPromptDesigner, onUpdateContent, onGenerateImage, imageModels])

    const handleTitleActivate = useCallback((event?: React.MouseEvent) => {
        // Don't activate if Cmd/Ctrl is held (user is multi-selecting)
        if (event && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            return
        }

        setIsEditingTitle(true)
        markSnippetDirty(snippet.id)
        setDraftTitle(snippet.title ?? '')
    }, [snippet.id, snippet.title, markSnippetDirty])

    const commitTitle = useCallback(async () => {
        const newValue = draftTitle.trim()
        const currentValue = snippet.title ?? ''

        if (newValue === currentValue) {
            clearSnippetDirty(snippet.id)
            setIsEditingTitle(false)
            return
        }

        setIsSavingTitle(true)
        markSnippetSaving(snippet.id)

        try {
            await onUpdateContent(snippet.id, { title: newValue })
            clearSnippetDirty(snippet.id)
            setIsEditingTitle(false)
        } catch (error) {
            console.error('Failed to update image snippet title:', error)
            toast.error('Failed to save title changes', 'Please try again')
            setDraftTitle(currentValue)
            setIsEditingTitle(false)
        } finally {
            setIsSavingTitle(false)
            clearSnippetSaving(snippet.id)
        }
    }, [draftTitle, snippet.id, snippet.title, onUpdateContent, toast, markSnippetSaving, clearSnippetSaving, clearSnippetDirty])

    const handleTitleBlur = useCallback(() => {
        void commitTitle()
    }, [commitTitle])

    const handleTitleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            setDraftTitle(snippet.title ?? '')
            setIsEditingTitle(false)
            clearSnippetDirty(snippet.id)
            return
        }

        if (event.key === 'Enter') {
            event.preventDefault()
            void commitTitle()
        }
    }, [commitTitle, snippet.title, snippet.id, clearSnippetDirty])

    const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setDraftTitle(event.target.value)
    }, [])

    return (
        <>
            {/* React Flow handles for connections */}
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />

            <div
                className="w-[900px] bg-white border border-gray-200 rounded-lg shadow-lg"
                data-testid="image-snippet-node"
                data-snippet-id={snippet.id}
                onClick={handleSnippetClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSnippetClick()
                    }
                }}
                role="button"
                tabIndex={0}
            >
                {/* Header with Editable Title */}
                <div className="flex items-start justify-between border-b border-gray-200 px-3 py-2.5 bg-gray-50/50 rounded-t-lg">
                    <div className="min-w-0 flex-1 mr-2">
                        {isEditingTitle ? (
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={draftTitle}
                                onChange={handleTitleChange}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                className="w-full text-sm font-semibold text-gray-900 bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Untitled Image Snippet"
                                disabled={isSavingTitle}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={handleTitleActivate}
                                className="text-sm font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer bg-transparent border-none p-0 text-left truncate w-full"
                                title="Click to edit title"
                            >
                                {snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Image Snippet'}
                            </button>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wide">
                                Image Generation
                            </p>
                            <button
                                type="button"
                                onClick={handleIdClick}
                                className="font-mono text-[10px] text-gray-400 hover:text-purple-600 transition-colors cursor-pointer bg-transparent border-none p-0"
                                title="Click to zoom and center this snippet"
                            >
                                #{snippet.id.slice(0, 8)}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-3">
                    {/* Core Fields - Always visible */}
                    <div className="mb-4 space-y-2">
                        <TextareaField
                            label="Subject"
                            placeholder="e.g., A futuristic cityscape at sunset"
                            value={draftFields.subject}
                            onChange={handleFieldChange('subject')}
                            onBlur={handleFieldBlur('subject')}
                            maxLength={280}
                            disabled={savingField === 'subject'}
                        />
                        <TextareaField
                            label="Background"
                            placeholder="e.g., with flying cars and neon lights"
                            value={draftFields.background}
                            onChange={handleFieldChange('background')}
                            onBlur={handleFieldBlur('background')}
                            maxLength={280}
                            disabled={savingField === 'background'}
                        />
                    </div>

                    {/* Details Section */}
                    <div className="mb-2">
                        <Accordion
                            title="Details"
                            defaultExpanded={accordionStates.details}
                            onToggle={handleAccordionToggle('details')}
                        >
                            <div className="space-y-2 mt-2">
                                <TextareaField
                                    label="Style"
                                    placeholder="e.g., Cyberpunk, Oil Painting"
                                    value={draftFields.style}
                                    onChange={handleFieldChange('style')}
                                    onBlur={handleFieldBlur('style')}
                                    maxLength={140}
                                    rows={2}
                                    disabled={savingField === 'style'}
                                />
                                <TextareaField
                                    label="Composition"
                                    placeholder="e.g., Wide shot, Rule of thirds"
                                    value={draftFields.composition}
                                    onChange={handleFieldChange('composition')}
                                    onBlur={handleFieldBlur('composition')}
                                    maxLength={140}
                                    rows={2}
                                    disabled={savingField === 'composition'}
                                />
                            </div>
                        </Accordion>
                    </div>

                    {/* Technical Section */}
                    <div className="mb-2">
                        <Accordion
                            title="Technical"
                            defaultExpanded={accordionStates.technical}
                            onToggle={handleAccordionToggle('technical')}
                        >
                            <div className="space-y-2 mt-2">
                                <TextareaField
                                    label="Camera Position"
                                    placeholder="e.g., Eye level, Low angle"
                                    value={draftFields.cameraPosition}
                                    onChange={handleFieldChange('cameraPosition')}
                                    onBlur={handleFieldBlur('cameraPosition')}
                                    maxLength={140}
                                    rows={2}
                                    disabled={savingField === 'cameraPosition'}
                                />
                                <TextareaField
                                    label="Focus & Lens"
                                    placeholder="e.g., f/1.8, 50mm"
                                    value={draftFields.focusLens}
                                    onChange={handleFieldChange('focusLens')}
                                    onBlur={handleFieldBlur('focusLens')}
                                    maxLength={140}
                                    rows={2}
                                    disabled={savingField === 'focusLens'}
                                />
                                <TextareaField
                                    label="Lighting"
                                    placeholder="e.g., Cinematic lighting, Golden hour"
                                    value={draftFields.lighting}
                                    onChange={handleFieldChange('lighting')}
                                    onBlur={handleFieldBlur('lighting')}
                                    maxLength={140}
                                    rows={2}
                                    disabled={savingField === 'lighting'}
                                />
                                <TextareaField
                                    label="Film Type"
                                    placeholder="e.g., Kodak Portra 400"
                                    value={draftFields.filmType}
                                    onChange={handleFieldChange('filmType')}
                                    onBlur={handleFieldBlur('filmType')}
                                    maxLength={140}
                                    rows={2}
                                    disabled={savingField === 'filmType'}
                                />
                            </div>
                        </Accordion>
                    </div>

                    {snippet.imageUrl ? (
                        <div className="mt-6">
                            <div className="text-base font-semibold text-gray-800 mb-2">
                                Generated Image
                            </div>
                            <img
                                src={snippet.imageUrl}
                                alt={snippet.title}
                                className="w-full rounded-lg border border-purple-200"
                            />
                            {snippet.imageMetadata && (
                                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                                    <div>
                                        <dt className="font-semibold text-gray-900">Dimensions</dt>
                                        <dd>{snippet.imageMetadata.width}x{snippet.imageMetadata.height}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-gray-900">Aspect</dt>
                                        <dd>{snippet.imageMetadata.aspectRatio}</dd>
                                    </div>
                                </dl>
                            )}
                        </div>
                    ) : snippet.imageS3Key ? (
                        <p className="mt-4 text-sm text-gray-500">
                            The previous image exists but its preview link expired. Generate again to refresh the preview.
                        </p>
                    ) : null}

                </div>
            </div>
        </>
    )
})

ImageSnippetNode.displayName = 'ImageSnippetNode'

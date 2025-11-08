import { memo, useState } from 'react'
import { Handle, Position } from 'reactflow'
import { Accordion } from '../../shared/components/ui/Accordion'

import type { ConnectedContentItem } from '../../types'

interface VideoSnippetNodeProps {
  id: string
  data: {
    snippet: {
      id: string
      title?: string
      connectedContent?: ConnectedContentItem[]
    }
    onFocusSnippet: (snippetId: string) => void
  }
}

interface VideoFormData {
  subject: string
  action: string
  cameraMotion: string
  composition: string
  focusLens: string
  style: string
  ambiance: string
  dialogue: string
  soundEffects: string
  ambientNoise: string
}

interface StarDropdownProps {
  fieldName: string
}

const StarDropdown = ({ fieldName }: StarDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="text-gray-600 hover:text-gray-800 transition-colors p-1 text-xl"
            title={`Options for ${fieldName}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded shadow-lg p-4 z-20 min-w-[200px]">
            <div className="text-lg text-gray-500">
              Menu (coming soon)
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface TextareaFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  rows?: number
}

const TextareaField = ({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
  rows = 3
}: TextareaFieldProps) => {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-2xl font-medium text-gray-900 bg-white border border-gray-200 rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none leading-relaxed"
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        <StarDropdown fieldName={label} />
      </div>
      <div className="text-xl text-gray-500 text-right">
        {value.length}/{maxLength}
      </div>
    </div>
  )
}

export const VideoSnippetNode = memo(({ data }: VideoSnippetNodeProps) => {
  const { snippet, onFocusSnippet } = data

  // Local state for all form fields (ephemeral - not persisted)
  const [formData, setFormData] = useState<VideoFormData>({
    subject: '',
    action: '',
    cameraMotion: '',
    composition: '',
    focusLens: '',
    style: '',
    ambiance: '',
    dialogue: '',
    soundEffects: '',
    ambientNoise: ''
  })

  // Accordion expanded states
  const [accordionStates, setAccordionStates] = useState({
    referenceImages: false, // Collapsed by default
    shotDetails: true, // Expanded by default
    visualTone: true, // Expanded by default
    audioDetails: true // Expanded by default
  })

  const handleFieldChange = (field: keyof VideoFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAccordionToggle = (section: keyof typeof accordionStates) => (isExpanded: boolean) => {
    setAccordionStates((prev) => ({ ...prev, [section]: isExpanded }))
  }

  const handleIdClick = () => {
    onFocusSnippet(snippet.id)
  }

  // Get connected images (up to 3)
  const connectedImages = (snippet.connectedContent ?? [])
    .filter((item) => item.type === 'image')
    .slice(0, 3)

  // Create placeholder slots if fewer than 3 images
  const imageSlots = [0, 1, 2].map((index) => connectedImages[index] || null)

  return (
    <>
      {/* React Flow handles for connections */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div
        className="p-6 w-[900px] bg-purple-100 border border-purple-200 rounded-2xl shadow-sm"
        data-testid="video-snippet-node"
        data-snippet-id={snippet.id}
      >
        {/* Header */}
        <div className="flex items-center justify-between text-3xl font-bold text-gray-900 uppercase mb-5">
          <span className="tracking-wide">
            VIDEO SNIPPET
          </span>
          <button
            type="button"
            onClick={handleIdClick}
            className="font-mono text-lg text-gray-600 hover:text-blue-600 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            title="Click to zoom and center this snippet"
          >
            #{snippet.id.slice(0, 8)}
          </button>
        </div>

        {/* Reference Images Section */}
        <div className="mb-2">
          <Accordion
            title="Reference Images"
            isOptional={true}
            defaultExpanded={accordionStates.referenceImages}
            onToggle={handleAccordionToggle('referenceImages')}
          >
            <div className="grid grid-cols-3 gap-2 mt-2">
              {imageSlots.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-sm flex items-center justify-center bg-gray-50"
                >
                  {image ? (
                    <img
                      src={image.value}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-600">
                      <svg
                        className="w-12 h-12 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xl">Image {index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Accordion>
        </div>

        {/* Core Scene Section - Always expanded, cannot collapse */}
        <div className="mb-4 border border-gray-200 rounded-lg bg-white p-5">
          <div className="text-2xl font-bold text-gray-900 uppercase mb-4">
            Core Scene
          </div>
          <div className="space-y-2">
            <TextareaField
              label="Subject"
              placeholder="e.g., A cute creature with snow leopard-like fur and large expressive eyes."
              value={formData.subject}
              onChange={handleFieldChange('subject')}
              maxLength={280}
            />
            <TextareaField
              label="Action"
              placeholder="e.g., happily prances through a whimsical winter forest."
              value={formData.action}
              onChange={handleFieldChange('action')}
              maxLength={280}
            />
          </div>
        </div>

        {/* Shot Details Section */}
        <div className="mb-2">
          <Accordion
            title="Shot Details"
            isOptional={true}
            defaultExpanded={accordionStates.shotDetails}
            onToggle={handleAccordionToggle('shotDetails')}
          >
            <div className="space-y-2 mt-2">
              <TextareaField
                label="Camera & Motion"
                placeholder="e.g., Aerial view, dolly shot"
                value={formData.cameraMotion}
                onChange={handleFieldChange('cameraMotion')}
                maxLength={140}
                rows={2}
              />
              <TextareaField
                label="Composition"
                placeholder="e.g., Wide shot, close-up"
                value={formData.composition}
                onChange={handleFieldChange('composition')}
                maxLength={140}
                rows={2}
              />
              <TextareaField
                label="Focus & Lens"
                placeholder="e.g., Shallow focus, wide-angle"
                value={formData.focusLens}
                onChange={handleFieldChange('focusLens')}
                maxLength={140}
                rows={2}
              />
            </div>
          </Accordion>
        </div>

        {/* Visual Tone Section */}
        <div className="mb-2">
          <Accordion
            title="Visual Tone"
            defaultExpanded={accordionStates.visualTone}
            onToggle={handleAccordionToggle('visualTone')}
          >
            <div className="space-y-2 mt-2">
              <TextareaField
                label="Style"
                placeholder="e.g., 3D animated scene, joyful cartoon style, bright cheerful colors."
                value={formData.style}
                onChange={handleFieldChange('style')}
                maxLength={280}
              />
              <TextareaField
                label="Ambiance"
                placeholder="e.g., Warm sunlight filtering through branches, eerie glow of a neon sign."
                value={formData.ambiance}
                onChange={handleFieldChange('ambiance')}
                maxLength={280}
              />
            </div>
          </Accordion>
        </div>

        {/* Audio Details Section */}
        <div className="mb-2">
          <Accordion
            title="Audio Details"
            isOptional={true}
            defaultExpanded={accordionStates.audioDetails}
            onToggle={handleAccordionToggle('audioDetails')}
          >
            <div className="space-y-2 mt-2">
              <TextareaField
                label="Dialogue"
                placeholder='e.g., "This must be the key," he murmured.'
                value={formData.dialogue}
                onChange={handleFieldChange('dialogue')}
                maxLength={280}
              />
              <TextareaField
                label="Sound Effects (SFX)"
                placeholder="e.g., Tires screeching loudly, engine roaring."
                value={formData.soundEffects}
                onChange={handleFieldChange('soundEffects')}
                maxLength={280}
              />
              <TextareaField
                label="Ambient Noise"
                placeholder="e.g., A faint, eerie hum resonates."
                value={formData.ambientNoise}
                onChange={handleFieldChange('ambientNoise')}
                maxLength={280}
              />
            </div>
          </Accordion>
        </div>
      </div>
    </>
  )
})

VideoSnippetNode.displayName = 'VideoSnippetNode'

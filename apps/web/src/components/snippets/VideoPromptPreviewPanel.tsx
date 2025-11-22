import { useEffect, useMemo } from 'react';

import { Accordion } from '../../components/ui/Accordion';
import { VIDEO_GENERATION } from '../../constants';
import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore';
import { useVideoPromptStore } from '../../features/snippets/store/videoPromptStore';

import type { AvailableModel, Snippet, VideoGenerationInput } from '../../types';
import type { Viewport } from 'reactflow';

type ViduCapability = 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'REFERENCE_TO_VIDEO';
type ResolutionOption = (typeof VIDEO_GENERATION.RESOLUTIONS)[number];

interface ResolutionPricingDefinition {
  baseCredits: number;
  perSecondCredits: number;
  baseUsd: number;
  perSecondUsd: number;
  secondSecondCredits?: number;
  secondSecondUsd?: number;
}

interface ViduModelConfig {
  id: string;
  label: string;
  description: string;
  capability: ViduCapability | 'HYBRID';
  durations: readonly number[];
  defaultDuration: number;
  resolutions: readonly ResolutionOption[];
  defaultResolution: ResolutionOption;
  maxReferenceImages: number;
  pricing: Partial<Record<ViduCapability, Record<ResolutionOption, ResolutionPricingDefinition>>>;
}

const CAPABILITY_LABELS: Record<ViduCapability, string> = {
  IMAGE_TO_VIDEO: 'Image-to-Video & Start-End',
  TEXT_TO_VIDEO: 'Text-to-Video',
  REFERENCE_TO_VIDEO: 'Reference-to-Video'
};

const COMMON_DURATIONS = [...VIDEO_GENERATION.DURATIONS] as const;
const COMMON_RESOLUTIONS = VIDEO_GENERATION.RESOLUTIONS;

const isResolutionOption = (value: string): value is ResolutionOption =>
  (COMMON_RESOLUTIONS as readonly string[]).includes(value);

const VIDU_Q2_MODEL_CONFIG: Record<string, ViduModelConfig> = {
  'vidu-q2-turbo': {
    id: 'vidu-q2-turbo',
    label: 'Vidu Q2 Turbo',
    description: 'Fastest Q2 image-to-video (best for storyboard start/end workflows).',
    capability: 'IMAGE_TO_VIDEO',
    durations: COMMON_DURATIONS,
    defaultDuration: 4,
    resolutions: COMMON_RESOLUTIONS,
    defaultResolution: '720p',
    maxReferenceImages: 7,
    pricing: {
      IMAGE_TO_VIDEO: {
        '540p': {
          baseCredits: 6,
          perSecondCredits: 2,
          baseUsd: 0.03,
          perSecondUsd: 0.01
        },
        '720p': {
          baseCredits: 8,
          secondSecondCredits: 10,
          perSecondCredits: 10,
          baseUsd: 0.04,
          secondSecondUsd: 0.01,
          perSecondUsd: 0.05
        },
        '1080p': {
          baseCredits: 35,
          perSecondCredits: 10,
          baseUsd: 0.175,
          perSecondUsd: 0.05
        }
      }
    }
  },
  'vidu-q2-pro': {
    id: 'vidu-q2-pro',
    label: 'Vidu Q2 Pro',
    description: 'Premium Q2 image-to-video output with more headroom for upscale.',
    capability: 'IMAGE_TO_VIDEO',
    durations: COMMON_DURATIONS,
    defaultDuration: 4,
    resolutions: COMMON_RESOLUTIONS,
    defaultResolution: '720p',
    maxReferenceImages: 7,
    pricing: {
      IMAGE_TO_VIDEO: {
        '540p': {
          baseCredits: 8,
          secondSecondCredits: 10,
          perSecondCredits: 5,
          baseUsd: 0.04,
          secondSecondUsd: 0.01,
          perSecondUsd: 0.025
        },
        '720p': {
          baseCredits: 15,
          perSecondCredits: 10,
          baseUsd: 0.075,
          perSecondUsd: 0.05
        },
        '1080p': {
          baseCredits: 55,
          perSecondCredits: 15,
          baseUsd: 0.275,
          perSecondUsd: 0.075
        }
      }
    }
  },
  'vidu-q2': {
    id: 'vidu-q2',
    label: 'Vidu Q2',
    description: 'Core Q2 model for pure text prompts or reference-to-video runs.',
    capability: 'HYBRID',
    durations: COMMON_DURATIONS,
    defaultDuration: 4,
    resolutions: COMMON_RESOLUTIONS,
    defaultResolution: '540p',
    maxReferenceImages: 7,
    pricing: {
      TEXT_TO_VIDEO: {
        '540p': {
          baseCredits: 10,
          perSecondCredits: 2,
          baseUsd: 0.05,
          perSecondUsd: 0.01
        },
        '720p': {
          baseCredits: 15,
          perSecondCredits: 5,
          baseUsd: 0.075,
          perSecondUsd: 0.025
        },
        '1080p': {
          baseCredits: 20,
          perSecondCredits: 10,
          baseUsd: 0.1,
          perSecondUsd: 0.05
        }
      },
      REFERENCE_TO_VIDEO: {
        '540p': {
          baseCredits: 15,
          perSecondCredits: 5,
          baseUsd: 0.075,
          perSecondUsd: 0.025
        },
        '720p': {
          baseCredits: 25,
          perSecondCredits: 5,
          baseUsd: 0.125,
          perSecondUsd: 0.025
        },
        '1080p': {
          baseCredits: 75,
          perSecondCredits: 10,
          baseUsd: 0.375,
          perSecondUsd: 0.05
        }
      }
    }
  }
};

const DEFAULT_MODEL_ID = VIDEO_GENERATION.DEFAULT_MODEL;
const MODEL_OPTIONS = Object.values(VIDU_Q2_MODEL_CONFIG);

const determineCapability = (config: ViduModelConfig, hasReferenceImages: boolean): ViduCapability => {
  if (config.capability === 'HYBRID') {
    return hasReferenceImages ? 'REFERENCE_TO_VIDEO' : 'TEXT_TO_VIDEO';
  }
  return config.capability;
};

const getPricingDefinition = (
  config: ViduModelConfig,
  requestedCapability: ViduCapability,
  resolution: ResolutionOption
): ResolutionPricingDefinition | undefined => {
  const mapping = config.pricing[requestedCapability];
  if (!mapping) {
    return undefined;
  }
  return mapping[resolution];
};

const accumulateTotals = (duration: number, definition: ResolutionPricingDefinition, valueKey: 'credit' | 'usd'): number => {
  const base = valueKey === 'credit' ? definition.baseCredits : definition.baseUsd;
  const perSecond = valueKey === 'credit' ? definition.perSecondCredits : definition.perSecondUsd;
  const secondSecond = valueKey === 'credit' ? definition.secondSecondCredits : definition.secondSecondUsd;

  if (duration <= 1) {
    return base;
  }

  let total = base;
  if (secondSecond !== undefined) {
    total += secondSecond;
    if (duration > 2) {
      total += perSecond * (duration - 2);
    }
  } else {
    total += perSecond * (duration - 1);
  }
  return total;
};

const calculatePricing = (duration: number, definition: ResolutionPricingDefinition) => {
  const totalCredits = accumulateTotals(duration, definition, 'credit');
  const totalUsd = accumulateTotals(duration, definition, 'usd');
  const standardCredits = Math.ceil(totalCredits);
  const standardUsd = Number(totalUsd.toFixed(2));
  const offPeakCredits = Math.ceil(totalCredits / 2);
  const offPeakUsd = Number((totalUsd / 2).toFixed(2));

  return {
    standardCredits,
    standardUsd,
    offPeakCredits,
    offPeakUsd
  };
};

const formatUsd = (value: number) => `$${value.toFixed(2)}`;

interface VideoPromptPreviewPanelProps {
  snippets: Snippet[];
  viewport: Viewport;
  videoModels: AvailableModel[];
  isLoadingVideoModels: boolean;
  isGeneratingVideo: boolean;
  onGenerateVideo: (snippetId: string, options: VideoGenerationInput) => Promise<void> | void;
  onUpdateContent: (snippetId: string, changes: Partial<Record<'textField1' | 'title', string>>) => Promise<void>;
}

export const VideoPromptPreviewPanel = ({
  snippets,
  viewport,
  videoModels,
  isLoadingVideoModels,
  isGeneratingVideo,
  onGenerateVideo,
  onUpdateContent
}: VideoPromptPreviewPanelProps) => {
  const {
    activeSnippetId,
    modelSettings,
    combinedPrompt,
    referenceImages,
    updateModelSettings,
  } = useVideoPromptStore();
  const openPromptDesigner = usePromptDesignerStore((state) => state.open);

  useEffect(() => {
    if (!VIDU_Q2_MODEL_CONFIG[modelSettings.model]) {
      updateModelSettings({ model: DEFAULT_MODEL_ID });
    }
  }, [modelSettings.model, updateModelSettings]);

  const selectedModelId = VIDU_Q2_MODEL_CONFIG[modelSettings.model] ? modelSettings.model : DEFAULT_MODEL_ID;
  const modelConfig = useMemo(() => VIDU_Q2_MODEL_CONFIG[selectedModelId], [selectedModelId]);

  useEffect(() => {
    if (!modelConfig.durations.includes(modelSettings.duration)) {
      updateModelSettings({ duration: modelConfig.defaultDuration });
    }
  }, [modelConfig, modelSettings.duration, updateModelSettings]);

  useEffect(() => {
    const currentResolution = modelSettings.resolution;
    const isValidResolution =
      isResolutionOption(currentResolution) && modelConfig.resolutions.includes(currentResolution);
    if (!isValidResolution) {
      updateModelSettings({ resolution: modelConfig.defaultResolution });
    }
  }, [modelConfig, modelSettings.resolution, updateModelSettings]);

  const activeDuration = modelConfig.durations.includes(modelSettings.duration)
    ? modelSettings.duration
    : modelConfig.defaultDuration;
  const sanitizedResolution = isResolutionOption(modelSettings.resolution)
    ? modelSettings.resolution
    : modelConfig.defaultResolution;
  const activeResolution = modelConfig.resolutions.includes(sanitizedResolution)
    ? sanitizedResolution
    : modelConfig.defaultResolution;

  const hasReferenceImages = referenceImages.length > 0;
  const capability = determineCapability(modelConfig, hasReferenceImages);
  const pricingDefinition = getPricingDefinition(modelConfig, capability, activeResolution);
  const pricingSummary = useMemo<ReturnType<typeof calculatePricing> | null>(() => {
    if (!pricingDefinition) {
      return null;
    }
    return calculatePricing(activeDuration, pricingDefinition);
  }, [pricingDefinition, activeDuration]);
  const appliedCredits = pricingSummary
    ? (modelSettings.offPeak ? pricingSummary.offPeakCredits : pricingSummary.standardCredits)
    : null;
  const appliedUsd = pricingSummary
    ? (modelSettings.offPeak ? pricingSummary.offPeakUsd : pricingSummary.standardUsd)
    : null;
  const capabilityLabel = CAPABILITY_LABELS[capability];

  if (!activeSnippetId) {
    return null;
  }

  const activeSnippet = snippets.find(s => s.id === activeSnippetId);
  if (!activeSnippet?.position) {
    return null;
  }

  // Calculate screen position from canvas coordinates
  // Canvas coordinates are transformed by viewport (zoom and pan)
  const screenX = activeSnippet.position.x * viewport.zoom + viewport.x;
  const screenY = activeSnippet.position.y * viewport.zoom + viewport.y;
  const characterCount = combinedPrompt.length;
  const maxCharacters = 2000;

  // Available voice IDs (placeholder - should be loaded from API or constants)
  const voiceIds = [
    { id: 'voice_1', name: 'Voice 1 - Natural' },
    { id: 'voice_2', name: 'Voice 2 - Energetic' },
    { id: 'voice_3', name: 'Voice 3 - Calm' },
  ];

  const MODEL_SELECT_ID = 'video-model-select';
  const DURATION_SELECT_ID = 'video-duration-select';
  const RESOLUTION_SELECT_ID = 'video-resolution-select';
  const MOVEMENT_SELECT_ID = 'video-movement-amplitude';
  const VOICE_SELECT_ID = 'video-voice-select';
  const SEED_INPUT_ID = 'video-seed-input';

  return (
    <div
      className="absolute bg-purple-100 border border-purple-200 rounded-2xl shadow-sm p-6 w-[900px] pointer-events-auto origin-top-left"
      style={{
        left: `${screenX + 920 * viewport.zoom}px`,
        top: `${screenY}px`,
        transform: `scale(${viewport.zoom})`,
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-3xl font-bold text-gray-900 uppercase tracking-wide">Prompt Preview</h3>
      </div>

      <div className="space-y-3">
        {/* Model Settings Section */}
        <Accordion title="Settings" defaultExpanded={true}>
          <div className="space-y-3">
            {/* Model Selection */}
            <div>
              <label htmlFor={MODEL_SELECT_ID} className="block text-xs font-medium text-gray-800 mb-1">
                Model
              </label>
              <select
                id={MODEL_SELECT_ID}
                value={selectedModelId}
                onChange={(e) => {
                  const newModel = e.target.value;
                  const nextConfig = VIDU_Q2_MODEL_CONFIG[newModel] ?? modelConfig;
                  updateModelSettings({
                    model: newModel,
                    duration: nextConfig.defaultDuration,
                    resolution: nextConfig.defaultResolution,
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-600">
                {modelConfig.description}
              </p>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor={DURATION_SELECT_ID} className="block text-xs font-medium text-gray-800 mb-1">
                Duration
              </label>
              <select
                id={DURATION_SELECT_ID}
                value={activeDuration}
                onChange={(e) => {
                  const newDuration = Number(e.target.value);
                  updateModelSettings({ duration: newDuration });
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {modelConfig.durations.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}s
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label htmlFor={RESOLUTION_SELECT_ID} className="block text-xs font-medium text-gray-800 mb-1">
                Resolution
              </label>
              <select
                id={RESOLUTION_SELECT_ID}
                value={activeResolution}
                onChange={(e) => updateModelSettings({ resolution: e.target.value as ResolutionOption })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {modelConfig.resolutions.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution}
                  </option>
                ))}
              </select>
            </div>

            {/* Movement Amplitude */}
            <div>
              <label htmlFor={MOVEMENT_SELECT_ID} className="block text-xs font-medium text-gray-800 mb-1">
                Movement Amplitude
              </label>
              <select
                id={MOVEMENT_SELECT_ID}
                value={modelSettings.movementAmplitude}
                onChange={(e) => updateModelSettings({ movementAmplitude: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="auto">Auto</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800">Audio</span>
              <button
                onClick={() => updateModelSettings({ audio: !modelSettings.audio })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  modelSettings.audio ? 'bg-purple-600' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    modelSettings.audio ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Voice ID (only when audio is enabled) */}
            {modelSettings.audio && (
              <div>
                <label htmlFor={VOICE_SELECT_ID} className="block text-xs font-medium text-gray-800 mb-1">
                  Voice
                </label>
                <select
                  id={VOICE_SELECT_ID}
                  value={modelSettings.voiceId ?? ''}
                  onChange={(e) => updateModelSettings({ voiceId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select voice...</option>
                  {voiceIds.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seed (optional) */}
            <div>
              <label htmlFor={SEED_INPUT_ID} className="block text-xs font-medium text-gray-800 mb-1">
                Seed (optional)
              </label>
              <input
                id={SEED_INPUT_ID}
                type="number"
                value={modelSettings.seed ?? ''}
                onChange={(e) => updateModelSettings({ seed: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Random"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Off-peak Mode */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800">Off-peak Mode</span>
              <button
                onClick={() => updateModelSettings({ offPeak: !modelSettings.offPeak })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  modelSettings.offPeak ? 'bg-purple-600' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    modelSettings.offPeak ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {pricingSummary && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
                <div className="flex items-center justify-between font-semibold">
                  <span>{modelConfig.label}</span>
                  <span>{activeResolution.toUpperCase()} • {activeDuration}s</span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-purple-700">
                  {capabilityLabel}
                </div>
                <dl className="mt-2 space-y-1 text-gray-900">
                  <div className="flex items-center justify-between">
                    <dt>{modelSettings.offPeak ? 'Applied (off-peak)' : 'Applied (standard)'}</dt>
                    <dd>
                      {appliedCredits} credits · {appliedUsd !== null ? formatUsd(appliedUsd) : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <dt>Standard</dt>
                    <dd>
                      {pricingSummary.standardCredits} credits · {formatUsd(pricingSummary.standardUsd)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <dt>Off-peak</dt>
                    <dd>
                      {pricingSummary.offPeakCredits} credits · {formatUsd(pricingSummary.offPeakUsd)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] text-gray-600">
                  Estimates follow Vidu Q2 pricing. Off-peak halves the total credits (rounded up).
                </p>
              </div>
            )}

            {/* Generate Video Button */}
            <button
              type="button"
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded transition-colors mt-2"
              onClick={(event) => {
                event.stopPropagation();
                if (!activeSnippetId) return;

                const snippet = snippets.find(s => s.id === activeSnippetId);
                if (!snippet) return;

                openPromptDesigner({
                  snippetId: activeSnippetId,
                  snippetTitle: snippet.title && snippet.title.trim() !== '' ? snippet.title : 'Untitled Video Snippet',
                  mode: 'video',
                  initialPrompt: combinedPrompt,
                  connectedContent: referenceImages.map(img => ({
                    type: 'image' as const,
                    snippetId: img.snippetId,
                    snippetTitle: img.snippetTitle,
                    value: img.url
                  })),
                  generationSettings: {
                    type: 'video',
                    settings: {
                      ...modelSettings,
                      model: selectedModelId,
                      duration: activeDuration,
                      resolution: activeResolution
                    }
                  },
                  onGenerate: async (finalPrompt) => {
                    const latestSettings = useVideoPromptStore.getState().modelSettings;
                    await onUpdateContent(activeSnippetId, { textField1: finalPrompt });
                    const fallbackModel = videoModels[0]?.id ?? VIDEO_GENERATION.DEFAULT_MODEL;
                    const targetModel = latestSettings.model && VIDU_Q2_MODEL_CONFIG[latestSettings.model]
                      ? latestSettings.model
                      : fallbackModel;
                    const designerRequest: VideoGenerationInput = {
                      modelId: targetModel,
                      duration: latestSettings.duration ?? VIDEO_GENERATION.DEFAULT_DURATION,
                      aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
                      resolution: latestSettings.resolution ?? VIDEO_GENERATION.DEFAULT_RESOLUTION,
                      style: VIDEO_GENERATION.DEFAULT_STYLE,
                      seed: latestSettings.seed,
                      movementAmplitude: latestSettings.movementAmplitude ?? VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
                    };
                    await onGenerateVideo(activeSnippetId, designerRequest);
                  }
                });
              }}
              disabled={
                isLoadingVideoModels ||
                (!selectedModelId && videoModels.length > 0) ||
                isGeneratingVideo ||
                !combinedPrompt
              }
              aria-label="Generate video content"
              title={
                isGeneratingVideo
                  ? 'Video generation in progress...'
                  : isLoadingVideoModels
                    ? 'Loading models...'
                    : !selectedModelId
                      ? 'Please select a video model first'
                      : !combinedPrompt
                        ? 'No prompt available. Fill in the form fields first.'
                        : 'Generate video for this snippet'
              }
            >
              {isGeneratingVideo ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Generate Video
                </>
              )}
            </button>
          </div>
        </Accordion>

        {/* Reference Images Section */}
        <Accordion title="Reference Images" defaultExpanded={false}>
          {referenceImages.length === 0 ? (
            <p className="text-xs text-gray-500">No reference images</p>
          ) : (
            <div>
              <p className="text-xs text-gray-600 mb-2">
                {referenceImages.length} / {modelConfig.maxReferenceImages} images
              </p>
              <div className="grid grid-cols-3 gap-2">
                {referenceImages.slice(0, modelConfig.maxReferenceImages).map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={image.url}
                      alt={image.snippetTitle && image.snippetTitle.trim() !== ''
                        ? image.snippetTitle
                        : `Reference ${index + 1}`}
                      className="w-full h-full object-cover rounded border border-gray-300"
                    />
                  </div>
                ))}
              </div>
              {referenceImages.length > modelConfig.maxReferenceImages && (
                <p className="text-xs text-red-600 mt-2">
                  Warning: Only first {modelConfig.maxReferenceImages} images will be used
                </p>
              )}
            </div>
          )}
        </Accordion>

        {/* Prompt Preview Section */}
        <Accordion title="Prompt Preview" defaultExpanded={true}>
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">
                {characterCount} / {maxCharacters} characters
              </span>
              {characterCount > maxCharacters && (
                <span className="text-xs text-red-600">Exceeds limit!</span>
              )}
            </div>
            <textarea
              value={combinedPrompt}
              readOnly
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 resize-none focus:outline-none"
              rows={6}
              placeholder="Your combined prompt will appear here..."
            />
          </div>
        </Accordion>
      </div>
    </div>
  );
};

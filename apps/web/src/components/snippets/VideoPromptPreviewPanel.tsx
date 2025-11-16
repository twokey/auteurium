import { useVideoPromptStore } from '../../features/snippets/store/videoPromptStore';
import { Accordion } from '../../shared/components/ui/Accordion';
import type { Snippet, AvailableModel, VideoGenerationInput } from '../../types';
import type { Viewport } from 'reactflow';
import { VIDEO_GENERATION } from '../../shared/constants';
import { usePromptDesignerStore } from '../../features/canvas/store/promptDesignerStore';

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

  // Don't render if no active snippet
  if (!activeSnippetId) return null;

  // Find the active snippet to get its position
  const activeSnippet = snippets.find(s => s.id === activeSnippetId);
  if (!activeSnippet || !activeSnippet.position) return null;

  // Calculate screen position from canvas coordinates
  // Canvas coordinates are transformed by viewport (zoom and pan)
  const screenX = activeSnippet.position.x * viewport.zoom + viewport.x;
  const screenY = activeSnippet.position.y * viewport.zoom + viewport.y;

  // Model-specific constraints
  const getModelConstraints = (model: string) => {
    switch (model) {
      case 'viduq2-pro':
      case 'viduq2-turbo':
        return {
          durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          resolutions: ['540p', '720p', '1080p'],
          defaultDuration: 5,
          defaultResolution: '720p',
          maxReferenceImages: 7,
        };
      case 'viduq1':
      case 'viduq1-classic':
        return {
          durations: [5],
          resolutions: ['1080p'],
          defaultDuration: 5,
          defaultResolution: '1080p',
          maxReferenceImages: 7,
        };
      case 'vidu2.0':
      case 'vidu1.5':
        return {
          durations: [4, 8],
          resolutions: modelSettings.duration === 8 ? ['720p'] : ['360p', '720p', '1080p'],
          defaultDuration: 4,
          defaultResolution: modelSettings.duration === 8 ? '720p' : '720p',
          maxReferenceImages: 3,
        };
      default:
        return {
          durations: [4, 8],
          resolutions: ['540p', '720p', '1080p'],
          defaultDuration: 4,
          defaultResolution: '720p',
          maxReferenceImages: 7,
        };
    }
  };

  const constraints = getModelConstraints(modelSettings.model);
  const characterCount = combinedPrompt.length;
  const maxCharacters = 2000;

  // Available voice IDs (placeholder - should be loaded from API or constants)
  const voiceIds = [
    { id: 'voice_1', name: 'Voice 1 - Natural' },
    { id: 'voice_2', name: 'Voice 2 - Energetic' },
    { id: 'voice_3', name: 'Voice 3 - Calm' },
  ];

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
              <label className="block text-xs font-medium text-gray-800 mb-1">
                Model
              </label>
              <select
                value={modelSettings.model}
                onChange={(e) => {
                  const newModel = e.target.value;
                  const constraints = getModelConstraints(newModel);
                  updateModelSettings({
                    model: newModel,
                    duration: constraints.defaultDuration,
                    resolution: constraints.defaultResolution,
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="viduq2-pro">Vidu Q2 Pro</option>
                <option value="viduq2-turbo">Vidu Q2 Turbo</option>
                <option value="viduq1">Vidu Q1</option>
                <option value="viduq1-classic">Vidu Q1 Classic</option>
                <option value="vidu2.0">Vidu 2.0</option>
                <option value="vidu1.5">Vidu 1.5</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">
                Duration
              </label>
              <select
                value={modelSettings.duration}
                onChange={(e) => {
                  const newDuration = Number(e.target.value);
                  updateModelSettings({
                    duration: newDuration,
                    // Update resolution if needed for vidu2.0/1.5
                    resolution: modelSettings.model.includes('vidu2.0') || modelSettings.model.includes('vidu1.5')
                      ? newDuration === 8 ? '720p' : modelSettings.resolution
                      : modelSettings.resolution,
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {constraints.durations.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}s
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">
                Resolution
              </label>
              <select
                value={modelSettings.resolution}
                onChange={(e) => updateModelSettings({ resolution: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {constraints.resolutions.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution}
                  </option>
                ))}
              </select>
            </div>

            {/* Movement Amplitude */}
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">
                Movement Amplitude
              </label>
              <select
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
              <label className="text-xs font-medium text-gray-800">Audio</label>
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
                <label className="block text-xs font-medium text-gray-800 mb-1">
                  Voice
                </label>
                <select
                  value={modelSettings.voiceId || ''}
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
              <label className="block text-xs font-medium text-gray-800 mb-1">
                Seed (optional)
              </label>
              <input
                type="number"
                value={modelSettings.seed || ''}
                onChange={(e) => updateModelSettings({ seed: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Random"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Off-peak Mode */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-800">Off-peak Mode</label>
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
                  onGenerate: async (finalPrompt) => {
                    await onUpdateContent(activeSnippetId, { textField1: finalPrompt });
                    const targetModel = modelSettings.model || videoModels[0]?.id || VIDEO_GENERATION.DEFAULT_MODEL;
                    const designerRequest: VideoGenerationInput = {
                      modelId: targetModel,
                      duration: modelSettings.duration || VIDEO_GENERATION.DEFAULT_DURATION,
                      aspectRatio: VIDEO_GENERATION.DEFAULT_ASPECT_RATIO,
                      resolution: modelSettings.resolution || VIDEO_GENERATION.DEFAULT_RESOLUTION,
                      style: VIDEO_GENERATION.DEFAULT_STYLE,
                      movementAmplitude: modelSettings.movementAmplitude || VIDEO_GENERATION.DEFAULT_MOVEMENT_AMPLITUDE
                    };
                    await onGenerateVideo(activeSnippetId, designerRequest);
                  }
                });
              }}
              disabled={
                isLoadingVideoModels ||
                (!modelSettings.model && videoModels.length > 0) ||
                isGeneratingVideo ||
                !combinedPrompt
              }
              aria-label="Generate video content"
              title={
                isGeneratingVideo
                  ? 'Video generation in progress...'
                  : isLoadingVideoModels
                    ? 'Loading models...'
                    : !modelSettings.model
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
                {referenceImages.length} / {constraints.maxReferenceImages} images
              </p>
              <div className="grid grid-cols-3 gap-2">
                {referenceImages.slice(0, constraints.maxReferenceImages).map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={image.url}
                      alt={image.snippetTitle || `Reference ${index + 1}`}
                      className="w-full h-full object-cover rounded border border-gray-300"
                    />
                  </div>
                ))}
              </div>
              {referenceImages.length > constraints.maxReferenceImages && (
                <p className="text-xs text-red-600 mt-2">
                  Warning: Only first {constraints.maxReferenceImages} images will be used
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

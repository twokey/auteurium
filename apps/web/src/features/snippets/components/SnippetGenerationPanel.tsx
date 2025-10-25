import { UseSnippetGenerationReturn } from '../hooks/useSnippetGeneration'

interface SnippetGenerationPanelProps {
  generation: UseSnippetGenerationReturn
  textField1: string
  onGenerate: () => Promise<void>
  onGenerateFromField2: () => Promise<void>
  onCombine: () => Promise<void>
  onGenerateImage: () => Promise<void>
  isPrimaryBusy: boolean
  isCombining: boolean
  isGeneratingImage: boolean
  streamError: string | null
  isDisabled?: boolean
}

/**
 * SnippetGenerationPanel - LLM generation controls
 * Renders model selectors and generation action buttons
 */
export const SnippetGenerationPanel = ({
  generation,
  textField1,
  onGenerate,
  onGenerateFromField2,
  onCombine,
  onGenerateImage,
  isPrimaryBusy,
  isCombining,
  isGeneratingImage,
  streamError,
  isDisabled = false
}: SnippetGenerationPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Primary Generation Panel */}
      <div className="flex items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 mb-1">
            LLM Model
          </label>
          <select
            id="llmModel"
            value={generation.selectedModelPrimary}
            onChange={(e) => generation.setSelectedModelPrimary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isDisabled || isPrimaryBusy || generation.isLoadingModels}
          >
            <option value="" disabled>
              {generation.isLoadingModels ? 'Loading models...' : 'Select a model...'}
            </option>
            {generation.models.map((model) => (
              <option key={model.id} value={model.id} title={model.description ?? undefined}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            void onGenerate()
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-2"
          disabled={
            isDisabled ||
            isPrimaryBusy ||
            !generation.selectedModelPrimary ||
            textField1.trim() === '' ||
            generation.isLoadingModels
          }
        >
          {isPrimaryBusy && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isPrimaryBusy ? 'Generating...' : 'Generate'}
        </button>

        <button
          onClick={() => {
            void onCombine()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
          disabled={isDisabled || isCombining}
        >
          {isCombining && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isCombining ? 'Combining...' : 'Combine'}
        </button>

        <button
          onClick={() => {
            void onGenerateImage()
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400 flex items-center gap-2"
          disabled={isDisabled || isGeneratingImage || !textField1.trim()}
        >
          {isGeneratingImage && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isGeneratingImage ? 'Generating...' : 'Image'}
        </button>
      </div>

      {/* Error States */}
      {generation.modelsError && (
        <p className="text-sm text-red-600">
          Failed to load models. Please try again later or contact your administrator.
        </p>
      )}
      {!generation.modelsError && !generation.isLoadingModels && generation.models.length === 0 && (
        <p className="text-sm text-gray-500">No models available. Please contact your administrator.</p>
      )}
      {streamError && (
        <p className="text-sm text-red-600">{streamError}</p>
      )}

      {/* Secondary Generation Panel */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="llmModelSecondary" className="block text-sm font-medium text-gray-700 mb-1">
              LLM Model 2
            </label>
            <select
              id="llmModelSecondary"
              value={generation.selectedModelSecondary}
              onChange={(e) => generation.setSelectedModelSecondary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isDisabled || generation.isGeneratingSecondary || generation.isLoadingModels}
            >
              <option value="" disabled>
                {generation.isLoadingModels ? 'Loading models...' : 'Select a model...'}
              </option>
              {generation.models.map((model) => (
                <option key={model.id} value={model.id} title={model.description ?? undefined}>
                  {model.displayName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              void onGenerateFromField2()
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-2"
            disabled={
              isDisabled ||
              generation.isGeneratingSecondary ||
              !generation.selectedModelSecondary ||
              generation.isLoadingModels
            }
          >
            {generation.isGeneratingSecondary && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {generation.isGeneratingSecondary ? 'Generating...' : 'Generate Snippet'}
          </button>

          <button
            onClick={() => {
              void onCombine()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center gap-2"
            disabled={isDisabled || isCombining}
          >
            {isCombining && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isCombining ? 'Combining...' : 'Combine'}
          </button>
        </div>
      </div>
    </div>
  )
}



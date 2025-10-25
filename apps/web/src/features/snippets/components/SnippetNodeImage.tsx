interface SnippetNodeImageProps {
  imageUrl?: string | null
  imageMetadata?: {
    width: number
    height: number
    aspectRatio: string
  } | null
  isLoading?: boolean
}

/**
 * SnippetNodeImage - Display generated snippet image
 * Shows image with metadata if available
 */
export const SnippetNodeImage = ({
  imageUrl,
  imageMetadata,
  isLoading = false
}: SnippetNodeImageProps) => {
  if (!imageUrl && !isLoading) {
    return null
  }

  return (
    <div className="mt-2 rounded-md overflow-hidden bg-gray-100">
      {isLoading ? (
        <div className="w-full h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : imageUrl ? (
        <div className="flex flex-col">
          <img
            src={imageUrl}
            alt="Generated snippet"
            className="w-full h-auto object-cover"
            style={{
              aspectRatio: imageMetadata?.aspectRatio || 'auto'
            }}
          />
          {imageMetadata && (
            <p className="text-[10px] text-gray-500 px-2 py-1 bg-gray-50">
              {imageMetadata.width}×{imageMetadata.height}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}



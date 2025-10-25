interface SnippetImageSectionProps {
  imageUrl?: string | null
  imageMetadata?: {
    width: number
    height: number
    aspectRatio: string
  } | null
}

/**
 * SnippetImageSection - Display generated snippet images
 * Shows image with metadata if present
 */
export const SnippetImageSection = ({
  imageUrl,
  imageMetadata
}: SnippetImageSectionProps) => {
  if (!imageUrl) {
    return null
  }

  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 mb-2">
        Generated Image
      </p>
      <div className="relative">
        <img
          src={imageUrl}
          alt="Generated from snippet text"
          className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm"
        />
        {imageMetadata && (
          <p className="text-xs text-gray-500 mt-1">
            {imageMetadata.width}x{imageMetadata.height} • {imageMetadata.aspectRatio}
          </p>
        )}
      </div>
    </div>
  )
}



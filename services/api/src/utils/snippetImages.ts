import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { Snippet } from '@auteurium/shared-types'
import type { Logger } from '@aws-lambda-powertools/logger'

const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME ?? ''
const s3Client = new S3Client({})

const isBucketConfigured = (): boolean => MEDIA_BUCKET_NAME.trim().length > 0

const logSigningError = (logger: Logger, snippetId: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error)
  logger.warn('Failed to generate signed URL for snippet image', {
    snippetId,
    error: message
  })
}

export const withSignedImageUrl = async (snippet: Snippet, logger: Logger): Promise<Snippet> => {
  if (!isBucketConfigured() || !snippet.imageS3Key) {
    return snippet
  }

  try {
    const command = new GetObjectCommand({
      Bucket: MEDIA_BUCKET_NAME,
      Key: snippet.imageS3Key
    })
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return {
      ...snippet,
      imageUrl: signedUrl
    }
  } catch (error) {
    logSigningError(logger, snippet.id, error)
    return snippet
  }
}

export const withSignedImageUrls = async (snippets: Snippet[], logger: Logger): Promise<Snippet[]> => {
  if (!isBucketConfigured()) {
    return snippets
  }

  return Promise.all(snippets.map((snippet) => withSignedImageUrl(snippet, logger)))
}

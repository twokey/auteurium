import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { Snippet } from '@auteurium/shared-types'
import type { Logger } from '@aws-lambda-powertools/logger'

const MEDIA_BUCKET_NAME = process.env.MEDIA_BUCKET_NAME ?? ''
const s3Client = new S3Client({})

const isBucketConfigured = (): boolean => MEDIA_BUCKET_NAME.trim().length > 0

const logSigningError = (logger: Logger, snippetId: string, error: unknown, assetType: 'image' | 'video'): void => {
  const message = error instanceof Error ? error.message : String(error)
  logger.warn('Failed to generate signed URL for snippet asset', {
    snippetId,
    assetType,
    error: message
  })
}

const signMediaKey = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: MEDIA_BUCKET_NAME,
    Key: key
  })
  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export const withSignedImageUrl = async (snippet: Snippet, logger: Logger): Promise<Snippet> => {
  if (!isBucketConfigured()) {
    return snippet
  }

  const updatedSnippet: Snippet = { ...snippet }

  if (snippet.imageS3Key) {
    try {
      updatedSnippet.imageUrl = await signMediaKey(snippet.imageS3Key)
    } catch (error) {
      logSigningError(logger, snippet.id, error, 'image')
    }
  }

  if (snippet.videoS3Key) {
    try {
      updatedSnippet.videoUrl = await signMediaKey(snippet.videoS3Key)
    } catch (error) {
      logSigningError(logger, snippet.id, error, 'video')
    }
  }

  return updatedSnippet
}

export const withSignedImageUrls = async (snippets: Snippet[], logger: Logger): Promise<Snippet[]> => {
  if (!isBucketConfigured()) {
    return snippets
  }

  return Promise.all(snippets.map((snippet) => withSignedImageUrl(snippet, logger)))
}

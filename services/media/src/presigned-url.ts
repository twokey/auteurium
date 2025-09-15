import { APIGatewayProxyHandler } from 'aws-lambda'
import { S3 } from 'aws-sdk'
import { Logger } from '@aws-lambda-powertools/logger'

const logger = new Logger({ serviceName: 'auteurium-media' })
const s3 = new S3()

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { key, contentType } = JSON.parse(event.body || '{}')
    
    if (!key || !contentType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing key or contentType' })
      }
    }

    const bucketName = process.env.MEDIA_BUCKET!
    
    // Generate presigned URL for upload
    const presignedUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
      ServerSideEncryption: 'AES256'
    })

    logger.info('Generated presigned URL', { key, contentType })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        presignedUrl,
        key,
        bucketName
      })
    }
  } catch (error) {
    logger.error('Error generating presigned URL', { error })
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
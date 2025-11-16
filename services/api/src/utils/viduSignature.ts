import { createHmac, timingSafeEqual } from 'crypto'

export interface SignatureVerificationParams {
  secret: string
  httpMethod: string
  path: string
  rawQueryString?: string
  headers: Record<string, string | undefined>
  signature?: string | null
  signedHeaders?: string | null
  toleranceMs?: number
}

export interface SignatureVerificationResult {
  valid: boolean
  reason?: string
  debugString?: string
  providedSignature?: string
  expectedSignature?: string
}

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000

const getHeaderValue = (headers: Record<string, string | undefined>, key: string): string | undefined => {
  const lowerKey = key.toLowerCase()
  for (const [headerKey, value] of Object.entries(headers)) {
    if (headerKey.toLowerCase() === lowerKey) {
      return value ?? undefined
    }
  }
  return undefined
}

const safeCompareBase64 = (expected: string, provided: string): boolean => {
  try {
    const expectedBuffer = Buffer.from(expected, 'base64')
    const providedBuffer = Buffer.from(provided, 'base64')

    if (expectedBuffer.length !== providedBuffer.length) {
      return false
    }

    return timingSafeEqual(expectedBuffer, providedBuffer)
  } catch {
    return false
  }
}

const validateDateHeader = (value: string | undefined, toleranceMs: number): SignatureVerificationResult | null => {
  if (!value) {
    return { valid: false, reason: 'missing_date_header' }
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return { valid: false, reason: 'invalid_date_header' }
  }

  const now = Date.now()
  if (Math.abs(now - parsed) > toleranceMs) {
    return { valid: false, reason: 'timestamp_out_of_range' }
  }

  return null
}

const normalizePath = (path?: string): string => {
  if (!path || path.trim() === '') {
    return '/'
  }
  return path.startsWith('/') ? path : `/${path}`
}

export const verifyViduSignature = ({
  secret,
  httpMethod,
  path,
  rawQueryString = '',
  headers,
  signature,
  signedHeaders,
  toleranceMs = DEFAULT_TOLERANCE_MS
}: SignatureVerificationParams): SignatureVerificationResult => {
  if (!signature) {
    return { valid: false, reason: 'missing_signature' }
  }

  if (!signedHeaders) {
    return { valid: false, reason: 'missing_signed_headers' }
  }

  const dateHeader = getHeaderValue(headers, 'Date')
  const dateValidation = validateDateHeader(dateHeader, toleranceMs)
  if (dateValidation) {
    return dateValidation
  }

  const headerNames = signedHeaders
    .split(';')
    .map(header => header.trim())
    .filter(header => header.length > 0)

  if (headerNames.length === 0) {
    return { valid: false, reason: 'invalid_signed_headers' }
  }

  const canonicalPath = normalizePath(path)
  const canonicalQuery = rawQueryString ?? ''
  const upperMethod = (httpMethod ?? '').toUpperCase()
  if (!upperMethod) {
    return { valid: false, reason: 'missing_http_method' }
  }

  let signingString = `${upperMethod}\n${canonicalPath}\n${canonicalQuery}\nvidu\n${dateHeader}\n`

  for (const headerName of headerNames) {
    const headerValue = getHeaderValue(headers, headerName)
    if (headerValue === undefined) {
      return { valid: false, reason: `missing_header_${headerName.toLowerCase()}` }
    }
    signingString += `${headerName}:${headerValue}\n`
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(signingString)
    .digest('base64')

  const providedSignature = signature.trim()
  const matches = safeCompareBase64(expectedSignature, providedSignature)
  if (!matches) {
    return {
      valid: false,
      reason: 'signature_mismatch',
      debugString: signingString,
      providedSignature,
      expectedSignature
    }
  }

  return { valid: true }
}

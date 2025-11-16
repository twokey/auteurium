import { createHmac } from 'crypto'

import { verifyViduSignature } from '../viduSignature'

const buildSignature = (options: {
  secret: string
  method: string
  path: string
  query?: string
  date: string
  headers: Record<string, string>
  signedHeaders: string[]
}): string => {
  const { secret, method, path, query = '', date, headers, signedHeaders } = options
  let signingString = `${method}\n${path}\n${query}\nvidu\n${date}\n`
  for (const header of signedHeaders) {
    signingString += `${header}:${headers[header]}\n`
  }

  return createHmac('sha256', secret).update(signingString).digest('base64')
}

describe('verifyViduSignature', () => {
  const secret = 'test-secret'
  const method = 'POST'
  const path = '/vidu/callback'
  const query = 'name=james&age=36'
  const date = new Date().toUTCString()
  const headers = {
    'Date': date,
    'x-request-nonce': '123e4567-e89b-12d3-a456-426614174000'
  }
  const signedHeaders = ['Date', 'x-request-nonce']

  it('accepts a valid signature', () => {
    const signature = buildSignature({ secret, method, path, query, date, headers, signedHeaders })
    const result = verifyViduSignature({
      secret,
      httpMethod: method,
      path,
      rawQueryString: query,
      headers,
      signature,
      signedHeaders: signedHeaders.join(';')
    })

    expect(result.valid).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('rejects invalid signatures', () => {
    const signature = buildSignature({
      secret,
      method,
      path,
      query,
      date,
      headers: { ...headers, Date: new Date(Date.now() - 60_000).toUTCString() },
      signedHeaders
    })

    const result = verifyViduSignature({
      secret,
      httpMethod: method,
      path,
      rawQueryString: query,
      headers,
      signature,
      signedHeaders: signedHeaders.join(';')
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('signature_mismatch')
  })

  it('rejects signatures outside the tolerance window', () => {
    const oldDate = new Date(Date.now() - 600_000).toUTCString()
    const staleHeaders = {
      'Date': oldDate,
      'x-request-nonce': headers['x-request-nonce']
    }
    const signature = buildSignature({
      secret,
      method,
      path,
      query,
      date: oldDate,
      headers: staleHeaders,
      signedHeaders
    })

    const result = verifyViduSignature({
      secret,
      httpMethod: method,
      path,
      rawQueryString: query,
      headers: staleHeaders,
      signature,
      signedHeaders: signedHeaders.join(';'),
      toleranceMs: 60_000
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('timestamp_out_of_range')
  })
})

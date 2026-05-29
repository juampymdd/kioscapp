import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-sync-secret',
}

export function corsHeaders() {
  return CORS_HEADERS
}

export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export function withCors(res: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * Thin wrappers over the existing v1 response helpers.
 * v1Ok(data, status?) and v1Error(message, status) convenience forms.
 */
import { NextResponse } from 'next/server'

export function v1Ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function v1Error(message: string, status: number): NextResponse {
  return NextResponse.json({ error: { message } }, { status })
}

/**
 * National SOC Platform - Auth Route (DISABLED)
 * 
 * ⚠️ Authentication is disabled - Public access mode
 * This route returns 404 to indicate auth is not available
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { 
      error: 'Authentication disabled',
      message: 'Platform is running in public access mode'
    },
    { status: 404 }
  )
}

export async function POST() {
  return NextResponse.json(
    { 
      error: 'Authentication disabled',
      message: 'Platform is running in public access mode'
    },
    { status: 404 }
  )
}

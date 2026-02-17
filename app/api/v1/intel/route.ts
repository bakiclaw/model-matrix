import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const hardwarePath = path.join(process.cwd(), 'public/data/hardware.json')
  const pricesPath = path.join(process.cwd(), 'public/data/prices.json')
  
  try {
    const hardware = JSON.parse(fs.readFileSync(hardwarePath, 'utf8'))
    return NextResponse.json({
      hardware: hardware.hardware,
      presets: hardware.presets,
      benchmarks: {
        source: "OpenClaw Intel Layer",
        last_updated: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to load intel data" }, { status: 500 })
  }
}

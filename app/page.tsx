import type { Metadata } from 'next'
import ModelMatrixApp from './ModelMatrixApp'

export const metadata: Metadata = {
  title: 'ModelMatrix | AI Cost Intelligence',
  description: 'Modern LLM price tracking, cost projection, and value analysis based on LMSYS Arena scores.',
  keywords: 'LLM, AI, Cost, Pricing, LMSYS, Leaderboard, Token, Comparison',
  openGraph: {
    title: 'ModelMatrix | AI Cost Intelligence',
    description: 'Modern LLM price tracking and cost projection.',
    type: 'website',
  }
}

export default function Page() {
  return <ModelMatrixApp />
}

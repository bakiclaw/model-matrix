'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'

interface ModelPricing {
  prompt: number
  completion: number
}

interface ModelScores {
  overall: number | null
  coding: number | null
  vision: number | null
  hard: number | null
}

interface Model {
  id: string
  name: string
  context_length: number
  pricing: ModelPricing
  price_history?: { date: string, prompt: number, completion: number }[]
  price_status?: 'stable' | 'drop' | 'hike'
  scores: ModelScores
  provider: string
  tags: string[]
  baki_report?: string
}

interface ModelData {
  metadata: {
    source: string
    last_updated: string
    total_models: number
  }
  models: Model[]
}

interface SubscriptionTier {
  name: string
  provider: string
  cost: number
  monthlyTokenEquivalent: number
  includedModels: string[]
  description: string
  color: string
}

const SUBSCRIPTIONS: SubscriptionTier[] = [
  {
    name: "ChatGPT Plus",
    provider: "OpenAI",
    cost: 20,
    monthlyTokenEquivalent: 4000000,
    includedModels: ["gpt-4o", "o1", "o3"],
    description: "80 msgs/3h + o3 access",
    color: "emerald"
  },
  {
    name: "Claude Pro",
    provider: "Anthropic",
    cost: 20,
    monthlyTokenEquivalent: 2000000,
    includedModels: ["sonnet-4.5", "opus-4.5"],
    description: "5x usage vs free tier",
    color: "orange"
  },
  {
    name: "Google AI Pro",
    provider: "Google",
    cost: 20,
    monthlyTokenEquivalent: 7000000,
    includedModels: ["gemini-3-pro", "thinking"],
    description: "300 Thinking prompts/day",
    color: "blue"
  },
  {
    name: "Antigravity",
    provider: "Ben-Aggregator",
    cost: 15,
    monthlyTokenEquivalent: 10000000,
    includedModels: ["all-premium", "optimized-agents"],
    description: "High-throughput Agent Access",
    color: "indigo"
  },
  {
    name: "Google AI Ultra",
    provider: "Google",
    cost: 250,
    monthlyTokenEquivalent: 25000000,
    includedModels: ["3-pro-max", "nano-banana-4k"],
    description: "Enterprise/Heavy Automation",
    color: "purple"
  }
]

const CATEGORY_TAGS = ["Code", "Vision", "Logic", "Chat"]

export default function ModelMatrixApp() {
  const [data, setData] = useState<ModelData | null>(null)
  const [tokenVolume, setTokenVolume] = useState(7500000)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<'matrix' | 'coding' | 'vision' | 'logic' | 'subs' | 'intel' | 'compare'>('matrix')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortKey, setSortKey] = useState('cost')
  const [sortOrder, setSortOrder] = useState(1)
  const [hardwareData, setHardwareData] = useState<any>(null)
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('rtx_4090')
  const [electricityRate, setElectricityRate] = useState(0.12)
  const [usageHoursPerDay, setUsageHoursPerDay] = useState(8)
  const [comparisonBaseModel, setComparisonBaseModel] = useState<string>('Llama 3.1 70B')
  const [projectionEnabled, setProjectionEnabled] = useState(false)

  useEffect(() => {
    fetch('/data/prices.json')
      .then(res => res.json())
      .then((resData: ModelData) => {
        setData(resData)
      })
      .catch(err => console.error("Failed to load prices", err))

    fetch('/data/hardware.json')
      .then(res => res.json())
      .then(hwData => {
        setHardwareData(hwData)
      })
      .catch(err => console.error("Failed to load hardware", err))
  }, [])

  const models = useMemo(() => data?.models || [], [data])

  const calculateModelCost = (model: Model) => {
    const promptCost = (tokenVolume * 0.8 * model.pricing.prompt) / 1000000
    const completionCost = (tokenVolume * 0.2 * model.pricing.completion) / 1000000
    return promptCost + completionCost
  }

  const providers = useMemo(() => {
    const set = new Set(models.map(m => m.provider))
    const list = Array.from(set).sort()
    const priority = ['openai', 'anthropic', 'google', 'meta-llama', 'deepseek']
    return [
      ...priority.filter(p => list.includes(p)),
      ...list.filter(p => !priority.includes(p))
    ]
  }, [models])

  const filteredModels = useMemo(() => {
    let result = [...models]
    
    // Auto-filter by Tab Category
    if (activeTab === 'coding') result = result.filter(m => m.scores.coding !== null)
    if (activeTab === 'vision') result = result.filter(m => m.scores.vision !== null)
    if (activeTab === 'logic') result = result.filter(m => m.scores.hard !== null)

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(m => m.name.toLowerCase().includes(s) || m.id.toLowerCase().includes(s))
    }

    if (selectedProviders.length > 0) {
      result = result.filter(m => selectedProviders.includes(m.provider))
    }

    if (selectedTags.length > 0) {
      result = result.filter(m => m.tags.some(t => selectedTags.includes(t)))
    }

    // Dynamic Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any
      const currentSort = activeTab !== 'matrix' && sortKey === 'cost' ? 'elo' : sortKey

      switch(currentSort) {
        case 'elo': 
          const scoreKey = activeTab === 'coding' ? 'coding' : activeTab === 'vision' ? 'vision' : activeTab === 'logic' ? 'hard' : 'overall'
          aVal = a.scores[scoreKey as keyof ModelScores] || 0
          bVal = b.scores[scoreKey as keyof ModelScores] || 0
          return (bVal - aVal) // Top score first by default
        case 'cost': 
          aVal = calculateModelCost(a)
          bVal = calculateModelCost(b)
          break
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        default: aVal = a.name; bVal = b.name;
      }

      if (aVal < bVal) return -1 * sortOrder
      if (aVal > bVal) return 1 * sortOrder
      return 0
    })

    return result
  }, [models, search, selectedProviders, selectedTags, activeTab, sortKey, sortOrder, tokenVolume])

  const formatProviderName = (slug: string) => {
    const map: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'meta-llama': 'Meta',
      'deepseek': 'DeepSeek',
      'mistralai': 'Mistral'
    }
    return map[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative flex flex-col overflow-x-hidden">
      <ParticleBackground />

      <header className="pt-20 pb-10 px-4 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent -z-10"></div>
        <h1 className="text-6xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-400 to-cyan-400">
          ModelMatrix <span className="text-xl font-light text-slate-600 ml-2">6.0</span>
        </h1>
        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-500 text-sm tracking-[0.3em] uppercase font-bold">Intelligence Resource Efficiency Matrix</p>
          
          <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">🧠⚡</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                Developed by <a href="https://github.com/bakiclaw" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 transition-all hover:underline decoration-indigo-500/50 underline-offset-4">Baki</a>
              </span>
            </div>
            
            <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
            
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="text-indigo-500/80 italic">Last Sync:</span>
              <span className="text-slate-200 font-mono">
                {data?.metadata?.last_updated ? new Date(data.metadata.last_updated).toLocaleString('he-IL', { 
                  day: '2-digit', month: '2-digit', year: '2-digit', 
                  hour: '2-digit', minute: '2-digit' 
                }) : 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-32">
        
        {/* Navigation Tabs */}
        <nav className="flex flex-wrap justify-center gap-2 mb-12 p-1.5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/5 w-fit mx-auto shadow-2xl">
          {[
            { id: 'matrix', label: 'Full Matrix', icon: '📊' },
            { id: 'coding', label: 'Coding Arena', icon: '💻' },
            { id: 'vision', label: 'Vision Rank', icon: '👁️' },
            { id: 'logic', label: 'Hard Prompts', icon: '🧠' },
            { id: 'compare', label: 'Provider Compare', icon: '⚔️' },
            { id: 'subs', label: 'Subscription Efficiency', icon: '💎' },
            { id: 'intel', label: 'OpenClaw Intel', icon: '⚡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'compare' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-white mb-4">Cross-Provider Comparison</h2>
                <p className="text-slate-400">Select a model family to see how pricing and context window vary across different infrastructure providers.</p>
            </div>

            <div className="glass rounded-[2rem] p-6 bg-slate-900/40 border border-white/5 flex flex-wrap items-center justify-center gap-4">
              {['Llama 3.1 70B', 'Llama 3.1 405B', 'Claude 3.5 Sonnet', 'GPT-4o', 'DeepSeek V3', 'Qwen 2.5 72B'].map(family => (
                <button
                  key={family}
                  onClick={() => setComparisonBaseModel(family)}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${comparisonBaseModel === family ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'}`}
                >
                  {family}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-slate-950/50 backdrop-blur-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Provider</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Exact Model ID</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Input / 1M</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Output / 1M</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Context</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {models.filter(m => m.name.toLowerCase().includes(comparisonBaseModel.toLowerCase()) || m.id.toLowerCase().includes(comparisonBaseModel.toLowerCase().replace(' ', '-'))).sort((a, b) => a.pricing.prompt - b.pricing.prompt).map(model => (
                    <tr key={model.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                            {model.provider.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-black text-white uppercase tracking-tight">{formatProviderName(model.provider)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-mono text-slate-500 group-hover:text-indigo-400 transition-colors">{model.id}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-300 tabular-nums">${model.pricing.prompt.toFixed(3)}</span>
                          {model.price_status === 'drop' && <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">Drop</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-slate-300 tabular-nums">${model.pricing.completion.toFixed(3)}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-slate-400 uppercase">{Math.floor(model.context_length / 1000)}K</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${Math.min(100, (1 / (model.pricing.prompt + 0.001)) * 5)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'subs' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-white mb-4">Subscription Break-Even Analysis</h2>
                <p className="text-slate-400">We compare your simulated API volume against premium subscription tiers. If the "Savings" indicator is green, the subscription is cheaper than direct API usage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {SUBSCRIPTIONS.map(sub => {
                    const savings = tokenVolume > sub.monthlyTokenEquivalent ? ( (tokenVolume / 1000000 * 5) - sub.cost) : ( (tokenVolume / 1000000 * 3) - sub.cost )
                    const isSaving = savings > 0
                    return (
                        <div key={sub.name} className={`glass rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden group transition-all hover:scale-[1.03] ${isSaving ? 'bg-emerald-500/5' : 'bg-slate-900/40'}`}>
                            <div className={`absolute top-0 right-0 p-4 bg-${sub.color}-500/20 text-${sub.color}-400 text-[10px] font-black uppercase rounded-bl-2xl border-l border-b border-white/5`}>{sub.provider}</div>
                            <h3 className="text-2xl font-black text-white mb-2">{sub.name}</h3>
                            <p className="text-slate-500 text-xs font-bold mb-8 uppercase tracking-widest">{sub.description}</p>
                            
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Fixed Cost</div>
                                    <div className="text-4xl font-black text-white">${sub.cost}<span className="text-sm text-slate-500">/mo</span></div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Token Capacity</div>
                                    <div className="text-xl font-black text-slate-300">~{sub.monthlyTokenEquivalent / 1000000}M</div>
                                </div>
                            </div>

                            <div className={`p-6 rounded-2xl border ${isSaving ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40'}`}>
                                {isSaving ? (
                                    <div className="text-center">
                                        <div className="text-emerald-400 font-black text-lg mb-1">PROFITABLE CHOICE</div>
                                        <div className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest">Est. ROI: {((savings/sub.cost)*100).toFixed(0)}%</div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-slate-500 font-black text-sm mb-1 uppercase">STICK TO API</div>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Need {((sub.monthlyTokenEquivalent - tokenVolume)/1000).toFixed(0)}K more tokens</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="glass rounded-[2.5rem] p-10 bg-slate-900/40 border border-white/5">
                <h4 className="text-xl font-bold mb-6">Volume Simulation Control</h4>
                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 w-full">
                        <input 
                            type="range" min="500000" max="50000000" step="500000"
                            value={tokenVolume} onChange={(e) => setTokenVolume(Number(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between mt-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            <span>0.5M Tokens</span>
                            <span>Current: {(tokenVolume/1000000).toFixed(1)}M Tokens</span>
                            <span>50M Tokens</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        ) : activeTab === 'intel' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-white mb-4">OpenClaw Intelligence Layer</h2>
                <p className="text-slate-400">Optimize your agentic workflows with model presets and local execution ROI analysis.</p>
            </div>

            {/* Presets Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {hardwareData?.presets.map((preset: any) => (
                    <div key={preset.id} className="glass rounded-[2rem] p-8 border border-white/5 bg-slate-900/40 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">{preset.name}</h3>
                            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full uppercase">{preset.focus}</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">{preset.description}</p>
                        <div className="space-y-2">
                            {preset.models.map((mId: string) => {
                                const model = models.find(m => m.id === mId)
                                return (
                                    <div key={mId} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-white/5">
                                        <span className="text-xs font-bold text-slate-300 truncate mr-2">{model?.name || mId}</span>
                                        <span className="text-[10px] font-mono text-indigo-400">
                                            {model ? `$${calculateModelCost(model).toFixed(2)}/mo` : 'N/A'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Hardware ROI Section */}
            <div className="glass rounded-[2.5rem] p-10 bg-slate-900/40 border border-white/5">
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-6">Local ROI Calculator</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest italic">Select Your Node Hardware</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {hardwareData?.hardware.map((hw: any) => (
                                        <button
                                            key={hw.id}
                                            onClick={() => setSelectedHardwareId(hw.id)}
                                            className={`p-4 rounded-2xl border text-left transition-all ${selectedHardwareId === hw.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-slate-950/40 hover:border-white/20'}`}
                                        >
                                            <div className="text-sm font-black text-white">{hw.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase">{hw.type} • ${hw.price}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest italic">Electricity ($/kWh)</label>
                                    <input 
                                        type="number" step="0.01" value={electricityRate} 
                                        onChange={(e) => setElectricityRate(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-white/5 rounded-xl py-3 px-5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest italic">Daily Usage (Hours)</label>
                                    <input 
                                        type="number" value={usageHoursPerDay} 
                                        onChange={(e) => setUsageHoursPerDay(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-white/5 rounded-xl py-3 px-5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-80 space-y-4">
                        {(() => {
                            const hw = hardwareData?.hardware.find((h: any) => h.id === selectedHardwareId)
                            if (!hw) return null
                            
                            const dailyElecCost = (hw.wattage / 1000) * usageHoursPerDay * electricityRate
                            const monthlyElecCost = dailyElecCost * 30
                            const monthlyCloudCost = (tokenVolume / 1000000) * 8 // Assuming $8/M tokens avg blend
                            const monthlySavings = monthlyCloudCost - monthlyElecCost
                            const breakEvenMonths = hw.price / monthlySavings

                            return (
                                <>
                                    <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                                        <div className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Monthly Local OpEx</div>
                                        <div className="text-3xl font-black text-white">${monthlyElecCost.toFixed(2)}</div>
                                        <div className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-widest">Electricity only</div>
                                    </div>

                                    <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                                        <div className="text-[10px] font-black text-emerald-400 uppercase mb-1 tracking-widest">Estimated Savings</div>
                                        <div className="text-3xl font-black text-white">${monthlySavings.toFixed(2)}</div>
                                        <div className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-widest">vs. Cloud API</div>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                                        <div className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Hardware Payback Period</div>
                                        <div className="text-2xl font-black text-white">{breakEvenMonths > 0 ? `${breakEvenMonths.toFixed(1)} Months` : 'N/A'}</div>
                                    </div>

                                    <div className={`p-6 rounded-3xl border transition-all cursor-pointer ${projectionEnabled ? 'bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-white/5 border-white/10 opacity-60'}`} onClick={() => setProjectionEnabled(!projectionEnabled)}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Rubin Projection (10x)</div>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${projectionEnabled ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${projectionEnabled ? 'left-4.5' : 'left-0.5'}`} />
                                            </div>
                                        </div>
                                        <div className="text-xl font-black text-white">
                                            {projectionEnabled ? `$${(monthlyCloudCost / 10).toFixed(2)}` : '---'}
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Projected Cloud Cost Floor</div>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* Global Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                <div className="lg:col-span-3 glass rounded-3xl p-6 bg-slate-900/40 border border-white/5 flex flex-wrap items-center gap-6">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest italic">Live Search</label>
                        <input 
                            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find specific models..."
                            className="w-full bg-slate-950 border border-white/5 rounded-xl py-3 px-5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {CATEGORY_TAGS.map(tag => (
                            <button 
                                key={tag}
                                onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag])}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedTags.includes(tag) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 border-white/5 text-slate-500 hover:border-slate-600'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="glass rounded-3xl p-6 bg-slate-900/40 border border-white/5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest italic">Sort Configuration</label>
                    <select 
                        value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl py-3 px-5 text-xs font-bold text-slate-400 outline-none cursor-pointer"
                    >
                        <option value="cost">Lowest Cost First</option>
                        <option value="elo">Performance Leaderboard</option>
                        <option value="name">Alphabetical (A-Z)</option>
                    </select>
                </div>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredModels.map(model => (
                    <div key={model.id} className="glass rounded-[2.5rem] p-8 border border-white/5 bg-slate-900/40 relative overflow-hidden group transition-all hover:border-indigo-500/30 hover:-translate-y-2 shadow-xl">
                        <div className="absolute top-0 right-0 flex">
                            {model.price_status === 'drop' && (
                                <div className="bg-emerald-500/20 text-emerald-400 border-l border-b border-emerald-500/10 text-[8px] font-black px-3 py-1.5 uppercase tracking-widest animate-pulse">
                                    📉 Price Drop
                                </div>
                            )}
                            {model.price_status === 'hike' && (
                                <div className="bg-red-500/20 text-red-400 border-l border-b border-red-500/10 text-[8px] font-black px-3 py-1.5 uppercase tracking-widest">
                                    📈 Price Hike
                                </div>
                            )}
                            {(model.scores.overall && model.scores.overall > 1300) && (
                                <div className="bg-amber-500/20 text-amber-400 border-l border-b border-amber-500/10 text-[8px] font-black px-3 py-1.5 uppercase tracking-widest animate-pulse">
                                    🔥 Trending
                                </div>
                            )}
                            {model.scores.overall && (
                                <div className="bg-indigo-500/20 text-indigo-400 border-l border-b border-indigo-500/10 text-[10px] font-black px-4 py-2 rounded-bl-2xl backdrop-blur-md">
                                    {activeTab === 'coding' ? `CODE ${model.scores.coding}` : activeTab === 'vision' ? `VISION ${model.scores.vision}` : activeTab === 'logic' ? `HARD ${model.scores.hard}` : `ELO ${model.scores.overall}`}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-1.5 mb-4">
                            {model.tags.map(tag => (
                                <span key={tag} className="text-[8px] font-black uppercase tracking-widest text-slate-600 bg-slate-950 px-2 py-0.5 rounded border border-white/5">{tag}</span>
                            ))}
                        </div>

                        <h3 className="text-xl font-black text-white mb-1 group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate">{model.name}</h3>
                        <p className="text-slate-600 text-[9px] font-mono mb-6 uppercase tracking-widest truncate">{model.id}</p>

                        {/* Baki Insight Section */}
                        <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-all">
                            <div className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 italic">Baki Intelligence Report</div>
                            <p className="text-slate-400 text-[10px] leading-relaxed font-medium">
                                {model.baki_report || (
                                    model.scores.coding && model.scores.coding > 1300 ? "Elite architectural reasoning detected. Top-tier for autonomous coding agents." : 
                                    model.pricing.prompt < 0.1 ? "Exceptional cost-to-performance ratio. Recommended for high-volume summarization." :
                                    model.context_length > 500000 ? "Massive context window optimized for deep document analysis and RAG." :
                                    "Balanced performance profile. Reliable for general purpose conversational AI."
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-10">
                            <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                                <div className="text-[8px] text-slate-600 font-black mb-1 uppercase">Input / 1M</div>
                                <div className="text-sm font-black text-slate-300">${model.pricing.prompt.toFixed(3)}</div>
                            </div>
                            <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                                <div className="text-[8px] text-slate-600 font-black mb-1 uppercase">Output / 1M</div>
                                <div className="text-sm font-black text-slate-300">${model.pricing.completion.toFixed(3)}</div>
                            </div>
                        </div>

                        <div className="p-6 bg-indigo-500/5 rounded-[1.5rem] border border-indigo-500/10 flex justify-between items-center group-hover:bg-indigo-500/10 transition-all shadow-inner">
                            <div>
                                <div className="text-[8px] text-indigo-400/80 font-black mb-1 uppercase tracking-widest">Est. Monthly Cost</div>
                                <div className="text-3xl font-black text-white tracking-tighter">${calculateModelCost(model).toFixed(1)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[8px] text-slate-600 font-black mb-1 uppercase tracking-widest">Context</div>
                                <div className="text-xs font-black text-slate-500">{Math.floor(model.context_length / 1000)}K</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-20 px-4 bg-slate-950 border-t border-white/5 text-center relative mt-20">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
         <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.5em] mb-4">ModelMatrix Efficiency Systems &copy; 2026</p>
         <div className="text-[8px] font-bold text-slate-800 uppercase tracking-widest max-w-2xl mx-auto leading-loose">
            Enterprise Grade Cost Mapping. Verified Data Sources from LMSYS Arena & OpenRouter API.
         </div>
      </footer>
    </div>
  )
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const particles: any[] = []
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.05
      })
    }

    let animationFrame: number
    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
      animationFrame = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none opacity-40" />
  )
}

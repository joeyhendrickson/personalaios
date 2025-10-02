'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Settings,
  Plus,
  Trash2,
  Search,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  X,
  Edit,
  Save,
  Eye,
  EyeOff,
  Brain,
  Calendar,
  Clock,
  Star,
  TrendingDown,
  Activity,
  Zap,
} from 'lucide-react'

interface InformationSource {
  id: string
  name: string
  type: 'twitter' | 'news' | 'google_news' | 'other'
  weight: number
  isActive: boolean
}

interface TradingConfig {
  buyingPower: number
  stockSymbol: string
  investorType: 'long_term' | 'scalper' | 'options_trader' | 'gambler'
  informationSources: InformationSource[]
  eventMonitoring: {
    earnings: boolean
    federalEvents: boolean
    tariffs: boolean
    rateCuts: boolean
    employment: boolean
    interestRates: boolean
    recession: boolean
    monetaryPolicy: boolean
    industryTrends: boolean
    analystRatings: boolean
  }
}

interface TradingPattern {
  name: string
  description: string
  confidence: number
  timeframe: string
  implications: string
  chartLocation?: string
  currentStatus?: string
  keyLevels?: string[]
  imageUrl?: string
}

interface Prediction {
  direction: 'up' | 'down' | 'sideways'
  confidence: number
  timeframes: {
    morning: string
    afternoon: string
    endOfDay: string
  }
  keyIndicators: string[]
  riskLevel: 'low' | 'medium' | 'high'
  optionsStrategy?: {
    calls?: {
      strikePrice: number
      timeWindow: string
      expectedProfit: string
      riskLevel: string
    }
    puts?: {
      strikePrice: number
      timeWindow: string
      expectedProfit: string
      riskLevel: string
    }
  }
  positionSizing?: {
    totalBuyingPower: number
    recommendedAllocation: number
    maxRiskPerTrade: number
    numberOfContracts: number
  }
}

interface ProfitAdvisor {
  advisorSummary: {
    feasibility: 'high' | 'medium' | 'low'
    riskAssessment: 'low' | 'medium' | 'high'
    recommendedApproach: string
    dailyTarget: number
    totalTarget: number
    timeframe: number
  }
  optimalTrades: Array<{
    tradeType: 'shares' | 'options_calls' | 'options_puts'
    strategy: string
    entryPrice: number
    targetPrice: number
    stopLoss: number
    positionSize: number
    investmentAmount: number
    expectedProfit: number
    riskLevel: 'low' | 'medium' | 'high'
    timeframe: string
    confidence: number
    reasoning: string
    executionWindow: string
    exitStrategy: string
  }>
  riskManagement: {
    maxRiskPerTrade: number
    totalPortfolioRisk: number
    positionSizing: string
    stopLossStrategy: string
  }
  dailyPlan: {
    day1: string
    day2: string
    day3?: string
  }
  contingencyPlans: string[]
  successMetrics: {
    minimumDailyProfit: string
    targetDailyProfit: string
    maximumAcceptableLoss: string
  }
}

export default function DayTraderModule() {
  const [config, setConfig] = useState<TradingConfig>({
    buyingPower: 1000,
    stockSymbol: '',
    investorType: 'long_term',
    informationSources: [],
    eventMonitoring: {
      earnings: true,
      federalEvents: true,
      tariffs: false,
      rateCuts: true,
      employment: true,
      interestRates: true,
      recession: false,
      monetaryPolicy: false,
      industryTrends: true,
      analystRatings: true,
    },
  })

  const [manualStockData, setManualStockData] = useState({
    currentPrice: '',
    open: '',
    high: '',
    low: '',
    volume: '',
    previousClose: '',
  })

  const [isEditing, setIsEditing] = useState(true)
  const [showPatterns, setShowPatterns] = useState(false)
  const [showPrediction, setShowPrediction] = useState(false)
  const [patterns, setPatterns] = useState<TradingPattern[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [profitAdvisor, setProfitAdvisor] = useState<ProfitAdvisor | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', type: 'twitter' as const, weight: 50 })
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [profitGoal, setProfitGoal] = useState('')
  const [timeframeDays, setTimeframeDays] = useState('')
  const [showProfitAdvisor, setShowProfitAdvisor] = useState(false)

  const investorTypes = [
    {
      value: 'long_term',
      label: 'Long Term Investor',
      description: 'Buy shares and hold longer than 3 months',
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      value: 'scalper',
      label: 'Scalper',
      description: 'Buy options during short term momentum lows and highs',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      value: 'options_trader',
      label: 'Options Trader',
      description: 'Buying options calls and puts with reasonable theta for high risk trading',
      icon: <Target className="h-4 w-4" />,
    },
    {
      value: 'gambler',
      label: 'Gambler',
      description:
        'Buying calls options or puts with less than 1 week theta for highest return possible, but could lose everything fast',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ]

  const addInformationSource = () => {
    if (newSource.name.trim()) {
      const source: InformationSource = {
        id: Date.now().toString(),
        name: newSource.name.trim(),
        type: newSource.type,
        weight: newSource.weight,
        isActive: true,
      }
      setConfig((prev) => ({
        ...prev,
        informationSources: [...prev.informationSources, source],
      }))
      setNewSource({ name: '', type: 'twitter', weight: 50 })
    }
  }

  const removeInformationSource = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      informationSources: prev.informationSources.filter((source) => source.id !== id),
    }))
  }

  const updateSourceWeight = (id: string, weight: number) => {
    setConfig((prev) => ({
      ...prev,
      informationSources: prev.informationSources.map((source) =>
        source.id === id ? { ...source, weight } : source
      ),
    }))
  }

  const toggleSourceActive = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      informationSources: prev.informationSources.map((source) =>
        source.id === id ? { ...source, isActive: !source.isActive } : source
      ),
    }))
  }

  const generateChartImage = async (pattern: any) => {
    try {
      const response = await fetch('/api/modules/day-trader/generate-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockSymbol: config.stockSymbol,
          patternName: pattern.name,
          patternDescription: pattern.description,
          chartLocation: pattern.chartLocation || 'Recent chart data',
          keyLevels: pattern.keyLevels || [],
          timeframe: pattern.timeframe,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.imageUrl
      } else {
        console.error('Failed to generate chart image')
        return null
      }
    } catch (error) {
      console.error('Error generating chart image:', error)
      return null
    }
  }

  const detectTradingPatterns = async () => {
    if (!config.stockSymbol) {
      alert('Please enter a stock symbol first')
      return
    }

    setIsAnalyzing(true)
    setShowPatterns(true)

    try {
      const response = await fetch('/api/modules/day-trader/patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockSymbol: config.stockSymbol,
          investorType: config.investorType,
          informationSources: config.informationSources,
          eventMonitoring: config.eventMonitoring,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Pattern analysis response:', data)

        const analysis = data.analysis
        console.log('Analysis data:', analysis)

        // Convert AI analysis to pattern format with new fields
        const patterns: TradingPattern[] =
          analysis.patterns?.map((pattern: any) => ({
            name: pattern.name,
            description: pattern.description,
            confidence: pattern.confidence,
            timeframe: pattern.timeframe,
            implications: pattern.implications,
            chartLocation: pattern.chartLocation,
            currentStatus: pattern.currentStatus,
            keyLevels: pattern.keyLevels,
          })) || []

        console.log('Parsed patterns:', patterns)
        setPatterns(patterns)

        // Generate chart images for each pattern
        for (let i = 0; i < patterns.length; i++) {
          const imageUrl = await generateChartImage(patterns[i])
          if (imageUrl) {
            setPatterns((prev) => prev.map((p, index) => (index === i ? { ...p, imageUrl } : p)))
          }
        }
      } else {
        const errorData = await response.json()
        console.error('Error analyzing patterns:', errorData)
        alert(`Error analyzing patterns: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error analyzing patterns:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
      })
      alert(
        `Failed to analyze trading patterns: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generatePrediction = async () => {
    if (!config.stockSymbol) {
      alert('Please enter a stock symbol first')
      return
    }

    setIsAnalyzing(true)
    setShowPrediction(true)

    try {
      const response = await fetch('/api/modules/day-trader/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockSymbol: config.stockSymbol,
          buyingPower: config.buyingPower,
          investorType: config.investorType,
          informationSources: config.informationSources,
          eventMonitoring: config.eventMonitoring,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const predictionData = data.prediction

        // Convert AI prediction to our format
        const prediction: Prediction = {
          direction: predictionData.direction || 'sideways',
          confidence: predictionData.confidence || 70,
          timeframes: {
            morning: predictionData.timeframes?.morning || 'Morning analysis provided',
            afternoon: predictionData.timeframes?.afternoon || 'Afternoon analysis provided',
            endOfDay: predictionData.timeframes?.endOfDay || 'End of day analysis provided',
          },
          keyIndicators: predictionData.keyIndicators || [
            'Volume analysis',
            'Price action monitoring',
          ],
          riskLevel: predictionData.riskLevel || 'medium',
        }

        setPrediction(prediction)
      } else {
        const errorData = await response.json()
        console.error('Error generating prediction:', errorData)
        alert(`Error generating prediction: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating prediction:', error)
      alert('Failed to generate prediction. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const recommendSources = async () => {
    if (!config.stockSymbol) {
      alert('Please enter a stock symbol first')
      return
    }

    try {
      const response = await fetch('/api/modules/day-trader/recommend-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockSymbol: config.stockSymbol,
          investorType: config.investorType,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const recommendations = data.recommendations

        // Add recommended sources to the list
        const newSources =
          recommendations.sources?.map((source: any) => ({
            id: Date.now().toString() + Math.random(),
            name: source.name,
            type: source.type,
            weight: source.suggestedWeight || 50,
            isActive: true,
          })) || []

        setConfig((prev) => ({
          ...prev,
          informationSources: [...prev.informationSources, ...newSources],
        }))

        alert(`Added ${newSources.length} recommended sources for ${config.stockSymbol}`)
      } else {
        const errorData = await response.json()
        console.error('Error getting recommendations:', errorData)
        alert(`Error getting recommendations: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error getting recommendations:', error)
      alert('Failed to get source recommendations. Please try again.')
    }
  }

  const getInvestorTypeInfo = (type: string) => {
    return investorTypes.find((t) => t.value === type) || investorTypes[0]
  }

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'high':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const generateProfitAdvisor = async () => {
    if (!config.stockSymbol || !profitGoal || !timeframeDays) {
      alert('Please enter stock symbol, profit goal, and timeframe first')
      return
    }

    if (!patterns.length || !prediction) {
      alert('Please complete both pattern analysis and prediction first')
      return
    }

    setIsAnalyzing(true)
    setShowProfitAdvisor(true)

    try {
      const response = await fetch('/api/modules/day-trader/profit-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockSymbol: config.stockSymbol,
          buyingPower: config.buyingPower,
          investorType: config.investorType,
          profitGoal: parseFloat(profitGoal),
          timeframeDays: parseInt(timeframeDays),
          patterns: patterns,
          prediction: prediction,
          informationSources: config.informationSources,
          eventMonitoring: config.eventMonitoring,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfitAdvisor(data.advisor)
      } else {
        const errorData = await response.json()
        console.error('Error generating profit advisor:', errorData)
        alert(`Error generating profit advisor: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating profit advisor:', error)
      alert('Failed to generate profit advisor. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Modules
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <TrendingUp className="h-8 w-8 mr-3 text-green-600" />
                  Day Trader
                </h1>
                <p className="text-sm text-gray-600">
                  Advanced stock analysis and trading pattern detection with AI-powered insights
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3"
              >
                <Settings className="h-4 w-4" />
                {isEditing ? 'Save' : 'Edit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Trading Configuration
              </h2>

              {/* Buying Power */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Buying Power</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="number"
                    min="100"
                    max="1000000"
                    value={config.buyingPower}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        buyingPower: parseInt(e.target.value) || 100,
                      }))
                    }
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Range: $100 - $1,000,000</p>
              </div>

              {/* Stock Symbol */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Symbol</label>
                <input
                  type="text"
                  placeholder="e.g., AAPL, TSLA, MSFT"
                  value={config.stockSymbol}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, stockSymbol: e.target.value.toUpperCase() }))
                  }
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>

              {/* Investor Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investor Type
                </label>
                <div className="space-y-2">
                  {investorTypes.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="investorType"
                        value={type.value}
                        checked={config.investorType === type.value}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, investorType: e.target.value as any }))
                        }
                        disabled={!isEditing}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {type.icon}
                          <span className="font-medium text-sm">{type.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Information Sources */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Information Sources
                  </label>
                  <span className="text-xs text-gray-500">
                    {config.informationSources.length}/20
                  </span>
                </div>

                {/* Add New Source */}
                {isEditing && config.informationSources.length < 20 && (
                  <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="Source name (e.g., @username, Wall Street Journal)"
                        value={newSource.name}
                        onChange={(e) =>
                          setNewSource((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <select
                        value={newSource.type}
                        onChange={(e) =>
                          setNewSource((prev) => ({ ...prev, type: e.target.value as any }))
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="twitter">Twitter/X</option>
                        <option value="news">News Channel</option>
                        <option value="google_news">Google News</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Weight:</span>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={newSource.weight}
                          onChange={(e) =>
                            setNewSource((prev) => ({ ...prev, weight: parseInt(e.target.value) }))
                          }
                          className="w-20"
                        />
                        <span className="text-xs text-gray-500 w-8">{newSource.weight}%</span>
                      </div>
                      <button
                        onClick={addInformationSource}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sources List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {config.informationSources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        {isEditing ? (
                          <button
                            onClick={() => toggleSourceActive(source.id)}
                            className={`p-1 rounded ${source.isActive ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {source.isActive ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </button>
                        ) : (
                          <div
                            className={`p-1 rounded ${source.isActive ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {source.isActive ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </div>
                        )}
                        <span className="text-sm flex-1">{source.name}</span>
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          {source.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={source.weight}
                              onChange={(e) =>
                                updateSourceWeight(source.id, parseInt(e.target.value))
                              }
                              className="w-16"
                            />
                            <span className="text-xs text-gray-500 w-8">{source.weight}%</span>
                            <button
                              onClick={() => removeInformationSource(source.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">{source.weight}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <button
                    onClick={recommendSources}
                    className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    + Recommend Sources
                  </button>
                )}
              </div>

              {/* Event Monitoring */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Event Monitoring
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config.eventMonitoring).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            eventMonitoring: { ...prev.eventMonitoring, [key]: e.target.checked },
                          }))
                        }
                        disabled={!isEditing}
                        className="rounded"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Profit Advisor Configuration */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Profit Advisor
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-1">Prerequisites</h4>
                      <p className="text-sm text-blue-700">
                        Complete both "Detect Trading Patterns" and "Generate Prediction" before
                        using Profit Advisor.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profit Goal ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="number"
                        min="1"
                        max="1000000"
                        value={profitGoal}
                        onChange={(e) => setProfitGoal(e.target.value)}
                        disabled={!isEditing}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                        placeholder="e.g., 1000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeframe (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={timeframeDays}
                      onChange={(e) => setTimeframeDays(e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      placeholder="e.g., 2"
                    />
                  </div>

                  <button
                    onClick={generateProfitAdvisor}
                    disabled={
                      isAnalyzing ||
                      !config.stockSymbol ||
                      !profitGoal ||
                      !timeframeDays ||
                      !patterns.length ||
                      !prediction
                    }
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Target className="h-5 w-5" />
                    <span>Generate Profit Advisor</span>
                  </button>

                  {(!patterns.length || !prediction) && (
                    <div className="text-xs text-gray-500 text-center">
                      Complete pattern analysis and prediction first
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={detectTradingPatterns}
                    disabled={isAnalyzing || !config.stockSymbol}
                    className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>Detect Trading Patterns</span>
                  </button>
                  <button
                    onClick={generatePrediction}
                    disabled={isAnalyzing || !config.stockSymbol}
                    className="flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="h-5 w-5" />
                    <span>Generate Prediction</span>
                  </button>
                </div>
                {isAnalyzing && (
                  <div className="mt-4 flex items-center space-x-2 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm">AI is analyzing market data...</span>
                  </div>
                )}
              </div>

              {/* Trading Patterns */}
              {showPatterns && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Day Trading Pattern Analysis (Last 24 Hours)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Analysis based on consolidation patterns, structural patterns, and candlestick
                    formations from the last trading day.
                  </p>

                  {/* Data Warning */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Data Source Notice</h4>
                        <p className="text-sm text-gray-700 mb-2">
                          We're working to integrate reliable real-time stock data sources. Current
                          analysis may be based on general market knowledge rather than live data.
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                          ⚠️ Always verify current stock prices and market data independently before
                          making trading decisions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manual Stock Data Input */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Manual Stock Data Input (Optional)
                    </h4>
                    <p className="text-sm text-gray-700 mb-4">
                      For more accurate analysis, you can manually input current stock data:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Current Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualStockData.currentPrice}
                          onChange={(e) =>
                            setManualStockData((prev) => ({
                              ...prev,
                              currentPrice: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 20.71"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Open</label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualStockData.open}
                          onChange={(e) =>
                            setManualStockData((prev) => ({ ...prev, open: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 20.50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">High</label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualStockData.high}
                          onChange={(e) =>
                            setManualStockData((prev) => ({ ...prev, high: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 21.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Low</label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualStockData.low}
                          onChange={(e) =>
                            setManualStockData((prev) => ({ ...prev, low: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 20.30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Volume
                        </label>
                        <input
                          type="number"
                          value={manualStockData.volume}
                          onChange={(e) =>
                            setManualStockData((prev) => ({ ...prev, volume: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 1000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Previous Close
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualStockData.previousClose}
                          onChange={(e) =>
                            setManualStockData((prev) => ({
                              ...prev,
                              previousClose: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 20.45"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {patterns.map((pattern, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{pattern.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  pattern.name.toLowerCase().includes('flag') ||
                                  pattern.name.toLowerCase().includes('pennant') ||
                                  pattern.name.toLowerCase().includes('triangle')
                                    ? 'bg-gray-100 text-gray-800'
                                    : pattern.name.toLowerCase().includes('double') ||
                                        pattern.name.toLowerCase().includes('head')
                                      ? 'bg-gray-200 text-gray-900'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {pattern.name.toLowerCase().includes('flag') ||
                                pattern.name.toLowerCase().includes('pennant') ||
                                pattern.name.toLowerCase().includes('triangle')
                                  ? 'Consolidation Pattern'
                                  : pattern.name.toLowerCase().includes('double') ||
                                      pattern.name.toLowerCase().includes('head')
                                    ? 'Structural Pattern'
                                    : 'Candlestick Pattern'}
                              </span>
                              <span className="text-sm text-gray-500">{pattern.timeframe}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                              {pattern.confidence}% confidence
                            </span>
                            {pattern.currentStatus && (
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  pattern.currentStatus === 'confirmed'
                                    ? 'bg-gray-200 text-gray-900'
                                    : pattern.currentStatus === 'developing'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {pattern.currentStatus}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chart Image */}
                        {pattern.imageUrl && (
                          <div className="mb-4">
                            <img
                              src={pattern.imageUrl}
                              alt={`${pattern.name} chart for ${config.stockSymbol}`}
                              className="w-full h-64 object-contain border border-gray-200 rounded"
                            />
                          </div>
                        )}

                        <p className="text-gray-600 mb-3">{pattern.description}</p>

                        {/* Chart Location */}
                        {pattern.chartLocation && (
                          <div className="bg-gray-50 p-3 rounded mb-3">
                            <h5 className="font-medium text-sm mb-1 flex items-center">
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Chart Location:
                            </h5>
                            <p className="text-sm text-gray-700">{pattern.chartLocation}</p>
                          </div>
                        )}

                        {/* Key Levels */}
                        {pattern.keyLevels && pattern.keyLevels.length > 0 && (
                          <div className="bg-gray-50 p-3 rounded mb-3">
                            <h5 className="font-medium text-sm mb-1 flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              Key Price Levels:
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {pattern.keyLevels.map((level, levelIndex) => (
                                <span
                                  key={levelIndex}
                                  className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded"
                                >
                                  {level}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-50 p-3 rounded">
                          <h5 className="font-medium text-sm mb-1">Implications:</h5>
                          <p className="text-sm text-gray-700">{pattern.implications}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prediction */}
              {showPrediction && prediction && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    AI Prediction & Strategic Advisory
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prediction Summary */}
                    <div className="space-y-4">
                      <div
                        className={`p-4 rounded-lg border ${getDirectionColor(prediction.direction)}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Daily Direction</h4>
                          <span className="text-2xl font-bold capitalize">
                            {prediction.direction}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Confidence</span>
                          <span className="font-semibold">{prediction.confidence}%</span>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Risk Level</h4>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(prediction.riskLevel)}`}
                        >
                          {prediction.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Timeframes */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Time-Based Analysis</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">Morning (9:30-11:00 AM)</span>
                          </div>
                          <p className="text-sm text-gray-700">{prediction.timeframes.morning}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium text-sm">Afternoon (1:00-3:00 PM)</span>
                          </div>
                          <p className="text-sm text-gray-700">{prediction.timeframes.afternoon}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">Power Hour (3:30-4:00 PM)</span>
                          </div>
                          <p className="text-sm text-gray-700">{prediction.timeframes.endOfDay}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options Strategy */}
                  {prediction.optionsStrategy && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Options Strategy
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prediction.optionsStrategy.calls && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-800">CALLS</span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">Strike Price:</span> $
                                {prediction.optionsStrategy.calls.strikePrice}
                              </div>
                              <div>
                                <span className="font-medium">Watch Window:</span>{' '}
                                {prediction.optionsStrategy.calls.timeWindow}
                              </div>
                              <div>
                                <span className="font-medium">Expected Profit:</span>{' '}
                                {prediction.optionsStrategy.calls.expectedProfit}
                              </div>
                              <div>
                                <span className="font-medium">Risk Level:</span>{' '}
                                {prediction.optionsStrategy.calls.riskLevel}
                              </div>
                            </div>
                          </div>
                        )}
                        {prediction.optionsStrategy.puts && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              <span className="font-semibold text-red-800">PUTS</span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">Strike Price:</span> $
                                {prediction.optionsStrategy.puts.strikePrice}
                              </div>
                              <div>
                                <span className="font-medium">Watch Window:</span>{' '}
                                {prediction.optionsStrategy.puts.timeWindow}
                              </div>
                              <div>
                                <span className="font-medium">Expected Profit:</span>{' '}
                                {prediction.optionsStrategy.puts.expectedProfit}
                              </div>
                              <div>
                                <span className="font-medium">Risk Level:</span>{' '}
                                {prediction.optionsStrategy.puts.riskLevel}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Position Sizing */}
                  {prediction.positionSizing && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        Position Sizing
                      </h4>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Total Buying Power:</span>
                            <div className="text-lg font-semibold">
                              ${prediction.positionSizing.totalBuyingPower?.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Recommended Allocation:</span>
                            <div className="text-lg font-semibold">
                              ${prediction.positionSizing.recommendedAllocation?.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Max Risk Per Trade:</span>
                            <div className="text-lg font-semibold">
                              ${prediction.positionSizing.maxRiskPerTrade?.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Number of Contracts:</span>
                            <div className="text-lg font-semibold">
                              {prediction.positionSizing.numberOfContracts}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Indicators */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Key Indicators to Watch</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {prediction.keyIndicators.map((indicator, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{indicator}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Profit Advisor */}
              {showProfitAdvisor && profitAdvisor && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Profit Advisor - ${profitAdvisor.advisorSummary.totalTarget.toLocaleString()} in{' '}
                    {profitAdvisor.advisorSummary.timeframe} Days
                  </h3>

                  {/* Advisor Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div
                      className={`p-4 rounded-lg border ${
                        profitAdvisor.advisorSummary.feasibility === 'high'
                          ? 'bg-green-50 border-green-200'
                          : profitAdvisor.advisorSummary.feasibility === 'medium'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Feasibility</h4>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            profitAdvisor.advisorSummary.feasibility === 'high'
                              ? 'bg-green-100 text-green-800'
                              : profitAdvisor.advisorSummary.feasibility === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {profitAdvisor.advisorSummary.feasibility.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {profitAdvisor.advisorSummary.recommendedApproach}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold mb-2">Daily Target</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        ${profitAdvisor.advisorSummary.dailyTarget.toFixed(2)}
                      </div>
                      <p className="text-sm text-gray-600">Required daily profit</p>
                    </div>

                    <div
                      className={`p-4 rounded-lg border ${getRiskColor(profitAdvisor.advisorSummary.riskAssessment)}`}
                    >
                      <h4 className="font-semibold mb-2">Risk Assessment</h4>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(profitAdvisor.advisorSummary.riskAssessment)}`}
                      >
                        {profitAdvisor.advisorSummary.riskAssessment.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Optimal Trades */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Optimal Trade Recommendations
                    </h4>
                    <div className="space-y-4">
                      {profitAdvisor.optimalTrades.map((trade, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-semibold text-lg">{trade.strategy}</h5>
                              <div className="flex items-center space-x-2 mt-1">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    trade.tradeType === 'shares'
                                      ? 'bg-blue-100 text-blue-800'
                                      : trade.tradeType === 'options_calls'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {trade.tradeType.replace('_', ' ').toUpperCase()}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${getRiskColor(trade.riskLevel)}`}
                                >
                                  {trade.riskLevel.toUpperCase()}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  {trade.confidence}% confidence
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                +${trade.expectedProfit.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">Expected Profit</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-600">
                                Entry Price:
                              </span>
                              <div className="font-semibold">${trade.entryPrice.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-600">
                                Target Price:
                              </span>
                              <div className="font-semibold text-green-600">
                                ${trade.targetPrice.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-600">Stop Loss:</span>
                              <div className="font-semibold text-red-600">
                                ${trade.stopLoss.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-600">
                                Position Size:
                              </span>
                              <div className="font-semibold">{trade.positionSize}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-600">
                                Investment Amount:
                              </span>
                              <div className="font-semibold">
                                ${trade.investmentAmount.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-600">
                                Execution Window:
                              </span>
                              <div className="font-semibold">{trade.executionWindow}</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-3 rounded">
                            <h6 className="font-medium text-sm mb-1">Reasoning:</h6>
                            <p className="text-sm text-gray-700">{trade.reasoning}</p>
                          </div>

                          <div className="bg-blue-50 p-3 rounded mt-2">
                            <h6 className="font-medium text-sm mb-1">Exit Strategy:</h6>
                            <p className="text-sm text-gray-700">{trade.exitStrategy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Management */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Risk Management
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Max Risk Per Trade:</span>
                            <span className="font-semibold">
                              ${profitAdvisor.riskManagement.maxRiskPerTrade.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Total Portfolio Risk:</span>
                            <span className="font-semibold">
                              ${profitAdvisor.riskManagement.totalPortfolioRisk.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Position Sizing:</span>
                            <span className="font-semibold">
                              {profitAdvisor.riskManagement.positionSizing}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h6 className="font-medium text-sm mb-2">Stop Loss Strategy:</h6>
                        <p className="text-sm text-gray-700">
                          {profitAdvisor.riskManagement.stopLossStrategy}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Daily Plan */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Daily Execution Plan
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">Day 1:</span>
                        </div>
                        <p className="text-sm text-gray-700">{profitAdvisor.dailyPlan.day1}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">Day 2:</span>
                        </div>
                        <p className="text-sm text-gray-700">{profitAdvisor.dailyPlan.day2}</p>
                      </div>
                      {profitAdvisor.dailyPlan.day3 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">Day 3:</span>
                          </div>
                          <p className="text-sm text-gray-700">{profitAdvisor.dailyPlan.day3}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Success Metrics */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Star className="h-5 w-5 mr-2" />
                      Success Metrics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                        <div className="text-lg font-semibold text-green-600">
                          ${profitAdvisor.successMetrics.minimumDailyProfit}
                        </div>
                        <div className="text-sm text-gray-600">Minimum Daily Profit</div>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          ${profitAdvisor.successMetrics.targetDailyProfit}
                        </div>
                        <div className="text-sm text-gray-600">Target Daily Profit</div>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                        <div className="text-lg font-semibold text-red-600">
                          ${profitAdvisor.successMetrics.maximumAcceptableLoss}
                        </div>
                        <div className="text-sm text-gray-600">Max Acceptable Loss</div>
                      </div>
                    </div>
                  </div>

                  {/* Contingency Plans */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Contingency Plans
                    </h4>
                    <div className="space-y-2">
                      {profitAdvisor.contingencyPlans.map((plan, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 p-2 bg-gray-50 rounded"
                        >
                          <AlertTriangle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{plan}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Disclaimer */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Legal Disclaimer</h4>
                    <p className="text-sm text-red-700 mt-1">
                      This is not financial advice. All trading involves risk, and you should only
                      trade with money you can afford to lose. Past performance does not guarantee
                      future results. Please consult with a qualified financial advisor before
                      making any investment decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

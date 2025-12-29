'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ConnectBankButton } from '@/components/modules/budget-optimizer/connect-bank-button'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target,
  PiggyBank,
  Settings,
  Download,
  Upload,
  Brain,
  Star,
  Activity,
  Zap,
} from 'lucide-react'

interface BankConnection {
  id: string
  institution_name: string
  status: string
  created_at: string
  last_sync_at: string
  bank_accounts: BankAccount[]
}

interface BankAccount {
  id: string
  account_id: string
  name: string
  official_name: string
  type: string
  subtype: string
  mask: string
  current_balance: number
  available_balance: number
  iso_currency_code: string
}

interface Transaction {
  id: string
  amount: number
  date: string
  name: string
  merchant_name: string
  category: string[]
  pending: boolean
  bank_accounts: {
    name: string
    type: string
  }
  transaction_categorizations: Array<{
    budget_categories: {
      name: string
      color: string
      icon: string
    }
  }>
}

interface BudgetAnalysis {
  spending_patterns: {
    trends: string[]
    unusual_spending: string[]
    seasonal_patterns: string[]
  }
  savings_opportunities: Array<{
    category: string
    current_spending: number
    potential_savings: number
    savings_percentage: number
    recommendation: string
  }>
  budget_recommendations: {
    income_allocation: {
      needs: number
      wants: number
      savings: number
    }
    category_budgets: Array<{
      category: string
      recommended_amount: number
      current_spending: number
      adjustment: number
      reasoning: string
    }>
  }
  financial_health: {
    score: number
    assessment: string
    strengths: string[]
    concerns: string[]
  }
  actionable_insights: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    impact: string
    timeline: string
  }>
  monthly_budget_suggestion: {
    total_income: number
    recommended_expenses: number
    recommended_savings: number
    breakdown: string
  }
}

export default function BudgetOptimizerModule() {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analysis' | 'settings'>(
    'overview'
  )
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  // Load bank connections on component mount
  useEffect(() => {
    loadBankConnections()
  }, [])

  const loadBankConnections = async () => {
    try {
      const response = await fetch('/api/budget/connections')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Error loading bank connections:', error)
    }
  }

  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/budget/transactions?start_date=${dateRange.start}&end_date=${dateRange.end}&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBankConnectionSuccess = async (connectionId: string, institutionName: string) => {
    console.log('Bank connection successful:', institutionName)
    alert(`✅ Successfully connected ${institutionName}!`)

    // Reload connections and transactions
    await loadBankConnections()

    // Auto-sync transactions for the new connection
    await syncTransactions(connectionId)
  }

  const handleBankConnectionError = (error: string) => {
    console.error('Bank connection error:', error)
    alert(`Failed to connect bank: ${error}`)
  }

  const syncTransactions = async (connectionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/modules/budget-optimizer/plaid/sync-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_connection_id: connectionId,
          start_date: dateRange.start,
          end_date: dateRange.end,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Sync result:', data)
        // Reload transactions after sync
        await loadTransactions()
        // Reload connections to update last sync time
        await loadBankConnections()
      }
    } catch (error) {
      console.error('Error syncing transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeBudget = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/budget/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: dateRange.start,
          end_date: dateRange.end,
          analysis_type: 'comprehensive',
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
        setActiveTab('analysis')
      }
    } catch (error) {
      console.error('Error analyzing budget:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConnection = async (connectionId: string) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this bank account? This will also delete all associated transaction data.'
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/budget/connections?id=${connectionId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await loadBankConnections()
        await loadTransactions()
      }
    } catch (error) {
      console.error('Error deleting connection:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
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
                  <PiggyBank className="h-8 w-8 mr-3 text-blue-600" />
                  Budget Optimizer
                </h1>
                <p className="text-sm text-gray-600">
                  AI-powered budget analysis and financial optimization with secure bank integration
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('settings')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'transactions', label: 'Transactions', icon: CreditCard },
                { id: 'analysis', label: 'AI Analysis', icon: Brain },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Bank Connections */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Bank Connections
                </h2>
                <ConnectBankButton
                  onSuccess={handleBankConnectionSuccess}
                  onError={handleBankConnectionError}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                />
              </div>

              {connections.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Bank Accounts Connected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Connect your bank account to start tracking your spending and get AI-powered
                    budget insights.
                  </p>
                  <ConnectBankButton
                    onSuccess={handleBankConnectionSuccess}
                    onError={handleBankConnectionError}
                    variant="default"
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Connect Your First Bank Account</span>
                  </ConnectBankButton>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Building2 className="h-8 w-8 text-blue-600" />
                          <div>
                            <h3 className="font-semibold">{connection.institution_name}</h3>
                            <p className="text-sm text-gray-600">
                              Connected {new Date(connection.created_at).toLocaleDateString()}
                              {connection.last_sync_at && (
                                <span>
                                  {' '}
                                  • Last synced{' '}
                                  {new Date(connection.last_sync_at).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              connection.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {connection.status}
                          </span>
                          <button
                            onClick={() => syncTransactions(connection.id)}
                            disabled={isLoading}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => deleteConnection(connection.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {connection.bank_accounts.map((account) => (
                          <div key={account.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{account.name}</h4>
                              <span className="text-xs text-gray-500 capitalize">
                                {account.type}
                              </span>
                            </div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(account.current_balance || 0)}
                            </div>
                            {account.available_balance !== account.current_balance && (
                              <div className="text-xs text-gray-600">
                                Available: {formatCurrency(account.available_balance || 0)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {connections.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={loadTransactions}
                    disabled={isLoading}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <CreditCard className="h-6 w-6 text-blue-600" />
                    <div className="text-left">
                      <h3 className="font-medium">View Transactions</h3>
                      <p className="text-sm text-gray-600">See your recent spending</p>
                    </div>
                  </button>

                  <button
                    onClick={analyzeBudget}
                    disabled={isLoading}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Brain className="h-6 w-6 text-purple-600" />
                    <div className="text-left">
                      <h3 className="font-medium">AI Analysis</h3>
                      <p className="text-sm text-gray-600">Get budget insights</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Settings className="h-6 w-6 text-gray-600" />
                    <div className="text-left">
                      <h3 className="font-medium">Budget Settings</h3>
                      <p className="text-sm text-gray-600">Configure categories</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Transactions
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">From:</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">To:</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={loadTransactions}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Load Transactions'}
                  </button>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
                  <p className="text-gray-600 mb-4">
                    {connections.length === 0
                      ? 'Connect a bank account first to see your transactions.'
                      : 'Load transactions for the selected date range.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.amount > 0
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{transaction.name}</h4>
                          <p className="text-sm text-gray-600">
                            {transaction.bank_accounts.name} •{' '}
                            {new Date(transaction.date).toLocaleDateString()}
                            {transaction.pending && (
                              <span className="text-yellow-600 ml-2">• Pending</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </div>
                        {transaction.transaction_categorizations?.[0]?.budget_categories && (
                          <div className="text-xs text-gray-500">
                            {transaction.transaction_categorizations[0].budget_categories.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Budget Analysis
                </h2>
                <button
                  onClick={analyzeBudget}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Brain className="h-4 w-4" />
                  <span>{isLoading ? 'Analyzing...' : 'Run Analysis'}</span>
                </button>
              </div>

              {!analysis ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
                  <p className="text-gray-600 mb-4">
                    Run an AI analysis to get insights about your spending patterns and budget
                    recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Financial Health Score */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Financial Health Score</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthScoreColor(analysis.financial_health.score)}`}
                      >
                        {analysis.financial_health.score}/100
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">{analysis.financial_health.assessment}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                        <ul className="space-y-1">
                          {analysis.financial_health.strengths.map((strength, index) => (
                            <li key={index} className="flex items-center text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">Areas for Improvement</h4>
                        <ul className="space-y-1">
                          {analysis.financial_health.concerns.map((concern, index) => (
                            <li key={index} className="flex items-center text-sm">
                              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                              {concern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Savings Opportunities */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Savings Opportunities
                    </h3>
                    <div className="space-y-4">
                      {analysis.savings_opportunities.map((opportunity, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{opportunity.category}</h4>
                            <span className="text-sm text-green-600 font-medium">
                              Save {formatCurrency(opportunity.potential_savings)} (
                              {opportunity.savings_percentage}%)
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Current spending: {formatCurrency(opportunity.current_spending)}
                          </p>
                          <p className="text-sm text-gray-700">{opportunity.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Insights */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Star className="h-5 w-5 mr-2" />
                      Actionable Insights
                    </h3>
                    <div className="space-y-3">
                      {analysis.actionable_insights.map((insight, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(insight.priority)}`}
                          >
                            {insight.priority.toUpperCase()}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium">{insight.action}</h4>
                            <p className="text-sm text-gray-600 mb-1">{insight.impact}</p>
                            <p className="text-xs text-gray-500">Timeline: {insight.timeline}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Budget Suggestion */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2" />
                      Recommended Monthly Budget
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(analysis.monthly_budget_suggestion.total_income)}
                        </div>
                        <div className="text-sm text-gray-600">Total Income</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(analysis.monthly_budget_suggestion.recommended_expenses)}
                        </div>
                        <div className="text-sm text-gray-600">Recommended Expenses</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(analysis.monthly_budget_suggestion.recommended_savings)}
                        </div>
                        <div className="text-sm text-gray-600">Recommended Savings</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      {analysis.monthly_budget_suggestion.breakdown}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Budget Settings
              </h2>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Coming Soon</h3>
                <p className="text-gray-600">
                  Budget category management and customization options will be available here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

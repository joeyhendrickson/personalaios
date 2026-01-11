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
  Edit,
  X,
  Save,
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

interface ManualAccount {
  id: string
  institution_name: string
  account_name: string | null
  account_type: 'investment' | 'loan' | 'asset' | 'other'
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

interface ExpectedIncome {
  id: string
  category: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'one-time'
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ExpectedExpense {
  id: string
  category: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'one-time'
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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
    discrepancies?: {
      expected_vs_actual_income?: string
      expected_vs_actual_expenses?: string
      missing_categories?: string[]
      unexpected_income?: string[]
    }
  }
  accountability_questions?: Array<{
    question: string
    category: string
    context: string
  }>
  side_business_analysis?: {
    potential_income: number
    transfers_analysis: string
    recommendations: string[]
    questions: string[]
  }
  subscription_analysis?: {
    total_subscription_spending: number
    unaccounted_subscriptions: Array<{ name: string; amount: number; date: string }>
    recommendations: string[]
  }
  goal_alignment?: {
    connected_goals: Array<{ title: string; description?: string }>
    income_goal_coaching: string[]
    budget_reduction_coaching: string[]
    business_launch_recommendations: string[]
  }
  waste_area_analysis?: {
    frequently_eating_out: {
      total: number
      transaction_count: number
      recommendations: string[]
    }
    impulse_online_buying: {
      total: number
      transaction_count: number
      recommendations: string[]
    }
    unused_memberships_subscriptions: {
      total: number
      transaction_count: number
      recommendations: string[]
    }
    convenience_foods_drinks: {
      total: number
      transaction_count: number
      recommendations: string[]
    }
    food_waste: {
      total: number
      grocery_spending: number
      transaction_count: number
      note?: string
      recommendations: string[]
    }
    total_waste_spending: number
  }
  savings_opportunities: Array<{
    category: string
    current_spending: number
    potential_savings: number
    savings_percentage: number
    recommendation: string
    connection_to_goals?: string
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
      goal_alignment?: string
    }>
    expected_income_updates?: Array<{
      suggestion: string
      reasoning: string
      estimated_amount: number
    }>
    expected_expense_updates?: Array<{
      suggestion: string
      reasoning: string
      estimated_amount?: number
      current_amount?: number
      recommended_amount?: number
    }>
  }
  financial_health: {
    score: number
    assessment: string
    strengths: string[]
    concerns: string[]
    goal_progress?: string
  }
  actionable_insights: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    impact: string
    timeline: string
    connected_goal?: string | null
  }>
  monthly_budget_suggestion: {
    total_income: number
    recommended_expenses: number
    recommended_savings: number
    breakdown: string
  }
  cross_module_insights?: string[]
  module_recommendations?: Array<{
    module: string
    reason: string
    specific_issue: string
    expected_benefit: string
  }>
  dashboard_update_recommendations?: Array<{
    type: 'goal' | 'task' | 'habit'
    action: 'add' | 'modify' | 'remove'
    title: string
    description: string
    reasoning: string
  }>
  thirty_day_actuals?: {
    income_actuals: Array<{
      category: string
      expected: number
      actual: number
      difference: number
      percentage_difference?: number
    }>
    expense_actuals: Array<{
      category: string
      expected: number
      actual: number
      difference: number
      percentage_difference?: number
    }>
  }
}

export default function BudgetOptimizerModule() {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null)
  const [manualAccounts, setManualAccounts] = useState<ManualAccount[]>([])
  const [expectedIncome, setExpectedIncome] = useState<ExpectedIncome[]>([])
  const [expectedExpenses, setExpectedExpenses] = useState<ExpectedExpense[]>([])
  const [allDashboardGoals, setAllDashboardGoals] = useState<
    Array<{
      id: string
      title: string
      description?: string
      goal_type: string
      target_value?: number
      target_unit?: string
      status: string
      priority_level?: number
    }>
  >([])
  const [incomeGoals, setIncomeGoals] = useState<
    Array<{
      id: string
      title: string
      description?: string
      goal_type: string
      target_value?: number
      target_unit?: string
      status: string
    }>
  >([])
  const [budgetReductionGoals, setBudgetReductionGoals] = useState<
    Array<{
      id: string
      title: string
      description?: string
      goal_type: string
      target_value?: number
      target_unit?: string
      status: string
    }>
  >([])
  const [goalSuggestions, setGoalSuggestions] = useState<{
    incomeSuggestions: Array<{ title: string; description: string; suggestedTarget?: number }>
    budgetReductionSuggestions: Array<{
      title: string
      description: string
      suggestedTarget?: number
    }>
  }>({ incomeSuggestions: [], budgetReductionSuggestions: [] })
  const [showIncomeGoalModal, setShowIncomeGoalModal] = useState(false)
  const [showBudgetReductionGoalModal, setShowBudgetReductionGoalModal] = useState(false)
  const [incomeGoalForm, setIncomeGoalForm] = useState({
    title: '',
    description: '',
    goal_type: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    target_value: '',
    target_unit: 'dollars',
    priority_level: 3,
    target_date: '',
  })
  const [budgetReductionGoalForm, setBudgetReductionGoalForm] = useState({
    title: '',
    description: '',
    goal_type: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    target_value: '',
    target_unit: 'dollars',
    priority_level: 3,
    target_date: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'income-expenses' | 'analysis' | 'settings'
  >('overview')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [analysisDateRange, setAnalysisDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [showManualAccountModal, setShowManualAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ManualAccount | null>(null)
  const [manualAccountForm, setManualAccountForm] = useState({
    institution_name: '',
    account_name: '',
    account_type: 'investment' as 'investment' | 'loan' | 'asset' | 'other',
    amount: '',
    notes: '',
  })
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editingIncome, setEditingIncome] = useState<ExpectedIncome | null>(null)
  const [incomeForm, setIncomeForm] = useState({
    category: '',
    amount: '',
    frequency: 'monthly' as
      | 'weekly'
      | 'biweekly'
      | 'monthly'
      | 'quarterly'
      | 'annually'
      | 'one-time',
    notes: '',
  })
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpectedExpense | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    frequency: 'monthly' as
      | 'weekly'
      | 'biweekly'
      | 'monthly'
      | 'quarterly'
      | 'annually'
      | 'one-time',
    notes: '',
  })

  // TurboTax business expense categories
  const expenseCategories = [
    'Rent',
    'Utilities',
    'Groceries',
    'Car Payment',
    'Car Insurance',
    'Gasoline',
    'Meals & Entertainment',
    'Meetings',
    'Subscriptions',
    'Travel',
    'Office Supplies',
    'Professional Services',
    'Marketing & Advertising',
    'Software & Subscriptions',
    'Internet & Phone',
    'Insurance',
    'Legal & Professional Fees',
    'Bank Fees',
    'Depreciation',
    'Home Office',
    'Business Equipment',
    'Repairs & Maintenance',
    'Other',
  ]

  const incomeCategories = [
    'Job',
    'Client Account',
    'Freelance',
    'Real Estate',
    'Dividends',
    'Interest',
    'Rental Income',
    'Investment Income',
    'Side Business',
    'Other',
  ]

  // Load bank connections, manual accounts, income, expenses, and goals on component mount
  useEffect(() => {
    loadBankConnections()
    loadManualAccounts()
    loadExpectedIncome()
    loadExpectedExpenses()
    loadGoals()
  }, [])

  // Regenerate suggestions when expected expenses or dashboard goals change
  useEffect(() => {
    if (allDashboardGoals.length > 0 || expectedExpenses.length > 0) {
      generateGoalSuggestions(allDashboardGoals)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedExpenses])

  const loadGoals = async () => {
    try {
      // Load budget goals (manually entered from Budget Advisor)
      const budgetGoalsResponse = await fetch('/api/budget/goals')
      if (budgetGoalsResponse.ok) {
        const budgetGoalsData = await budgetGoalsResponse.json()
        const budgetGoals = budgetGoalsData.goals || []

        // Separate income and budget reduction goals
        const income = budgetGoals.filter((g: any) => g.goal_category === 'income')
        const budgetReduction = budgetGoals.filter(
          (g: any) => g.goal_category === 'budget_reduction'
        )

        setIncomeGoals(income)
        setBudgetReductionGoals(budgetReduction)
      }

      // Load dashboard goals for suggestions
      const dashboardGoalsResponse = await fetch('/api/goals')
      if (dashboardGoalsResponse.ok) {
        const dashboardGoalsData = await dashboardGoalsResponse.json()
        const allGoals = (dashboardGoalsData.goals || []).filter(
          (goal: any) => goal.status === 'active'
        )

        // Store all dashboard goals for suggestions
        setAllDashboardGoals(allGoals)

        // Generate suggestions based on dashboard goals
        generateGoalSuggestions(allGoals)
      }
    } catch (error) {
      console.error('Error loading goals:', error)
    }
  }

  const generateGoalSuggestions = (dashboardGoals: any[]) => {
    const incomeSuggestions: Array<{
      title: string
      description: string
      suggestedTarget?: number
    }> = []
    const budgetReductionSuggestions: Array<{
      title: string
      description: string
      suggestedTarget?: number
    }> = []

    // Analyze dashboard goals for income-related suggestions
    dashboardGoals.forEach((goal: any) => {
      const title = goal.title?.toLowerCase() || ''
      const desc = goal.description?.toLowerCase() || ''

      // Check if this goal suggests an income opportunity
      if (
        title.includes('business') ||
        title.includes('side') ||
        title.includes('freelance') ||
        title.includes('consulting') ||
        title.includes('startup') ||
        desc.includes('business') ||
        desc.includes('income') ||
        desc.includes('revenue')
      ) {
        // Generate income suggestion based on the goal
        if (title.includes('side') || desc.includes('side')) {
          incomeSuggestions.push({
            title: 'Launch Side Business',
            description: `Based on your goal "${goal.title}", consider setting an income target for your side business.`,
            suggestedTarget:
              goal.target_value && typeof goal.target_value === 'number'
                ? goal.target_value
                : undefined,
          })
        } else if (title.includes('new') || title.includes('start') || title.includes('launch')) {
          incomeSuggestions.push({
            title: 'New Business Income Target',
            description: `Based on your goal "${goal.title}", consider setting a monthly income target for your new business.`,
            suggestedTarget:
              goal.target_value && typeof goal.target_value === 'number'
                ? goal.target_value / 12
                : undefined,
          })
        } else {
          incomeSuggestions.push({
            title: 'Increase Income from Business',
            description: `Based on your goal "${goal.title}", consider setting a specific income target.`,
            suggestedTarget:
              goal.target_value && typeof goal.target_value === 'number'
                ? goal.target_value
                : undefined,
          })
        }
      }
    })

    // Analyze dashboard goals and transactions for budget reduction suggestions
    // Check for spending patterns or goals that suggest cost reduction
    const hasSubscriptionSpending = expectedExpenses.some((exp) =>
      exp.category.toLowerCase().includes('subscription')
    )
    const subscriptionTotal = expectedExpenses
      .filter((exp) => exp.category.toLowerCase().includes('subscription'))
      .reduce((sum, exp) => {
        const monthly =
          exp.frequency === 'weekly'
            ? exp.amount * 4.33
            : exp.frequency === 'biweekly'
              ? exp.amount * 2.17
              : exp.frequency === 'monthly'
                ? exp.amount
                : exp.frequency === 'quarterly'
                  ? exp.amount / 3
                  : exp.frequency === 'annually'
                    ? exp.amount / 12
                    : 0
        return sum + monthly
      }, 0)

    if (hasSubscriptionSpending && subscriptionTotal > 100) {
      budgetReductionSuggestions.push({
        title: 'Reduce Subscription Costs',
        description: `You're currently spending ${formatCurrency(subscriptionTotal)}/month on subscriptions. Consider reducing by 20-30%.`,
        suggestedTarget: subscriptionTotal * 0.25,
      })
    }

    const hasMealsSpending = expectedExpenses.some(
      (exp) =>
        exp.category.toLowerCase().includes('meal') ||
        exp.category.toLowerCase().includes('entertainment') ||
        exp.category.toLowerCase().includes('dining')
    )
    const mealsTotal = expectedExpenses
      .filter(
        (exp) =>
          exp.category.toLowerCase().includes('meal') ||
          exp.category.toLowerCase().includes('entertainment') ||
          exp.category.toLowerCase().includes('dining')
      )
      .reduce((sum, exp) => {
        const monthly =
          exp.frequency === 'weekly'
            ? exp.amount * 4.33
            : exp.frequency === 'biweekly'
              ? exp.amount * 2.17
              : exp.frequency === 'monthly'
                ? exp.amount
                : exp.frequency === 'quarterly'
                  ? exp.amount / 3
                  : exp.frequency === 'annually'
                    ? exp.amount / 12
                    : 0
        return sum + monthly
      }, 0)

    if (hasMealsSpending && mealsTotal > 200) {
      budgetReductionSuggestions.push({
        title: 'Reduce Meals & Entertainment Spending',
        description: `You're currently spending ${formatCurrency(mealsTotal)}/month on meals and entertainment. Consider meal planning to save 20-30%.`,
        suggestedTarget: mealsTotal * 0.25,
      })
    }

    // Check dashboard goals for budget reduction hints
    dashboardGoals.forEach((goal: any) => {
      const title = goal.title?.toLowerCase() || ''
      const desc = goal.description?.toLowerCase() || ''

      if (
        title.includes('reduce') ||
        title.includes('save') ||
        title.includes('cut') ||
        title.includes('spending') ||
        title.includes('budget') ||
        desc.includes('reduce') ||
        desc.includes('save money') ||
        desc.includes('cut costs')
      ) {
        if (title.includes('subscription')) {
          budgetReductionSuggestions.push({
            title: 'Reduce Subscription Expenses',
            description: `Based on your goal "${goal.title}", set a specific target for subscription reduction.`,
          })
        } else if (
          title.includes('meal') ||
          title.includes('dining') ||
          title.includes('entertainment')
        ) {
          budgetReductionSuggestions.push({
            title: 'Cut Meal & Entertainment Costs',
            description: `Based on your goal "${goal.title}", set a specific monthly reduction target.`,
          })
        } else {
          budgetReductionSuggestions.push({
            title: 'Overall Spending Reduction',
            description: `Based on your goal "${goal.title}", consider setting a specific monthly reduction target.`,
          })
        }
      }
    })

    setGoalSuggestions({
      incomeSuggestions: incomeSuggestions.slice(0, 3), // Limit to 3 suggestions
      budgetReductionSuggestions: budgetReductionSuggestions.slice(0, 3),
    })
  }

  const handleAddIncomeGoal = () => {
    setIncomeGoalForm({
      title: '',
      description: '',
      goal_type: 'monthly',
      target_value: '',
      target_unit: 'dollars',
      priority_level: 3,
      target_date: '',
    })
    setShowIncomeGoalModal(true)
  }

  const handleSaveIncomeGoal = async () => {
    if (!incomeGoalForm.title || !incomeGoalForm.target_value) {
      alert('Please fill in title and target value')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/budget/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...incomeGoalForm,
          goal_category: 'income',
          target_value: parseFloat(incomeGoalForm.target_value),
          description: incomeGoalForm.description || undefined,
          target_date: incomeGoalForm.target_date || undefined,
        }),
      })

      if (response.ok) {
        const newGoal = await response.json()
        // Add the new goal to income goals list (manually entered)
        setIncomeGoals([...incomeGoals, newGoal.goal])
        setShowIncomeGoalModal(false)
        setIncomeGoalForm({
          title: '',
          description: '',
          goal_type: 'monthly',
          target_value: '',
          target_unit: 'dollars',
          priority_level: 3,
          target_date: '',
        })
        alert('✅ Income goal created! It will appear as a recommendation on your dashboard.')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create income goal')
      }
    } catch (error) {
      console.error('Error creating income goal:', error)
      alert('Failed to create income goal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBudgetReductionGoal = () => {
    setBudgetReductionGoalForm({
      title: '',
      description: '',
      goal_type: 'monthly',
      target_value: '',
      target_unit: 'dollars',
      priority_level: 3,
      target_date: '',
    })
    setShowBudgetReductionGoalModal(true)
  }

  const handleSaveBudgetReductionGoal = async () => {
    if (!budgetReductionGoalForm.title || !budgetReductionGoalForm.target_value) {
      alert('Please fill in title and target value')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/budget/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...budgetReductionGoalForm,
          goal_category: 'budget_reduction',
          target_value: parseFloat(budgetReductionGoalForm.target_value),
          description: budgetReductionGoalForm.description || undefined,
          target_date: budgetReductionGoalForm.target_date || undefined,
        }),
      })

      if (response.ok) {
        const newGoal = await response.json()
        // Add the new goal to budget reduction goals list (manually entered)
        setBudgetReductionGoals([...budgetReductionGoals, newGoal.goal])
        setShowBudgetReductionGoalModal(false)
        setBudgetReductionGoalForm({
          title: '',
          description: '',
          goal_type: 'monthly',
          target_value: '',
          target_unit: 'dollars',
          priority_level: 3,
          target_date: '',
        })
        alert(
          '✅ Budget reduction goal created! It will appear as a recommendation on your dashboard.'
        )
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create budget reduction goal')
      }
    } catch (error) {
      console.error('Error creating budget reduction goal:', error)
      alert('Failed to create budget reduction goal')
    } finally {
      setIsLoading(false)
    }
  }

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
        `/api/budget/transactions?start_date=${dateRange.start}&end_date=${dateRange.end}&limit=10000`
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

      const data = await response.json()

      if (response.ok) {
        console.log('Sync result:', data)
        // Reload transactions after sync
        await loadTransactions()
        // Reload connections to update last sync time
        await loadBankConnections()
        alert(`✅ Synced ${data.transactions_synced || 0} new transactions`)
      } else {
        // Handle specific error cases
        if (data.requires_reconnect) {
          alert(
            `⚠️ ${data.message || 'Your bank connection needs attention. Please reconnect your bank account.'}`
          )
          await loadBankConnections() // Reload to show updated status
        } else {
          alert(`❌ ${data.message || data.error || 'Failed to sync transactions'}`)
        }
      }
    } catch (error) {
      console.error('Error syncing transactions:', error)
      alert('❌ Failed to sync transactions. Please try again.')
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
          start_date: analysisDateRange.start,
          end_date: analysisDateRange.end,
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

  const loadManualAccounts = async () => {
    try {
      const response = await fetch('/api/budget/manual-accounts')
      if (response.ok) {
        const data = await response.json()
        setManualAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error loading manual accounts:', error)
    }
  }

  const handleAddManualAccount = () => {
    setEditingAccount(null)
    setManualAccountForm({
      institution_name: '',
      account_name: '',
      account_type: 'investment',
      amount: '',
      notes: '',
    })
    setShowManualAccountModal(true)
  }

  const handleEditManualAccount = (account: ManualAccount) => {
    setEditingAccount(account)
    setManualAccountForm({
      institution_name: account.institution_name,
      account_name: account.account_name || '',
      account_type: account.account_type,
      amount: account.amount.toString(),
      notes: account.notes || '',
    })
    setShowManualAccountModal(true)
  }

  const handleSaveManualAccount = async () => {
    if (!manualAccountForm.institution_name || !manualAccountForm.amount) {
      alert('Please fill in institution name and amount')
      return
    }

    setIsLoading(true)
    try {
      const url = '/api/budget/manual-accounts'
      const method = editingAccount ? 'PUT' : 'POST'
      const body = editingAccount
        ? { id: editingAccount.id, ...manualAccountForm }
        : manualAccountForm

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await loadManualAccounts()
        setShowManualAccountModal(false)
        setEditingAccount(null)
        setManualAccountForm({
          institution_name: '',
          account_name: '',
          account_type: 'investment',
          amount: '',
          notes: '',
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save manual account')
      }
    } catch (error) {
      console.error('Error saving manual account:', error)
      alert('Failed to save manual account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteManualAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this manual account?')) {
      return
    }

    try {
      const response = await fetch(`/api/budget/manual-accounts?id=${accountId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await loadManualAccounts()
      }
    } catch (error) {
      console.error('Error deleting manual account:', error)
      alert('Failed to delete manual account')
    }
  }

  const loadExpectedIncome = async () => {
    try {
      const response = await fetch('/api/budget/expected-income')
      if (response.ok) {
        const data = await response.json()
        setExpectedIncome(data.income || [])
      }
    } catch (error) {
      console.error('Error loading expected income:', error)
    }
  }

  const loadExpectedExpenses = async () => {
    try {
      const response = await fetch('/api/budget/expected-expenses')
      if (response.ok) {
        const data = await response.json()
        setExpectedExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error('Error loading expected expenses:', error)
    }
  }

  const handleAddIncome = () => {
    setEditingIncome(null)
    setIncomeForm({
      category: '',
      amount: '',
      frequency: 'monthly',
      notes: '',
    })
    setShowIncomeModal(true)
  }

  const handleEditIncome = (income: ExpectedIncome) => {
    setEditingIncome(income)
    setIncomeForm({
      category: income.category,
      amount: income.amount.toString(),
      frequency: income.frequency,
      notes: income.notes || '',
    })
    setShowIncomeModal(true)
  }

  const handleSaveIncome = async () => {
    if (!incomeForm.category || !incomeForm.amount) {
      alert('Please fill in category and amount')
      return
    }

    setIsLoading(true)
    try {
      const url = '/api/budget/expected-income'
      const method = editingIncome ? 'PUT' : 'POST'
      const body = editingIncome ? { id: editingIncome.id, ...incomeForm } : incomeForm

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await loadExpectedIncome()
        setShowIncomeModal(false)
        setEditingIncome(null)
        setIncomeForm({
          category: '',
          amount: '',
          frequency: 'monthly',
          notes: '',
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save expected income')
      }
    } catch (error) {
      console.error('Error saving expected income:', error)
      alert('Failed to save expected income')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('Are you sure you want to delete this expected income?')) {
      return
    }

    try {
      const response = await fetch(`/api/budget/expected-income?id=${incomeId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await loadExpectedIncome()
      }
    } catch (error) {
      console.error('Error deleting expected income:', error)
      alert('Failed to delete expected income')
    }
  }

  const handleAddExpense = () => {
    setEditingExpense(null)
    setExpenseForm({
      category: '',
      amount: '',
      frequency: 'monthly',
      notes: '',
    })
    setShowExpenseModal(true)
  }

  const handleEditExpense = (expense: ExpectedExpense) => {
    setEditingExpense(expense)
    setExpenseForm({
      category: expense.category,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      notes: expense.notes || '',
    })
    setShowExpenseModal(true)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.category || !expenseForm.amount) {
      alert('Please fill in category and amount')
      return
    }

    setIsLoading(true)
    try {
      const url = '/api/budget/expected-expenses'
      const method = editingExpense ? 'PUT' : 'POST'
      const body = editingExpense ? { id: editingExpense.id, ...expenseForm } : expenseForm

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await loadExpectedExpenses()
        setShowExpenseModal(false)
        setEditingExpense(null)
        setExpenseForm({
          category: '',
          amount: '',
          frequency: 'monthly',
          notes: '',
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save expected expense')
      }
    } catch (error) {
      console.error('Error saving expected expense:', error)
      alert('Failed to save expected expense')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expected expense?')) {
      return
    }

    try {
      const response = await fetch(`/api/budget/expected-expenses?id=${expenseId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await loadExpectedExpenses()
      }
    } catch (error) {
      console.error('Error deleting expected expense:', error)
      alert('Failed to delete expected expense')
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
                  Budget Advisor
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
                { id: 'income-expenses', label: 'Income & Expenses', icon: DollarSign },
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
            {/* Summary Section */}
            {(connections.length > 0 || manualAccounts.length > 0) && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    // Calculate total cash from all bank connections
                    let totalCashFromBanks = 0
                    connections.forEach((connection) => {
                      const cashAccounts = connection.bank_accounts.filter(
                        (acc) =>
                          acc.type === 'depository' ||
                          acc.subtype === 'checking' ||
                          acc.subtype === 'savings'
                      )
                      totalCashFromBanks += cashAccounts.reduce(
                        (sum, acc) => sum + (acc.current_balance || 0),
                        0
                      )

                      // Add credit card overpayments (negative balances) to cash
                      const creditAccounts = connection.bank_accounts.filter(
                        (acc) => acc.type === 'credit' || acc.subtype === 'credit_card'
                      )
                      creditAccounts.forEach((acc) => {
                        const current = acc.current_balance || 0
                        if (current < 0) {
                          totalCashFromBanks += Math.abs(current)
                        }
                      })
                    })

                    // Calculate total cash from manual entries (positive amounts for investments/assets)
                    const totalCashFromManual = manualAccounts.reduce((sum, acc) => {
                      if (
                        (acc.account_type === 'investment' || acc.account_type === 'asset') &&
                        acc.amount > 0
                      ) {
                        return sum + acc.amount
                      }
                      return sum
                    }, 0)

                    const totalCash = totalCashFromBanks + totalCashFromManual

                    // Calculate total owed from all bank connections
                    let totalOwedFromBanks = 0
                    let totalCreditLimit = 0

                    connections.forEach((connection) => {
                      const creditAccounts = connection.bank_accounts.filter(
                        (acc) => acc.type === 'credit' || acc.subtype === 'credit_card'
                      )

                      creditAccounts.forEach((acc) => {
                        const current = acc.current_balance || 0
                        const available = acc.available_balance || 0

                        if (current > 0) {
                          totalOwedFromBanks += current
                          totalCreditLimit += available + current
                        } else if (current === 0) {
                          totalCreditLimit += available
                        } else {
                          totalCreditLimit += available
                        }
                      })
                    })

                    // Calculate total owed from manual entries (loans and negative amounts)
                    const totalOwedFromManual = manualAccounts.reduce((sum, acc) => {
                      if (acc.account_type === 'loan' || acc.amount < 0) {
                        return sum + Math.abs(acc.amount)
                      }
                      return sum
                    }, 0)

                    const totalOwed = totalOwedFromBanks + totalOwedFromManual

                    return (
                      <>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Total Cash</div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalCash)}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Total Owed</div>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(totalOwed)}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Total Credit Limit</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(totalCreditLimit)}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

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

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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

                      {/* Summary totals */}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
                        {(() => {
                          // Calculate total cash (checking/savings accounts + credit card overpayments)
                          const cashAccounts = connection.bank_accounts.filter(
                            (acc) =>
                              acc.type === 'depository' ||
                              acc.subtype === 'checking' ||
                              acc.subtype === 'savings'
                          )
                          let totalCash = cashAccounts.reduce(
                            (sum, acc) => sum + (acc.current_balance || 0),
                            0
                          )

                          // Calculate total owed and credit limit (credit card accounts)
                          // IMPORTANT: For credit cards:
                          // - Positive balance = amount owed (debt)
                          // - Negative balance = overpayment/credit (counts as cash)
                          const creditAccounts = connection.bank_accounts.filter(
                            (acc) => acc.type === 'credit' || acc.subtype === 'credit_card'
                          )

                          let totalOwed = 0
                          let totalCreditLimit = 0

                          creditAccounts.forEach((acc) => {
                            const current = acc.current_balance || 0
                            const available = acc.available_balance || 0

                            if (current > 0) {
                              // Positive balance = debt/owed (e.g., $2200 owed)
                              totalOwed += current
                              // Credit limit = available credit + amount owed
                              totalCreditLimit += available + current
                            } else if (current < 0) {
                              // Negative balance = overpayment/credit (e.g., -$80 = $80 cash/credit)
                              totalCash += Math.abs(current)
                              // Credit limit = available (which already includes the credit)
                              totalCreditLimit += available
                            } else {
                              // Zero balance
                              totalCreditLimit += available
                            }
                          })

                          return (
                            <>
                              {(cashAccounts.length > 0 ||
                                creditAccounts.some((acc) => (acc.current_balance || 0) < 0)) && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-600 font-medium">Cash:</span>
                                  <span className="text-green-600 font-semibold">
                                    {formatCurrency(totalCash)}
                                  </span>
                                </div>
                              )}
                              {creditAccounts.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-600 font-medium">Owed:</span>
                                  <span className="text-red-600 font-semibold">
                                    {formatCurrency(totalOwed)}
                                  </span>
                                </div>
                              )}
                              {creditAccounts.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-600 font-medium">Credit Limit:</span>
                                  <span className="text-blue-600 font-semibold">
                                    {formatCurrency(totalCreditLimit)}
                                  </span>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Entry Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <PiggyBank className="h-5 w-5 mr-2" />
                  Manual Entry
                </h2>
                <button
                  onClick={handleAddManualAccount}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3"
                >
                  <Plus className="h-4 w-4" />
                  Add Entry
                </button>
              </div>

              {manualAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <PiggyBank className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Manual Accounts Added
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add accounts that aren't connected via Plaid, such as investment accounts,
                    loans, or other assets.
                  </p>
                  <button
                    onClick={handleAddManualAccount}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-md px-4"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Manual Account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {manualAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{account.institution_name}</h3>
                          {account.account_name && (
                            <span className="text-sm text-gray-500">• {account.account_name}</span>
                          )}
                          <span
                            className={`px-2 py-1 text-xs rounded-full capitalize ${
                              account.account_type === 'investment'
                                ? 'bg-purple-100 text-purple-800'
                                : account.account_type === 'loan'
                                  ? 'bg-red-100 text-red-800'
                                  : account.account_type === 'asset'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {account.account_type}
                          </span>
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            account.amount < 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {formatCurrency(account.amount)}
                        </div>
                        {account.notes && (
                          <p className="text-sm text-gray-600 mt-1">{account.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditManualAccount(account)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteManualAccount(account.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

        {/* Income & Expenses Tab */}
        {activeTab === 'income-expenses' && (
          <div className="space-y-6">
            {/* Expected Income Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Expected Income
                </h2>
                <button
                  onClick={handleAddIncome}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3"
                >
                  <Plus className="h-4 w-4" />
                  Add Income
                </button>
              </div>

              {expectedIncome.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Expected Income</h3>
                  <p className="text-gray-600 mb-4">
                    Add your expected income sources to track your budget planning.
                  </p>
                  <button
                    onClick={handleAddIncome}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-md px-4"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Income Source
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expectedIncome
                    .filter((inc) => inc.is_active)
                    .map((income) => {
                      // Calculate monthly equivalent
                      const monthlyAmount =
                        income.frequency === 'weekly'
                          ? income.amount * 4.33
                          : income.frequency === 'biweekly'
                            ? income.amount * 2.17
                            : income.frequency === 'monthly'
                              ? income.amount
                              : income.frequency === 'quarterly'
                                ? income.amount / 3
                                : income.frequency === 'annually'
                                  ? income.amount / 12
                                  : 0

                      return (
                        <div
                          key={income.id}
                          className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold">{income.category}</h3>
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                                {income.frequency}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-sm text-gray-600">Amount:</span>
                                <span className="text-lg font-semibold text-green-600 ml-2">
                                  {formatCurrency(income.amount)}
                                </span>
                              </div>
                              {income.frequency !== 'monthly' && (
                                <div>
                                  <span className="text-sm text-gray-600">Monthly:</span>
                                  <span className="text-sm font-medium text-gray-700 ml-2">
                                    {formatCurrency(monthlyAmount)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {income.notes && (
                              <p className="text-sm text-gray-600 mt-1">{income.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditIncome(income)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(income.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Total Expected Income */}
              {expectedIncome.filter((inc) => inc.is_active).length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Monthly Income:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        expectedIncome
                          .filter((inc) => inc.is_active)
                          .reduce((sum, inc) => {
                            const monthly =
                              inc.frequency === 'weekly'
                                ? inc.amount * 4.33
                                : inc.frequency === 'biweekly'
                                  ? inc.amount * 2.17
                                  : inc.frequency === 'monthly'
                                    ? inc.amount
                                    : inc.frequency === 'quarterly'
                                      ? inc.amount / 3
                                      : inc.frequency === 'annually'
                                        ? inc.amount / 12
                                        : 0
                            return sum + monthly
                          }, 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Expected Expenses Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                  Expected Expenses
                </h2>
                <button
                  onClick={handleAddExpense}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </button>
              </div>

              {expectedExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Expected Expenses</h3>
                  <p className="text-gray-600 mb-4">
                    Add your expected expenses to track your budget planning. Categories align with
                    TurboTax business expense categories.
                  </p>
                  <button
                    onClick={handleAddExpense}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-md px-4"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Expense
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expectedExpenses
                    .filter((exp) => exp.is_active)
                    .map((expense) => {
                      // Calculate monthly equivalent
                      const monthlyAmount =
                        expense.frequency === 'weekly'
                          ? expense.amount * 4.33
                          : expense.frequency === 'biweekly'
                            ? expense.amount * 2.17
                            : expense.frequency === 'monthly'
                              ? expense.amount
                              : expense.frequency === 'quarterly'
                                ? expense.amount / 3
                                : expense.frequency === 'annually'
                                  ? expense.amount / 12
                                  : 0

                      return (
                        <div
                          key={expense.id}
                          className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold">{expense.category}</h3>
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                                {expense.frequency}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-sm text-gray-600">Amount:</span>
                                <span className="text-lg font-semibold text-red-600 ml-2">
                                  {formatCurrency(expense.amount)}
                                </span>
                              </div>
                              {expense.frequency !== 'monthly' && (
                                <div>
                                  <span className="text-sm text-gray-600">Monthly:</span>
                                  <span className="text-sm font-medium text-gray-700 ml-2">
                                    {formatCurrency(monthlyAmount)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {expense.notes && (
                              <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Total Expected Expenses */}
              {expectedExpenses.filter((exp) => exp.is_active).length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Monthly Expenses:</span>
                    <span className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        expectedExpenses
                          .filter((exp) => exp.is_active)
                          .reduce((sum, exp) => {
                            const monthly =
                              exp.frequency === 'weekly'
                                ? exp.amount * 4.33
                                : exp.frequency === 'biweekly'
                                  ? exp.amount * 2.17
                                  : exp.frequency === 'monthly'
                                    ? exp.amount
                                    : exp.frequency === 'quarterly'
                                      ? exp.amount / 3
                                      : exp.frequency === 'annually'
                                        ? exp.amount / 12
                                        : 0
                            return sum + monthly
                          }, 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Net Income Summary */}
            {expectedIncome.filter((inc) => inc.is_active).length > 0 &&
              expectedExpenses.filter((exp) => exp.is_active).length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">Budget Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                      const totalMonthlyIncome = expectedIncome
                        .filter((inc) => inc.is_active)
                        .reduce((sum, inc) => {
                          const monthly =
                            inc.frequency === 'weekly'
                              ? inc.amount * 4.33
                              : inc.frequency === 'biweekly'
                                ? inc.amount * 2.17
                                : inc.frequency === 'monthly'
                                  ? inc.amount
                                  : inc.frequency === 'quarterly'
                                    ? inc.amount / 3
                                    : inc.frequency === 'annually'
                                      ? inc.amount / 12
                                      : 0
                          return sum + monthly
                        }, 0)

                      const totalMonthlyExpenses = expectedExpenses
                        .filter((exp) => exp.is_active)
                        .reduce((sum, exp) => {
                          const monthly =
                            exp.frequency === 'weekly'
                              ? exp.amount * 4.33
                              : exp.frequency === 'biweekly'
                                ? exp.amount * 2.17
                                : exp.frequency === 'monthly'
                                  ? exp.amount
                                  : exp.frequency === 'quarterly'
                                    ? exp.amount / 3
                                    : exp.frequency === 'annually'
                                      ? exp.amount / 12
                                      : 0
                          return sum + monthly
                        }, 0)

                      const netIncome = totalMonthlyIncome - totalMonthlyExpenses

                      return (
                        <>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Total Income</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(totalMonthlyIncome)}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
                            <div className="text-2xl font-bold text-red-600">
                              {formatCurrency(totalMonthlyExpenses)}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Net Income</div>
                            <div
                              className={`text-2xl font-bold ${
                                netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatCurrency(netIncome)}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

            {/* Growth and Improvement Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-600" />
                  Growth and Improvement
                </h2>
              </div>

              {/* Goal Suggestions */}
              {(goalSuggestions.incomeSuggestions.length > 0 ||
                goalSuggestions.budgetReductionSuggestions.length > 0) && (
                <div className="mb-6 bg-white rounded-lg border border-purple-200 p-4">
                  <h3 className="text-lg font-medium mb-3 text-gray-900 flex items-center">
                    <Star className="h-5 w-5 mr-2 text-purple-600" />
                    Suggestions Based on Your Dashboard
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on your dashboard goals and current budget, here are some suggested goals
                    you might want to add:
                  </p>

                  {goalSuggestions.incomeSuggestions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-green-700 mb-2">Income Goal Suggestions:</h4>
                      <div className="space-y-2">
                        {goalSuggestions.incomeSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <h5 className="font-medium text-green-900 mb-1">
                                {suggestion.title}
                              </h5>
                              <p className="text-sm text-gray-700">{suggestion.description}</p>
                              {suggestion.suggestedTarget && (
                                <p className="text-xs text-green-700 mt-1">
                                  Suggested target: {formatCurrency(suggestion.suggestedTarget)}
                                  /month
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <button
                                onClick={() => {
                                  setIncomeGoalForm({
                                    title: suggestion.title,
                                    description: suggestion.description,
                                    goal_type: 'monthly',
                                    target_value: suggestion.suggestedTarget?.toString() || '',
                                    target_unit: 'dollars',
                                    priority_level: 3,
                                    target_date: '',
                                  })
                                  setShowIncomeGoalModal(true)
                                }}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Use Suggestion
                              </button>
                              <button
                                onClick={() => {
                                  setGoalSuggestions((prev) => ({
                                    ...prev,
                                    incomeSuggestions: prev.incomeSuggestions.filter(
                                      (_, i) => i !== index
                                    ),
                                  }))
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete suggestion"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {goalSuggestions.budgetReductionSuggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">
                        Budget Reduction Suggestions:
                      </h4>
                      <div className="space-y-2">
                        {goalSuggestions.budgetReductionSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <h5 className="font-medium text-red-900 mb-1">{suggestion.title}</h5>
                              <p className="text-sm text-gray-700">{suggestion.description}</p>
                              {suggestion.suggestedTarget && (
                                <p className="text-xs text-red-700 mt-1">
                                  Suggested reduction: {formatCurrency(suggestion.suggestedTarget)}
                                  /month
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <button
                                onClick={() => {
                                  setBudgetReductionGoalForm({
                                    title: suggestion.title,
                                    description: suggestion.description,
                                    goal_type: 'monthly',
                                    target_value: suggestion.suggestedTarget?.toString() || '',
                                    target_unit: 'dollars',
                                    priority_level: 3,
                                    target_date: '',
                                  })
                                  setShowBudgetReductionGoalModal(true)
                                }}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Use Suggestion
                              </button>
                              <button
                                onClick={() => {
                                  setGoalSuggestions((prev) => ({
                                    ...prev,
                                    budgetReductionSuggestions:
                                      prev.budgetReductionSuggestions.filter((_, i) => i !== index),
                                  }))
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete suggestion"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Income Goals */}
              <div className="mb-6">
                <div className="mb-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Income Goals
                  </h3>
                </div>
                {incomeGoals.length > 0 ? (
                  <div className="space-y-3">
                    {incomeGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="bg-white rounded-lg border border-green-200 p-4 flex items-start justify-between hover:bg-green-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-green-900">{goal.title}</h4>
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 capitalize">
                              {goal.goal_type}
                            </span>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-gray-700 mb-2">{goal.description}</p>
                          )}
                          {goal.target_value && (
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-sm text-gray-600">Target:</span>
                                <span className="text-lg font-bold text-green-600 ml-2">
                                  {formatCurrency(goal.target_value)}
                                  {goal.target_unit &&
                                    goal.target_unit !== 'dollars' &&
                                    ` ${goal.target_unit}`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No Income Goals Added
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Add income goals to track your targets for side business, new business, or
                      other income sources.
                    </p>
                    <button
                      onClick={handleAddIncomeGoal}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 hover:bg-green-700 text-white h-9 rounded-md px-4"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Income Goal
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Budget Reduction Goals */}
              <div className="mb-6">
                <div className="mb-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                    Budget Reduction Goals
                  </h3>
                </div>
                {budgetReductionGoals.length > 0 ? (
                  <div className="space-y-3">
                    {budgetReductionGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="bg-white rounded-lg border border-red-200 p-4 flex items-start justify-between hover:bg-red-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-red-900">{goal.title}</h4>
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 capitalize">
                              {goal.goal_type}
                            </span>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-gray-700 mb-2">{goal.description}</p>
                          )}
                          {goal.target_value && (
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-sm text-gray-600">Target Reduction:</span>
                                <span className="text-lg font-bold text-red-600 ml-2">
                                  {formatCurrency(Math.abs(goal.target_value))}
                                  {goal.target_unit &&
                                    goal.target_unit !== 'dollars' &&
                                    ` ${goal.target_unit}`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No Budget Reduction Goals Added
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Add budget reduction goals to track your targets for cutting costs in specific
                      categories.
                    </p>
                    <button
                      onClick={handleAddBudgetReductionGoal}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white h-9 rounded-md px-4"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Reduction Goal
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {transactions.length.toLocaleString()} transaction
                    {transactions.length !== 1 ? 's' : ''}
                    {dateRange.start && dateRange.end && (
                      <span>
                        {' '}
                        from {new Date(dateRange.start).toLocaleDateString()} to{' '}
                        {new Date(dateRange.end).toLocaleDateString()}
                      </span>
                    )}
                  </div>
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
              </div>

              {/* Date Range Selection */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Select Date Range for Analysis
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">From:</label>
                    <input
                      type="date"
                      value={analysisDateRange.start}
                      onChange={(e) =>
                        setAnalysisDateRange((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">To:</label>
                    <input
                      type="date"
                      value={analysisDateRange.end}
                      onChange={(e) =>
                        setAnalysisDateRange((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={analyzeBudget}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Brain className="h-4 w-4" />
                    <span>{isLoading ? 'Analyzing...' : 'Run Analysis'}</span>
                  </button>
                </div>
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
                    {analysis.financial_health.goal_progress && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-purple-600 mb-2">Goal Progress</h4>
                        <p className="text-sm text-gray-700">
                          {analysis.financial_health.goal_progress}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Accountability Questions */}
                  {analysis.accountability_questions &&
                    analysis.accountability_questions.length > 0 && (
                      <div className="bg-white border border-orange-200 rounded-lg p-6 bg-orange-50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-orange-900">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Accountability Questions
                        </h3>
                        <div className="space-y-3">
                          {analysis.accountability_questions.map((item, index) => (
                            <div
                              key={index}
                              className="bg-white border border-orange-200 rounded-lg p-4"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-orange-900 mb-1">
                                    {item.question}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-medium">Category:</span> {item.category}
                                  </p>
                                  <p className="text-sm text-gray-700">{item.context}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Side Business Analysis */}
                  {analysis.side_business_analysis && (
                    <div className="bg-white border border-green-200 rounded-lg p-6 bg-green-50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-green-900">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Side Business Analysis
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Potential P2P Income:</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatCurrency(analysis.side_business_analysis.potential_income)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-4">
                          {analysis.side_business_analysis.transfers_analysis}
                        </p>
                        {analysis.side_business_analysis.questions &&
                          analysis.side_business_analysis.questions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="font-medium mb-2">Questions to Consider:</h4>
                              <ul className="space-y-1">
                                {analysis.side_business_analysis.questions.map((q, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-green-600 mr-2">•</span>
                                    {q}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                      {analysis.side_business_analysis.recommendations &&
                        analysis.side_business_analysis.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-green-900">Recommendations:</h4>
                            {analysis.side_business_analysis.recommendations.map((rec, i) => (
                              <div
                                key={i}
                                className="bg-white rounded-lg p-3 border border-green-200"
                              >
                                <p className="text-sm text-gray-700">{rec}</p>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Subscription Analysis */}
                  {analysis.subscription_analysis && (
                    <div className="bg-white border border-purple-200 rounded-lg p-6 bg-purple-50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-purple-900">
                        <Activity className="h-5 w-5 mr-2" />
                        Subscription Analysis
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">
                            Total Subscription Spending:
                          </span>
                          <span className="text-xl font-bold text-purple-600">
                            {formatCurrency(
                              analysis.subscription_analysis.total_subscription_spending
                            )}
                          </span>
                        </div>
                        {analysis.subscription_analysis.unaccounted_subscriptions &&
                          analysis.subscription_analysis.unaccounted_subscriptions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Unaccounted Subscriptions:</h4>
                              <div className="space-y-2">
                                {analysis.subscription_analysis.unaccounted_subscriptions.map(
                                  (sub, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                      <span className="text-sm font-medium">{sub.name}</span>
                                      <span className="text-sm text-purple-600 font-semibold">
                                        {formatCurrency(sub.amount)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        {analysis.subscription_analysis.recommendations &&
                          analysis.subscription_analysis.recommendations.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="font-medium mb-2">Recommendations:</h4>
                              <ul className="space-y-1">
                                {analysis.subscription_analysis.recommendations.map((rec, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-purple-600 mr-2">•</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Goal Alignment */}
                  {analysis.goal_alignment && (
                    <div className="bg-white border border-blue-200 rounded-lg p-6 bg-blue-50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-900">
                        <Target className="h-5 w-5 mr-2" />
                        Goal Alignment & Coaching
                      </h3>
                      {analysis.goal_alignment.connected_goals &&
                        analysis.goal_alignment.connected_goals.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                            <h4 className="font-medium mb-2">Connected Goals:</h4>
                            <div className="space-y-2">
                              {analysis.goal_alignment.connected_goals.map((goal, i) => (
                                <div key={i} className="p-2 bg-gray-50 rounded">
                                  <div className="font-medium">{goal.title}</div>
                                  {goal.description && (
                                    <div className="text-sm text-gray-600">{goal.description}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      {analysis.goal_alignment.income_goal_coaching &&
                        analysis.goal_alignment.income_goal_coaching.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                            <h4 className="font-medium mb-2 text-green-700">
                              Income Goal Coaching:
                            </h4>
                            <ul className="space-y-1">
                              {analysis.goal_alignment.income_goal_coaching.map((coaching, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start">
                                  <span className="text-green-600 mr-2">•</span>
                                  {coaching}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {analysis.goal_alignment.budget_reduction_coaching &&
                        analysis.goal_alignment.budget_reduction_coaching.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                            <h4 className="font-medium mb-2 text-red-700">
                              Budget Reduction Coaching:
                            </h4>
                            <ul className="space-y-1">
                              {analysis.goal_alignment.budget_reduction_coaching.map(
                                (coaching, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    {coaching}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      {analysis.goal_alignment.business_launch_recommendations &&
                        analysis.goal_alignment.business_launch_recommendations.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-medium mb-2 text-purple-700">
                              Business Launch Recommendations:
                            </h4>
                            <ul className="space-y-1">
                              {analysis.goal_alignment.business_launch_recommendations.map(
                                (rec, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-purple-600 mr-2">•</span>
                                    {rec}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Expected Income/Expense Updates */}
                  {((analysis.budget_recommendations.expected_income_updates?.length ?? 0) > 0 ||
                    (analysis.budget_recommendations.expected_expense_updates?.length ?? 0) >
                      0) && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Edit className="h-5 w-5 mr-2" />
                        Recommended Budget Updates
                      </h3>
                      {analysis.budget_recommendations.expected_income_updates &&
                        analysis.budget_recommendations.expected_income_updates.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-green-700 mb-2">Income Updates:</h4>
                            <div className="space-y-2">
                              {analysis.budget_recommendations.expected_income_updates.map(
                                (update, i) => (
                                  <div
                                    key={i}
                                    className="border border-green-200 rounded-lg p-3 bg-green-50"
                                  >
                                    <div className="font-medium mb-1">{update.suggestion}</div>
                                    <p className="text-sm text-gray-700 mb-1">{update.reasoning}</p>
                                    <span className="text-sm font-semibold text-green-600">
                                      Estimated: {formatCurrency(update.estimated_amount)}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      {analysis.budget_recommendations.expected_expense_updates &&
                        analysis.budget_recommendations.expected_expense_updates.length > 0 && (
                          <div>
                            <h4 className="font-medium text-red-700 mb-2">Expense Updates:</h4>
                            <div className="space-y-2">
                              {analysis.budget_recommendations.expected_expense_updates.map(
                                (update, i) => (
                                  <div
                                    key={i}
                                    className="border border-red-200 rounded-lg p-3 bg-red-50"
                                  >
                                    <div className="font-medium mb-1">{update.suggestion}</div>
                                    <p className="text-sm text-gray-700 mb-1">{update.reasoning}</p>
                                    {update.current_amount && update.recommended_amount && (
                                      <div className="flex items-center space-x-4 text-sm">
                                        <span>
                                          Current:{' '}
                                          <span className="font-semibold text-red-600">
                                            {formatCurrency(update.current_amount)}
                                          </span>
                                        </span>
                                        <span>→</span>
                                        <span>
                                          Recommended:{' '}
                                          <span className="font-semibold text-green-600">
                                            {formatCurrency(update.recommended_amount)}
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                    {update.estimated_amount && (
                                      <span className="text-sm font-semibold text-red-600">
                                        Estimated: {formatCurrency(update.estimated_amount)}
                                      </span>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* 30-Day Actuals Summary */}
                  {analysis.thirty_day_actuals && (
                    <div className="bg-white border border-green-200 rounded-lg p-6 bg-green-50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-green-900">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        30-Day Actuals Summary
                      </h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Actual spending and income for the most recent 30 days, broken down by your
                        defined categories:
                      </p>

                      {/* Income Actuals */}
                      {analysis.thirty_day_actuals.income_actuals.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-green-800 mb-3">Income Actuals</h4>
                          <div className="space-y-2">
                            {analysis.thirty_day_actuals.income_actuals.map((item, i) => (
                              <div
                                key={i}
                                className="bg-white rounded-lg p-4 border border-green-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-green-900">{item.category}</h5>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-green-700">
                                      {formatCurrency(item.actual)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Expected: {formatCurrency(item.expected)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span
                                    className={`font-medium ${
                                      item.difference >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    Difference: {formatCurrency(item.difference)} (
                                    {item.percentage_difference?.toFixed(1) || '0'}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expense Actuals */}
                      {analysis.thirty_day_actuals.expense_actuals.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-red-800 mb-3">Expense Actuals</h4>
                          <div className="space-y-2">
                            {analysis.thirty_day_actuals.expense_actuals.map((item, i) => (
                              <div
                                key={i}
                                className="bg-white rounded-lg p-4 border border-red-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-red-900">{item.category}</h5>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-red-700">
                                      {formatCurrency(item.actual)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Expected: {formatCurrency(item.expected)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span
                                    className={`font-medium ${
                                      item.difference <= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    Difference: {formatCurrency(item.difference)} (
                                    {item.percentage_difference?.toFixed(1) || '0'}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cross-Module Insights */}
                  {analysis.cross_module_insights && analysis.cross_module_insights.length > 0 && (
                    <div className="bg-white border border-indigo-200 rounded-lg p-6 bg-indigo-50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-indigo-900">
                        <Zap className="h-5 w-5 mr-2" />
                        Cross-Module Insights
                      </h3>
                      <div className="space-y-2">
                        {analysis.cross_module_insights.map((insight, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-sm text-gray-700">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top 5 Common Waste Areas Analysis */}
                  {analysis.waste_area_analysis && (
                    <div className="bg-white border border-orange-200 rounded-lg p-6 bg-orange-50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center text-orange-900">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Top 5 Common Waste Areas Analysis
                      </h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Based on research showing where consumers commonly waste money, here's your
                        spending in these areas:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Frequently Eating Out */}
                        <div className="bg-white rounded-lg border border-orange-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-orange-900">
                              1. Frequently Eating Out
                            </h4>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(
                                analysis.waste_area_analysis.frequently_eating_out.total
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {analysis.waste_area_analysis.frequently_eating_out.transaction_count}{' '}
                            transactions
                          </p>
                          {analysis.waste_area_analysis.frequently_eating_out.recommendations &&
                            analysis.waste_area_analysis.frequently_eating_out.recommendations
                              .length > 0 && (
                              <p className="text-sm text-gray-700">
                                {
                                  analysis.waste_area_analysis.frequently_eating_out
                                    .recommendations[0]
                                }
                              </p>
                            )}
                        </div>

                        {/* Impulse Online Buying */}
                        <div className="bg-white rounded-lg border border-orange-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-orange-900">
                              2. Impulse Online Buying
                            </h4>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(
                                analysis.waste_area_analysis.impulse_online_buying.total
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {analysis.waste_area_analysis.impulse_online_buying.transaction_count}{' '}
                            transactions
                          </p>
                          {analysis.waste_area_analysis.impulse_online_buying.recommendations &&
                            analysis.waste_area_analysis.impulse_online_buying.recommendations
                              .length > 0 && (
                              <p className="text-sm text-gray-700">
                                {
                                  analysis.waste_area_analysis.impulse_online_buying
                                    .recommendations[0]
                                }
                              </p>
                            )}
                        </div>

                        {/* Unused Memberships and Subscriptions */}
                        <div className="bg-white rounded-lg border border-orange-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-orange-900">
                              3. Unused Memberships & Subscriptions
                            </h4>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(
                                analysis.waste_area_analysis.unused_memberships_subscriptions.total
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {
                              analysis.waste_area_analysis.unused_memberships_subscriptions
                                .transaction_count
                            }{' '}
                            transactions
                          </p>
                          {analysis.waste_area_analysis.unused_memberships_subscriptions
                            .recommendations &&
                            analysis.waste_area_analysis.unused_memberships_subscriptions
                              .recommendations.length > 0 && (
                              <p className="text-sm text-gray-700">
                                {
                                  analysis.waste_area_analysis.unused_memberships_subscriptions
                                    .recommendations[0]
                                }
                              </p>
                            )}
                        </div>

                        {/* Convenience Foods and Drinks */}
                        <div className="bg-white rounded-lg border border-orange-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-orange-900">
                              4. Convenience Foods & Drinks
                            </h4>
                            <span className="text-lg font-bold text-orange-600">
                              {formatCurrency(
                                analysis.waste_area_analysis.convenience_foods_drinks.total
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {
                              analysis.waste_area_analysis.convenience_foods_drinks
                                .transaction_count
                            }{' '}
                            transactions
                          </p>
                          {analysis.waste_area_analysis.convenience_foods_drinks.recommendations &&
                            analysis.waste_area_analysis.convenience_foods_drinks.recommendations
                              .length > 0 && (
                              <p className="text-sm text-gray-700">
                                {
                                  analysis.waste_area_analysis.convenience_foods_drinks
                                    .recommendations[0]
                                }
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Food Waste */}
                      <div className="bg-white rounded-lg border border-orange-200 p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-orange-900">
                              5. Food Waste (Estimated)
                            </h4>
                            {analysis.waste_area_analysis.food_waste.note && (
                              <p className="text-xs text-gray-600 mt-1">
                                {analysis.waste_area_analysis.food_waste.note}
                              </p>
                            )}
                          </div>
                          <span className="text-lg font-bold text-orange-600">
                            {formatCurrency(analysis.waste_area_analysis.food_waste.total)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          Based on{' '}
                          {formatCurrency(analysis.waste_area_analysis.food_waste.grocery_spending)}{' '}
                          in grocery spending (
                          {analysis.waste_area_analysis.food_waste.transaction_count} transactions)
                        </p>
                        {analysis.waste_area_analysis.food_waste.recommendations &&
                          analysis.waste_area_analysis.food_waste.recommendations.length > 0 && (
                            <p className="text-sm text-gray-700">
                              {analysis.waste_area_analysis.food_waste.recommendations[0]}
                            </p>
                          )}
                      </div>

                      {/* Total Waste Spending */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-red-900">Total Waste Areas Spending</h4>
                          <span className="text-2xl font-bold text-red-600">
                            {formatCurrency(analysis.waste_area_analysis.total_waste_spending)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">
                          This represents potential savings opportunities across all 5 common waste
                          areas.
                        </p>
                      </div>
                    </div>
                  )}

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
                          <p className="text-sm text-gray-700 mb-2">{opportunity.recommendation}</p>
                          {opportunity.connection_to_goals && (
                            <p className="text-xs text-purple-600 italic">
                              📍 {opportunity.connection_to_goals}
                            </p>
                          )}
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
                            {insight.connected_goal && (
                              <p className="text-xs text-purple-600 mt-1">
                                🎯 Connected to goal: {insight.connected_goal}
                              </p>
                            )}
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

      {/* Manual Account Modal */}
      {showManualAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingAccount ? 'Edit Manual Account' : 'Add Manual Account'}
              </h3>
              <button
                onClick={() => {
                  setShowManualAccountModal(false)
                  setEditingAccount(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualAccountForm.institution_name}
                  onChange={(e) =>
                    setManualAccountForm({ ...manualAccountForm, institution_name: e.target.value })
                  }
                  placeholder="e.g., Schwab, Fidelity, Bank of America"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={manualAccountForm.account_name}
                  onChange={(e) =>
                    setManualAccountForm({ ...manualAccountForm, account_name: e.target.value })
                  }
                  placeholder="e.g., 401k, Roth IRA, Mortgage"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualAccountForm.account_type}
                  onChange={(e) =>
                    setManualAccountForm({
                      ...manualAccountForm,
                      account_type: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="investment">Investment (Stocks, IRA, 401k, etc.)</option>
                  <option value="loan">Loan (Student Loan, Mortgage, etc.)</option>
                  <option value="asset">Asset (Other assets)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualAccountForm.amount}
                  onChange={(e) =>
                    setManualAccountForm({ ...manualAccountForm, amount: e.target.value })
                  }
                  placeholder="Positive for assets, negative for debts"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use positive values for assets (e.g., $50,000), negative for debts (e.g.,
                  -$200,000)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={manualAccountForm.notes}
                  onChange={(e) =>
                    setManualAccountForm({ ...manualAccountForm, notes: e.target.value })
                  }
                  placeholder="Additional notes about this account"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowManualAccountModal(false)
                  setEditingAccount(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManualAccount}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expected Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingIncome ? 'Edit Expected Income' : 'Add Expected Income'}
              </h3>
              <button
                onClick={() => {
                  setShowIncomeModal(false)
                  setEditingIncome(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                    placeholder="e.g., Job, Client Account, Real Estate, Dividends"
                    list="income-categories"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="income-categories">
                    {incomeCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500">
                    Type your own category or select from suggestions (Job, Client Account, Real
                    Estate, Dividends, etc.)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={incomeForm.frequency}
                  onChange={(e) =>
                    setIncomeForm({
                      ...incomeForm,
                      frequency: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                  placeholder="Additional notes about this income source"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowIncomeModal(false)
                  setEditingIncome(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIncome}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expected Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {editingExpense ? 'Edit Expected Expense' : 'Add Expected Expense'}
              </h3>
              <button
                onClick={() => {
                  setShowExpenseModal(false)
                  setEditingExpense(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Categories align with TurboTax business expense categories
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.frequency}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      frequency: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Additional notes about this expense"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowExpenseModal(false)
                  setEditingExpense(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExpense}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Income Goal Modal */}
      {showIncomeGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Add New Income Goal</h3>
              <button
                onClick={() => setShowIncomeGoalModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={incomeGoalForm.title}
                  onChange={(e) => setIncomeGoalForm({ ...incomeGoalForm, title: e.target.value })}
                  placeholder="e.g., Launch Side Business, Increase Freelance Income"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={incomeGoalForm.description}
                  onChange={(e) =>
                    setIncomeGoalForm({ ...incomeGoalForm, description: e.target.value })
                  }
                  placeholder="Describe your income goal in detail"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeGoalForm.goal_type}
                    onChange={(e) =>
                      setIncomeGoalForm({
                        ...incomeGoalForm,
                        goal_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={incomeGoalForm.priority_level}
                    onChange={(e) =>
                      setIncomeGoalForm({
                        ...incomeGoalForm,
                        priority_level: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={1}>1 - Highest</option>
                    <option value={2}>2 - High</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Low</option>
                    <option value={5}>5 - Lowest</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Value (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={incomeGoalForm.target_value}
                  onChange={(e) =>
                    setIncomeGoalForm({ ...incomeGoalForm, target_value: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount you want to earn per {incomeGoalForm.goal_type}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={incomeGoalForm.target_date}
                  onChange={(e) =>
                    setIncomeGoalForm({ ...incomeGoalForm, target_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowIncomeGoalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIncomeGoal}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Goal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Reduction Goal Modal */}
      {showBudgetReductionGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Add Budget Reduction Goal</h3>
              <button
                onClick={() => setShowBudgetReductionGoalModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={budgetReductionGoalForm.title}
                  onChange={(e) =>
                    setBudgetReductionGoalForm({
                      ...budgetReductionGoalForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g., Reduce Subscription Costs, Cut Meal Spending"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={budgetReductionGoalForm.description}
                  onChange={(e) =>
                    setBudgetReductionGoalForm({
                      ...budgetReductionGoalForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what expenses you want to reduce"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={budgetReductionGoalForm.goal_type}
                    onChange={(e) =>
                      setBudgetReductionGoalForm({
                        ...budgetReductionGoalForm,
                        goal_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={budgetReductionGoalForm.priority_level}
                    onChange={(e) =>
                      setBudgetReductionGoalForm({
                        ...budgetReductionGoalForm,
                        priority_level: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={1}>1 - Highest</option>
                    <option value={2}>2 - High</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Low</option>
                    <option value={5}>5 - Lowest</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Reduction (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={budgetReductionGoalForm.target_value}
                  onChange={(e) =>
                    setBudgetReductionGoalForm({
                      ...budgetReductionGoalForm,
                      target_value: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount you want to reduce spending by per{' '}
                  {budgetReductionGoalForm.goal_type}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={budgetReductionGoalForm.target_date}
                  onChange={(e) =>
                    setBudgetReductionGoalForm({
                      ...budgetReductionGoalForm,
                      target_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBudgetReductionGoalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBudgetReductionGoal}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Goal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

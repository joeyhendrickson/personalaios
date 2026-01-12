import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          details: 'Please add OPENAI_API_KEY to your environment variables',
        },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { start_date, end_date, analysis_type = 'comprehensive' } = body

    // Set default date range if not provided (last 3 months)
    const endDate = end_date || new Date().toISOString().split('T')[0]
    const startDate =
      start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch user's goals/strategies related to income, business, and budget
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('priority_level', { ascending: true })

    // Fetch expected income and expenses
    const [expectedIncomeResult, expectedExpensesResult] = await Promise.all([
      supabase.from('expected_income').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('expected_expenses').select('*').eq('user_id', user.id).eq('is_active', true),
    ])

    const expectedIncome = expectedIncomeResult.data || []
    const expectedExpenses = expectedExpensesResult.data || []

    // Get user's bank connection IDs first (to support both schema variants)
    const { data: userConnections, error: connectionsError } = await supabase
      .from('bank_connections')
      .select('id')
      .eq('user_id', user.id)

    if (connectionsError) {
      console.error('Error fetching bank connections:', connectionsError)
    }

    const connectionIds = userConnections?.map((c) => c.id) || []

    // Get bank account IDs for these connections
    const { data: bankAccounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('id')
      .in('bank_connection_id', connectionIds)

    if (accountsError) {
      console.error('Error fetching bank accounts:', accountsError)
    }

    const bankAccountIds = bankAccounts?.map((a) => a.id) || []

    // Get transactions for the specified date range (prioritize date range)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(
        `
        *,
        bank_accounts!inner (
          name,
          type
        )
      `
      )
      .in('bank_account_id', bankAccountIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const transactionsToAnalyze = transactions || []

    // Calculate last 30 days for actuals summary
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    // Get transactions for last 30 days for actuals summary
    const { data: last30DaysTransactions, error: last30DaysError } = await supabase
      .from('transactions')
      .select(
        `
        *,
        bank_accounts!inner (
          name,
          type
        )
      `
      )
      .in('bank_account_id', bankAccountIds)
      .gte('date', thirtyDaysAgoStr)
      .lte('date', todayStr)
      .order('date', { ascending: false })

    if (last30DaysError) {
      console.error('Error fetching last 30 days transactions:', last30DaysError)
    }

    // Fetch dashboard data: tasks, habits, strategies (goals)
    const [tasksResult, habitsResult, strategiesResult] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).eq('status', 'pending'),
      supabase.from('daily_habits').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
    ])

    const tasks = tasksResult.data || []
    const habits = habitsResult.data || []
    const strategies = strategiesResult.data || []

    if (!transactionsToAnalyze || transactionsToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          message: 'No transactions found. Please sync your bank accounts first.',
          insights: [],
          recommendations: [],
          spending_summary: {
            total_income: 0,
            total_expenses: 0,
            net_savings: 0,
            top_categories: [],
          },
        },
      })
    }

    // Fetch focus enhancer app usage data to identify app subscriptions
    const { data: focusAnalyses, error: focusError } = await supabase
      .from('focus_analyses')
      .select('app_usage_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    let appSubscriptions: string[] = []
    if (focusAnalyses && focusAnalyses.length > 0 && focusAnalyses[0].app_usage_data) {
      // Extract app names from app_usage_data JSONB
      try {
        const appData = focusAnalyses[0].app_usage_data as any
        if (Array.isArray(appData)) {
          appSubscriptions = appData
            .map((app: any) => app.name || app.app_name || '')
            .filter(Boolean)
        } else if (typeof appData === 'object') {
          appSubscriptions = Object.keys(appData).filter(Boolean)
        }
      } catch (e) {
        console.error('Error parsing app usage data:', e)
      }
    }

    // Get user's budget categories
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.id)

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
    }

    // Detect Venmo, PayPal, Zelle transfers (potential side business income)
    const p2pTransfers = transactionsToAnalyze.filter((t: any) => {
      const name = (t.name || '').toLowerCase()
      const merchant = (t.merchant_name || '').toLowerCase()
      return (
        name.includes('venmo') ||
        name.includes('paypal') ||
        name.includes('zelle') ||
        merchant.includes('venmo') ||
        merchant.includes('paypal') ||
        merchant.includes('zelle')
      )
    })

    // Separate incoming vs outgoing P2P transfers
    const incomingP2P = p2pTransfers.filter((t: any) => t.amount > 0)
    const outgoingP2P = p2pTransfers.filter((t: any) => t.amount < 0)

    // Calculate totals for P2P transfers
    const totalIncomingP2P = incomingP2P.reduce((sum: number, t: any) => sum + t.amount, 0)
    const totalOutgoingP2P = Math.abs(
      outgoingP2P.reduce((sum: number, t: any) => sum + t.amount, 0)
    )

    // Process transaction data for AI analysis
    const transactionData = transactionsToAnalyze.map((t: any) => ({
      date: t.date,
      amount: t.amount,
      name: t.name,
      merchant_name: t.merchant_name,
      category: t.category,
      account_name: t.bank_accounts?.name,
      account_type: t.bank_accounts?.type,
      is_income: t.amount > 0,
    }))

    // Calculate basic spending summary
    const totalIncome = transactionsToAnalyze
      .filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0)
    const totalExpenses = Math.abs(
      transactionsToAnalyze
        .filter((t: any) => t.amount < 0)
        .reduce((sum: number, t: any) => sum + t.amount, 0)
    )
    const netSavings = totalIncome - totalExpenses

    // Calculate expected monthly income/expenses
    const calculateMonthlyAmount = (item: any) => {
      if (item.frequency === 'weekly') return item.amount * 4.33
      if (item.frequency === 'biweekly') return item.amount * 2.17
      if (item.frequency === 'monthly') return item.amount
      if (item.frequency === 'quarterly') return item.amount / 3
      if (item.frequency === 'annually') return item.amount / 12
      return 0
    }

    const totalExpectedMonthlyIncome = expectedIncome.reduce(
      (sum, inc) => sum + calculateMonthlyAmount(inc),
      0
    )
    const totalExpectedMonthlyExpenses = expectedExpenses.reduce(
      (sum, exp) => sum + calculateMonthlyAmount(exp),
      0
    )

    // Calculate 30-day actuals by matching transactions to expected income/expense categories
    const calculate30DayActuals = () => {
      const last30Days = last30DaysTransactions || []
      const actuals: {
        income: Array<{
          category: string
          expected: number
          actual: number
          difference: number
          transactions: Array<{ date: string; name: string; amount: number }>
        }>
        expenses: Array<{
          category: string
          expected: number
          actual: number
          difference: number
          transactions: Array<{ date: string; name: string; amount: number }>
        }>
      } = { income: [], expenses: [] }

      // Calculate income actuals
      expectedIncome.forEach((inc: any) => {
        const expectedMonthly = calculateMonthlyAmount(inc)
        // Simple keyword matching - could be improved with AI categorization
        const matchingTransactions = last30Days.filter((t: any) => {
          const name = (t.name || '').toLowerCase()
          const merchant = (t.merchant_name || '').toLowerCase()
          const categoryName = inc.category.toLowerCase()
          return (
            t.amount > 0 &&
            (name.includes(categoryName) ||
              merchant.includes(categoryName) ||
              categoryName.includes(name.split(' ')[0]) ||
              categoryName.includes(merchant.split(' ')[0]))
          )
        })
        const actual = matchingTransactions.reduce((sum: number, t: any) => sum + t.amount, 0)
        const transactionDetails = matchingTransactions.map((t: any) => ({
          date: t.date,
          name: t.name || t.merchant_name || 'Unknown',
          amount: t.amount,
        }))
        actuals.income.push({
          category: inc.category,
          expected: expectedMonthly,
          actual,
          difference: actual - expectedMonthly,
          transactions: transactionDetails,
        })
      })

      // Calculate expense actuals
      expectedExpenses.forEach((exp: any) => {
        const expectedMonthly = calculateMonthlyAmount(exp)
        const categoryName = exp.category.toLowerCase()

        // Create category-specific keywords for better matching
        const categoryKeywords: string[] = []
        if (categoryName.includes('utilities')) {
          categoryKeywords.push(
            'utility',
            'electric',
            'gas',
            'water',
            'sewer',
            'trash',
            'internet',
            'cable',
            'phone bill'
          )
        } else if (categoryName.includes('rent')) {
          categoryKeywords.push('rent', 'apartment', 'housing payment', 'landlord')
        } else if (categoryName.includes('grocery')) {
          categoryKeywords.push(
            'grocery',
            'supermarket',
            'walmart',
            'target',
            'costco',
            'kroger',
            'safeway',
            'whole foods',
            'trader joe',
            'aldi',
            'food',
            'grocery store'
          )
        } else if (categoryName.includes('meals') || categoryName.includes('entertainment')) {
          categoryKeywords.push(
            'restaurant',
            'dining',
            'cafe',
            'bar',
            'entertainment',
            'movies',
            'theater',
            'concert',
            'event'
          )
        }

        const matchingTransactions = last30Days.filter((t: any) => {
          // Skip if transaction is income
          if (t.amount >= 0) return false

          const name = (t.name || '').toLowerCase()
          const merchant = (t.merchant_name || '').toLowerCase()
          const transactionText = `${name} ${merchant}`.toLowerCase()
          const plaidCategories = (t.category || []).map((c: string) => c.toLowerCase())

          // Primary: Check if Plaid category matches (most reliable)
          const plaidMatch = plaidCategories.some((cat: string) => {
            if (
              categoryName.includes('utilities') &&
              (cat.includes('utilities') || cat.includes('utility'))
            )
              return true
            if (categoryName.includes('rent') && (cat.includes('rent') || cat.includes('housing')))
              return true
            if (
              categoryName.includes('grocery') &&
              (cat.includes('grocery') || cat.includes('food and drink'))
            )
              return true
            if (
              (categoryName.includes('meals') || categoryName.includes('entertainment')) &&
              (cat.includes('restaurant') ||
                cat.includes('food and drink') ||
                cat.includes('entertainment'))
            )
              return true
            return false
          })

          if (plaidMatch) return true

          // Secondary: Check category-specific keywords (more precise)
          if (categoryKeywords.length > 0) {
            const keywordMatch = categoryKeywords.some((keyword) =>
              transactionText.includes(keyword)
            )
            if (keywordMatch) return true
          }

          // Tertiary: Direct category name match in transaction text (fallback)
          if (categoryName.length > 3 && transactionText.includes(categoryName)) {
            return true
          }

          return false
        })

        const actual = Math.abs(
          matchingTransactions.reduce((sum: number, t: any) => sum + t.amount, 0)
        )
        const transactionDetails = matchingTransactions.map((t: any) => ({
          date: t.date,
          name: t.name || t.merchant_name || 'Unknown',
          amount: Math.abs(t.amount),
        }))
        actuals.expenses.push({
          category: exp.category,
          expected: expectedMonthly,
          actual,
          difference: actual - expectedMonthly,
          transactions: transactionDetails,
        })
      })

      return actuals
    }

    const thirtyDayActuals = calculate30DayActuals()

    // Validate expense actuals - check for duplicate values (indicating matching bug)
    if (thirtyDayActuals.expenses.length > 1) {
      const actualValues = thirtyDayActuals.expenses.map((e) => e.actual)
      const uniqueValues = new Set(actualValues)
      if (uniqueValues.size === 1 && actualValues[0] > 0) {
        console.warn(
          'WARNING: All expense categories have the same actual value. This indicates a matching logic bug.'
        )
        console.warn('Expense actuals:', thirtyDayActuals.expenses)
      }
    }

    // Calculate spending by category
    const categorySpending: Record<string, number> = {}
    transactionsToAnalyze.forEach((t: any) => {
      if (t.amount < 0) {
        // Only expenses
        const categoryName = t.category?.[0] || 'Uncategorized'
        categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Math.abs(t.amount)
      }
    })

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, amount]) => ({ name, amount }))

    // Categorize transactions into the 5 common waste areas
    const wasteAreaCategories = {
      frequentlyEatingOut: {
        name: 'Frequently Eating Out',
        keywords: [
          'restaurant',
          'dining',
          'cafe',
          'coffee shop',
          'starbucks',
          'dunkin',
          'mcdonalds',
          'burger king',
          'subway',
          'pizza',
          'doordash',
          'uber eats',
          'grubhub',
          'postmates',
          'caviar',
          'seamless',
          'food delivery',
          'fast food',
          'drive thru',
          'takeout',
          'take out',
          'bar & grill',
          'bistro',
          'diner',
          'buffet',
        ],
        transactions: [] as any[],
        total: 0,
      },
      impulseOnlineBuying: {
        name: 'Impulse Online Buying',
        keywords: [
          'amazon',
          'etsy',
          'ebay',
          'shopify',
          'online purchase',
          'internet purchase',
          'online order',
          'web order',
          'instacart',
          'target.com',
          'walmart.com',
          'bestbuy.com',
          'zappos',
          'nordstrom',
          'online',
          'e-commerce',
          'shop',
          'store online',
        ],
        transactions: [] as any[],
        total: 0,
      },
      unusedMembershipsSubscriptions: {
        name: 'Unused Memberships and Subscriptions',
        keywords: [
          'subscription',
          'recurring',
          'membership',
          'monthly',
          'annual',
          'netflix',
          'spotify',
          'hulu',
          'disney',
          'apple music',
          'youtube premium',
          'adobe',
          'microsoft',
          'gym',
          'fitness',
          'planet fitness',
          '24 hour fitness',
          'peloton',
          'classpass',
          'audible',
          'kindle unlimited',
          'adobe creative',
          'office 365',
          'dropbox',
          'icloud',
          'prime',
          'premium',
          'pro',
        ],
        transactions: [] as any[],
        total: 0,
      },
      convenienceFoodsDrinks: {
        name: 'Buying Convenience Foods and Drinks',
        keywords: [
          'convenience store',
          '7-eleven',
          'circle k',
          'speedway',
          'wawa',
          'sheetz',
          'bottled water',
          'beverage',
          'vending',
          'snack',
          'pre-cut',
          'prepared food',
          'ready meal',
          'frozen meal',
          'microwave meal',
          'coffee',
          'espresso',
          'latte',
          'cappuccino',
          'smoothie',
          'juice bar',
          'jamba',
          'energy drink',
          'red bull',
          'monster',
          'gas station',
          'quick mart',
        ],
        transactions: [] as any[],
        total: 0,
      },
      foodWaste: {
        name: 'Food Waste (Estimated)',
        keywords: [
          'grocery',
          'supermarket',
          'walmart',
          'target',
          'costco',
          'sams club',
          'kroger',
          'safeway',
          'whole foods',
          'trader joe',
          'aldi',
          'food',
          'supermarket',
        ],
        transactions: [] as any[],
        total: 0,
        note: 'Estimated based on grocery spending - actual waste may vary',
      },
    }

    // Categorize each transaction into waste areas
    transactionsToAnalyze.forEach((t: any) => {
      if (t.amount >= 0) return // Only analyze expenses

      const name = (t.name || '').toLowerCase()
      const merchant = (t.merchant_name || '').toLowerCase()
      const transactionText = `${name} ${merchant}`.toLowerCase()
      const amount = Math.abs(t.amount)
      const plaidCategory = (t.category || []).map((c: string) => c.toLowerCase()).join(' ')
      let categorized = false

      // Check each waste category (except food waste - handled separately)
      for (const [key, category] of Object.entries(wasteAreaCategories)) {
        if (key === 'foodWaste') continue // Handle food waste separately

        const matches = category.keywords.some((keyword) =>
          transactionText.includes(keyword.toLowerCase())
        )
        const categoryMatches = category.keywords.some((keyword) =>
          plaidCategory.includes(keyword.toLowerCase())
        )

        if (matches || categoryMatches) {
          category.transactions.push(t)
          category.total += amount
          categorized = true
          break // Only count in first matching category
        }
      }

      // Food waste: Estimate based on grocery spending (only if not already categorized)
      if (!categorized) {
        const groceryKeywords = wasteAreaCategories.foodWaste.keywords
        const isGrocery = groceryKeywords.some((keyword) =>
          transactionText.includes(keyword.toLowerCase())
        )
        const isGroceryCategory =
          plaidCategory.includes('groceries') ||
          plaidCategory.includes('food and drink') ||
          plaidCategory.includes('supermarkets') ||
          plaidCategory.includes('supermarkets')

        // Only count as grocery if not already counted as eating out
        const alreadyCountedAsEatingOut =
          wasteAreaCategories.frequentlyEatingOut.transactions.includes(t)
        if ((isGrocery || isGroceryCategory) && !alreadyCountedAsEatingOut) {
          wasteAreaCategories.foodWaste.transactions.push(t)
          wasteAreaCategories.foodWaste.total += amount
        }
      }
    })

    // Calculate total grocery spending first (before estimating waste)
    const totalGrocerySpending = wasteAreaCategories.foodWaste.transactions.reduce(
      (sum: number, t: any) => sum + Math.abs(t.amount),
      0
    )

    // Estimate food waste as 25% of grocery spending (based on research showing 20-30% of food is wasted)
    const estimatedFoodWaste = totalGrocerySpending * 0.25

    // Format waste area totals for AI prompt
    const wasteAreaTotals = Object.entries(wasteAreaCategories).map(([key, category]) => ({
      category: category.name,
      total: category.total,
      transactionCount: category.transactions.length,
      note: (category as any).note || undefined,
    }))

    // Check for app subscriptions in transactions
    const subscriptionTransactions = transactionsToAnalyze.filter((t: any) => {
      const name = (t.name || '').toLowerCase()
      const merchant = (t.merchant_name || '').toLowerCase()
      const isSubscription = appSubscriptions.some(
        (app) => name.includes(app.toLowerCase()) || merchant.includes(app.toLowerCase())
      )
      const commonSubscriptionKeywords = [
        'subscription',
        'recurring',
        'monthly',
        'premium',
        'pro',
        'netflix',
        'spotify',
        'amazon prime',
        'adobe',
        'microsoft',
        'apple',
        'google',
        'youtube premium',
      ]
      const hasSubscriptionKeyword = commonSubscriptionKeywords.some(
        (keyword) => name.includes(keyword) || merchant.includes(keyword)
      )
      return isSubscription || hasSubscriptionKeyword
    })

    // Identify subscriptions that might not be in expected expenses
    const missingSubscriptions = subscriptionTransactions
      .filter((t: any) => {
        const name = (t.name || '').toLowerCase()
        return !expectedExpenses.some((exp) => {
          const expName = exp.category.toLowerCase()
          return name.includes(expName) || expName.includes(name.split(' ')[0])
        })
      })
      .map((t: any) => ({ name: t.name, amount: Math.abs(t.amount), date: t.date }))

    // Filter relevant goals for income/business/budget
    const relevantGoals = (goals || []).filter(
      (g: any) =>
        g.title?.toLowerCase().includes('income') ||
        g.title?.toLowerCase().includes('business') ||
        g.title?.toLowerCase().includes('side') ||
        g.title?.toLowerCase().includes('revenue') ||
        g.title?.toLowerCase().includes('budget') ||
        g.title?.toLowerCase().includes('spending') ||
        g.description?.toLowerCase().includes('income') ||
        g.description?.toLowerCase().includes('business') ||
        g.target_unit?.toLowerCase().includes('dollar')
    )

    // Create AI prompt for comprehensive budget analysis with coaching
    const prompt = `
You are an expert financial advisor, budget analyst, and business coach specializing in helping users achieve income growth goals and optimize spending. Analyze the following comprehensive financial data and provide detailed insights, questions, and coaching recommendations.

=== ANALYSIS DATE RANGE ===
Analysis Period: ${startDate} to ${endDate}
Total transactions analyzed: ${transactionsToAnalyze.length}
Recent transactions (sample):
${JSON.stringify(transactionData.slice(0, 50), null, 2)}
${transactionData.length > 50 ? `\n... and ${transactionData.length - 50} more transactions` : ''}

=== EXPECTED INCOME & EXPENSES ===
Expected Monthly Income: $${totalExpectedMonthlyIncome.toFixed(2)}
Expected Income Sources:
${expectedIncome.map((inc: any) => `- ${inc.category}: $${inc.amount} (${inc.frequency})`).join('\n') || 'None defined'}

Expected Monthly Expenses: $${totalExpectedMonthlyExpenses.toFixed(2)}
Expected Expense Categories:
${expectedExpenses.map((exp: any) => `- ${exp.category}: $${exp.amount} (${exp.frequency})`).join('\n') || 'None defined'}

=== ACTUAL SPENDING SUMMARY ===
Total Income (actual): $${totalIncome.toFixed(2)}
Total Expenses (actual): $${totalExpenses.toFixed(2)}
Net Savings: $${netSavings.toFixed(2)}
Top Spending Categories: ${topCategories.map((c) => `${c.name}: $${c.amount.toFixed(2)}`).join(', ')}

=== DISCREPANCIES & ACCOUNTABILITY ===
Expected vs Actual Income: Expected $${totalExpectedMonthlyIncome.toFixed(2)} vs Actual $${(totalIncome / (transactionsToAnalyze.length > 0 ? Math.max(1, transactionsToAnalyze.length / 30) : 1)).toFixed(2)} per month
Expected vs Actual Expenses: Expected $${totalExpectedMonthlyExpenses.toFixed(2)} vs Actual $${(totalExpenses / (transactionsToAnalyze.length > 0 ? Math.max(1, transactionsToAnalyze.length / 30) : 1)).toFixed(2)} per month

=== POTENTIAL SIDE BUSINESS INCOME ===
P2P Transfer Income (Venmo/PayPal/Zelle incoming): $${totalIncomingP2P.toFixed(2)}
Number of incoming P2P transfers: ${incomingP2P.length}
P2P Transfer Outgoing: $${totalOutgoingP2P.toFixed(2)}
Sample incoming transfers: ${
      incomingP2P
        .slice(0, 5)
        .map((t: any) => `${t.name}: $${t.amount}`)
        .join(', ') || 'None'
    }

=== APP SUBSCRIPTIONS (from Focus Enhancer module) ===
Apps detected: ${appSubscriptions.join(', ') || 'None'}
Subscription transactions found: ${subscriptionTransactions.length}
Total subscription spending: $${subscriptionTransactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0).toFixed(2)}
Subscriptions NOT in expected expenses: ${missingSubscriptions.length > 0 ? missingSubscriptions.map((s) => `${s.name}: $${s.amount.toFixed(2)}`).join(', ') : 'None identified'}

=== USER DASHBOARD DATA ===
Active Goals/Strategies (${strategies.length}):
${strategies.map((g: any) => `- ${g.title}: ${g.description || 'No description'} (${g.goal_type || 'N/A'}, Target: ${g.target_value ? `${g.target_unit === 'dollars' ? '$' : ''}${g.target_value}` : 'No target'})`).join('\n') || 'No goals found'}

Active Tasks (${tasks.length}):
${
  tasks
    .slice(0, 20)
    .map((t: any) => `- ${t.title}: ${t.description || 'No description'}`)
    .join('\n') || 'No tasks found'
}
${tasks.length > 20 ? `... and ${tasks.length - 20} more tasks` : ''}

Daily Habits (${habits.length}):
${habits.map((h: any) => `- ${h.title || h.name}: ${h.description || 'No description'}`).join('\n') || 'No habits found'}

=== 30-DAY ACTUALS SUMMARY ===
Last 30 Days Income Actuals (${thirtyDaysAgoStr} to ${todayStr}):
${
  thirtyDayActuals.income
    .map((a) => {
      const percentageDiff = a.expected > 0 ? (a.difference / a.expected) * 100 : 0
      const transactionList =
        a.transactions.length > 0
          ? `\n  Transactions (${a.transactions.length}): ${a.transactions
              .slice(0, 10)
              .map((t) => `${t.date}: ${t.name} $${t.amount.toFixed(2)}`)
              .join(
                ', '
              )}${a.transactions.length > 10 ? ` ... and ${a.transactions.length - 10} more` : ''}`
          : ''
      return `- ${a.category}: Expected $${a.expected.toFixed(2)}/month, Actual $${a.actual.toFixed(2)}, Difference: $${a.difference.toFixed(2)} (${percentageDiff.toFixed(1)}%)${transactionList}`
    })
    .join('\n') || 'No income categories'
}

Last 30 Days Expense Actuals:
${
  thirtyDayActuals.expenses
    .map((a) => {
      const percentageDiff = a.expected > 0 ? (a.difference / a.expected) * 100 : 0
      const transactionList =
        a.transactions.length > 0
          ? `\n  Transactions (${a.transactions.length}): ${a.transactions
              .slice(0, 10)
              .map((t) => `${t.date}: ${t.name} $${t.amount.toFixed(2)}`)
              .join(
                ', '
              )}${a.transactions.length > 10 ? ` ... and ${a.transactions.length - 10} more` : ''}`
          : ''
      return `- ${a.category}: Expected $${a.expected.toFixed(2)}/month, Actual $${a.actual.toFixed(2)}, Difference: $${a.difference.toFixed(2)} (${percentageDiff.toFixed(1)}%)${transactionList}`
    })
    .join('\n') || 'No expense categories'
}

IMPORTANT: If multiple expense categories show identical actual amounts, this indicates a data processing error. Do NOT report these as real spending discrepancies. Instead, note that the category matching logic needs review. Each expense category should have distinct actual spending values based on transaction categorization.

ANALYSIS TYPE: ${analysis_type}

Please provide a comprehensive budget analysis with the following enhanced structure:

1. SPENDING PATTERNS & DISCREPANCIES: Compare expected vs actual income/expenses based on the selected date range. Identify where expectations don't match reality (flag discrepancies >20%).
2. ACCOUNTABILITY QUESTIONS: Ask specific questions about spending habits (e.g., "Why are you spending $X on Y when your expected budget is $Z?"). 
   CRITICAL RULE: For ANY discrepancy >20% or any question about spending that exceeds expected amounts, you MUST include the specific transactions that contributed to that discrepancy. List the transaction dates, merchant names, and amounts that were used to calculate the actual spending. This ensures transparency and helps users verify the analysis.
   ADDITIONAL RULE: If you ask a question about a SPECIFIC TRANSACTION or mention a specific transaction by name/merchant, you MUST include that transaction's full details (date, name, amount) in the transactions array. Users should be able to see exactly which transaction you're referring to.
3. DASHBOARD ALIGNMENT: Review the user's current goals, tasks, and habits. Make specific recommendations on how to update the dashboard based on financial analysis findings (e.g., suggest adding new goals, modifying existing goals, adding tasks, or creating habits).
4. MODULE RECOMMENDATIONS: Recommend specific Lifestacks modules based on detected financial patterns:
   - If user has habitual spending problems (e.g., excessive retail/impulse buying): Recommend creating a daily habit in the dashboard to track and reduce this behavior
   - If user has excessive app subscriptions affecting focus: Recommend the Focus Enhancer module
   - If user eats out frequently and exceeds budget: Recommend the Grocery Store Optimizer module to track spending between stores and optimize grocery budget
   - If actual vs expected income/expenses differs by >20%: Recommend the Life Coach module for conversational goal redefinition and expectation revisions
5. SIDE BUSINESS OPPORTUNITIES: Analyze P2P transfers - ask if incoming Venmo/PayPal/Zelle transfers represent side business income that should be tracked in expected income.
6. SUBSCRIPTION ANALYSIS: Identify app subscriptions that may be excessive or not accounted for in expected expenses.
7. GOAL ALIGNMENT: Connect spending/income to user's goals for new business, side business, and budget reduction.
8. COACHING RECOMMENDATIONS: Provide strategic coaching on:
   - Launching new business (if user has new business goals)
   - Marketing/advertising spending (if aligned with goals)
   - Cost reduction opportunities (subscriptions, meals, entertainment, fees)
   - Consolidating or eliminating unnecessary expenses
9. SAVINGS OPPORTUNITIES: Specific areas where money can be saved, especially variable expenses.
10. FINANCIAL HEALTH: Overall assessment.
11. ACTIONABLE INSIGHTS: Immediate steps the user should take.
12. 30-DAY ACTUALS SUMMARY: Provide a summary of actual spending and income for the most recent 30 days, broken down by the categories defined in the income and expenses section.

Format your response as JSON with this structure:
{
  "spending_patterns": {
    "trends": ["List of spending trends identified"],
    "unusual_spending": ["Any unusual or concerning spending patterns"],
    "seasonal_patterns": ["Any seasonal or cyclical patterns"],
    "discrepancies": {
      "expected_vs_actual_income": "Comparison and analysis",
      "expected_vs_actual_expenses": "Comparison and analysis",
      "missing_categories": ["Categories in transactions but not in expected expenses"],
      "unexpected_income": ["Income sources not in expected income"]
    }
  },
  "accountability_questions": [
    {
      "question": "Specific question about spending habits",
      "category": "Category this relates to",
      "context": "Why this question matters",
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "name": "Merchant/Transaction name",
          "amount": 0.00
        }
      ]
    }
  ],
  "side_business_analysis": {
    "potential_income": ${totalIncomingP2P},
    "transfers_analysis": "Analysis of P2P transfers and whether they represent business income",
    "recommendations": [
      "Specific recommendations for tracking side business income",
      "Suggestions for connecting to business goals"
    ],
    "questions": [
      "Questions about whether incoming transfers represent business income"
    ]
  },
  "subscription_analysis": {
    "total_subscription_spending": ${subscriptionTransactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)},
    "unaccounted_subscriptions": ${JSON.stringify(missingSubscriptions.slice(0, 10))},
    "recommendations": [
      "Specific recommendations for subscription management",
      "Suggestions for consolidation or elimination"
    ]
  },
  "goal_alignment": {
    "connected_goals": ${JSON.stringify(relevantGoals.map((g: any) => ({ title: g.title, description: g.description })))},
    "income_goal_coaching": [
      "Coaching on achieving new income goals related to side business or new business launch"
    ],
    "budget_reduction_coaching": [
      "Coaching on reducing spending to align with budget reduction goals"
    ],
    "business_launch_recommendations": [
      "Strategic recommendations for launching new business",
      "Marketing/advertising spending guidance",
      "Investment recommendations for business growth"
    ]
  },
  "waste_area_analysis": {
    "frequently_eating_out": {
      "total": ${wasteAreaCategories.frequentlyEatingOut.total},
      "transaction_count": ${wasteAreaCategories.frequentlyEatingOut.transactions.length},
      "recommendations": ["Specific recommendations for reducing dining out costs"]
    },
    "impulse_online_buying": {
      "total": ${wasteAreaCategories.impulseOnlineBuying.total},
      "transaction_count": ${wasteAreaCategories.impulseOnlineBuying.transactions.length},
      "recommendations": ["Specific recommendations for reducing impulse purchases"]
    },
    "unused_memberships_subscriptions": {
      "total": ${wasteAreaCategories.unusedMembershipsSubscriptions.total},
      "transaction_count": ${wasteAreaCategories.unusedMembershipsSubscriptions.transactions.length},
      "recommendations": ["Specific recommendations for canceling unused subscriptions"]
    },
    "convenience_foods_drinks": {
      "total": ${wasteAreaCategories.convenienceFoodsDrinks.total},
      "transaction_count": ${wasteAreaCategories.convenienceFoodsDrinks.transactions.length},
      "recommendations": ["Specific recommendations for reducing convenience food spending"]
    },
    "food_waste": {
      "total": ${estimatedFoodWaste},
      "grocery_spending": ${totalGrocerySpending},
      "transaction_count": ${wasteAreaCategories.foodWaste.transactions.length},
      "note": "Estimated as 25% of grocery spending",
      "recommendations": ["Specific recommendations for reducing food waste through meal planning"]
    },
    "total_waste_spending": ${wasteAreaCategories.frequentlyEatingOut.total + wasteAreaCategories.impulseOnlineBuying.total + wasteAreaCategories.unusedMembershipsSubscriptions.total + wasteAreaCategories.convenienceFoodsDrinks.total + estimatedFoodWaste}
  },
  "savings_opportunities": [
    {
      "category": "Category name",
      "current_spending": 500.00,
      "potential_savings": 150.00,
      "savings_percentage": 30,
      "recommendation": "Specific recommendation for this category",
      "connection_to_goals": "How this connects to user's goals"
    }
  ],
  "budget_recommendations": {
    "income_allocation": {
      "needs": 50,
      "wants": 30,
      "savings": 20
    },
    "category_budgets": [
      {
        "category": "Category name",
        "recommended_amount": 500.00,
        "current_spending": 600.00,
        "adjustment": -100.00,
        "reasoning": "Why this adjustment is recommended",
        "goal_alignment": "How this aligns with user's goals"
      }
    ],
    "expected_income_updates": [
      {
        "suggestion": "Should add [income source] to expected income",
        "reasoning": "Why this should be added",
        "estimated_amount": 500.00
      }
    ],
    "expected_expense_updates": [
      {
        "suggestion": "Should add [expense category] to expected expenses",
        "reasoning": "Why this should be added",
        "estimated_amount": 100.00
      },
      {
        "suggestion": "Should reduce [expense category]",
        "reasoning": "Why this should be reduced",
        "current_amount": 200.00,
        "recommended_amount": 150.00
      }
    ]
  },
  "financial_health": {
    "score": 75,
    "assessment": "Overall financial health assessment",
    "strengths": ["List of financial strengths"],
    "concerns": ["List of areas of concern"],
    "goal_progress": "How current spending/income aligns with goals"
  },
  "actionable_insights": [
    {
      "priority": "high/medium/low",
      "action": "Specific action to take",
      "impact": "Expected impact of this action",
      "timeline": "When to implement this action",
      "connected_goal": "Which goal this supports (if any)"
    }
  ],
  "monthly_budget_suggestion": {
    "total_income": ${totalExpectedMonthlyIncome || totalIncome / Math.max(1, transactionsToAnalyze.length / 30)},
    "recommended_expenses": ${totalExpectedMonthlyIncome ? totalExpectedMonthlyIncome * 0.8 : totalIncome * 0.8},
    "recommended_savings": ${totalExpectedMonthlyIncome ? totalExpectedMonthlyIncome * 0.2 : totalIncome * 0.2},
    "breakdown": "Detailed breakdown of recommended budget"
  },
  "cross_module_insights": [
    "Insights that connect budget data to other modules (like focus enhancer subscriptions)"
  ],
  "module_recommendations": [
    {
      "module": "module_name",
      "reason": "Why this module is recommended",
      "specific_issue": "The specific financial pattern or problem this addresses",
      "expected_benefit": "What benefit the user will gain"
    }
  ],
  "dashboard_update_recommendations": [
    {
      "type": "goal|task|habit",
      "action": "add|modify|remove",
      "title": "Title of the item",
      "description": "Description or reasoning",
      "reasoning": "Why this dashboard update is recommended based on financial analysis"
    }
  ],
  "thirty_day_actuals": {
    "income_actuals": ${JSON.stringify(
      thirtyDayActuals.income.map((a: any) => ({
        category: a.category,
        expected: a.expected,
        actual: a.actual,
        difference: a.difference,
        percentage_difference: a.expected > 0 ? (a.difference / a.expected) * 100 : 0,
      }))
    )},
    "expense_actuals": ${JSON.stringify(
      thirtyDayActuals.expenses.map((a: any) => ({
        category: a.category,
        expected: a.expected,
        actual: a.actual,
        difference: a.difference,
        percentage_difference: a.expected > 0 ? (a.difference / a.expected) * 100 : 0,
      }))
    )}
  }
}

IMPORTANT INSTRUCTIONS:
- Be direct and accountable: Ask tough questions about spending that violates goals or expectations
- Be encouraging: Provide coaching that helps users achieve their income and business goals
- Be strategic: Connect spending recommendations to launching new businesses, marketing, and growth
- Be specific: Reference actual transaction amounts, categories, and user goals
- Focus on action: Every recommendation should be actionable and tied to specific goals
- Ask questions: Don't just tell, ask questions that prompt reflection and change
- CRITICAL: For any discrepancy >20% between expected and actual spending/income, or any accountability question about excessive spending, you MUST include the "transactions" array in the accountability_question object. This array should list the specific transactions (date, name, amount) that contributed to the discrepancy. Use the transaction data from the 30-DAY ACTUALS SUMMARY above. This rule is mandatory - do not ask questions about spending discrepancies without listing the underlying transactions.

Focus on actionable, specific recommendations that help improve financial situation and achieve income/business goals. Be encouraging but hold users accountable to their stated goals and expectations.
`

    // Use AI to analyze the budget data with enhanced coaching capabilities
    const { text: analysis } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert financial advisor, budget analyst, and business coach specializing in budget analysis, personal finance optimization, and helping users achieve income growth goals. You analyze transaction data, expected income/expenses, user goals, and cross-reference with app usage data. You provide direct, accountable questions about spending habits while offering encouraging coaching to help users achieve their financial and business goals. You connect spending recommendations to strategic business launch activities, marketing, and growth. Be specific, actionable, and goal-aligned.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysis)
    } catch {
      // If JSON parsing fails, return a structured response
      parsedAnalysis = {
        spending_patterns: {
          trends: ['Analysis provided in recommendations'],
          unusual_spending: ['See detailed analysis above'],
          seasonal_patterns: ['Pattern analysis included'],
          discrepancies: {
            expected_vs_actual_income: analysis,
            expected_vs_actual_expenses: analysis,
            missing_categories: [],
            unexpected_income: [],
          },
        },
        accountability_questions: [
          {
            question:
              'Review the detailed analysis above for specific questions about your spending habits',
            category: 'General',
            context: 'Understanding your spending patterns',
            transactions: [],
          },
        ],
        side_business_analysis: {
          potential_income: totalIncomingP2P,
          transfers_analysis: analysis,
          recommendations: ['Review analysis for specific recommendations'],
          questions: ['Are incoming P2P transfers from side business income?'],
        },
        subscription_analysis: {
          total_subscription_spending: subscriptionTransactions.reduce(
            (sum: number, t: any) => sum + Math.abs(t.amount),
            0
          ),
          unaccounted_subscriptions: missingSubscriptions,
          recommendations: ['Review analysis for subscription management recommendations'],
        },
        goal_alignment: {
          connected_goals: relevantGoals,
          income_goal_coaching: ['Review analysis for income growth coaching'],
          budget_reduction_coaching: ['Review analysis for budget reduction coaching'],
          business_launch_recommendations: ['Review analysis for business launch strategies'],
        },
        waste_area_analysis: {
          frequently_eating_out: {
            total: wasteAreaCategories.frequentlyEatingOut.total,
            transaction_count: wasteAreaCategories.frequentlyEatingOut.transactions.length,
            recommendations: ['Review analysis for dining out reduction recommendations'],
          },
          impulse_online_buying: {
            total: wasteAreaCategories.impulseOnlineBuying.total,
            transaction_count: wasteAreaCategories.impulseOnlineBuying.transactions.length,
            recommendations: ['Review analysis for impulse purchase reduction recommendations'],
          },
          unused_memberships_subscriptions: {
            total: wasteAreaCategories.unusedMembershipsSubscriptions.total,
            transaction_count:
              wasteAreaCategories.unusedMembershipsSubscriptions.transactions.length,
            recommendations: ['Review analysis for subscription management recommendations'],
          },
          convenience_foods_drinks: {
            total: wasteAreaCategories.convenienceFoodsDrinks.total,
            transaction_count: wasteAreaCategories.convenienceFoodsDrinks.transactions.length,
            recommendations: ['Review analysis for convenience food reduction recommendations'],
          },
          food_waste: {
            total: estimatedFoodWaste,
            grocery_spending: totalGrocerySpending,
            transaction_count: wasteAreaCategories.foodWaste.transactions.length,
            note: 'Estimated as 25% of grocery spending',
            recommendations: ['Review analysis for food waste reduction recommendations'],
          },
          total_waste_spending:
            wasteAreaCategories.frequentlyEatingOut.total +
            wasteAreaCategories.impulseOnlineBuying.total +
            wasteAreaCategories.unusedMembershipsSubscriptions.total +
            wasteAreaCategories.convenienceFoodsDrinks.total +
            estimatedFoodWaste,
        },
        savings_opportunities: [
          {
            category: 'General',
            current_spending: totalExpenses,
            potential_savings: totalExpenses * 0.1,
            savings_percentage: 10,
            recommendation: analysis,
            connection_to_goals: 'Review analysis for goal connections',
          },
        ],
        budget_recommendations: {
          income_allocation: {
            needs: 50,
            wants: 30,
            savings: 20,
          },
          category_budgets: [],
          expected_income_updates: [],
          expected_expense_updates: [],
        },
        financial_health: {
          score: 70,
          assessment: 'Based on your transaction data',
          strengths: ['Regular income and spending tracking'],
          concerns: ['Review detailed analysis for specific areas'],
          goal_progress: 'Review analysis for goal alignment',
        },
        actionable_insights: [
          {
            priority: 'medium',
            action: 'Review the detailed analysis above',
            impact: 'Improved financial awareness',
            timeline: 'Immediate',
            connected_goal: null,
          },
        ],
        monthly_budget_suggestion: {
          total_income:
            totalExpectedMonthlyIncome ||
            totalIncome / Math.max(1, transactionsToAnalyze.length / 30),
          recommended_expenses: totalExpectedMonthlyIncome
            ? totalExpectedMonthlyIncome * 0.8
            : totalIncome * 0.8,
          recommended_savings: totalExpectedMonthlyIncome
            ? totalExpectedMonthlyIncome * 0.2
            : totalIncome * 0.2,
          breakdown: 'See detailed analysis above',
        },
        cross_module_insights: ['Review analysis for cross-module insights'],
      }
    }

    // Store insights in database
    const insightsToInsert = [
      {
        user_id: user.id,
        insight_type: 'spending_analysis',
        title: 'Spending Pattern Analysis',
        description: `Analysis of spending patterns from ${startDate} to ${endDate}`,
        data: {
          analysis_type,
          date_range: { start_date: startDate, end_date: endDate },
          transaction_count: transactions.length,
          spending_summary: {
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_savings: netSavings,
            top_categories: topCategories,
          },
        },
        priority: 'high',
      },
    ]

    await supabase.from('budget_insights').insert(insightsToInsert)

    // Store accountability questions in database
    if (
      parsedAnalysis.accountability_questions &&
      parsedAnalysis.accountability_questions.length > 0
    ) {
      const questionsToInsert = parsedAnalysis.accountability_questions.map((q: any) => ({
        user_id: user.id,
        question: q.question,
        category: q.category,
        context: q.context || null,
        transactions: q.transactions || null,
        status: 'pending',
      }))

      await supabase.from('accountability_questions').insert(questionsToInsert)
    }

    return NextResponse.json({
      success: true,
      analysis: parsedAnalysis,
      spending_summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_savings: netSavings,
        top_categories: topCategories,
        transaction_count: transactionsToAnalyze.length,
        expected_monthly_income: totalExpectedMonthlyIncome,
        expected_monthly_expenses: totalExpectedMonthlyExpenses,
        p2p_incoming: totalIncomingP2P,
        subscription_spending: subscriptionTransactions.reduce(
          (sum: number, t: any) => sum + Math.abs(t.amount),
          0
        ),
      },
      date_range: { start_date: startDate, end_date: endDate },
      goals_count: relevantGoals.length,
    })
  } catch (error) {
    console.error('Error in budget analysis:', error)

    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured or invalid',
          details: 'Please check your OpenAI API key in the environment variables',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze budget',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

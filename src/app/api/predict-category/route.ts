import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const validCategories = [
  'quick_money',
  'save_money',
  'health',
  'network_expansion',
  'business_growth',
  'fires',
  'good_living',
  'big_vision',
  'job',
  'organization',
  'tech_issues',
  'business_launch',
  'future_planning',
  'innovation',
  'other',
]

// POST /api/predict-category - Predict category based on title and description
export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json()
    console.log('API received:', { title, description })

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      // Fallback to rule-based prediction
      return NextResponse.json({
        category: predictCategoryFallback(title, description),
        method: 'fallback',
      })
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    const prompt = `You are a productivity expert. Analyze the following goal/task and predict which category it belongs to.

Title: "${title}"
Description: "${description || 'No description provided'}"

Categories:
- quick_money: Making money quickly, side hustles, immediate income, fast earnings, gig work, quick profit
- save_money: Saving money, reducing costs, cutting expenses, frugal living, cost optimization, budgeting
- health: Physical fitness, mental health, wellness, exercise, diet, medical, self-care
- network_expansion: Social goals, networking, fundraising, investor relations, building connections
- business_growth: Growing existing business, scaling operations, increasing revenue, market expansion
- fires: Emergency items, urgent problems, crisis management, immediate attention needed
- good_living: Enjoyable activities, hobbies, travel, entertainment, quality of life, fun experiences
- big_vision: Long-term strategic goals, major life changes, transformative projects, legacy building
- job: Resume building, job applications, recruiter outreach, career advancement, employment
- organization: Administrative tasks, filing, scheduling, systems, processes, efficiency
- tech_issues: Technical problems, software bugs, IT support, digital troubleshooting
- business_launch: Starting new business, launching products, entrepreneurship, startup activities
- future_planning: Strategic planning, goal setting, vision work, long-term preparation
- innovation: New projects, creative ideas, research, experimentation, breakthrough thinking
- other: Anything that doesn't fit the above categories

PRIORITY RULES:
- Fires should be identified first - anything urgent, emergency, or crisis-related
- Quick money vs save money: quick_money is about earning, save_money is about spending less
- Network expansion focuses on relationships and fundraising, not general socializing
- Business growth is for existing businesses, business_launch is for starting new ventures

Respond with ONLY the category name (use underscores, not spaces).`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0.1,
    })

    const predictedCategory = completion.choices[0]?.message?.content?.toLowerCase().trim()

    // Validate the response
    if (predictedCategory && validCategories.includes(predictedCategory)) {
      return NextResponse.json({
        category: predictedCategory,
        method: 'ai',
      })
    } else {
      // Fallback if AI returns invalid category
      return NextResponse.json({
        category: predictCategoryFallback(title, description),
        method: 'fallback',
      })
    }
  } catch (error) {
    console.error('Error predicting category:', error)

    // Fallback to rule-based prediction
    const { title, description } = await request
      .json()
      .catch(() => ({ title: '', description: '' }))
    return NextResponse.json({
      category: predictCategoryFallback(title, description),
      method: 'fallback',
    })
  }
}

// Fallback rule-based category prediction
function predictCategoryFallback(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase()
  console.log('Fallback function processing text:', text)

  // Fires - check first for urgent/emergency items
  if (
    text.includes('urgent') ||
    text.includes('emergency') ||
    text.includes('crisis') ||
    text.includes('asap') ||
    text.includes('immediately') ||
    text.includes('deadline') ||
    text.includes('overdue') ||
    text.includes('late') ||
    text.includes('broken') ||
    text.includes('fix') ||
    text.includes('problem') ||
    text.includes('issue') ||
    text.includes('trouble') ||
    text.includes('help') ||
    text.includes('critical') ||
    text.includes('priority') ||
    text.includes('rush')
  ) {
    console.log('Matched fires category')
    return 'fires'
  }

  // Quick money keywords
  if (
    text.includes('side hustle') ||
    text.includes('gig') ||
    text.includes('freelance') ||
    text.includes('quick money') ||
    text.includes('fast cash') ||
    text.includes('immediate income') ||
    text.includes('part time') ||
    text.includes('extra income') ||
    text.includes('make money') ||
    text.includes('earn money') ||
    text.includes('quick buck') ||
    text.includes('side job') ||
    text.includes('temp work') ||
    text.includes('odd job') ||
    text.includes('quick profit') ||
    text.includes('fast earning') ||
    text.includes('immediate cash') ||
    text.includes('quick income') ||
    text.includes('side income') ||
    text.includes('gig work') ||
    text.includes('delivery') ||
    text.includes('uber') ||
    text.includes('lyft') ||
    text.includes('taskrabbit') ||
    text.includes('fiverr') ||
    text.includes('upwork') ||
    text.includes('quick cash')
  ) {
    return 'quick_money'
  }

  // Save money keywords
  if (
    text.includes('save money') ||
    text.includes('cut cost') ||
    text.includes('reduce expense') ||
    text.includes('frugal') ||
    text.includes('budget') ||
    text.includes('cheap') ||
    text.includes('affordable') ||
    text.includes('discount') ||
    text.includes('coupon') ||
    text.includes('deal') ||
    text.includes('sale') ||
    text.includes('cut back') ||
    text.includes('spend less') ||
    text.includes('save up') ||
    text.includes('emergency fund') ||
    text.includes('debt payoff') ||
    text.includes('pay off debt') ||
    text.includes('reduce spending') ||
    text.includes('cost effective') ||
    text.includes('money saving') ||
    text.includes('thrifty') ||
    text.includes('penny pinching')
  ) {
    return 'save_money'
  }

  // Health keywords
  if (
    text.includes('health') ||
    text.includes('fitness') ||
    text.includes('exercise') ||
    text.includes('workout') ||
    text.includes('gym') ||
    text.includes('diet') ||
    text.includes('nutrition') ||
    text.includes('wellness') ||
    text.includes('mental') ||
    text.includes('therapy') ||
    text.includes('doctor') ||
    text.includes('medical') ||
    text.includes('sleep') ||
    text.includes('meditation') ||
    text.includes('yoga') ||
    text.includes('running') ||
    text.includes('walking') ||
    text.includes('cardio') ||
    text.includes('strength') ||
    text.includes('weight') ||
    text.includes('muscle') ||
    text.includes('flexibility') ||
    text.includes('stretching') ||
    text.includes('recovery') ||
    text.includes('stress') ||
    text.includes('anxiety') ||
    text.includes('depression') ||
    text.includes('mindfulness')
  ) {
    return 'health'
  }

  // Network expansion keywords
  if (
    text.includes('network') ||
    text.includes('networking') ||
    text.includes('fundraising') ||
    text.includes('investor') ||
    text.includes('investors') ||
    text.includes('funding') ||
    text.includes('raise money') ||
    text.includes('pitch') ||
    text.includes('presentation') ||
    text.includes('connections') ||
    text.includes('relationship') ||
    text.includes('social') ||
    text.includes('meet people') ||
    text.includes('conference') ||
    text.includes('event') ||
    text.includes('speaking') ||
    text.includes('outreach') ||
    text.includes('partnership') ||
    text.includes('collaboration') ||
    text.includes('mentor') ||
    text.includes('mentorship')
  ) {
    return 'network_expansion'
  }

  // Business growth keywords
  if (
    text.includes('grow business') ||
    text.includes('scale') ||
    text.includes('expansion') ||
    text.includes('increase revenue') ||
    text.includes('market share') ||
    text.includes('customer acquisition') ||
    text.includes('sales growth') ||
    text.includes('business development') ||
    text.includes('scaling') ||
    text.includes('growth') ||
    text.includes('revenue growth') ||
    text.includes('market expansion') ||
    text.includes('business growth')
  ) {
    return 'business_growth'
  }

  // Good living keywords
  if (
    text.includes('hobby') ||
    text.includes('travel') ||
    text.includes('vacation') ||
    text.includes('entertainment') ||
    text.includes('movie') ||
    text.includes('music') ||
    text.includes('art') ||
    text.includes('craft') ||
    text.includes('garden') ||
    text.includes('cook') ||
    text.includes('recipe') ||
    text.includes('fun') ||
    text.includes('relax') ||
    text.includes('rest') ||
    text.includes('leisure') ||
    text.includes('enjoy') ||
    text.includes('pleasure') ||
    text.includes('happiness') ||
    text.includes('joy') ||
    text.includes('quality life') ||
    text.includes('experience') ||
    text.includes('adventure') ||
    text.includes('explore') ||
    text.includes('discover')
  ) {
    return 'good_living'
  }

  // Big vision keywords
  if (
    text.includes('vision') ||
    text.includes('legacy') ||
    text.includes('transform') ||
    text.includes('change world') ||
    text.includes('impact') ||
    text.includes('mission') ||
    text.includes('purpose') ||
    text.includes('big picture') ||
    text.includes('long term') ||
    text.includes('strategic') ||
    text.includes('life changing') ||
    text.includes('revolutionary') ||
    text.includes('breakthrough') ||
    text.includes('game changer') ||
    text.includes('paradigm') ||
    text.includes('shift')
  ) {
    return 'big_vision'
  }

  // Job keywords
  if (
    text.includes('resume') ||
    text.includes('cv') ||
    text.includes('job application') ||
    text.includes('recruiter') ||
    text.includes('interview') ||
    text.includes('career') ||
    text.includes('employment') ||
    text.includes('job search') ||
    text.includes('linkedin') ||
    text.includes('portfolio') ||
    text.includes('cover letter') ||
    text.includes('job hunt') ||
    text.includes('career change') ||
    text.includes('promotion') ||
    text.includes('raise') ||
    text.includes('salary')
  ) {
    return 'job'
  }

  // Organization keywords
  if (
    text.includes('organize') ||
    text.includes('organization') ||
    text.includes('filing') ||
    text.includes('scheduling') ||
    text.includes('systems') ||
    text.includes('processes') ||
    text.includes('efficiency') ||
    text.includes('admin') ||
    text.includes('administrative') ||
    text.includes('paperwork') ||
    text.includes('files') ||
    text.includes('folders') ||
    text.includes('calendar') ||
    text.includes('schedule') ||
    text.includes('planning') ||
    text.includes('structure') ||
    text.includes('system')
  ) {
    return 'organization'
  }

  // Tech issues keywords
  if (
    text.includes('tech') ||
    text.includes('technical') ||
    text.includes('bug') ||
    text.includes('software') ||
    text.includes('hardware') ||
    text.includes('computer') ||
    text.includes('it support') ||
    text.includes('digital') ||
    text.includes('troubleshoot') ||
    text.includes('fix computer') ||
    text.includes('update') ||
    text.includes('upgrade') ||
    text.includes('install') ||
    text.includes('uninstall') ||
    text.includes('error') ||
    text.includes('crash') ||
    text.includes('broken computer')
  ) {
    return 'tech_issues'
  }

  // Business launch keywords
  if (
    text.includes('launch') ||
    text.includes('startup') ||
    text.includes('start business') ||
    text.includes('entrepreneur') ||
    text.includes('new business') ||
    text.includes('business plan') ||
    text.includes('founder') ||
    text.includes('co founder') ||
    text.includes('venture') ||
    text.includes('launch product') ||
    text.includes('go to market') ||
    text.includes('mvp') ||
    text.includes('minimum viable product')
  ) {
    return 'business_launch'
  }

  // Future planning keywords
  if (
    text.includes('planning') ||
    text.includes('strategy') ||
    text.includes('strategic') ||
    text.includes('future') ||
    text.includes('long term') ||
    text.includes('roadmap') ||
    text.includes('milestone') ||
    text.includes('timeline') ||
    text.includes('projection') ||
    text.includes('forecast') ||
    text.includes('plan') ||
    text.includes('preparation') ||
    text.includes('prep') ||
    text.includes('ready') ||
    text.includes('prepare')
  ) {
    return 'future_planning'
  }

  // Innovation keywords
  if (
    text.includes('innovation') ||
    text.includes('innovate') ||
    text.includes('creative') ||
    text.includes('new idea') ||
    text.includes('research') ||
    text.includes('experiment') ||
    text.includes('prototype') ||
    text.includes('invention') ||
    text.includes('breakthrough') ||
    text.includes('discovery') ||
    text.includes('explore') ||
    text.includes('test') ||
    text.includes('trial') ||
    text.includes('pilot') ||
    text.includes('beta') ||
    text.includes('cutting edge') ||
    text.includes('next generation')
  ) {
    return 'innovation'
  }

  // Default to other
  console.log('No category matched, returning other')
  return 'other'
}

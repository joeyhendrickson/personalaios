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
    const { goals, stats, body_photos, diet_type, diet_modifications, zipcode } = body

    console.log(`Generating nutrition plan for user: ${user.id}`)
    console.log(
      `Goals: ${goals?.length || 0}, Stats: ${stats?.length || 0}, Body photos: ${body_photos?.length || 0}`
    )

    // Generate nutrition plan using AI
    const nutritionPlan = await generateNutritionPlanWithAI(
      goals || [],
      stats || [],
      body_photos || [],
      diet_type,
      diet_modifications || [],
      zipcode
    )

    // Save nutrition plan to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: user.id,
        plan_name: nutritionPlan.plan_name,
        plan_type: nutritionPlan.plan_type,
        diet_type: diet_type,
        diet_modifications: diet_modifications || [],
        daily_calories: nutritionPlan.daily_calories,
        protein_grams: nutritionPlan.protein_grams,
        carbs_grams: nutritionPlan.carbs_grams,
        fat_grams: nutritionPlan.fat_grams,
        fiber_grams: nutritionPlan.fiber_grams,
        water_liters: nutritionPlan.water_liters,
        meal_frequency: nutritionPlan.meal_frequency,
        description: nutritionPlan.description,
        is_ai_generated: true,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving nutrition plan:', saveError)
      return NextResponse.json({ error: 'Failed to save nutrition plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'nutrition_plan_generated',
      description: `Generated AI nutrition plan: ${nutritionPlan.plan_name}`,
      metadata: {
        plan_type: nutritionPlan.plan_type,
        daily_calories: nutritionPlan.daily_calories,
        protein_grams: nutritionPlan.protein_grams,
        meal_frequency: nutritionPlan.meal_frequency,
      },
    })

    return NextResponse.json({
      success: true,
      nutrition_plan: savedPlan,
      meal_plan: nutritionPlan.meal_plan,
      shopping_list: nutritionPlan.shopping_list,
      recommendations: nutritionPlan.recommendations,
    })
  } catch (error) {
    console.error('Error generating nutrition plan:', error)

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
        error: 'Failed to generate nutrition plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function generateNutritionPlanWithAI(
  goals: any[],
  stats: any[],
  bodyPhotos: any[],
  dietType?: string,
  dietModifications: string[] = [],
  zipcode?: string
) {
  // Prepare data for AI
  const goalsData = goals.map((g) => ({
    type: g.goal_type,
    target_weight: g.target_weight,
    current_weight: g.current_weight,
    target_body_fat: g.target_body_fat_percentage,
    current_body_fat: g.current_body_fat_percentage,
    timeline_weeks: g.timeline_weeks,
  }))

  const statsData = stats.map((s) => ({
    type: s.stat_type,
    exercise: s.exercise_name,
    value: s.measurement_value,
    unit: s.measurement_unit,
  }))

  const bodyData = bodyPhotos.map((p) => ({
    type: p.photo_type,
    target_areas: p.target_areas,
    body_type_goal: p.body_type_goal,
  }))

  const prompt = `
Create a comprehensive nutrition plan based on the following user data:

USER GOALS:
${JSON.stringify(goalsData, null, 2)}

CURRENT FITNESS STATS:
${JSON.stringify(statsData, null, 2)}

BODY ANALYSIS DATA:
${JSON.stringify(bodyData, null, 2)}

DIET PREFERENCES:
Diet Type: ${dietType || 'No specific diet selected'}
Diet Modifications: ${dietModifications.length > 0 ? dietModifications.join(', ') : 'None'}

LOCATION: ${zipcode ? `Zipcode: ${zipcode}` : 'No zipcode provided'}

IMPORTANT: If a specific diet type is selected, strictly follow its principles and guidelines. Consider any modifications the user has specified.

Create a comprehensive nutrition plan that includes:
1. Plan name and type
2. Daily calorie target
3. Macronutrient breakdown (protein, carbs, fat)
4. Fiber and water recommendations
5. Meal frequency
6. Detailed description
7. Complete weekly meal plan (7 days, 3-4 meals per day)
8. Detailed shopping list with quantities and estimated costs
9. Store recommendations (Walmart, Target, local grocery stores)
10. Food recommendations
11. Supplement suggestions
12. Hydration strategy
13. Meal timing recommendations

Format your response as JSON with this structure:
{
  "plan_name": "Descriptive name for the plan",
  "plan_type": "weight_loss/muscle_gain/maintenance/performance/medical",
  "daily_calories": 2000,
  "protein_grams": 150,
  "carbs_grams": 200,
  "fat_grams": 80,
  "fiber_grams": 30,
  "water_liters": 3.0,
  "meal_frequency": 4,
  "description": "Detailed description of the nutrition approach",
  "meal_plan": {
    "monday": {
      "breakfast": "Oatmeal with berries and protein powder",
      "lunch": "Grilled chicken salad with quinoa",
      "dinner": "Salmon with sweet potato and vegetables",
      "snacks": ["Greek yogurt", "Mixed nuts"]
    },
    "tuesday": { "breakfast": "...", "lunch": "...", "dinner": "...", "snacks": [...] },
    "wednesday": { "breakfast": "...", "lunch": "...", "dinner": "...", "snacks": [...] },
    "thursday": { "breakfast": "...", "lunch": "...", "dinner": "...", "snacks": [...] },
    "friday": { "breakfast": "...", "lunch": "...", "dinner": "...", "snacks": [...] },
    "saturday": { "breakfast": "...", "lunch": "...", "dinner": "...", "snacks": [...] },
    "sunday": { "breakfast": "...", "lunch": "...", "dinner": "...", "snacks": [...] }
  },
  "shopping_list": {
    "proteins": [
      {"item": "Chicken breast", "quantity": "2 lbs", "estimated_cost": "$8.99", "store": "Walmart"}
    ],
    "vegetables": [
      {"item": "Spinach", "quantity": "1 bag", "estimated_cost": "$2.49", "store": "Target"}
    ],
    "fruits": [
      {"item": "Bananas", "quantity": "1 bunch", "estimated_cost": "$1.99", "store": "Walmart"}
    ],
    "grains": [
      {"item": "Quinoa", "quantity": "1 bag", "estimated_cost": "$4.99", "store": "Target"}
    ],
    "dairy": [
      {"item": "Greek yogurt", "quantity": "32 oz", "estimated_cost": "$5.99", "store": "Walmart"}
    ],
    "pantry": [
      {"item": "Olive oil", "quantity": "1 bottle", "estimated_cost": "$6.99", "store": "Target"}
    ],
    "total_estimated_cost": "$32.44",
    "store_recommendations": [
      {"store": "Walmart", "reason": "Best prices for bulk items", "estimated_savings": "$5-8"},
      {"store": "Target", "reason": "Good quality organic options", "estimated_savings": "$2-4"}
    ]
  },
  "recommendations": {
    "foods_to_eat": ["List of recommended foods"],
    "foods_to_avoid": ["List of foods to limit"],
    "supplements": ["Recommended supplements"],
    "hydration": "Hydration strategy",
    "meal_timing": "When to eat meals",
    "tips": "Additional nutrition tips"
  }
}

Be realistic about calorie needs based on goals and current stats. Focus on whole foods and balanced nutrition. Consider the user's fitness goals and body composition targets.
`

  const { text: aiResponse } = await generateText({
    model: openai('gpt-4.1-mini'),
    messages: [
      {
        role: 'system',
        content:
          'You are an expert nutritionist and dietitian. Create detailed, personalized nutrition plans based on user goals, current fitness level, and body composition. Always prioritize health, sustainability, and balanced nutrition.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  })

  let parsedResponse
  try {
    parsedResponse = JSON.parse(aiResponse)
  } catch (parseError) {
    // If JSON parsing fails, create a basic plan
    parsedResponse = {
      plan_name: 'Balanced Nutrition Plan',
      plan_type: 'maintenance',
      daily_calories: 2000,
      protein_grams: 150,
      carbs_grams: 200,
      fat_grams: 80,
      fiber_grams: 30,
      water_liters: 3.0,
      meal_frequency: 3,
      description: 'A balanced nutrition plan based on your goals and current fitness level.',
      meal_plan: {
        monday: {
          breakfast: 'Oatmeal with berries',
          lunch: 'Grilled chicken salad',
          dinner: 'Salmon with vegetables',
          snacks: ['Greek yogurt'],
        },
        tuesday: {
          breakfast: 'Scrambled eggs',
          lunch: 'Turkey wrap',
          dinner: 'Baked cod',
          snacks: ['Mixed nuts'],
        },
        wednesday: {
          breakfast: 'Smoothie bowl',
          lunch: 'Quinoa salad',
          dinner: 'Chicken stir-fry',
          snacks: ['Apple slices'],
        },
        thursday: {
          breakfast: 'Greek yogurt parfait',
          lunch: 'Lentil soup',
          dinner: 'Grilled salmon',
          snacks: ['Trail mix'],
        },
        friday: {
          breakfast: 'Avocado toast',
          lunch: 'Chicken Caesar salad',
          dinner: 'Baked chicken',
          snacks: ['Protein bar'],
        },
        saturday: {
          breakfast: 'Pancakes with fruit',
          lunch: 'Turkey burger',
          dinner: 'Fish tacos',
          snacks: ['Cheese and crackers'],
        },
        sunday: {
          breakfast: 'French toast',
          lunch: 'Chicken pasta',
          dinner: 'Roast beef',
          snacks: ['Fruit salad'],
        },
      },
      shopping_list: {
        proteins: [
          { item: 'Chicken breast', quantity: '3 lbs', estimated_cost: '$12.99', store: 'Walmart' },
          { item: 'Salmon fillets', quantity: '2 lbs', estimated_cost: '$15.99', store: 'Target' },
          { item: 'Ground turkey', quantity: '1 lb', estimated_cost: '$6.99', store: 'Walmart' },
        ],
        vegetables: [
          { item: 'Spinach', quantity: '2 bags', estimated_cost: '$4.98', store: 'Target' },
          { item: 'Broccoli', quantity: '2 heads', estimated_cost: '$3.98', store: 'Walmart' },
          { item: 'Bell peppers', quantity: '6 pieces', estimated_cost: '$4.99', store: 'Target' },
        ],
        fruits: [
          { item: 'Bananas', quantity: '2 bunches', estimated_cost: '$3.98', store: 'Walmart' },
          { item: 'Berries', quantity: '3 containers', estimated_cost: '$8.97', store: 'Target' },
          { item: 'Apples', quantity: '1 bag', estimated_cost: '$4.99', store: 'Walmart' },
        ],
        grains: [
          { item: 'Quinoa', quantity: '1 bag', estimated_cost: '$4.99', store: 'Target' },
          { item: 'Oats', quantity: '1 container', estimated_cost: '$3.99', store: 'Walmart' },
          { item: 'Brown rice', quantity: '1 bag', estimated_cost: '$2.99', store: 'Walmart' },
        ],
        dairy: [
          { item: 'Greek yogurt', quantity: '32 oz', estimated_cost: '$5.99', store: 'Walmart' },
          { item: 'Eggs', quantity: '1 dozen', estimated_cost: '$2.99', store: 'Target' },
          { item: 'Cheese', quantity: '1 block', estimated_cost: '$4.99', store: 'Walmart' },
        ],
        pantry: [
          { item: 'Olive oil', quantity: '1 bottle', estimated_cost: '$6.99', store: 'Target' },
          { item: 'Almonds', quantity: '1 bag', estimated_cost: '$7.99', store: 'Walmart' },
          {
            item: 'Protein powder',
            quantity: '1 container',
            estimated_cost: '$24.99',
            store: 'Target',
          },
        ],
        total_estimated_cost: '$115.78',
        store_recommendations: [
          {
            store: 'Walmart',
            reason: 'Best prices for bulk items and basics',
            estimated_savings: '$8-12',
          },
          {
            store: 'Target',
            reason: 'Good quality organic options and specialty items',
            estimated_savings: '$3-6',
          },
        ],
      },
      recommendations: {
        foods_to_eat: ['Lean proteins', 'Whole grains', 'Fruits and vegetables', 'Healthy fats'],
        foods_to_avoid: ['Processed foods', 'Excessive sugar', 'Trans fats'],
        supplements: ['Multivitamin', 'Omega-3'],
        hydration: 'Drink 8-10 glasses of water daily',
        meal_timing: 'Eat every 3-4 hours',
        tips: "Focus on whole foods and listen to your body's hunger cues",
      },
    }
  }

  return parsedResponse
}

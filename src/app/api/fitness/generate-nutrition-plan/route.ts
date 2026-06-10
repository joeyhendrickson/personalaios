import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import {
  normalizeNutritionPlanType,
  parseAiJsonResponse,
} from '@/lib/fitness/normalize-nutrition-plan'

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

    const { data: savedPrefs } = await supabase
      .from('nutrition_preferences')
      .select('diet_type, diet_modifications')
      .eq('user_id', user.id)
      .maybeSingle()

    const resolvedDietType =
      (typeof diet_type === 'string' && diet_type.trim()) || savedPrefs?.diet_type || undefined
    const resolvedModifications =
      Array.isArray(diet_modifications) && diet_modifications.length > 0
        ? diet_modifications
        : Array.isArray(savedPrefs?.diet_modifications)
          ? savedPrefs.diet_modifications
          : []

    console.log(`Generating nutrition plan for user: ${user.id}`)
    console.log(
      `Goals: ${goals?.length || 0}, Stats: ${stats?.length || 0}, Body photos: ${body_photos?.length || 0}, Diet: ${resolvedDietType || 'none'}`
    )

    // Generate nutrition plan using AI
    const nutritionPlan = await generateNutritionPlanWithAI(
      goals || [],
      stats || [],
      body_photos || [],
      resolvedDietType,
      resolvedModifications,
      zipcode
    )

    const planType = normalizeNutritionPlanType(nutritionPlan.plan_type, goals || [])

    // Save nutrition plan to database
    const fullRecord: Record<string, unknown> = {
      user_id: user.id,
      plan_name: nutritionPlan.plan_name,
      plan_type: planType,
      diet_type: resolvedDietType,
      diet_modifications: resolvedModifications,
      daily_calories: nutritionPlan.daily_calories,
      protein_grams: nutritionPlan.protein_grams,
      carbs_grams: nutritionPlan.carbs_grams,
      fat_grams: nutritionPlan.fat_grams,
      fiber_grams: nutritionPlan.fiber_grams,
      water_liters: nutritionPlan.water_liters,
      meal_frequency: nutritionPlan.meal_frequency,
      description: nutritionPlan.description,
      meal_plan: nutritionPlan.meal_plan,
      shopping_list: nutritionPlan.shopping_list,
      recommendations: nutritionPlan.recommendations,
      is_ai_generated: true,
    }

    // Columns added later (meal_plan/shopping_list/recommendations/diet_*) may not
    // exist yet — progressively strip optional columns and retry so saving works.
    const optionalColumns = [
      'meal_plan',
      'shopping_list',
      'recommendations',
      'diet_type',
      'diet_modifications',
    ]
    let saveRes = await supabase.from('nutrition_plans').insert(fullRecord).select().single()
    let attempt = 0
    while (saveRes.error && attempt < optionalColumns.length) {
      const m = (saveRes.error.message || '').toLowerCase()
      const isColumnError = saveRes.error.code === 'PGRST204' || m.includes('column')
      if (!isColumnError) break
      const reduced = { ...fullRecord }
      for (const c of optionalColumns.slice(0, attempt + 1)) delete reduced[c]
      saveRes = await supabase.from('nutrition_plans').insert(reduced).select().single()
      attempt++
    }

    const savedPlan = saveRes.data
    if (saveRes.error || !savedPlan) {
      console.error('Error saving nutrition plan:', saveRes.error)
      return NextResponse.json(
        { error: 'Failed to save nutrition plan', details: saveRes.error?.message },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'nutrition_plan_generated',
      description: `Generated AI nutrition plan: ${nutritionPlan.plan_name}`,
      metadata: {
        plan_type: planType,
        daily_calories: nutritionPlan.daily_calories,
        protein_grams: nutritionPlan.protein_grams,
        meal_frequency: nutritionPlan.meal_frequency,
      },
    })

    return NextResponse.json({
      success: true,
      // Always return the full plan content so the UI renders it even when the
      // JSONB columns aren't present in this environment yet.
      nutrition_plan: {
        ...savedPlan,
        diet_type: savedPlan.diet_type ?? resolvedDietType ?? null,
        diet_modifications: savedPlan.diet_modifications ?? resolvedModifications,
        meal_plan: savedPlan.meal_plan ?? nutritionPlan.meal_plan ?? null,
        shopping_list: savedPlan.shopping_list ?? nutritionPlan.shopping_list ?? null,
        recommendations: savedPlan.recommendations ?? nutritionPlan.recommendations ?? null,
      },
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
  const DIET_LABELS: Record<string, string> = {
    whole30: 'Whole30 (30-day whole-foods elimination)',
    keto: 'Ketogenic (high fat, very low carb)',
    high_protein_vegetarian: 'High-Protein Vegetarian',
    gluten_free: 'Gluten-Free',
    vegan: 'Vegan (no animal products)',
    mediterranean: 'Mediterranean',
    pescatarian: 'Pescatarian (vegetarian + fish/seafood)',
    anti_inflammatory: 'Anti-Inflammatory',
    atkins: 'Atkins (phased low-carb)',
    paleo: 'Paleo',
    dash: 'DASH',
    low_carb: 'Low-Carb',
    intermittent_fasting: 'Intermittent Fasting',
    flexitarian: 'Flexitarian',
    raw_food: 'Raw Food',
  }

  const dietLabel = dietType ? DIET_LABELS[dietType] || dietType : 'No specific diet selected'
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
    ai_assessment: p?.analysis_data?.analysis_text || undefined,
  }))

  const prompt = `
Create a comprehensive nutrition plan based on the following user data:

USER GOALS:
${JSON.stringify(goalsData, null, 2)}

CURRENT FITNESS STATS:
${JSON.stringify(statsData, null, 2)}

BODY ANALYSIS DATA:
${JSON.stringify(bodyData, null, 2)}

DIET PREFERENCES (must drive every recommended meal):
Diet Type: ${dietLabel}
Diet Modifications: ${dietModifications.length > 0 ? dietModifications.join(', ') : 'None'}

LOCATION: ${zipcode ? `Zipcode: ${zipcode}` : 'No zipcode provided'}

CRITICAL REQUIREMENTS:
- The primary deliverable is a complete 7-day meal plan with specific named meals (breakfast, lunch, dinner, snacks) — not macros alone.
- Every meal MUST comply with the selected diet type and all modifications. Do not suggest foods that violate them.
- Use concrete dish names with ingredients (e.g. "Grilled salmon with quinoa and roasted broccoli" not "balanced dinner").
- Macros (calories, protein, carbs, fat) support the meal plan; they are secondary to the meals themselves.
- If no diet is selected, still provide varied, whole-food meal ideas tailored to the user's goals.

Create a comprehensive nutrition plan that includes:
1. Plan name and type
2. Daily calorie target
3. Macronutrient breakdown (protein, carbs, fat)
4. Fiber and water recommendations
5. Meal frequency
6. Detailed description referencing how meals align with the diet preferences
7. Complete weekly meal plan (7 days, breakfast/lunch/dinner/snacks) — REQUIRED
8. Detailed shopping list with quantities and estimated costs
9. Store recommendations (Walmart, Target, local grocery stores)
10. Food recommendations
11. Supplement suggestions
12. Hydration strategy
13. Meal timing recommendations

IMPORTANT: If a specific diet type is selected, strictly follow its principles and guidelines. Consider any modifications the user has specified.

Format your response as JSON with this structure:
{
  "plan_name": "Descriptive name for the plan",
  "plan_type": "weight_loss",
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

Choose plan_type as exactly one of: weight_loss, muscle_gain, maintenance, performance, medical.
`

  const { text: aiResponse } = await generateText({
    model: defaultOpenaiModel(),
    messages: [
      {
        role: 'system',
        content:
          "You are an expert nutritionist and dietitian. Create detailed, personalized nutrition plans based on user goals, current fitness level, body composition, and diet preferences. Always include a full 7-day meal plan with specific meals that honor the user's diet type and modifications. Never return macros without meals. Prioritize health, sustainability, and balanced nutrition.",
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
    parsedResponse = parseAiJsonResponse(aiResponse) as Record<string, unknown>
  } catch {
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

  parsedResponse.plan_type = normalizeNutritionPlanType(parsedResponse.plan_type, goals)

  const mealPlan = parsedResponse.meal_plan
  const hasMealPlan =
    mealPlan &&
    typeof mealPlan === 'object' &&
    Object.keys(mealPlan as object).length >= 3 &&
    Object.values(mealPlan as Record<string, unknown>).some(
      (day) =>
        day &&
        typeof day === 'object' &&
        ('breakfast' in (day as object) || 'lunch' in (day as object))
    )

  if (!hasMealPlan) {
    parsedResponse.description =
      typeof parsedResponse.description === 'string'
        ? `${parsedResponse.description} Includes a starter weekly meal plan aligned with your diet preferences.`
        : 'A balanced nutrition plan with diet-aligned meals based on your goals.'
    parsedResponse.meal_plan = buildDietAlignedFallbackMealPlan(dietType, dietModifications)
  }

  return parsedResponse
}

function buildDietAlignedFallbackMealPlan(dietType?: string, modifications: string[] = []) {
  const isVegan = dietType === 'vegan'
  const isVegetarian =
    isVegan || dietType === 'high_protein_vegetarian' || dietType === 'flexitarian'
  const isPescatarian = dietType === 'pescatarian'
  const isKeto = dietType === 'keto' || dietType === 'atkins' || dietType === 'low_carb'
  const isGlutenFree = dietType === 'gluten_free' || modifications.includes('Gluten-free')
  const noDairy = isVegan || modifications.includes('Dairy-free')

  const protein = isVegan
    ? 'Tofu scramble with spinach and peppers'
    : isVegetarian
      ? 'Greek yogurt parfait with berries and chia' + (noDairy ? ' (coconut yogurt)' : '')
      : isPescatarian
        ? 'Smoked salmon and avocado on ' +
          (isGlutenFree ? 'gluten-free toast' : 'whole-grain toast')
        : isKeto
          ? 'Scrambled eggs with avocado and turkey sausage'
          : 'Oatmeal with berries and protein powder'

  const lunch = isVegan
    ? 'Lentil and quinoa Buddha bowl with tahini dressing'
    : isVegetarian
      ? 'Chickpea and feta salad with olive oil and lemon'
      : isPescatarian
        ? 'Tuna and white bean salad with mixed greens'
        : isKeto
          ? 'Grilled chicken Caesar salad (no croutons)'
          : 'Grilled chicken salad with quinoa'

  const dinner = isVegan
    ? 'Tempeh stir-fry with broccoli and brown rice'
    : isVegetarian
      ? 'Black bean and sweet potato tacos'
      : isPescatarian
        ? 'Baked cod with roasted vegetables and wild rice'
        : isKeto
          ? 'Salmon with asparagus and cauliflower mash'
          : 'Salmon with sweet potato and steamed vegetables'

  const dayTemplate = {
    breakfast: protein,
    lunch,
    dinner,
    snacks: isKeto
      ? ['Almonds', 'Cheese sticks']
      : isVegan
        ? ['Hummus with carrots', 'Mixed nuts']
        : ['Greek yogurt', 'Apple with almond butter'],
  }

  return {
    monday: { ...dayTemplate },
    tuesday: { ...dayTemplate, lunch: isVegan ? 'Mediterranean chickpea wrap' : lunch },
    wednesday: { ...dayTemplate },
    thursday: { ...dayTemplate, dinner: isVegan ? 'Red lentil curry with basmati rice' : dinner },
    friday: { ...dayTemplate },
    saturday: { ...dayTemplate, breakfast: isKeto ? 'Chia pudding with coconut milk' : protein },
    sunday: { ...dayTemplate },
  }
}

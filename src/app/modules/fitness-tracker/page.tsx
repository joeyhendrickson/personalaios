'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Camera,
  Target,
  Dumbbell,
  Activity,
  TrendingUp,
  Calendar,
  Utensils,
  Heart,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  User,
  Settings,
  BarChart3,
  Clock,
  Star,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Info,
  Lightbulb,
  Award,
  Timer,
  MapPin,
  Weight,
  Ruler,
  Droplets,
  Flame,
} from 'lucide-react'
import WorkoutPlanModal from '@/components/fitness-tracker/WorkoutPlanModal'
import BiometricsSection, {
  type FitnessBiometricRow,
} from '@/components/fitness-tracker/BiometricsSection'
import BiometricsOverview from '@/components/fitness-tracker/BiometricsOverview'
import FitnessProgressPanel from '@/components/fitness-tracker/FitnessProgressPanel'
import StrengthGrowthChart from '@/components/fitness-tracker/StrengthGrowthChart'
import PlanActionSuggestions from '@/components/fitness-tracker/PlanActionSuggestions'

interface DashboardGoal {
  id?: string
  title?: string
  description?: string
  priority_level?: number
  target_date?: string
}

interface BodyPhoto {
  id: string
  photo_url: string
  photo_type: 'front' | 'side' | 'back'
  height_inches?: number
  weight_lbs?: number
  uploaded_at: string
  analysis_data?: any
  target_areas: string[]
  body_type_goal?: string
  is_primary: boolean
}

interface FitnessGoal {
  id: string
  goal_type: string
  target_body_type?: string
  target_weight?: number
  current_weight?: number
  target_areas: string[]
  timeline_weeks: number
  priority_level: string
  description?: string
  is_active: boolean
  completed_at?: string | null
}

interface FitnessStat {
  id: string
  stat_type: 'cardio' | 'strength' | 'flexibility' | 'endurance'
  exercise_name: string
  measurement_value: number
  measurement_unit: string
  rep_range?: string
  notes?: string
  recorded_at: string
}

interface WorkoutPlan {
  id: string
  plan_name: string
  plan_type: string
  difficulty_level: string
  duration_weeks: number
  frequency_per_week: number
  target_areas: string[]
  goals_supported?: string[]
  description?: string
  weekly_structure?: {
    [key: string]: {
      focus: string
      duration_minutes: number
      exercises: Array<{
        exercise_id: string
        exercise_name: string
        sets: number
        reps: string
        weight_suggestion?: number
        rest_seconds: number
        order_index: number
        notes?: string
      }>
    }
  }
  progression_strategy?: {
    [key: string]: string
  }
  is_active: boolean
  is_ai_generated: boolean
  created_at?: string
}

interface NutritionPlan {
  id: string
  plan_name: string
  plan_type: string
  diet_type?: string
  diet_modifications?: string[]
  daily_calories?: number
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  description?: string
  meal_plan?: any
  shopping_list?: any
  recommendations?: any
  is_active: boolean
  is_ai_generated: boolean
  created_at?: string
}

export default function FitnessTrackerModule() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'body-analysis' | 'goals' | 'stats' | 'workouts' | 'nutrition' | 'progress'
  >('overview')
  const [bodyPhotos, setBodyPhotos] = useState<BodyPhoto[]>([])
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoal[]>([])
  const [fitnessStats, setFitnessStats] = useState<FitnessStat[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FitnessGoal | null>(null)
  const [goalsView, setGoalsView] = useState<'active' | 'completed'>('active')
  const [showStatsForm, setShowStatsForm] = useState(false)
  const [selectedTargetAreas, setSelectedTargetAreas] = useState<string[]>([])
  const [selectedBodyType, setSelectedBodyType] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedDietType, setSelectedDietType] = useState<string>('')
  const [selectedModifications, setSelectedModifications] = useState<string[]>([])
  const [dietPrefsLoaded, setDietPrefsLoaded] = useState(false)
  const [savingDietPrefs, setSavingDietPrefs] = useState(false)
  const [selectedDietLongDescription, setSelectedDietLongDescription] = useState<string>('')
  const [zipcode, setZipcode] = useState<string>('')
  const [heightInches, setHeightInches] = useState<string>('')
  const [weightLbs, setWeightLbs] = useState<string>('')
  const [editingStat, setEditingStat] = useState<FitnessStat | null>(null)
  const [showEditStatForm, setShowEditStatForm] = useState(false)
  const [showStrengthGrowth, setShowStrengthGrowth] = useState(false)
  const [editingNutritionPlan, setEditingNutritionPlan] = useState<NutritionPlan | null>(null)
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [dashboardGoals, setDashboardGoals] = useState<DashboardGoal[]>([])
  const [biometrics, setBiometrics] = useState<FitnessBiometricRow[]>([])
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [modalWorkoutPlan, setModalWorkoutPlan] = useState<WorkoutPlan | null>(null)

  // Available options
  const bodyTypes = [
    'Ectomorph (Naturally thin, hard to gain muscle)',
    'Mesomorph (Athletic, gains muscle easily)',
    'Endomorph (Naturally larger, gains weight easily)',
    'Athletic (Well-defined muscles)',
    'Lean (Low body fat, defined)',
    'Muscular (High muscle mass)',
    'Toned (Moderate muscle, low fat)',
  ]

  const targetAreas = [
    'Chest',
    'Shoulders',
    'Arms',
    'Back',
    'Abs',
    'Legs',
    'Glutes',
    'Calves',
    'Full Body',
  ]

  const goalTypes = [
    'Weight Loss',
    'Muscle Gain',
    'Endurance',
    'Strength',
    'Flexibility',
    'Body Recomposition',
    'General Fitness',
  ]

  const statTypes = [
    {
      type: 'cardio',
      exercises: [
        'Running (1 mile)',
        'Running (1/2 mile)',
        'Running (1/4 mile)',
        'Cycling',
        'Swimming',
      ],
    },
    {
      type: 'strength',
      exercises: [
        'Bench Press',
        'Squat',
        'Deadlift',
        'Pull-ups',
        'Military Press',
        'Bicep Curls',
        'Sit-ups',
      ],
    },
    {
      type: 'flexibility',
      exercises: ['Sit and Reach', 'Shoulder Flexibility', 'Hip Flexibility'],
    },
    { type: 'endurance', exercises: ['Plank Hold', 'Wall Sit', 'Burpees'] },
  ]

  const dietTypes = [
    {
      value: 'whole30',
      label: 'Whole30',
      description: '30-day elimination diet focusing on whole foods',
    },
    { value: 'keto', label: 'Ketogenic', description: 'High-fat, low-carb diet for ketosis' },
    {
      value: 'high_protein_vegetarian',
      label: 'High-Protein Vegetarian',
      description: 'Plant-based diet with emphasis on protein',
    },
    {
      value: 'gluten_free',
      label: 'Gluten-Free',
      description: 'Eliminates gluten-containing foods',
    },
    {
      value: 'vegan',
      label: 'Vegan',
      description: 'Plant-based diet excluding all animal products',
    },
    {
      value: 'mediterranean',
      label: 'Mediterranean',
      description: 'Heart-healthy diet rich in olive oil, fish, and vegetables',
    },
    {
      value: 'pescatarian',
      label: 'Pescatarian',
      description: 'Vegetarian diet that includes fish and seafood',
    },
    {
      value: 'anti_inflammatory',
      label: 'Anti-Inflammatory',
      description: 'Focuses on foods that reduce inflammation',
    },
    { value: 'atkins', label: 'Atkins', description: 'Low-carb diet with phases' },
    { value: 'paleo', label: 'Paleo', description: 'Based on presumed ancient human diet' },
    { value: 'dash', label: 'DASH', description: 'Dietary Approaches to Stop Hypertension' },
    { value: 'low_carb', label: 'Low-Carb', description: 'Reduces carbohydrate intake' },
    {
      value: 'intermittent_fasting',
      label: 'Intermittent Fasting',
      description: 'Cycling between eating and fasting periods',
    },
    {
      value: 'flexitarian',
      label: 'Flexitarian',
      description: 'Mostly vegetarian with occasional meat',
    },
    { value: 'raw_food', label: 'Raw Food', description: 'Uncooked, unprocessed foods' },
  ]

  const dietLongDescriptions: Record<string, string> = {
    whole30:
      'Included foods: meat, seafood, eggs, vegetables, fruit, natural fats (olive oil, avocado), herbs/spices. Excludes: added sugar, alcohol, grains, legumes, dairy, most additives.',
    keto: 'Included foods: meat, fish, eggs, low-carb vegetables, olive oil, avocado, nuts/seeds, full-fat dairy (if tolerated). Limits: grains, sugar, most fruit, starchy vegetables.',
    high_protein_vegetarian:
      'Included foods: beans, lentils, chickpeas, tofu, tempeh, edamame, Greek yogurt or cottage cheese and other dairy (if you include them), eggs (if you include them), seitan as an option for some meal plans, quinoa and pseudograins paired with plants, nuts and seeds, plenty of vegetables. Goal: repeat protein across meals/snacks—about a palm-sized plant protein portion plus balanced carbs/fats so you hit your targets without relying on meat or fish.',
    gluten_free:
      'Included foods: all naturally gluten-free whole foods—fruits, vegetables, eggs, dairy, fish/meat/poultry if you eat them, legumes (check sauces and labels), potatoes, rice, corn, quinoa, buckwheat, certified gluten-free oats if they work for you, nuts/seeds. Avoid wheat, barley, rye, malt, and triticale (read labels on sauces, soups, dressings, and processed foods due to hidden gluten and cross-contact).',
    anti_inflammatory:
      'Typically emphasizes vegetables (especially leafy and colorful kinds), berries, whole grains where tolerated, fatty fish such as salmon or sardines if you eat seafood, olive oil and other unsaturated fats, nuts, beans, and herbs/spices often used include turmeric and ginger patterns. Usually leans toward fewer fried foods, less refined sugar, and less ultra-processed meat—but this is guidance, not a diagnosis; tune it to foods you tolerate and enjoy.',
    vegan:
      'Included foods: vegetables, fruit, beans/lentils, tofu/tempeh, whole grains, nuts/seeds, plant oils. Focus on protein and micronutrients (B12, iron, omega-3).',
    mediterranean:
      'Included foods: olive oil, fish/seafood, vegetables, legumes, whole grains, nuts, fruit, yogurt/cheese (optional), herbs. Limits: ultra-processed foods and added sugars.',
    pescatarian:
      'Included foods: fish/seafood, vegetables, fruit, legumes, whole grains, nuts/seeds, eggs/dairy (optional). Excludes: meat/poultry.',
    atkins:
      'Included foods: proteins, non-starchy vegetables, healthy fats; carbs increase across phases. Limits: sugar and refined carbs, especially early phases.',
    paleo:
      'Included foods: meat, fish, eggs, vegetables, fruit, nuts/seeds, natural fats. Excludes: grains, most dairy, legumes, refined sugar.',
    dash: 'Included foods: vegetables, fruit, whole grains, lean proteins, low-fat dairy, beans, nuts. Emphasizes sodium reduction and steady energy.',
    low_carb:
      'Included foods: protein, non-starchy vegetables, healthy fats, limited whole-food carbs. Limits: refined grains, sugary foods, and large starch portions.',
    intermittent_fasting:
      'Included foods: your normal food choices, but within an eating window (e.g., 8 hours). Focus on protein, fiber, and hydration to support the fasting schedule.',
    flexitarian:
      'Included foods: mostly plant-based meals with occasional meat/fish. Emphasizes legumes, vegetables, whole grains, and simple proteins when included.',
    raw_food:
      'Included foods: raw fruits/vegetables, nuts/seeds, sprouted grains/legumes (if used), cold-pressed oils. Avoids cooked foods; focus on variety and adequate protein.',
  }

  const dietModifications = [
    'Allow alcohol (beer, wine, spirits)',
    'Include dairy products',
    'Allow processed foods occasionally',
    'Include soy products',
    'Allow artificial sweeteners',
    'Include nightshade vegetables',
    'Allow caffeine',
    'Include legumes and beans',
    'Allow refined grains occasionally',
    'Include nuts and seeds',
    'Allow dark chocolate',
    'Include fermented foods',
    'Allow condiments and sauces',
    'Include tropical fruits',
    'Allow meal replacement shakes',
  ]

  useEffect(() => {
    loadFitnessData()
  }, [])

  const loadFitnessData = async () => {
    setIsLoading(true)
    try {
      // Load all fitness data
      const [
        photosRes,
        goalsRes,
        statsRes,
        workoutsRes,
        nutritionRes,
        nutritionPrefsRes,
        dashboardGoalsRes,
        biometricsRes,
      ] = await Promise.all([
        fetch('/api/fitness/body-photos'),
        fetch('/api/fitness/goals'),
        fetch('/api/fitness/stats'),
        fetch('/api/fitness/workout-plans'),
        fetch('/api/fitness/nutrition-plans'),
        fetch('/api/fitness/nutrition-preferences'),
        fetch('/api/goals'),
        fetch('/api/fitness/biometrics'),
      ])

      // Check for table existence errors
      const responses = [photosRes, goalsRes, statsRes, workoutsRes, nutritionRes]
      const hasTableErrors = responses.some((res) => !res.ok && res.status === 500)

      if (hasTableErrors) {
        setErrorMessage(
          'Fitness database tables not found. Please run the fitness migration in Supabase SQL Editor. See FITNESS_GOALS_FIX.md for instructions.'
        )
        setTimeout(() => setErrorMessage(''), 10000)
      }

      if (photosRes.ok) setBodyPhotos(await photosRes.json())
      if (goalsRes.ok) setFitnessGoals(await goalsRes.json())
      if (statsRes.ok) setFitnessStats(await statsRes.json())
      if (workoutsRes.ok) setWorkoutPlans(await workoutsRes.json())
      if (nutritionRes.ok) setNutritionPlans(await nutritionRes.json())

      if (dashboardGoalsRes.ok) {
        const dg = await dashboardGoalsRes.json()
        setDashboardGoals(dg.goals || [])
      }
      if (biometricsRes.ok) {
        const bio = await biometricsRes.json()
        setBiometrics(bio.biometrics || [])
      }

      if (nutritionPrefsRes.ok) {
        const prefs = await nutritionPrefsRes.json()
        const pref = prefs?.preferences
        if (pref && !dietPrefsLoaded) {
          if (typeof pref.diet_type === 'string') {
            setSelectedDietType(pref.diet_type)
            setSelectedDietLongDescription(dietLongDescriptions[pref.diet_type] || '')
          }
          if (Array.isArray(pref.diet_modifications))
            setSelectedModifications(pref.diet_modifications)
          setDietPrefsLoaded(true)
        }
      }
    } catch (error) {
      console.error('Error loading fitness data:', error)
      setErrorMessage('Failed to load fitness data. Please check your connection and try again.')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const saveDietPreferences = async () => {
    setSavingDietPrefs(true)
    try {
      const res = await fetch('/api/fitness/nutrition-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diet_type: selectedDietType || null,
          diet_modifications: selectedModifications,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        const detail = j?.details ? `: ${j.details}` : ''
        throw new Error(`${j?.error || 'Failed to save diet preferences'}${detail}`)
      }
      setSuccessMessage('Diet preferences saved!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to save diet preferences')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setSavingDietPrefs(false)
    }
  }

  const handleImageUpload = async (file: File, photoType: 'front' | 'side' | 'back') => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('photo_type', photoType)
      formData.append('target_areas', JSON.stringify(selectedTargetAreas))
      formData.append('body_type_goal', selectedBodyType)
      if (heightInches) formData.append('height_inches', heightInches)
      if (weightLbs) formData.append('weight_lbs', weightLbs)

      const response = await fetch('/api/fitness/upload-photo', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        // The API returns { success, photo, analysis }; older callers expected the row directly.
        const newPhoto = data?.photo ?? data
        setBodyPhotos((prev) => [...prev, newPhoto])
        setShowImageUpload(false)
        setSelectedTargetAreas([])
        setSelectedBodyType('')
        setSuccessMessage('Photo uploaded successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const j = await response.json().catch(() => ({}))
        const detail = j?.details ? `: ${j.details}` : ''
        setErrorMessage(`${j?.error || 'Failed to upload photo. Please try again.'}${detail}`)
        setTimeout(() => setErrorMessage(''), 6000)
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      setErrorMessage(
        error instanceof Error
          ? `Failed to upload photo: ${error.message}`
          : 'Failed to upload photo.'
      )
      setTimeout(() => setErrorMessage(''), 6000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/fitness/upload-photo?id=${encodeURIComponent(photoId)}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setBodyPhotos((prev) => prev.filter((p) => p.id !== photoId))
        setSuccessMessage('Photo deleted.')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const j = await response.json().catch(() => ({}))
        setErrorMessage(`Failed to delete photo: ${j.details || j.error || 'Unknown error'}`)
        setTimeout(() => setErrorMessage(''), 6000)
      }
    } catch (error) {
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateNutritionPlan = async (planData: Partial<NutritionPlan> & { id: string }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fitness/nutrition-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })
      if (response.ok) {
        const updated = await response.json()
        setNutritionPlans((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        )
        setEditingNutritionPlan(null)
        setSuccessMessage('Nutrition plan updated!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const j = await response.json().catch(() => ({}))
        setErrorMessage(`Failed to update plan: ${j.details || j.error || 'Unknown error'}`)
        setTimeout(() => setErrorMessage(''), 6000)
      }
    } catch (error) {
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoalSubmit = async (goalData: any) => {
    setIsLoading(true)
    const isEdit = !!editingGoal
    try {
      const response = await fetch('/api/fitness/goals', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingGoal!.id, ...goalData } : goalData),
      })

      if (response.ok) {
        const savedGoal = await response.json()
        setFitnessGoals((prev) =>
          isEdit ? prev.map((g) => (g.id === savedGoal.id ? savedGoal : g)) : [...prev, savedGoal]
        )
        setShowGoalForm(false)
        setEditingGoal(null)
        setSuccessMessage(isEdit ? 'Fitness goal updated!' : 'Fitness goal created successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const errorData = await response.json()
        console.error('Goal save error:', errorData)
        setErrorMessage(
          `Failed to ${isEdit ? 'update' : 'create'} goal: ${errorData.details || errorData.error || 'Unknown error'}`
        )
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } catch (error) {
      console.error('Error saving goal:', error)
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const openEditGoal = (goal: FitnessGoal) => {
    setEditingGoal(goal)
    setShowGoalForm(true)
  }

  const closeGoalForm = () => {
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  // Patch a goal via the API and reflect the change locally.
  const patchGoal = async (id: string, updates: Record<string, unknown>, successMsg: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fitness/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (response.ok) {
        const updated = await response.json()
        setFitnessGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updated } : g)))
        setSuccessMessage(successMsg)
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const err = await response.json().catch(() => ({}))
        setErrorMessage(`Failed to update goal: ${err.details || err.error || 'Unknown error'}`)
        setTimeout(() => setErrorMessage(''), 6000)
      }
    } catch (error) {
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteGoal = (goal: FitnessGoal) =>
    patchGoal(
      goal.id,
      { completed_at: new Date().toISOString(), is_active: false },
      'Goal marked complete! 🎉'
    )

  const handleReopenGoal = (goal: FitnessGoal) =>
    patchGoal(goal.id, { completed_at: null, is_active: true }, 'Goal moved back to active.')

  const handleDeleteGoal = async (goal: FitnessGoal) => {
    if (!confirm('Delete this fitness goal? This cannot be undone.')) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/fitness/goals?id=${encodeURIComponent(goal.id)}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setFitnessGoals((prev) => prev.filter((g) => g.id !== goal.id))
        setSuccessMessage('Goal deleted.')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const err = await response.json().catch(() => ({}))
        setErrorMessage(`Failed to delete goal: ${err.details || err.error || 'Unknown error'}`)
        setTimeout(() => setErrorMessage(''), 6000)
      }
    } catch (error) {
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatsSubmit = async (statsData: any) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fitness/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statsData),
      })

      if (response.ok) {
        const newStats = await response.json()
        setFitnessStats((prev) => [...prev, ...newStats])
        setShowStatsForm(false)
        setSuccessMessage('Fitness stats logged successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage('Failed to log stats. Please try again.')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error saving stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditStat = (stat: FitnessStat) => {
    setEditingStat(stat)
    setShowEditStatForm(true)
  }

  const handleUpdateStat = async (updatedStat: any) => {
    setIsLoading(true)
    try {
      // Log a NEW dated entry instead of overwriting the old one, so the
      // previous value stays in the log and we can chart growth over time.
      const { id: _id, ...fields } = updatedStat
      const response = await fetch('/api/fitness/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: [fields] }),
      })

      if (response.ok) {
        const created = await response.json()
        const newStats = Array.isArray(created) ? created : []
        setFitnessStats((prev) => [...newStats, ...prev])
        setShowEditStatForm(false)
        setEditingStat(null)
        setSuccessMessage('New measurement logged. Previous entries are kept to track growth.')
        setTimeout(() => setSuccessMessage(''), 3500)
      } else {
        setErrorMessage('Failed to log update. Please try again.')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error logging stat update:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStat = async (statId: string) => {
    if (!confirm('Are you sure you want to delete this stat?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/fitness/stats?id=${statId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setFitnessStats((prev) => prev.filter((stat) => stat.id !== statId))
        setSuccessMessage('Stat deleted successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage('Failed to delete stat. Please try again.')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error deleting stat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateWorkoutPlan = async () => {
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/fitness/generate-workout-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: fitnessGoals,
          stats: fitnessStats,
          target_areas: selectedTargetAreas,
          body_type_goal: selectedBodyType,
          dashboard_goals: dashboardGoals,
          latest_biometrics: biometrics[0] ?? null,
          body_photos: bodyPhotos,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.workout_plan) {
          setWorkoutPlans((prev) => [...prev, result.workout_plan])
          setSuccessMessage('Workout plan generated successfully!')
          setTimeout(() => setSuccessMessage(''), 5000)
        } else {
          setErrorMessage('Failed to generate workout plan. Please try again.')
          setTimeout(() => setErrorMessage(''), 5000)
        }
      } else {
        const errorData = await response.json()
        console.error('Workout plan generation error:', errorData)
        setErrorMessage(
          `Failed to generate workout plan: ${errorData.details || errorData.error || 'Unknown error'}`
        )
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } catch (error) {
      console.error('Error generating workout plan:', error)
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const generateNutritionPlan = async () => {
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/fitness/generate-nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: fitnessGoals,
          stats: fitnessStats,
          body_photos: bodyPhotos,
          diet_type: selectedDietType,
          diet_modifications: selectedModifications,
          zipcode: zipcode,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.nutrition_plan) {
          setNutritionPlans((prev) => [...prev, result.nutrition_plan])
          setSuccessMessage('Nutrition plan generated successfully!')
          setTimeout(() => setSuccessMessage(''), 5000)
        } else {
          setErrorMessage('Failed to generate nutrition plan. Please try again.')
          setTimeout(() => setErrorMessage(''), 5000)
        }
      } else {
        const errorData = await response.json()
        console.error('Nutrition plan generation error:', errorData)
        setErrorMessage(
          `Failed to generate nutrition plan: ${errorData.details || errorData.error || 'Unknown error'}`
        )
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } catch (error) {
      console.error('Error generating nutrition plan:', error)
      setErrorMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteWorkoutPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this workout plan?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/fitness/workout-plans?id=${planId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWorkoutPlans((prev) => prev.filter((plan) => plan.id !== planId))
        if (modalWorkoutPlan?.id === planId) {
          setModalWorkoutPlan(null)
          setWorkoutModalOpen(false)
        }
        setSuccessMessage('Workout plan deleted successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage('Failed to delete workout plan. Please try again.')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error deleting workout plan:', error)
      setErrorMessage('Failed to delete workout plan. Please try again.')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExerciseClick = (exerciseName: string) => {
    setSelectedExercise(exerciseName)
    setShowExerciseModal(true)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'body-analysis', label: 'Body Analysis', icon: Camera },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'stats', label: 'Current Stats', icon: Activity },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
  ]

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
                  <Activity className="h-8 w-8 mr-3 text-green-600" />
                  Fitness Tracker
                </h1>
                <p className="text-sm text-gray-600">Track your fitness journey</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 text-green-600" />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-600 bg-green-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Goals</span>
                    <span className="font-semibold">
                      {fitnessGoals.filter((g) => g.is_active).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Body Photos</span>
                    <span className="font-semibold">{bodyPhotos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Workout Plans</span>
                    <span className="font-semibold">{workoutPlans.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nutrition Plans</span>
                    <span className="font-semibold">{nutritionPlans.length}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {fitnessStats.slice(0, 3).map((stat) => (
                    <div key={stat.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{stat.exercise_name}</span>
                      <span className="text-sm font-medium">
                        {stat.measurement_value} {stat.measurement_unit}
                      </span>
                    </div>
                  ))}
                  {fitnessStats.length === 0 && (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-purple-600" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded flex items-center"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Body Photo
                  </button>
                  <button
                    onClick={() => {
                      setEditingGoal(null)
                      setShowGoalForm(true)
                    }}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded flex items-center"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Set Fitness Goal
                  </button>
                  <button
                    onClick={() => setShowStatsForm(true)}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded flex items-center"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Log Current Stats
                  </button>
                  <button
                    onClick={generateWorkoutPlan}
                    disabled={isLoading}
                    className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded flex items-center disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Dumbbell className="h-4 w-4 mr-2" />
                    )}
                    Generate Workout Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'body-analysis' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-green-600" />
                    Body Analysis
                  </h3>
                  {/* Only show the header upload button when photos exist; the empty
                      state already has its own "Upload Your First Photo" button. */}
                  {bodyPhotos.length > 0 && (
                    <button
                      onClick={() => setShowImageUpload(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Photo
                    </button>
                  )}
                </div>

                {bodyPhotos.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No body photos uploaded
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Upload photos to get AI-powered body analysis and personalized recommendations
                    </p>
                    <button
                      onClick={() => setShowImageUpload(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Photo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bodyPhotos.map((photo) => (
                      <div key={photo.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="relative aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                          {photo.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.photo_url}
                              alt={`${photo.photo_type} body photo`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            title="Delete photo"
                            className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-white/90 p-1.5 text-red-600 shadow hover:bg-white hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">
                              {photo.photo_type}
                            </span>
                            {photo.is_primary && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(photo.uploaded_at).toLocaleDateString()}
                          </div>
                          {photo.target_areas.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {photo.target_areas.map((area) => (
                                <span
                                  key={area}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          )}

                          {photo.analysis_data?.analysis_text ? (
                            <div className="pt-2">
                              <button
                                onClick={() =>
                                  setExpandedPhotoId(expandedPhotoId === photo.id ? null : photo.id)
                                }
                                className="inline-flex items-center text-xs font-medium text-green-700 hover:text-green-800"
                              >
                                <Zap className="h-3.5 w-3.5 mr-1" />
                                {expandedPhotoId === photo.id
                                  ? 'Hide AI analysis'
                                  : 'View AI analysis'}
                              </button>
                              {expandedPhotoId === photo.id && (
                                <div className="mt-2 rounded-lg bg-green-50 border border-green-100 p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
                                  {photo.analysis_data.analysis_text}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="pt-1 text-xs text-gray-400 italic">
                              AI analysis unavailable for this photo.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' &&
            (() => {
              const activeGoals = fitnessGoals.filter((g) => !g.completed_at)
              const completedGoals = fitnessGoals.filter((g) => !!g.completed_at)

              const priorityBadge = (level: string) =>
                level === 'high'
                  ? 'bg-red-100 text-red-800'
                  : level === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'

              const renderGoalCard = (goal: FitnessGoal) => {
                const completed = !!goal.completed_at
                return (
                  <div
                    key={goal.id}
                    className={`rounded-lg p-4 border ${
                      completed ? 'border-green-200 bg-green-50/40' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize flex items-center">
                        {completed && <CheckCircle className="h-4 w-4 mr-2 text-green-600" />}
                        {goal.goal_type.replace(/_/g, ' ')}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          completed
                            ? 'bg-green-100 text-green-800'
                            : priorityBadge(goal.priority_level)
                        }`}
                      >
                        {completed ? 'Completed' : goal.priority_level}
                      </span>
                    </div>
                    {goal.target_weight && (
                      <p className="text-sm text-gray-600 mb-2">
                        Target Weight: {goal.target_weight} lbs
                      </p>
                    )}
                    {goal.target_areas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {goal.target_areas.map((area) => (
                          <span
                            key={area}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-2 italic">"{goal.description}"</p>
                    )}
                    {completed ? (
                      <p className="text-xs text-green-700 mb-3">
                        Completed on {new Date(goal.completed_at as string).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mb-3">
                        Timeline: {goal.timeline_weeks} weeks
                      </p>
                    )}

                    <div
                      className={`flex flex-wrap gap-2 pt-2 border-t ${
                        completed ? 'border-green-100' : 'border-gray-100'
                      }`}
                    >
                      {completed ? (
                        <button
                          onClick={() => handleReopenGoal(goal)}
                          disabled={isLoading}
                          className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                          Reopen
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditGoal(goal)}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleCompleteGoal(goal)}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Complete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(goal)}
                        disabled={isLoading}
                        className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Target className="h-5 w-5 mr-2 text-green-600" />
                        Fitness Goals
                      </h3>
                      <button
                        onClick={() => {
                          setEditingGoal(null)
                          setShowGoalForm(true)
                        }}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Goal
                      </button>
                    </div>

                    {/* Active / Completed sub-tabs */}
                    <div className="flex gap-1 mb-6 border-b border-gray-200">
                      <button
                        onClick={() => setGoalsView('active')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          goalsView === 'active'
                            ? 'border-green-600 text-green-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Active ({activeGoals.length})
                      </button>
                      <button
                        onClick={() => setGoalsView('completed')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          goalsView === 'completed'
                            ? 'border-green-600 text-green-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Completed ({completedGoals.length})
                      </button>
                    </div>

                    {goalsView === 'active' ? (
                      activeGoals.length === 0 ? (
                        <div className="text-center py-12">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            No active fitness goals
                          </h4>
                          <p className="text-gray-600 mb-4">
                            Set a fitness goal to start tracking your progress
                          </p>
                          <button
                            onClick={() => {
                              setEditingGoal(null)
                              setShowGoalForm(true)
                            }}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Set Your First Goal
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {activeGoals.map(renderGoalCard)}
                        </div>
                      )
                    ) : completedGoals.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          No completed goals yet
                        </h4>
                        <p className="text-gray-600">
                          When you complete an active goal, it will be saved here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {completedGoals.map(renderGoalCard)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <BiometricsSection
                latestFitbitOptIn={!!biometrics[0]?.fitbit_opt_in}
                onAfterSave={loadFitnessData}
              />

              <BiometricsOverview biometrics={biometrics} />

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-600" />
                    Current Fitness Stats
                  </h3>
                  <button
                    onClick={() => setShowStatsForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Stats
                  </button>
                </div>

                {biometrics[0] &&
                  typeof biometrics[0].contextual_energy_level_1_10 === 'number' && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-gray-800">
                      <span className="font-semibold text-amber-950">
                        Latest contextual energy:{' '}
                      </span>
                      {biometrics[0].contextual_energy_level_1_10}/10
                      {typeof biometrics[0].energy_level_self_1_10 === 'number' && (
                        <span className="text-gray-700">
                          {' '}
                          (you rated {biometrics[0].energy_level_self_1_10}/10)
                        </span>
                      )}
                      <span className="text-gray-600">
                        {' '}
                        · {new Date(biometrics[0].recorded_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                {fitnessStats.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No fitness stats logged
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Log your current fitness statistics to track your progress
                    </p>
                    <button
                      onClick={() => setShowStatsForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Log Your First Stats
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {statTypes.map((statType) => {
                      const typeStats = fitnessStats.filter((s) => s.stat_type === statType.type)
                      if (typeStats.length === 0) return null

                      return (
                        <div key={statType.type} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 capitalize">
                            {statType.type} Stats
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {typeStats.map((stat) => (
                              <div
                                key={stat.id}
                                className="flex flex-wrap justify-between items-center gap-2 p-3 bg-gray-50 rounded"
                              >
                                <div className="flex-1 min-w-[120px]">
                                  <p className="font-medium text-sm">{stat.exercise_name}</p>
                                  {stat.rep_range && (
                                    <p className="text-xs text-gray-500">{stat.rep_range} reps</p>
                                  )}
                                </div>
                                <div className="text-right mr-2">
                                  <p className="font-semibold">
                                    {stat.measurement_value} {stat.measurement_unit}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(stat.recorded_at).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-center px-2 py-1 rounded bg-white border border-amber-100 min-w-[5.5rem]">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Energy
                                  </p>
                                  <p className="text-sm font-semibold text-amber-900">
                                    {typeof biometrics[0]?.contextual_energy_level_1_10 === 'number'
                                      ? `${biometrics[0].contextual_energy_level_1_10}/10`
                                      : '—'}
                                  </p>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleEditStat(stat)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                    title="Log an updated measurement (keeps history)"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStat(stat.id)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    title="Delete stat"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {statType.type === 'strength' && (
                            <div className="mt-4 border-t border-gray-200 pt-4">
                              <button
                                onClick={() => setShowStrengthGrowth((prev) => !prev)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {showStrengthGrowth ? 'Hide Growth' : 'Track Growth'}
                              </button>

                              {showStrengthGrowth && (
                                <div className="mt-4">
                                  <p className="text-sm text-gray-600 mb-3">
                                    Each strength exercise is plotted over time — every saved update
                                    adds a point so you can see your progress trend.
                                  </p>
                                  <StrengthGrowthChart stats={typeStats} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workouts Tab */}
          {activeTab === 'workouts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Dumbbell className="h-5 w-5 mr-2 text-green-600" />
                    Workout Plans
                  </h3>
                  <button
                    onClick={generateWorkoutPlan}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Workout Plan
                  </button>
                </div>

                {workoutPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No workout plans created
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Generate a personalized workout plan based on your goals and stats
                    </p>
                    <button
                      onClick={generateWorkoutPlan}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Your First Plan
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workoutPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <button
                          type="button"
                          className="text-left p-5 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                          onClick={() => {
                            setModalWorkoutPlan(plan)
                            setWorkoutModalOpen(true)
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-lg font-bold text-gray-900 pr-2">
                              {plan.plan_name}
                            </h4>
                            <span
                              className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                                plan.difficulty_level === 'beginner'
                                  ? 'bg-green-100 text-green-800'
                                  : plan.difficulty_level === 'intermediate'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {plan.difficulty_level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 capitalize mb-1">
                            {plan.plan_type} · {plan.duration_weeks} weeks ·{' '}
                            {plan.frequency_per_week}x/week
                          </p>
                          {plan.created_at && (
                            <p className="text-xs text-gray-400 mb-3 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Generated {new Date(plan.created_at).toLocaleString()}
                            </p>
                          )}
                          {plan.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                              {plan.description}
                            </p>
                          )}
                          <p className="text-sm text-green-700 font-medium">
                            View timeline & adapted routine →
                          </p>
                        </button>
                        <div className="border-t border-gray-100 px-5 py-3 flex justify-end bg-gray-50">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteWorkoutPlan(plan.id)
                            }}
                            className="text-red-600 hover:text-red-800 text-sm inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nutrition Tab */}
          {activeTab === 'nutrition' && (
            <div className="space-y-6">
              {/* Diet Selection */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold flex items-center mb-4">
                  <Utensils className="h-5 w-5 mr-2 text-green-600" />
                  Diet Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Diet Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Diet Type
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dietTypes.map((diet) => (
                        <label
                          key={diet.value}
                          className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="diet_type"
                            value={diet.value}
                            checked={selectedDietType === diet.value}
                            onChange={(e) => {
                              const v = e.target.value
                              setSelectedDietType(v)
                              setSelectedDietLongDescription(dietLongDescriptions[v] || '')
                            }}
                            className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{diet.label}</div>
                            <div className="text-sm text-gray-500">{diet.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Diet Modifications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Diet Modifications
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dietModifications.map((modification) => (
                        <label
                          key={modification}
                          className="flex items-center space-x-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModifications.includes(modification)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedModifications([...selectedModifications, modification])
                              } else {
                                setSelectedModifications(
                                  selectedModifications.filter((m) => m !== modification)
                                )
                              }
                            }}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{modification}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Diet description panel (appears when diet selected) */}
                {selectedDietType && (
                  <div className="mt-5">
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-900">
                          Foods typically included (
                          {dietTypes.find((d) => d.value === selectedDietType)?.label})
                        </div>
                        <div className="text-xs text-gray-600">
                          Use this as a guide, not a rulebook.
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedDietLongDescription ||
                          dietTypes.find((d) => d.value === selectedDietType)?.description ||
                          'Select a diet above to see a fuller guide to typical foods.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save preferences */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={saveDietPreferences}
                    disabled={savingDietPrefs}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDietPrefs ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Diet Preferences
                  </button>
                </div>

                {/* Zipcode Input */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zipcode (for shopping list optimization)
                  </label>
                  <input
                    type="text"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    placeholder="Enter your zipcode (e.g., 90210)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used to find the best grocery stores and prices in your area
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={generateNutritionPlan}
                    disabled={isLoading}
                    className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Generate Nutrition Plan
                  </button>
                </div>
              </div>

              {/* Nutrition Plans Display */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Utensils className="h-5 w-5 mr-2 text-green-600" />
                    Your Nutrition Plans
                  </h3>
                </div>

                {nutritionPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No nutrition plans created
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Generate a personalized nutrition plan based on your goals and body analysis
                    </p>
                    <button
                      onClick={generateNutritionPlan}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Your First Plan
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {nutritionPlans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900">{plan.plan_name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                              {plan.plan_type.replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => setEditingNutritionPlan(plan)}
                              title="Edit plan"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {plan.created_at && (
                          <p className="text-xs text-gray-400 mb-2 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Generated {new Date(plan.created_at).toLocaleString()}
                          </p>
                        )}
                        {plan.diet_type && (
                          <div className="mb-2">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {dietTypes.find((d) => d.value === plan.diet_type)?.label ||
                                plan.diet_type}
                            </span>
                          </div>
                        )}
                        {plan.diet_modifications && plan.diet_modifications.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Modifications:</p>
                            <div className="flex flex-wrap gap-1">
                              {plan.diet_modifications.map((mod, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                                >
                                  {mod}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {plan.daily_calories && (
                          <p className="text-sm text-gray-600 mb-2">
                            Daily Calories: {plan.daily_calories}
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          {plan.protein_grams && (
                            <div className="text-center">
                              <p className="font-medium">{plan.protein_grams}g</p>
                              <p className="text-xs text-gray-500">Protein</p>
                            </div>
                          )}
                          {plan.carbs_grams && (
                            <div className="text-center">
                              <p className="font-medium">{plan.carbs_grams}g</p>
                              <p className="text-xs text-gray-500">Carbs</p>
                            </div>
                          )}
                          {plan.fat_grams && (
                            <div className="text-center">
                              <p className="font-medium">{plan.fat_grams}g</p>
                              <p className="text-xs text-gray-500">Fat</p>
                            </div>
                          )}
                        </div>

                        {/* Meal Plan and Shopping List */}
                        {(plan as any).meal_plan && (
                          <div className="mt-4 space-y-4">
                            <div className="border-t pt-4">
                              <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                                Weekly Meal Plan
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                {Object.entries((plan as any).meal_plan).map(
                                  ([day, meals]: [string, any]) => (
                                    <div key={day} className="bg-gray-50 rounded-lg p-3">
                                      <h6 className="font-medium text-gray-900 capitalize mb-2">
                                        {day}
                                      </h6>
                                      <div className="space-y-1">
                                        <div>
                                          <span className="font-medium">Breakfast:</span>{' '}
                                          {meals.breakfast}
                                        </div>
                                        <div>
                                          <span className="font-medium">Lunch:</span> {meals.lunch}
                                        </div>
                                        <div>
                                          <span className="font-medium">Dinner:</span>{' '}
                                          {meals.dinner}
                                        </div>
                                        {meals.snacks && (
                                          <div>
                                            <span className="font-medium">Snacks:</span>{' '}
                                            {Array.isArray(meals.snacks)
                                              ? meals.snacks.join(', ')
                                              : meals.snacks}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {(plan as any).shopping_list && (
                              <div className="border-t pt-4">
                                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                                  <Utensils className="h-4 w-4 mr-2 text-green-600" />
                                  Shopping List
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries((plan as any).shopping_list).map(
                                    ([category, items]: [string, any]) => {
                                      if (
                                        category === 'total_estimated_cost' ||
                                        category === 'store_recommendations'
                                      )
                                        return null
                                      return (
                                        <div key={category} className="bg-green-50 rounded-lg p-3">
                                          <h6 className="font-medium text-green-900 capitalize mb-2">
                                            {category}
                                          </h6>
                                          <div className="space-y-1">
                                            {Array.isArray(items) &&
                                              items.map((item: any, index: number) => (
                                                <div
                                                  key={index}
                                                  className="text-sm text-gray-700 flex justify-between"
                                                >
                                                  <span>
                                                    {item.item} ({item.quantity})
                                                  </span>
                                                  <span className="font-medium text-green-600">
                                                    {item.estimated_cost}
                                                  </span>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )
                                    }
                                  )}
                                </div>

                                {(plan as any).shopping_list.total_estimated_cost && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-blue-900">
                                        Total Estimated Cost:
                                      </span>
                                      <span className="text-lg font-bold text-blue-600">
                                        {(plan as any).shopping_list.total_estimated_cost}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {(plan as any).shopping_list.store_recommendations && (
                                  <div className="mt-4">
                                    <h6 className="font-medium text-gray-900 mb-2">
                                      Store Recommendations:
                                    </h6>
                                    <div className="space-y-2">
                                      {(plan as any).shopping_list.store_recommendations.map(
                                        (store: any, index: number) => (
                                          <div
                                            key={index}
                                            className="flex justify-between items-center p-2 bg-yellow-50 rounded"
                                          >
                                            <div>
                                              <span className="font-medium text-yellow-900">
                                                {store.store}
                                              </span>
                                              <p className="text-sm text-yellow-700">
                                                {store.reason}
                                              </p>
                                            </div>
                                            <span className="text-sm font-medium text-yellow-600">
                                              {store.estimated_savings}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <PlanActionSuggestions
                          planType="nutrition"
                          plan={{
                            plan_name: plan.plan_name,
                            plan_type: plan.plan_type,
                            diet_type: plan.diet_type,
                            daily_calories: plan.daily_calories,
                            protein_grams: plan.protein_grams,
                            carbs_grams: plan.carbs_grams,
                            fat_grams: plan.fat_grams,
                            meal_frequency: (plan as any).meal_frequency,
                            description: plan.description,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Progress Tracking
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Timestamped stats and biometrics: we highlight improvements and dips versus your
                  prior entries so you can see trajectory, not just single numbers.
                </p>
                <FitnessProgressPanel fitnessStats={fitnessStats} biometrics={biometrics} />
              </div>
            </div>
          )}
        </div>
      </div>

      <WorkoutPlanModal
        plan={modalWorkoutPlan}
        open={workoutModalOpen && !!modalWorkoutPlan}
        onClose={() => {
          setWorkoutModalOpen(false)
          setModalWorkoutPlan(null)
        }}
        fitnessGoals={fitnessGoals}
        dashboardGoals={dashboardGoals}
        fitnessStats={fitnessStats}
        latestBiometric={biometrics[0] ?? null}
        onExerciseClick={handleExerciseClick}
        onGoNutrition={() => setActiveTab('nutrition')}
      />

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Body Photo</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="front">Front View</option>
                  <option value="side">Side View</option>
                  <option value="back">Back View</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Areas of Improvement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {targetAreas.map((area) => (
                    <label key={area} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTargetAreas.includes(area)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTargetAreas([...selectedTargetAreas, area])
                          } else {
                            setSelectedTargetAreas(selectedTargetAreas.filter((a) => a !== area))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Body Type
                </label>
                <select
                  value={selectedBodyType}
                  onChange={(e) => setSelectedBodyType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select body type goal</option>
                  {bodyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (inches)
                  </label>
                  <input
                    type="number"
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    placeholder="e.g., 70"
                    min="48"
                    max="96"
                    step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(e.target.value)}
                    placeholder="e.g., 150"
                    min="50"
                    max="500"
                    step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file, 'front')
                    }
                  }}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Form Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingGoal ? 'Edit Fitness Goal' : 'Set Fitness Goal'}
              </h3>
              <button onClick={closeGoalForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              key={editingGoal?.id || 'new'}
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const goalData = {
                  goal_type: formData.get('goal_type'),
                  target_weight: formData.get('target_weight')
                    ? parseFloat(formData.get('target_weight') as string)
                    : undefined,
                  current_weight: formData.get('current_weight')
                    ? parseFloat(formData.get('current_weight') as string)
                    : undefined,
                  target_areas: Array.from(
                    document.querySelectorAll('input[name="target_areas"]:checked')
                  ).map((input: any) => input.value),
                  timeline_weeks: parseInt(formData.get('timeline_weeks') as string) || 12,
                  priority_level: formData.get('priority_level') || 'medium',
                  description: formData.get('description') || undefined,
                }
                handleGoalSubmit(goalData)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Type</label>
                <select
                  name="goal_type"
                  required
                  defaultValue={editingGoal?.goal_type || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select goal type</option>
                  {goalTypes.map((type) => (
                    <option key={type} value={type.toLowerCase().replace(' ', '_')}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Weight (lbs)
                  </label>
                  <input
                    type="number"
                    name="current_weight"
                    defaultValue={editingGoal?.current_weight ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Weight (lbs)
                  </label>
                  <input
                    type="number"
                    name="target_weight"
                    defaultValue={editingGoal?.target_weight ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="140"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Areas</label>
                <div className="grid grid-cols-3 gap-2">
                  {targetAreas.map((area) => (
                    <label key={area} className="flex items-center">
                      <input
                        type="checkbox"
                        name="target_areas"
                        value={area}
                        defaultChecked={editingGoal?.target_areas?.includes(area)}
                        className="mr-2"
                      />
                      <span className="text-sm">{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline (weeks)
                  </label>
                  <input
                    type="number"
                    name="timeline_weeks"
                    defaultValue={editingGoal?.timeline_weeks ?? 12}
                    min={1}
                    max={52}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    name="priority_level"
                    defaultValue={editingGoal?.priority_level || 'medium'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingGoal?.description || ''}
                  placeholder="Describe your specific fitness goals, motivations, and any special considerations..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This description will help AI generate more personalized workout plans
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeGoalForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Form Modal */}
      {showStatsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Log Fitness Stats</h3>
              <button
                onClick={() => setShowStatsForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const statsData = {
                  stats: [
                    {
                      stat_type: formData.get('stat_type'),
                      exercise_name: formData.get('exercise_name'),
                      measurement_value: parseFloat(formData.get('measurement_value') as string),
                      measurement_unit: formData.get('measurement_unit'),
                      rep_range: formData.get('rep_range') || undefined,
                      notes: formData.get('notes') || undefined,
                    },
                  ],
                }
                handleStatsSubmit(statsData)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stat Type</label>
                <select
                  name="stat_type"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select stat type</option>
                  {statTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exercise</label>
                <select
                  name="exercise_name"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select exercise</option>
                  {statTypes.map((type) =>
                    type.exercises.map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                  <input
                    type="number"
                    name="measurement_value"
                    step="0.1"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="135"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    name="measurement_unit"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select unit</option>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                    <option value="reps">reps</option>
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="miles">miles</option>
                    <option value="inches">inches</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rep Range (optional)
                </label>
                <input
                  type="text"
                  name="rep_range"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="8-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStatsForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Log Stats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stats Form Modal */}
      {showEditStatForm && editingStat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Update Measurement</h3>
              <button
                onClick={() => {
                  setShowEditStatForm(false)
                  setEditingStat(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Logs a new dated entry. Your previous entry stays in the log so you can track growth
              over time.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const updatedStat = {
                  id: editingStat.id,
                  stat_type: formData.get('stat_type'),
                  exercise_name: formData.get('exercise_name'),
                  measurement_value: parseFloat(formData.get('measurement_value') as string),
                  measurement_unit: formData.get('measurement_unit'),
                  rep_range: formData.get('rep_range') || undefined,
                  notes: formData.get('notes') || undefined,
                }
                handleUpdateStat(updatedStat)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stat Type</label>
                <select
                  name="stat_type"
                  defaultValue={editingStat.stat_type}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select stat type</option>
                  {statTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exercise</label>
                <select
                  name="exercise_name"
                  defaultValue={editingStat.exercise_name}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select exercise</option>
                  {statTypes.map((type) =>
                    type.exercises.map((exercise) => (
                      <option key={exercise} value={exercise}>
                        {exercise}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                  <input
                    type="number"
                    name="measurement_value"
                    defaultValue={editingStat.measurement_value}
                    step="0.1"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="135"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    name="measurement_unit"
                    defaultValue={editingStat.measurement_unit}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select unit</option>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                    <option value="reps">reps</option>
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="miles">miles</option>
                    <option value="inches">inches</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rep Range (optional)
                </label>
                <input
                  type="text"
                  name="rep_range"
                  defaultValue={editingStat.rep_range || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="8-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingStat.notes || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStatForm(false)
                    setEditingStat(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save New Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Nutrition Plan Modal */}
      {editingNutritionPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Nutrition Plan</h3>
              <button
                onClick={() => setEditingNutritionPlan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.target as HTMLFormElement)
                handleUpdateNutritionPlan({
                  id: editingNutritionPlan.id,
                  plan_name: (fd.get('plan_name') as string) || editingNutritionPlan.plan_name,
                  plan_type: (fd.get('plan_type') as string) || editingNutritionPlan.plan_type,
                  daily_calories: fd.get('daily_calories')
                    ? parseInt(fd.get('daily_calories') as string, 10)
                    : undefined,
                  protein_grams: fd.get('protein_grams')
                    ? parseInt(fd.get('protein_grams') as string, 10)
                    : undefined,
                  carbs_grams: fd.get('carbs_grams')
                    ? parseInt(fd.get('carbs_grams') as string, 10)
                    : undefined,
                  fat_grams: fd.get('fat_grams')
                    ? parseInt(fd.get('fat_grams') as string, 10)
                    : undefined,
                  description: (fd.get('description') as string) || undefined,
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                <input
                  name="plan_name"
                  defaultValue={editingNutritionPlan.plan_name}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                <select
                  name="plan_type"
                  defaultValue={editingNutritionPlan.plan_type}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="weight_loss">Weight loss</option>
                  <option value="muscle_gain">Muscle gain</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="performance">Performance</option>
                  <option value="medical">Medical</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Calories
                  </label>
                  <input
                    type="number"
                    name="daily_calories"
                    defaultValue={editingNutritionPlan.daily_calories ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    name="protein_grams"
                    defaultValue={editingNutritionPlan.protein_grams ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Carbs (g)</label>
                  <input
                    type="number"
                    name="carbs_grams"
                    defaultValue={editingNutritionPlan.carbs_grams ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fat (g)</label>
                  <input
                    type="number"
                    name="fat_grams"
                    defaultValue={editingNutritionPlan.fat_grams ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingNutritionPlan.description || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingNutritionPlan(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exercise Demonstration Modal */}
      {showExerciseModal && selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedExercise}</h3>
                <button
                  onClick={() => setShowExerciseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Exercise Image Placeholder */}
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Exercise demonstration image for "{selectedExercise}" would be displayed here.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This would show proper form and technique for performing the exercise.
                  </p>
                </div>

                {/* Exercise Instructions */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">How to Perform:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Start in the proper position</li>
                    <li>• Maintain good form throughout the movement</li>
                    <li>• Control the weight/movement</li>
                    <li>• Breathe properly during the exercise</li>
                    <li>• Complete the full range of motion</li>
                  </ul>
                </div>

                {/* Common Mistakes */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Common Mistakes to Avoid:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Using momentum instead of muscle control</li>
                    <li>• Not completing the full range of motion</li>
                    <li>• Holding your breath during the exercise</li>
                    <li>• Using too much weight too soon</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowExerciseModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

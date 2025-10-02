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
  is_active: boolean
  is_ai_generated: boolean
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
  const [showStatsForm, setShowStatsForm] = useState(false)
  const [selectedTargetAreas, setSelectedTargetAreas] = useState<string[]>([])
  const [selectedBodyType, setSelectedBodyType] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedDietType, setSelectedDietType] = useState<string>('')
  const [selectedModifications, setSelectedModifications] = useState<string[]>([])
  const [zipcode, setZipcode] = useState<string>('')
  const [heightInches, setHeightInches] = useState<string>('')
  const [weightLbs, setWeightLbs] = useState<string>('')
  const [editingStat, setEditingStat] = useState<FitnessStat | null>(null)
  const [showEditStatForm, setShowEditStatForm] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [showExerciseModal, setShowExerciseModal] = useState(false)

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
      const [photosRes, goalsRes, statsRes, workoutsRes, nutritionRes] = await Promise.all([
        fetch('/api/fitness/body-photos'),
        fetch('/api/fitness/goals'),
        fetch('/api/fitness/stats'),
        fetch('/api/fitness/workout-plans'),
        fetch('/api/fitness/nutrition-plans'),
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
    } catch (error) {
      console.error('Error loading fitness data:', error)
      setErrorMessage('Failed to load fitness data. Please check your connection and try again.')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsLoading(false)
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
        const newPhoto = await response.json()
        setBodyPhotos((prev) => [...prev, newPhoto])
        setShowImageUpload(false)
        setSelectedTargetAreas([])
        setSelectedBodyType('')
        setSuccessMessage('Photo uploaded successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage('Failed to upload photo. Please try again.')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoalSubmit = async (goalData: any) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fitness/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      })

      if (response.ok) {
        const newGoal = await response.json()
        setFitnessGoals((prev) => [...prev, newGoal])
        setShowGoalForm(false)
        setSuccessMessage('Fitness goal created successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const errorData = await response.json()
        console.error('Goal creation error:', errorData)
        setErrorMessage(
          `Failed to create goal: ${errorData.details || errorData.error || 'Unknown error'}`
        )
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } catch (error) {
      console.error('Error creating goal:', error)
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
      const response = await fetch('/api/fitness/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStat),
      })

      if (response.ok) {
        const updated = await response.json()
        setFitnessStats((prev) => prev.map((stat) => (stat.id === updated.id ? updated : stat)))
        setShowEditStatForm(false)
        setEditingStat(null)
        setSuccessMessage('Stat updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage('Failed to update stat. Please try again.')
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error updating stat:', error)
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
                <p className="text-sm text-gray-600">
                  Track your fitness journey with AI-powered analysis and personalized plans
                </p>
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
                    onClick={() => setShowGoalForm(true)}
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
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Photo
                  </button>
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
                        <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Target className="h-5 w-5 mr-2 text-green-600" />
                    Fitness Goals
                  </h3>
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </button>
                </div>

                {fitnessGoals.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No fitness goals set</h4>
                    <p className="text-gray-600 mb-4">
                      Set your first fitness goal to start tracking your progress
                    </p>
                    <button
                      onClick={() => setShowGoalForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Set Your First Goal
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fitnessGoals.map((goal) => (
                      <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {goal.goal_type.replace('_', ' ')}
                          </h4>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              goal.priority_level === 'high'
                                ? 'bg-red-100 text-red-800'
                                : goal.priority_level === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {goal.priority_level}
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
                        <p className="text-sm text-gray-500">
                          Timeline: {goal.timeline_weeks} weeks
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
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
                                className="flex justify-between items-center p-3 bg-gray-50 rounded"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{stat.exercise_name}</p>
                                  {stat.rep_range && (
                                    <p className="text-xs text-gray-500">{stat.rep_range} reps</p>
                                  )}
                                </div>
                                <div className="text-right mr-3">
                                  <p className="font-semibold">
                                    {stat.measurement_value} {stat.measurement_unit}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(stat.recorded_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleEditStat(stat)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                    title="Edit stat"
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
                    Generate AI Plan
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
                  <div className="space-y-8">
                    {workoutPlans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                        {/* Plan Header with Delete Button */}
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h4 className="text-2xl font-bold text-gray-900">{plan.plan_name}</h4>
                            <p className="text-sm text-gray-600 capitalize">
                              {plan.plan_type} Plan • {plan.duration_weeks} weeks •{' '}
                              {plan.frequency_per_week}x/week
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-3 py-1 rounded-full ${
                                plan.difficulty_level === 'beginner'
                                  ? 'bg-green-100 text-green-800'
                                  : plan.difficulty_level === 'intermediate'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {plan.difficulty_level}
                            </span>
                            <button
                              onClick={() => deleteWorkoutPlan(plan.id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete workout plan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Weekly Grid Format */}
                        {plan.weekly_structure && (
                          <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                              {/* Week Headers */}
                              <div className="grid grid-cols-8 gap-2 mb-4">
                                <div className="text-center font-semibold text-gray-700 py-2"></div>
                                {['WEEK 1', 'WEEK 2', 'WEEK 3', 'WEEK 4'].map((week, index) => (
                                  <div
                                    key={week}
                                    className="text-center font-bold text-white bg-green-600 py-2 rounded-lg"
                                  >
                                    {week}
                                  </div>
                                ))}
                              </div>

                              {/* Days of Week */}
                              {[
                                'sunday',
                                'monday',
                                'tuesday',
                                'wednesday',
                                'thursday',
                                'friday',
                                'saturday',
                              ].map((day) => (
                                <div key={day} className="grid grid-cols-8 gap-2 mb-2">
                                  {/* Day Label */}
                                  <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-center">
                                    <span className="font-semibold text-gray-800 uppercase text-sm">
                                      {day.substring(0, 3)}
                                    </span>
                                  </div>

                                  {/* Week 1 & 3 (Same content) */}
                                  <div className="bg-blue-50 p-3 rounded-lg min-h-[120px]">
                                    {plan.weekly_structure?.[day]?.exercises &&
                                    plan.weekly_structure?.[day]?.exercises.length > 0 ? (
                                      <div className="space-y-1">
                                        {plan.weekly_structure?.[day]?.exercises.map(
                                          (exercise: any, index: number) => (
                                            <div
                                              key={index}
                                              className="text-xs bg-white p-2 rounded border cursor-pointer hover:bg-blue-100 transition-colors"
                                              onClick={() =>
                                                handleExerciseClick(exercise.exercise_name)
                                              }
                                            >
                                              <div className="font-medium text-gray-800">
                                                {exercise.exercise_name}
                                              </div>
                                              <div className="text-gray-600">
                                                {exercise.sets} sets × {exercise.reps} reps
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 italic text-center pt-4">
                                        {day === 'sunday'
                                          ? 'Rest Time'
                                          : day === 'saturday'
                                            ? '30-45 Min. Cardio of choice'
                                            : 'No exercises'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Week 2 & 4 (Same content) */}
                                  <div className="bg-green-50 p-3 rounded-lg min-h-[120px]">
                                    {plan.weekly_structure?.[day]?.exercises &&
                                    plan.weekly_structure?.[day]?.exercises.length > 0 ? (
                                      <div className="space-y-1">
                                        {plan.weekly_structure?.[day]?.exercises.map(
                                          (exercise: any, index: number) => (
                                            <div
                                              key={index}
                                              className="text-xs bg-white p-2 rounded border cursor-pointer hover:bg-green-100 transition-colors"
                                              onClick={() =>
                                                handleExerciseClick(exercise.exercise_name)
                                              }
                                            >
                                              <div className="font-medium text-gray-800">
                                                {exercise.exercise_name}
                                              </div>
                                              <div className="text-gray-600">
                                                {exercise.sets} sets × {exercise.reps} reps
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 italic text-center pt-4">
                                        {day === 'sunday'
                                          ? 'Rest Time'
                                          : day === 'saturday'
                                            ? '30-45 Min. Cardio of choice'
                                            : 'No exercises'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Week 3 (Same as Week 1) */}
                                  <div className="bg-blue-50 p-3 rounded-lg min-h-[120px]">
                                    {plan.weekly_structure?.[day]?.exercises &&
                                    plan.weekly_structure?.[day]?.exercises.length > 0 ? (
                                      <div className="space-y-1">
                                        {plan.weekly_structure?.[day]?.exercises.map(
                                          (exercise: any, index: number) => (
                                            <div
                                              key={index}
                                              className="text-xs bg-white p-2 rounded border cursor-pointer hover:bg-blue-100 transition-colors"
                                              onClick={() =>
                                                handleExerciseClick(exercise.exercise_name)
                                              }
                                            >
                                              <div className="font-medium text-gray-800">
                                                {exercise.exercise_name}
                                              </div>
                                              <div className="text-gray-600">
                                                {exercise.sets} sets × {exercise.reps} reps
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 italic text-center pt-4">
                                        {day === 'sunday'
                                          ? 'Rest Time'
                                          : day === 'saturday'
                                            ? '30-45 Min. Cardio of choice'
                                            : 'No exercises'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Week 4 (Same as Week 2) */}
                                  <div className="bg-green-50 p-3 rounded-lg min-h-[120px]">
                                    {plan.weekly_structure?.[day]?.exercises &&
                                    plan.weekly_structure?.[day]?.exercises.length > 0 ? (
                                      <div className="space-y-1">
                                        {plan.weekly_structure?.[day]?.exercises.map(
                                          (exercise: any, index: number) => (
                                            <div
                                              key={index}
                                              className="text-xs bg-white p-2 rounded border cursor-pointer hover:bg-green-100 transition-colors"
                                              onClick={() =>
                                                handleExerciseClick(exercise.exercise_name)
                                              }
                                            >
                                              <div className="font-medium text-gray-800">
                                                {exercise.exercise_name}
                                              </div>
                                              <div className="text-gray-600">
                                                {exercise.sets} sets × {exercise.reps} reps
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 italic text-center pt-4">
                                        {day === 'sunday'
                                          ? 'Rest Time'
                                          : day === 'saturday'
                                            ? '30-45 Min. Cardio of choice'
                                            : 'No exercises'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                            onChange={(e) => setSelectedDietType(e.target.value)}
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
                    Generate AI Nutrition Plan
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
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{plan.plan_name}</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                            {plan.plan_type.replace('_', ' ')}
                          </span>
                        </div>
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
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Progress tracking coming soon
                  </h4>
                  <p className="text-gray-600">
                    Track your fitness progress with charts and analytics
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Areas</label>
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
              <h3 className="text-lg font-semibold">Set Fitness Goal</h3>
              <button
                onClick={() => setShowGoalForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
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
                      <input type="checkbox" name="target_areas" value={area} className="mr-2" />
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
                    defaultValue={12}
                    min={1}
                    max={52}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    name="priority_level"
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
                  onClick={() => setShowGoalForm(false)}
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
                  Create Goal
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Fitness Stat</h3>
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
                  Update Stat
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

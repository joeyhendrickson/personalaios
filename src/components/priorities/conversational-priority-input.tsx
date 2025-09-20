'use client'

import { useState } from 'react'
import { Brain, X, Zap, Clock, Target } from 'lucide-react'

interface ConversationalPriorityInputProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ConversationalPriorityInput({
  onClose,
  onSuccess,
}: ConversationalPriorityInputProps) {
  const [formData, setFormData] = useState({
    daily_intention: '',
    energy_level: 'medium' as 'high' | 'medium' | 'low',
    time_available: 'full_day' as 'full_day' | 'half_day' | 'few_hours',
    focus_area: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.daily_intention.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/ai/recommend-priorities-conversational', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daily_intention: formData.daily_intention.trim(),
          energy_level: formData.energy_level,
          time_available: formData.time_available,
          focus_area: formData.focus_area.trim() || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('AI priorities generated:', data.message)
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        console.error('Error generating AI priorities:', errorData)
        const errorMessage = errorData.details || errorData.error || 'Unknown error'
        alert(`Failed to generate AI priorities: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error generating AI priorities:', error)
      alert(
        `Failed to generate AI priorities: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickIntentionExamples = [
    'I want to focus on saving money today',
    'I need a rest day focused on health',
    'I want to make progress on my business goals',
    'I need to catch up on organization tasks',
    'I want to focus on learning and personal development',
    'I need to tackle urgent work projects',
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-500" />
            <h2 className="text-lg font-semibold">AI Priority Advisor</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label
              htmlFor="daily_intention"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              What do you want to focus on today? *
            </label>
            <textarea
              id="daily_intention"
              value={formData.daily_intention}
              onChange={(e) => setFormData({ ...formData, daily_intention: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., I want to focus on saving money and reducing expenses today"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about what you want to accomplish or focus on today
            </p>
          </div>

          {/* Quick Examples */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick examples:</p>
            <div className="grid grid-cols-1 gap-2">
              {quickIntentionExamples.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFormData({ ...formData, daily_intention: example })}
                  className="text-left p-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
                >
                  &ldquo;{example}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="energy_level"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Zap className="h-4 w-4 inline mr-1" />
                Energy Level
              </label>
              <select
                id="energy_level"
                value={formData.energy_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    energy_level: e.target.value as 'high' | 'medium' | 'low',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="high">High - Ready for challenging tasks</option>
                <option value="medium">Medium - Good for moderate tasks</option>
                <option value="low">Low - Need lighter, easier tasks</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="time_available"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Clock className="h-4 w-4 inline mr-1" />
                Time Available
              </label>
              <select
                id="time_available"
                value={formData.time_available}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time_available: e.target.value as 'full_day' | 'half_day' | 'few_hours',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="full_day">Full Day - 6+ hours available</option>
                <option value="half_day">Half Day - 3-6 hours available</option>
                <option value="few_hours">Few Hours - 1-3 hours available</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="focus_area" className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="h-4 w-4 inline mr-1" />
              Specific Focus Area (Optional)
            </label>
            <input
              type="text"
              id="focus_area"
              value={formData.focus_area}
              onChange={(e) => setFormData({ ...formData, focus_area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., financial planning, health routines, business development"
            />
            <p className="text-xs text-gray-500 mt-1">
              Any specific area you want to emphasize (optional)
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.daily_intention.trim()}
              className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Priorities
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

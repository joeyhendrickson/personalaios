'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  Plus,
  Trash2,
  Save,
  Flame,
  Trophy,
  Calendar,
  Star,
  Sparkles,
  CheckCircle,
  Sun,
  Moon,
  Smile,
  Meh,
  Frown,
} from 'lucide-react'

interface GratitudeEntry {
  id: string
  entry_date: string
  gratitude_items: string[]
  reflection: string | null
  mood_rating: number | null
  challenge_completed: boolean
  points_awarded: number
  created_at: string
}

const MOOD_OPTIONS = [
  { value: 1, icon: Frown, label: 'Rough day', color: 'text-red-500' },
  { value: 2, icon: Meh, label: 'Below average', color: 'text-orange-500' },
  { value: 3, icon: Smile, label: 'Okay', color: 'text-yellow-500' },
  { value: 4, icon: Smile, label: 'Good', color: 'text-lime-500' },
  { value: 5, icon: Star, label: 'Amazing', color: 'text-green-500' },
]

export default function GratitudeJournalModule() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([])
  const [streak, setStreak] = useState(0)
  const [todayCompleted, setTodayCompleted] = useState(false)
  const [todaysEntry, setTodaysEntry] = useState<GratitudeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [items, setItems] = useState<string[]>(['', '', ''])
  const [reflection, setReflection] = useState('')
  const [moodRating, setMoodRating] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/gratitude-journal?limit=30')
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setStreak(data.streak || 0)
        setTodayCompleted(data.todayCompleted || false)
        setTodaysEntry(data.todaysEntry || null)

        if (data.todaysEntry) {
          const existing = data.todaysEntry
          const existingItems = existing.gratitude_items || []
          setItems([
            existingItems[0] || '',
            existingItems[1] || '',
            existingItems[2] || '',
            ...existingItems.slice(3),
          ])
          setReflection(existing.reflection || '')
          setMoodRating(existing.mood_rating || null)
        }
      }
    } catch (error) {
      console.error('Error fetching gratitude entries:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleSave = async () => {
    const filledItems = items.filter((item) => item.trim() !== '')
    if (filledItems.length === 0) return

    setSaving(true)
    try {
      const response = await fetch('/api/gratitude-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gratitude_items: filledItems,
          reflection: reflection.trim() || null,
          mood_rating: moodRating,
        }),
      })

      if (response.ok) {
        await fetchEntries()
      }
    } catch (error) {
      console.error('Error saving gratitude entry:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/gratitude-journal?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchEntries()
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const addItem = () => {
    setItems([...items, ''])
  }

  const updateItem = (index: number, value: string) => {
    const updated = [...items]
    updated[index] = value
    setItems(updated)
  }

  const removeItem = (index: number) => {
    if (items.length <= 3) return
    setItems(items.filter((_, i) => i !== index))
  }

  const filledCount = items.filter((i) => i.trim() !== '').length
  const challengeMet = filledCount >= 3
  const isEvening = new Date().getHours() >= 17

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading gratitude journal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Life Hacks
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Heart className="h-8 w-8 text-amber-500" />
                  Gratitude Journal
                </h1>
                <p className="text-sm text-gray-600">
                  Write 3 things you&apos;re thankful for every night
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <Flame className="h-7 w-7 text-orange-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{streak}</p>
            <p className="text-sm text-gray-500">Day Streak</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <Trophy className="h-7 w-7 text-amber-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {entries.filter((e) => e.challenge_completed).length}
            </p>
            <p className="text-sm text-gray-500">Challenges Done</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <Calendar className="h-7 w-7 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{entries.length}</p>
            <p className="text-sm text-gray-500">Total Entries</p>
          </div>
        </div>

        {/* Nightly Challenge Banner */}
        {!todayCompleted && (
          <div
            className={`rounded-xl p-6 mb-8 border-2 ${
              isEvening
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
                : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isEvening ? (
                <Moon className="h-6 w-6 text-indigo-600" />
              ) : (
                <Sun className="h-6 w-6 text-amber-600" />
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {isEvening ? 'Nightly Challenge' : "Tonight's Challenge"}
              </h2>
              <span className="ml-auto text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                +50 points
              </span>
            </div>
            <p className="text-gray-600">
              {isEvening
                ? 'Before bed, write at least 3 things you are thankful for today.'
                : "Come back tonight and write 3 things you're thankful for to earn 50 points!"}
            </p>
          </div>
        )}

        {todayCompleted && (
          <div className="rounded-xl p-6 mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-green-800">Challenge Complete!</h2>
                <p className="text-green-700 text-sm">
                  You wrote {todaysEntry?.gratitude_items?.length || 3} things you&apos;re thankful
                  for today. Keep the streak going tomorrow!
                </p>
              </div>
              <Sparkles className="h-6 w-6 text-green-500 ml-auto" />
            </div>
          </div>
        )}

        {/* Journal Entry Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {todaysEntry ? "Today's Entry" : 'New Entry'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          {/* Gratitude Items */}
          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              I am thankful for...
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  challengeMet ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {filledCount}/3 {challengeMet ? 'Challenge met!' : 'for challenge'}
              </span>
            </label>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-amber-500 font-bold text-lg w-6 text-center">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  placeholder={
                    index === 0
                      ? 'e.g. My health and energy today'
                      : index === 1
                        ? 'e.g. A supportive conversation with a friend'
                        : index === 2
                          ? 'e.g. Progress on my project goals'
                          : 'Something else you appreciate...'
                  }
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                {items.length > 3 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium mt-1"
            >
              <Plus className="h-4 w-4" />
              Add another
            </button>
          </div>

          {/* Mood Rating */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 block mb-3">
              How was your day?
            </label>
            <div className="flex items-center gap-3">
              {MOOD_OPTIONS.map((mood) => {
                const Icon = mood.icon
                return (
                  <button
                    key={mood.value}
                    onClick={() => setMoodRating(moodRating === mood.value ? null : mood.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      moodRating === mood.value
                        ? 'border-amber-400 bg-amber-50 scale-105'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${moodRating === mood.value ? mood.color : 'text-gray-400'}`}
                    />
                    <span className="text-xs text-gray-600">{mood.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reflection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Reflection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="Any thoughts about your day or what these gratitudes mean to you..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-all"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || filledCount === 0}
            className="w-full bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {todaysEntry ? 'Update Entry' : 'Save Entry'}
                {challengeMet && !todayCompleted && ' & Complete Challenge'}
              </>
            )}
          </button>
        </div>

        {/* History Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {showHistory ? 'Hide' : 'Show'} Past Entries ({entries.length})
          </button>
        </div>

        {/* Past Entries */}
        {showHistory && (
          <div className="space-y-4">
            {entries
              .filter((e) => e.entry_date !== new Date().toISOString().split('T')[0])
              .map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {entry.challenge_completed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Challenge Done
                        </span>
                      )}
                      {entry.mood_rating && (
                        <span className="text-xs text-gray-500">
                          Mood: {MOOD_OPTIONS.find((m) => m.value === entry.mood_rating)?.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="space-y-1.5">
                    {(entry.gratitude_items || []).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <Heart className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {entry.reflection && (
                    <p className="mt-3 text-sm text-gray-500 italic border-t border-gray-100 pt-3">
                      {entry.reflection}
                    </p>
                  )}
                  {entry.points_awarded > 0 && (
                    <p className="mt-2 text-xs text-amber-600 font-medium">
                      +{entry.points_awarded} points earned
                    </p>
                  )}
                </div>
              ))}

            {entries.filter((e) => e.entry_date !== new Date().toISOString().split('T')[0])
              .length === 0 && (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  No past entries yet. Start your gratitude journey today!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import {
  Plus,
  CheckCircle,
  Trash2,
  Edit,
  GraduationCap,
  DollarSign,
  Calendar,
  Star,
} from 'lucide-react'

interface EducationItem {
  id: string
  title: string
  description?: string
  points_value: number
  cost?: number
  status: 'pending' | 'in_progress' | 'completed'
  priority_level: number
  target_date?: string
  is_active: boolean
  is_completed: boolean
  completed_at?: string
  completion_notes?: string
  created_at: string
}

interface EducationFormData {
  title: string
  description: string
  points_value: number
  cost: number
  priority_level: number
  target_date: string
}

export default function EducationSection() {
  const { t } = useLanguage()
  const [educationItems, setEducationItems] = useState<EducationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<EducationItem | null>(null)
  const [formData, setFormData] = useState<EducationFormData>({
    title: '',
    description: '',
    points_value: 100,
    cost: 0,
    priority_level: 3,
    target_date: '',
  })
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    fetchEducationItems()
  }, [])

  const fetchEducationItems = async () => {
    try {
      console.log('Fetching education items...')
      const response = await fetch('/api/education')
      console.log('Education response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Education data received:', data)
        setEducationItems(data.educationItems || [])
      } else {
        const errorData = await response.json()
        console.error('Error fetching education items:', errorData)
      }
    } catch (error) {
      console.error('Error fetching education items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      const url = editingItem ? `/api/education/${editingItem.id}` : '/api/education'
      const method = editingItem ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost || undefined,
          target_date: formData.target_date || undefined,
        }),
      })

      if (response.ok) {
        await fetchEducationItems()
        setShowAddForm(false)
        setEditingItem(null)
        setFormData({
          title: '',
          description: '',
          points_value: 100,
          cost: 0,
          priority_level: 3,
          target_date: '',
        })
      } else {
        const errorData = await response.json()
        console.error('Error saving education item:', errorData)
        alert('Failed to save education item. Please try again.')
      }
    } catch (error) {
      console.error('Error saving education item:', error)
      alert('Failed to save education item. Please try again.')
    }
  }

  const handleComplete = async (itemId: string, notes?: string) => {
    try {
      const response = await fetch(`/api/education/${itemId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(data.message)
        await fetchEducationItems() // Refresh to show updated status
      } else {
        const errorData = await response.json()
        if (errorData.error === 'Education item is already completed') {
          alert('This education item is already completed!')
        } else {
          console.error('Error completing education item:', errorData)
          alert('Failed to complete education item. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error completing education item:', error)
      alert('Failed to complete education item. Please try again.')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this education item?')) return

    try {
      const response = await fetch(`/api/education/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchEducationItems()
      } else {
        console.error('Failed to delete education item')
        alert('Failed to delete education item. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting education item:', error)
      alert('Failed to delete education item. Please try again.')
    }
  }

  const handleEdit = (item: EducationItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      points_value: item.points_value,
      cost: item.cost || 0,
      priority_level: item.priority_level,
      target_date: item.target_date || '',
    })
    setShowAddForm(true)
  }

  const handleImportDefaultEducation = async () => {
    setIsImporting(true)
    try {
      const response = await fetch('/api/education/import-default', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        console.log(data.message)
        await fetchEducationItems() // Refresh the education items list
        alert(`Successfully imported ${data.educationItems?.length || 0} default education items!`)
      } else {
        const errorData = await response.json()
        if (errorData.message?.includes('already has education items')) {
          alert('You already have education items imported. No duplicates were created.')
        } else {
          console.error('Error importing education items:', errorData)
          const errorMessage = errorData.details || errorData.error || 'Unknown error'
          alert(`Failed to import default education items: ${errorMessage}`)
        }
      }
    } catch (error) {
      console.error('Error importing education items:', error)
      alert('Failed to import default education items. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'text-red-600 bg-red-100'
      case 2:
        return 'text-orange-600 bg-orange-100'
      case 3:
        return 'text-yellow-600 bg-yellow-100'
      case 4:
        return 'text-blue-600 bg-blue-100'
      case 5:
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-50 border-green-200'
    if (status === 'in_progress') return 'bg-blue-50 border-blue-200'
    return 'bg-white border-gray-200 hover:border-blue-200'
  }

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">{t('education.description')}</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null)
              setFormData({
                title: '',
                description: '',
                points_value: 100,
                cost: 0,
                priority_level: 3,
                target_date: '',
              })
              setShowAddForm(true)
            }}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-10 px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            {t('common.add')} {t('common.item')}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-medium mb-3">
              {editingItem ? 'Edit Education Item' : 'Add New Education Item'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Education item title (e.g., AWS Certification)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.points_value}
                    onChange={(e) =>
                      setFormData({ ...formData, points_value: parseInt(e.target.value) || 100 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority_level}
                    onChange={(e) =>
                      setFormData({ ...formData, priority_level: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 - Critical</option>
                    <option value={2}>2 - High</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Low</option>
                    <option value={5}>5 - Very Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingItem(null)
                    setFormData({
                      title: '',
                      description: '',
                      points_value: 100,
                      cost: 0,
                      priority_level: 3,
                      target_date: '',
                    })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {educationItems.length === 0 ? (
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('empty.noEducation')}</h3>
            <button
              onClick={handleImportDefaultEducation}
              disabled={isImporting}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : t('empty.importDefaultEducation')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {educationItems.map((item) => {
              return (
                <div
                  key={item.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${getStatusColor(item.status, item.is_completed)}`}
                >
                  <button
                    onClick={() => handleComplete(item.id)}
                    disabled={item.is_completed}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.is_completed
                        ? 'bg-green-500 border-green-500 cursor-not-allowed'
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                    title={item.is_completed ? 'Completed' : 'Mark as completed'}
                  >
                    {item.is_completed && <CheckCircle className="h-4 w-4 text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4
                        className={`font-medium ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                      >
                        {item.title}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority_level)}`}
                      >
                        P{item.priority_level}
                      </span>
                      <span className="text-sm text-gray-500">+{item.points_value} pts</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {item.cost && item.cost > 0 && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>${item.cost}</span>
                        </div>
                      )}
                      {item.target_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {new Date(item.target_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.is_completed && (
                        <span className="text-green-600 font-medium">✓ Completed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit item"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

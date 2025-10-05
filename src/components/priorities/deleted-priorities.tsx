'use client'

import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, Clock, AlertTriangle } from 'lucide-react'

interface DeletedPriority {
  id: string
  title: string
  description?: string
  priority_type: string
  priority_score: number
  deleted_at: string
  created_at: string
}

interface DeletedPrioritiesProps {
  isOpen: boolean
  onClose: () => void
}

export function DeletedPriorities({ isOpen, onClose }: DeletedPrioritiesProps) {
  const [deletedPriorities, setDeletedPriorities] = useState<DeletedPriority[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [permanentlyDeleting, setPermanentlyDeleting] = useState<string | null>(null)

  const fetchDeletedPriorities = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/priorities/deleted')
      if (response.ok) {
        const data = await response.json()
        setDeletedPriorities(data.deletedPriorities || [])
      } else {
        console.error('Failed to fetch deleted priorities')
      }
    } catch (error) {
      console.error('Error fetching deleted priorities:', error)
    } finally {
      setLoading(false)
    }
  }

  const restorePriority = async (priorityId: string) => {
    setRestoring(priorityId)
    try {
      const response = await fetch(`/api/priorities/${priorityId}/restore`, {
        method: 'POST',
      })

      if (response.ok) {
        // Remove from deleted list
        setDeletedPriorities((prev) => prev.filter((p) => p.id !== priorityId))
        alert('Priority restored successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to restore priority: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error restoring priority:', error)
      alert('Error restoring priority')
    } finally {
      setRestoring(null)
    }
  }

  const permanentlyDeletePriority = async (priorityId: string) => {
    if (
      !confirm(
        'Are you sure you want to permanently delete this priority? This action cannot be undone.'
      )
    ) {
      return
    }

    setPermanentlyDeleting(priorityId)
    try {
      const response = await fetch(`/api/priorities/${priorityId}/permanent`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from deleted list
        setDeletedPriorities((prev) => prev.filter((p) => p.id !== priorityId))
        alert('Priority permanently deleted!')
      } else {
        const errorData = await response.json()
        alert(`Failed to permanently delete priority: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error permanently deleting priority:', error)
      alert('Error permanently deleting priority')
    } finally {
      setPermanentlyDeleting(null)
    }
  }

  const cleanupOldPriorities = async () => {
    if (
      !confirm(
        'This will permanently delete all priorities that have been in trash for 24+ hours. Continue?'
      )
    ) {
      return
    }

    try {
      const response = await fetch('/api/priorities/cleanup', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Cleanup complete: ${data.deletedCount} old priorities permanently deleted`)
        fetchDeletedPriorities() // Refresh the list
      } else {
        const errorData = await response.json()
        alert(`Failed to cleanup old priorities: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error cleaning up old priorities:', error)
      alert('Error cleaning up old priorities')
    }
  }

  const getTimeUntilPermanentDeletion = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const twentyFourHours = 24 * 60 * 60 * 1000
    const timeLeft = twentyFourHours - (Date.now() - deleted.getTime())

    if (timeLeft <= 0) {
      return 'Ready for permanent deletion'
    }

    const hours = Math.floor(timeLeft / (60 * 60 * 1000))
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))

    if (hours > 0) {
      return `${hours}h ${minutes}m until permanent deletion`
    } else {
      return `${minutes}m until permanent deletion`
    }
  }

  const isOldEnoughForPermanentDeletion = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const twentyFourHours = 24 * 60 * 60 * 1000
    return Date.now() - deleted.getTime() >= twentyFourHours
  }

  useEffect(() => {
    if (isOpen) {
      fetchDeletedPriorities()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-500" />
            Deleted Priorities
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={cleanupOldPriorities}
              className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
            >
              Cleanup Old Items
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading deleted priorities...</p>
            </div>
          ) : deletedPriorities.length === 0 ? (
            <div className="text-center py-8">
              <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No deleted priorities found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedPriorities.map((priority) => (
                <div
                  key={priority.id}
                  className={`p-4 border rounded-lg ${
                    isOldEnoughForPermanentDeletion(priority.deleted_at)
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900 line-through">{priority.title}</h3>
                        {isOldEnoughForPermanentDeletion(priority.deleted_at) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Ready for deletion
                          </span>
                        )}
                      </div>
                      {priority.description && (
                        <p className="text-sm text-gray-600 line-through mb-2">
                          {priority.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Priority Score: {priority.priority_score}</span>
                        <span>Type: {priority.priority_type}</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Deleted: {new Date(priority.deleted_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`text-xs ${
                            isOldEnoughForPermanentDeletion(priority.deleted_at)
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}
                        >
                          {getTimeUntilPermanentDeletion(priority.deleted_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => restorePriority(priority.id)}
                        disabled={restoring === priority.id}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {restoring === priority.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => permanentlyDeletePriority(priority.id)}
                        disabled={permanentlyDeleting === priority.id}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {permanentlyDeleting === priority.id ? 'Deleting...' : 'Delete Forever'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Deleted priorities are automatically permanently deleted after 24
            hours. Use "Cleanup Old Items" to manually remove items that are ready for permanent
            deletion.
          </p>
        </div>
      </div>
    </div>
  )
}

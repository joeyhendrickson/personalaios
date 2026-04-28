'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Camera,
  Calendar,
  Star,
  Clock,
  MapPin,
  Search,
  Filter,
  Eye,
  EyeOff,
  Send,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Brain,
  Target,
  Heart,
  Briefcase,
  Home,
  GraduationCap,
  Coffee,
  Gift,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  TrendingUp,
  Activity,
  X,
} from 'lucide-react'

interface Relationship {
  id: string
  name: string
  email?: string
  phone?: string
  relationship_type: string
  last_contact_date?: string
  contact_frequency_days: number
  notes?: string
  priority_level: number
  is_active: boolean
  created_at: string
  updated_at: string
  photos_count?: number
  recent_photos?: Photo[]
  days_since_last_contact?: number
  needs_contact?: boolean
}

interface Photo {
  id: string
  google_photo_id?: string | null
  photo_url?: string | null
  thumbnail_url?: string
  photo_date?: string
  location?: string
  description?: string
  people_in_photo?: string[]
  ai_tags?: string[]
  relevance_score: number
  source?: string
  storage_path?: string | null
  signed_url?: string | null
  display_url?: string | null
}

interface ContactHistory {
  id: string
  contact_type: string
  contact_method?: string
  message_content?: string
  was_initiated_by_me: boolean
  duration_minutes?: number
  outcome?: string
  next_follow_up_date?: string
  created_at: string
}

const relationshipTypes = [
  {
    value: 'family',
    label: 'Family',
    icon: <Heart className="h-4 w-4" />,
    color: 'text-red-600 bg-red-50',
  },
  {
    value: 'friend',
    label: 'Friend',
    icon: <Users className="h-4 w-4" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    value: 'colleague',
    label: 'Colleague',
    icon: <Briefcase className="h-4 w-4" />,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    value: 'business',
    label: 'Business',
    icon: <Target className="h-4 w-4" />,
    color: 'text-green-600 bg-green-50',
  },
  {
    value: 'mentor',
    label: 'Mentor',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    value: 'acquaintance',
    label: 'Acquaintance',
    icon: <Coffee className="h-4 w-4" />,
    color: 'text-yellow-600 bg-yellow-50',
  },
]

const priorityColors = {
  1: 'text-red-600 bg-red-100',
  2: 'text-orange-600 bg-orange-100',
  3: 'text-yellow-600 bg-yellow-100',
  4: 'text-blue-600 bg-blue-100',
  5: 'text-green-600 bg-green-100',
}

export default function RelationshipManagerPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [showNeedsContactOnly, setShowNeedsContactOnly] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [messageContext, setMessageContext] = useState<
    'casual_check_in' | 'birthday' | 'holiday' | 'follow_up' | 'thank_you'
  >('casual_check_in')
  const [generatingMessage, setGeneratingMessage] = useState(false)
  const [relationshipPhotos, setRelationshipPhotos] = useState<Photo[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form state for new relationship
  const [newRelationship, setNewRelationship] = useState({
    name: '',
    email: '',
    phone: '',
    relationship_type: 'friend',
    contact_frequency_days: 30,
    notes: '',
    priority_level: 3,
  })

  useEffect(() => {
    fetchRelationships()
  }, [])

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/relationship-manager/relationships')
      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships || [])
      }
    } catch (error) {
      console.error('Error fetching relationships:', error)
    } finally {
      setLoading(false)
    }
  }

  const addRelationship = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/relationship-manager/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRelationship),
      })

      if (response.ok) {
        await fetchRelationships()
        setShowAddModal(false)
        setNewRelationship({
          name: '',
          email: '',
          phone: '',
          relationship_type: 'friend',
          contact_frequency_days: 30,
          notes: '',
          priority_level: 3,
        })
      }
    } catch (error) {
      console.error('Error adding relationship:', error)
    }
  }

  const generateMessage = async () => {
    if (!selectedRelationship) return

    setGeneratingMessage(true)
    try {
      const response = await fetch('/api/relationship-manager/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId: selectedRelationship.id,
          context: messageContext,
          mode: 'single',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessageContent(data.message ?? '')
      }
    } catch (error) {
      console.error('Error generating message:', error)
    } finally {
      setGeneratingMessage(false)
    }
  }

  const generateMessageFramework = async () => {
    if (!selectedRelationship) return
    setGeneratingMessage(true)
    try {
      const response = await fetch('/api/relationship-manager/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId: selectedRelationship.id,
          mode: 'framework',
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setMessageContent(JSON.stringify(data.framework ?? data, null, 2))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingMessage(false)
    }
  }

  const fetchRelationshipPhotos = async (relationshipId: string) => {
    try {
      const response = await fetch(
        `/api/relationship-manager/photos?relationshipId=${relationshipId}`
      )
      if (response.ok) {
        const data = await response.json()
        setRelationshipPhotos(data.photos || [])
      }
    } catch (error) {
      console.error('Error fetching relationship photos:', error)
    }
  }

  const uploadRelationshipPhoto = async (file: File) => {
    if (!selectedRelationship) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `/api/relationship-manager/relationships/${selectedRelationship.id}/photos`,
        { method: 'POST', body: fd }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Upload failed')
        return
      }
      await fetchRelationshipPhotos(selectedRelationship.id)
      await fetchRelationships()
    } catch (e) {
      console.error(e)
      alert('Upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const getDaysSinceLastContact = (lastContactDate?: string) => {
    if (!lastContactDate) return null
    const lastContact = new Date(lastContactDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastContact.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getNeedsContactStatus = (relationship: Relationship) => {
    const daysSince = getDaysSinceLastContact(relationship.last_contact_date)
    return daysSince === null || daysSince >= relationship.contact_frequency_days
  }

  const filteredRelationships = relationships.filter((rel) => {
    const matchesSearch =
      rel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rel.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || rel.relationship_type === filterType
    const matchesPriority =
      filterPriority === 'all' || rel.priority_level.toString() === filterPriority
    const matchesNeedsContact = !showNeedsContactOnly || getNeedsContactStatus(rel)

    return matchesSearch && matchesType && matchesPriority && matchesNeedsContact
  })

  const getRelationshipTypeInfo = (type: string) => {
    return relationshipTypes.find((rt) => rt.value === type) || relationshipTypes[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading relationships...</p>
        </div>
      </div>
    )
  }

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
                  Back to Life Hacks
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Users className="h-8 w-8 mr-3 text-blue-600" />
                  Relationship Manager
                </h1>
                <p className="text-sm text-gray-600">
                  Manage your relationships and stay connected with the people who are close to you
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search relationships..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Relationship Type Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {relationshipTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="1">Priority 1 (High)</option>
                <option value="2">Priority 2</option>
                <option value="3">Priority 3 (Medium)</option>
                <option value="4">Priority 4</option>
                <option value="5">Priority 5 (Low)</option>
              </select>
            </div>

            {/* Needs Contact Filter */}
            <button
              onClick={() => setShowNeedsContactOnly(!showNeedsContactOnly)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showNeedsContactOnly
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showNeedsContactOnly ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Needs Contact
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Relationships</p>
                <p className="text-2xl font-bold text-gray-900">{relationships.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Need Contact</p>
                <p className="text-2xl font-bold text-orange-600">
                  {relationships.filter(getNeedsContactStatus).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Context photos</p>
                <p className="text-2xl font-bold text-green-600">
                  {relationships.reduce((n, r) => n + (r.photos_count || 0), 0)}
                </p>
              </div>
              <Camera className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Contacts</p>
                <p className="text-2xl font-bold text-purple-600">
                  {
                    relationships.filter((rel) => {
                      const days = getDaysSinceLastContact(rel.last_contact_date)
                      return days !== null && days <= 7
                    }).length
                  }
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Relationships Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRelationships.map((relationship) => {
            const typeInfo = getRelationshipTypeInfo(relationship.relationship_type)
            const daysSince = getDaysSinceLastContact(relationship.last_contact_date)
            const needsContact = getNeedsContactStatus(relationship)

            return (
              <div
                key={relationship.id}
                className={`bg-white rounded-lg border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
                  needsContact ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedRelationship(relationship)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {relationship.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{relationship.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}
                        >
                          {typeInfo.icon}
                          <span className="ml-1">{typeInfo.label}</span>
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[relationship.priority_level as keyof typeof priorityColors]}`}
                        >
                          P{relationship.priority_level}
                        </span>
                      </div>
                    </div>
                  </div>
                  {needsContact && <AlertCircle className="h-5 w-5 text-orange-500" />}
                </div>

                <div className="space-y-2 mb-4">
                  {relationship.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {relationship.email}
                    </div>
                  )}
                  {relationship.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {relationship.phone}
                    </div>
                  )}
                  {daysSince !== null && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {daysSince === 0 ? 'Contacted today' : `Last contact: ${daysSince} days ago`}
                    </div>
                  )}
                  {relationship.photos_count && relationship.photos_count > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {relationship.photos_count} photos
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/modules/relationship-manager/${relationship.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-[100px] text-center bg-slate-700 text-white px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRelationship(relationship)
                      setShowMessageModal(true)
                    }}
                    className="flex-1 min-w-[100px] bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Message
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRelationship(relationship)
                      fetchRelationshipPhotos(relationship.id)
                      setShowPhotosModal(true)
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredRelationships.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No relationships found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ||
              filterType !== 'all' ||
              filterPriority !== 'all' ||
              showNeedsContactOnly
                ? 'Try adjusting your search or filter criteria'
                : 'Start building your relationship network by adding people you care about'}
            </p>
            {!searchTerm &&
              filterType === 'all' &&
              filterPriority === 'all' &&
              !showNeedsContactOnly && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Your First Relationship
                </button>
              )}
          </div>
        )}
      </div>

      {/* Add Relationship Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Relationship</h2>
            <form onSubmit={addRelationship} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newRelationship.name}
                  onChange={(e) => setNewRelationship({ ...newRelationship, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newRelationship.email}
                  onChange={(e) =>
                    setNewRelationship({ ...newRelationship, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newRelationship.phone}
                  onChange={(e) =>
                    setNewRelationship({ ...newRelationship, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type
                </label>
                <select
                  value={newRelationship.relationship_type}
                  onChange={(e) =>
                    setNewRelationship({ ...newRelationship, relationship_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {relationshipTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Frequency (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newRelationship.contact_frequency_days}
                  onChange={(e) =>
                    setNewRelationship({
                      ...newRelationship,
                      contact_frequency_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level
                </label>
                <select
                  value={newRelationship.priority_level}
                  onChange={(e) =>
                    setNewRelationship({
                      ...newRelationship,
                      priority_level: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">Priority 1 (High)</option>
                  <option value="2">Priority 2</option>
                  <option value="3">Priority 3 (Medium)</option>
                  <option value="4">Priority 4</option>
                  <option value="5">Priority 5 (Low)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newRelationship.notes}
                  onChange={(e) =>
                    setNewRelationship({ ...newRelationship, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Relationship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Generator Modal */}
      {showMessageModal && selectedRelationship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Message for {selectedRelationship.name}</h2>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateMessage}
                  disabled={generatingMessage}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {generatingMessage ? 'Generating...' : 'One message'}
                </button>
                <button
                  onClick={generateMessageFramework}
                  disabled={generatingMessage}
                  type="button"
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Framework pack
                </button>
                <select
                  value={messageContext}
                  onChange={(e) => setMessageContext(e.target.value as typeof messageContext)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="casual_check_in">Casual Check-in</option>
                  <option value="birthday">Birthday Wishes</option>
                  <option value="holiday">Holiday Greeting</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="thank_you">Thank You</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={6}
                  placeholder="Your message will appear here after generation, or you can write your own..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <Send className="h-4 w-4 inline mr-2" />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photos Modal */}
      {showPhotosModal && selectedRelationship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Photos with {selectedRelationship.name}</h2>
              <button
                onClick={() => setShowPhotosModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadRelationshipPhoto(f)
                    e.target.value = ''
                  }}
                />
                {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
              </label>
              <p className="text-sm text-gray-500">
                Photos are stored privately and summarized for relationship context.
              </p>
            </div>

            {relationshipPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relationshipPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={
                        photo.display_url ||
                        photo.signed_url ||
                        photo.thumbnail_url ||
                        photo.photo_url ||
                        ''
                      }
                      alt={photo.description || 'Photo'}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        window.open(
                          photo.display_url || photo.signed_url || photo.photo_url || undefined,
                          '_blank'
                        )
                      }
                    />
                    {photo.ai_tags && photo.ai_tags.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-black bg-opacity-70 text-white text-xs p-1 rounded">
                          {photo.ai_tags.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                <p className="text-gray-500 mb-4">
                  Upload images from time together. They are stored privately and summarized to help
                  remember shared context.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

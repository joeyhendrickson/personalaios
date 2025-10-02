'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  Star,
  Heart,
  Briefcase,
  UserCheck,
  Coffee,
  Phone,
  Mail,
  MapPin,
  Clock,
  Target,
  Lightbulb,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RelationshipType {
  id: string
  name: string
  description: string
}

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  zipcode?: string
  notes?: string
  engagement_score: number
  last_contact_date?: string
  preferred_contact_frequency_days: number
  relationship_types: RelationshipType
  contact_profiles?: Array<{
    id: string
    profile_data: any
  }>
}

interface Interaction {
  id: string
  interaction_type: string
  interaction_date: string
  notes?: string
  outcome?: string
  follow_up_date?: string
}

interface AISuggestion {
  id: string
  suggestion_type: string
  suggestion_content: string
  priority_score: number
  is_completed: boolean
  created_at: string
  contacts?: Contact
}

const relationshipTypeIcons = {
  'Family (Close Cultural)': Heart,
  'Potential Investors (Fundraising)': Briefcase,
  'Potential Clients (Sales)': UserCheck,
  'Friendships (Social)': Coffee,
  'Dating (Romantic)': Heart,
}

const interactionTypeIcons = {
  call: Phone,
  text: MessageSquare,
  email: Mail,
  meeting: Calendar,
  date: Heart,
  event: Calendar,
}

export default function RelationshipManager() {
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<string>('all')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [showAddContact, setShowAddContact] = useState(false)
  const [showEditContact, setShowEditContact] = useState(false)
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [showGenerateSuggestions, setShowGenerateSuggestions] = useState(false)

  const [newContact, setNewContact] = useState({
    name: '',
    relationshipTypeId: '',
    email: '',
    phone: '',
    zipcode: '',
    notes: '',
    preferredContactFrequencyDays: 7,
    profileData: {},
  })

  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editContact, setEditContact] = useState({
    name: '',
    email: '',
    phone: '',
    zipcode: '',
    notes: '',
    engagementScore: 0,
    preferredContactFrequencyDays: 7,
    profileData: {},
  })

  const [newInteraction, setNewInteraction] = useState({
    contactId: '',
    interactionType: '',
    notes: '',
    outcome: '',
    followUpDate: '',
  })

  const [userZipcode, setUserZipcode] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadRelationshipTypes(),
        loadContacts(),
        loadInteractions(),
        loadAISuggestions(),
      ])
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadRelationshipTypes = async () => {
    const response = await fetch('/api/relationships/types')
    if (response.ok) {
      const data = await response.json()
      setRelationshipTypes(data.relationshipTypes)
    }
  }

  const loadContacts = async () => {
    const url =
      selectedRelationshipType && selectedRelationshipType !== 'all'
        ? `/api/relationships/contacts?relationshipTypeId=${selectedRelationshipType}`
        : '/api/relationships/contacts'

    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      setContacts(data.contacts)
    }
  }

  const loadInteractions = async () => {
    const url = selectedContact
      ? `/api/relationships/interactions?contactId=${selectedContact.id}`
      : '/api/relationships/interactions'

    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      setInteractions(data.interactions)
    }
  }

  const loadAISuggestions = async () => {
    const response = await fetch('/api/relationships/ai-suggestions')
    if (response.ok) {
      const data = await response.json()
      setAiSuggestions(data.suggestions)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [selectedRelationshipType])

  useEffect(() => {
    if (selectedContact) {
      loadInteractions()
    }
  }, [selectedContact])

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/relationships/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })

      if (response.ok) {
        setSuccess('Contact added successfully!')
        setNewContact({
          name: '',
          relationshipTypeId: '',
          email: '',
          phone: '',
          zipcode: '',
          notes: '',
          preferredContactFrequencyDays: 7,
          profileData: {},
        })
        setShowAddContact(false)
        loadContacts()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to add contact')
      }
    } catch (err) {
      setError('Failed to add contact')
    }
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setEditContact({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      zipcode: contact.zipcode || '',
      notes: contact.notes || '',
      engagementScore: contact.engagement_score,
      preferredContactFrequencyDays: contact.preferred_contact_frequency_days,
      profileData: contact.contact_profiles?.[0]?.profile_data || {},
    })
    setShowEditContact(true)
  }

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContact) return

    try {
      const response = await fetch(`/api/relationships/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editContact),
      })

      if (response.ok) {
        setSuccess('Contact updated successfully!')
        setShowEditContact(false)
        setEditingContact(null)
        loadContacts()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to update contact')
      }
    } catch (err) {
      setError('Failed to update contact')
    }
  }

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/relationships/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInteraction,
          contactId: selectedContact?.id,
        }),
      })

      if (response.ok) {
        setSuccess('Interaction logged successfully!')
        setNewInteraction({
          contactId: '',
          interactionType: '',
          notes: '',
          outcome: '',
          followUpDate: '',
        })
        setShowAddInteraction(false)
        loadInteractions()
        loadContacts() // Refresh to update last contact date
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to log interaction')
      }
    } catch (err) {
      setError('Failed to log interaction')
    }
  }

  const handleGenerateSuggestions = async () => {
    if (!selectedContact) return

    try {
      const response = await fetch('/api/relationships/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          userZipcode,
          dailyPriorities: 'relationship management', // This could be dynamic
        }),
      })

      if (response.ok) {
        setSuccess('AI suggestions generated successfully!')
        loadAISuggestions()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to generate suggestions')
      }
    } catch (err) {
      setError('Failed to generate suggestions')
    }
  }

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getDaysSinceLastContact = (lastContactDate?: string) => {
    if (!lastContactDate) return 'Never'
    const days = Math.floor(
      (Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    return `${days} days ago`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading relationship data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Users className="h-8 w-8 mr-3" />
            Relationship Manager
          </h1>
          <p className="text-gray-600 mt-2">
            Manage and strengthen your personal and professional relationships
          </p>
        </div>
        <Button onClick={() => setShowAddContact(true)} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          {/* Relationship Type Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Filter by Relationship Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRelationshipType} onValueChange={setSelectedRelationshipType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {relationshipTypes.map((type) => {
                    const IconComponent =
                      relationshipTypeIcons[type.name as keyof typeof relationshipTypeIcons] ||
                      Users
                    return (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center">
                          <IconComponent className="h-4 w-4 mr-2" />
                          {type.name}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => {
              const IconComponent =
                relationshipTypeIcons[
                  contact.relationship_types.name as keyof typeof relationshipTypeIcons
                ] || Users
              return (
                <Card
                  key={contact.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedContact?.id === contact.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <IconComponent className="h-5 w-5 mr-2 text-blue-600" />
                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditContact(contact)}
                          title="Edit contact"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedContact(contact)}
                          title="View interactions"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{contact.relationship_types.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engagement</span>
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                          <div
                            className={`h-2 rounded-full ${getEngagementColor(contact.engagement_score)}`}
                            style={{ width: `${contact.engagement_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{contact.engagement_score}%</span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      Last contact: {getDaysSinceLastContact(contact.last_contact_date)}
                    </div>
                    {contact.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-1" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-1" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.zipcode && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        {contact.zipcode}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {contacts.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-600 mb-4">
                  {selectedRelationshipType !== 'all'
                    ? 'No contacts found for this relationship type.'
                    : 'Start by adding your first contact.'}
                </p>
                <Button onClick={() => setShowAddContact(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          {selectedContact ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium">Interactions with {selectedContact.name}</h3>
                  <Badge variant="outline" className="text-sm">
                    {selectedContact.relationship_types.name}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => setShowAddInteraction(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Interaction
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedContact(null)}>
                    Change Contact
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {interactions.map((interaction) => {
                  const IconComponent =
                    interactionTypeIcons[
                      interaction.interaction_type as keyof typeof interactionTypeIcons
                    ] || MessageSquare
                  return (
                    <Card key={interaction.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <IconComponent className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <div className="font-medium capitalize">
                                {interaction.interaction_type}
                              </div>
                              <div className="text-sm text-gray-600">
                                {new Date(interaction.interaction_date).toLocaleDateString()}
                              </div>
                              {interaction.notes && (
                                <div className="text-sm mt-1">{interaction.notes}</div>
                              )}
                              {interaction.outcome && (
                                <div className="text-sm mt-1 text-green-600">
                                  <strong>Outcome:</strong> {interaction.outcome}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a contact to view interactions
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the <MessageSquare className="h-4 w-4 inline mx-1" /> icon on any contact
                  card in the Contacts tab to view their interaction history.
                </p>
                <Button
                  onClick={() => {
                    // Switch to contacts tab
                    const contactsTab = document.querySelector(
                      '[data-state="inactive"][value="contacts"]'
                    ) as HTMLElement
                    if (contactsTab) contactsTab.click()
                  }}
                >
                  Go to Contacts Tab
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">AI-Powered Suggestions</h3>
            {selectedContact && (
              <div className="flex space-x-2">
                <Input
                  placeholder="Your zipcode"
                  value={userZipcode}
                  onChange={(e) => setUserZipcode(e.target.value)}
                  className="w-40"
                />
                <Button onClick={handleGenerateSuggestions}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate Suggestions
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {aiSuggestions.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {suggestion.suggestion_type}
                        </Badge>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-medium">
                            {suggestion.priority_score}/100
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{suggestion.suggestion_content}</p>
                      {suggestion.contacts && (
                        <p className="text-xs text-gray-600 mt-1">
                          For: {suggestion.contacts.name}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {aiSuggestions.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions yet</h3>
                <p className="text-gray-600 mb-4">
                  Select a contact and generate AI-powered suggestions for maintaining your
                  relationship.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="relationshipType">Relationship Type *</Label>
                  <Select
                    value={newContact.relationshipTypeId}
                    onValueChange={(value) =>
                      setNewContact({ ...newContact, relationshipTypeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="zipcode">Zipcode</Label>
                  <Input
                    id="zipcode"
                    value={newContact.zipcode}
                    onChange={(e) => setNewContact({ ...newContact, zipcode: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="frequency">Preferred Contact Frequency (days)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    min="1"
                    value={newContact.preferredContactFrequencyDays}
                    onChange={(e) =>
                      setNewContact({
                        ...newContact,
                        preferredContactFrequencyDays: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    Add Contact
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddContact(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Interaction Modal */}
      {showAddInteraction && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Log Interaction with {selectedContact.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddInteraction} className="space-y-4">
                <div>
                  <Label htmlFor="interactionType">Interaction Type *</Label>
                  <Select
                    value={newInteraction.interactionType}
                    onValueChange={(value) =>
                      setNewInteraction({ ...newInteraction, interactionType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="text">Text Message</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newInteraction.notes}
                    onChange={(e) =>
                      setNewInteraction({ ...newInteraction, notes: e.target.value })
                    }
                    placeholder="What was discussed or happened?"
                  />
                </div>

                <div>
                  <Label htmlFor="outcome">Outcome</Label>
                  <Input
                    id="outcome"
                    value={newInteraction.outcome}
                    onChange={(e) =>
                      setNewInteraction({ ...newInteraction, outcome: e.target.value })
                    }
                    placeholder="What was the result or next steps?"
                  />
                </div>

                <div>
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={newInteraction.followUpDate}
                    onChange={(e) =>
                      setNewInteraction({ ...newInteraction, followUpDate: e.target.value })
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    Log Interaction
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddInteraction(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContact && editingContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateContact} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editContact.name}
                    onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editContact.email}
                    onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editContact.phone}
                    onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-zipcode">Zipcode</Label>
                  <Input
                    id="edit-zipcode"
                    value={editContact.zipcode}
                    onChange={(e) => setEditContact({ ...editContact, zipcode: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editContact.notes}
                    onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-engagement">Engagement Score (0-100)</Label>
                  <Input
                    id="edit-engagement"
                    type="number"
                    min="0"
                    max="100"
                    value={editContact.engagementScore}
                    onChange={(e) =>
                      setEditContact({
                        ...editContact,
                        engagementScore: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="edit-frequency">Preferred Contact Frequency (days)</Label>
                  <Input
                    id="edit-frequency"
                    type="number"
                    min="1"
                    value={editContact.preferredContactFrequencyDays}
                    onChange={(e) =>
                      setEditContact({
                        ...editContact,
                        preferredContactFrequencyDays: parseInt(e.target.value) || 7,
                      })
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    Update Contact
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditContact(false)
                      setEditingContact(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

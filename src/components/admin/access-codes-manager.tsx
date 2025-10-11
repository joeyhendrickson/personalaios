'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Copy, Check, X, Calendar, User } from 'lucide-react'

interface AccessCode {
  id: string
  code: string
  name: string
  email?: string
  created_at: string
  expires_at?: string
  used_at?: string
  used_by?: string
  is_active: boolean
  created_by: string
  max_uses?: number | null
  used_count?: number
}

export function AccessCodesManager() {
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null)
  const [editForm, setEditForm] = useState({
    max_uses: '',
  })

  // New code form
  const [newCode, setNewCode] = useState({
    name: '',
    email: '',
    expires_days: 30,
    max_uses: '',
  })

  useEffect(() => {
    fetchAccessCodes()
  }, [])

  const fetchAccessCodes = async () => {
    try {
      const response = await fetch('/api/admin/access-codes')
      if (response.ok) {
        const data = await response.json()
        setCodes(data.codes || [])
      } else {
        setError('Failed to fetch access codes')
      }
    } catch (err) {
      setError('Failed to fetch access codes')
    } finally {
      setLoading(false)
    }
  }

  const createAccessCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode.name.trim()) {
      setError('Code name is required')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCode),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setNewCode({ name: '', email: '', expires_days: 30, max_uses: '' })
        fetchAccessCodes() // Refresh the list
      } else {
        setError(result.error || 'Failed to create access code')
      }
    } catch (err) {
      setError('Failed to create access code')
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy code')
    }
  }

  const toggleCodeStatus = async (codeId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: codeId, is_active: !isActive }),
      })

      if (response.ok) {
        fetchAccessCodes()
      }
    } catch (err) {
      setError('Failed to update code status')
    }
  }

  const startEdit = (code: AccessCode) => {
    setEditingCode(code)
    setEditForm({
      max_uses: code.max_uses ? code.max_uses.toString() : '',
    })
  }

  const saveEdit = async () => {
    if (!editingCode) return

    try {
      // Convert empty string to null, or parse the number
      const maxUsesValue = editForm.max_uses === '' ? null : parseInt(editForm.max_uses)

      console.log('📝 Sending update:', {
        id: editingCode.id,
        max_uses: maxUsesValue,
        raw_input: editForm.max_uses,
      })

      const response = await fetch('/api/admin/access-codes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCode.id,
          max_uses: maxUsesValue,
        }),
      })

      const result = await response.json()
      console.log('📊 Update result:', result)
      console.log('📊 Response status:', response.status, response.ok)

      if (response.ok && result.success) {
        setEditingCode(null)
        fetchAccessCodes()
        setError('')
      } else {
        const errorMsg = result.error || result.details || 'Failed to update code'
        setError(errorMsg)
        console.error('Update failed:', {
          status: response.status,
          ok: response.ok,
          result,
        })
      }
    } catch (err) {
      console.error('Update error:', err)
      setError('Failed to update code')
    }
  }

  const cancelEdit = () => {
    setEditingCode(null)
    setEditForm({ max_uses: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (code: AccessCode) => {
    if (code.used_at) {
      return <Badge variant="secondary">Used</Badge>
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (!code.is_active) {
      return <Badge variant="outline">Inactive</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Codes</CardTitle>
          <CardDescription>Manage free access codes for account creation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Access Codes</CardTitle>
            <CardDescription>Manage free access codes for account creation</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Access Code</DialogTitle>
                <DialogDescription>
                  Create a new access code that allows free account creation
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createAccessCode} className="space-y-4">
                <div>
                  <Label htmlFor="name">Code Name</Label>
                  <Input
                    id="name"
                    value={newCode.name}
                    onChange={(e) => setNewCode({ ...newCode, name: e.target.value })}
                    placeholder="e.g., Early Adopter, Beta Tester"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCode.email}
                    onChange={(e) => setNewCode({ ...newCode, email: e.target.value })}
                    placeholder="Specific email to use this code"
                  />
                </div>
                <div>
                  <Label htmlFor="expires">Expires in (days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={newCode.expires_days}
                    onChange={(e) =>
                      setNewCode({ ...newCode, expires_days: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    placeholder="0 for no expiration"
                  />
                </div>
                <div>
                  <Label htmlFor="max_uses">Number of Uses</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={newCode.max_uses}
                    onChange={(e) => setNewCode({ ...newCode, max_uses: e.target.value })}
                    min="1"
                    placeholder="Leave empty for unlimited"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How many premium accounts can be created with this code
                  </p>
                </div>
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end space-x-2">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Code'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No access codes created yet</div>
        ) : (
          <div className="space-y-4">
            {codes.map((code) => (
              <div key={code.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {code.code}
                    </code>
                    {getStatusBadge(code)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(code.code)}>
                      {copiedCode === code.code ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(code)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCodeStatus(code.id, code.is_active)}
                    >
                      {code.is_active ? (
                        <X className="h-4 w-4 text-red-600" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{code.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(code.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Usage:</span>
                    <span>
                      {code.used_count || 0}
                      {code.max_uses ? ` / ${code.max_uses}` : ' / ∞'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Expires:</span>
                    <span>{code.expires_at ? formatDate(code.expires_at) : 'Never'}</span>
                  </div>
                  {code.email && (
                    <div className="col-span-2 text-xs text-gray-500">Email: {code.email}</div>
                  )}
                  {code.used_at && (
                    <div className="col-span-2 text-xs text-gray-500">
                      Used: {formatDate(code.used_at)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Code Dialog */}
      <Dialog open={!!editingCode} onOpenChange={() => setEditingCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Access Code</DialogTitle>
            <DialogDescription>
              Update the usage limit for code:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                {editingCode?.code}
              </code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_max_uses">Number of Uses</Label>
              <Input
                id="edit_max_uses"
                type="number"
                value={editForm.max_uses}
                onChange={(e) => setEditForm({ ...editForm, max_uses: e.target.value })}
                min="1"
                placeholder="Leave empty for unlimited"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current usage: {editingCode?.used_count || 0} / {editingCode?.max_uses || '∞'}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

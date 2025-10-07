'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import CategoryManager from '@/components/dashboard/category-manager'

export default function CategoriesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard Categories</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Customize your dashboard sections and organize your productivity system
            </p>
          </div>
        </div>

        {/* Category Manager */}
        <div className="max-w-4xl mx-auto">
          <CategoryManager />
        </div>
      </div>
    </div>
  )
}

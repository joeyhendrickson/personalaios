'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  MapPin,
  DollarSign,
  TrendingDown,
  Store,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReceiptItem {
  item: string
  price: number
  quantity: number
  total: number
}

interface Alternative {
  item: string
  currentPrice: number
  alternativeProduct: string
  alternativePrice: number
  savings: number
  store: string
}

interface StoreRecommendation {
  storeName: string
  address: string
  distance: number
  totalSavings: number
  savingsPercentage: number
}

interface AnalysisResult {
  receipt: ReceiptItem[]
  alternatives: Alternative[]
  storeRecommendation: StoreRecommendation
  totalCurrentSpending: number
  totalPotentialSavings: number
}

export default function GroceryOptimizerPage() {
  const [zipCode, setZipCode] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!zipCode || !receiptFile) {
      setError('Please enter a zip code and upload a receipt')
      return
    }

    if (!/^\d{5}$/.test(zipCode)) {
      setError('Please enter a valid 5-digit zip code')
      return
    }

    setUploading(true)
    setAnalyzing(true)
    setError(null)

    try {
      // Create FormData to send the file
      const formData = new FormData()
      formData.append('receipt', receiptFile)
      formData.append('zipCode', zipCode)

      const response = await fetch('/api/grocery/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        
        // Display specific error messages based on the error
        let userFriendlyError = errorData.error || 'Failed to analyze receipt'
        
        // Check for specific error types
        if (errorData.error?.includes('AI service is not configured')) {
          userFriendlyError = '⚙️ System Configuration Issue: The AI analysis service is not properly configured. Please contact support to enable this feature.'
        } else if (errorData.error?.includes('Unauthorized')) {
          userFriendlyError = '🔒 Authentication Required: Please log in to use this feature.'
        } else if (errorData.error?.includes('Could not extract items')) {
          userFriendlyError = '📸 Image Quality Issue: We could not read the items from your receipt. Please try uploading a clearer, well-lit photo of your receipt. Make sure all text is visible and in focus.'
        } else if (errorData.details) {
          userFriendlyError = `${errorData.error}\n\nDetails: ${errorData.details}`
        }
        
        throw new Error(userFriendlyError)
      }

      const data = await response.json()
      console.log('Analysis successful:', data)
      setAnalysisResult(data)
    } catch (err) {
      console.error('Error analyzing receipt:', err)
      let errorMessage = 'Failed to analyze receipt. Please try again.'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      // Check for network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = '🌐 Connection Error: Unable to reach the server. Please check your internet connection and try again.'
      }
      
      console.error('Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setZipCode('')
    setReceiptFile(null)
    setAnalysisResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Life Hacks
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <ShoppingCart className="h-8 w-8 mr-3 text-green-600" />
                  Grocery Store Optimizer
                </h1>
                <p className="text-sm text-gray-600">
                  Save money by finding the best grocery stores and alternative products in your area
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {!analysisResult ? (
          /* Upload Section */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Your Grocery Receipt
                </h2>
                <p className="text-gray-600">
                  Enter your zip code and upload a receipt to get personalized savings recommendations
                </p>
              </div>

              {/* Zip Code Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Zip Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="Enter your 5-digit zip code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  maxLength={5}
                />
              </div>

              {/* Receipt Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Receipt className="h-4 w-4 inline mr-1" />
                  Receipt Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    {receiptFile ? (
                      <div className="text-green-600 font-medium">
                        <CheckCircle className="h-5 w-5 inline mr-2" />
                        {receiptFile.name}
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-600 font-medium mb-1">
                          Click to upload receipt
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports JPG, PNG, or PDF files
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-800 text-sm font-semibold mb-1">Error</p>
                      <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
                      {error.includes('Configuration') && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-red-600 text-xs">
                            <strong>For Administrators:</strong> Make sure the OPENAI_API_KEY is set in your environment variables.
                          </p>
                        </div>
                      )}
                      {error.includes('Image Quality') && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-red-600 text-xs">
                            <strong>Tips for better results:</strong>
                          </p>
                          <ul className="text-red-600 text-xs mt-1 ml-4 list-disc space-y-1">
                            <li>Ensure good lighting when taking the photo</li>
                            <li>Make sure all text is in focus</li>
                            <li>Avoid shadows and glare</li>
                            <li>Capture the entire receipt in the frame</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={!zipCode || !receiptFile || analyzing}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing Receipt...
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 mr-2" />
                    Analyze & Find Savings
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Savings Analysis Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-green-100 text-sm mb-1">Current Spending</p>
                  <p className="text-3xl font-bold">
                    ${analysisResult.totalCurrentSpending.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-green-100 text-sm mb-1">Potential Savings</p>
                  <p className="text-3xl font-bold">
                    ${analysisResult.totalPotentialSavings.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-green-100 text-sm mb-1">Savings Percentage</p>
                  <p className="text-3xl font-bold">
                    {analysisResult.storeRecommendation.savingsPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Store Recommendation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Store className="h-6 w-6 mr-2 text-green-600" />
                Recommended Store
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">
                      {analysisResult.storeRecommendation.storeName}
                    </h4>
                    <p className="text-gray-600 mb-1">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      {analysisResult.storeRecommendation.address}
                    </p>
                    <p className="text-gray-600">
                      {analysisResult.storeRecommendation.distance.toFixed(1)} miles away
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Potential Savings</p>
                    <p className="text-3xl font-bold text-green-600">
                      ${analysisResult.storeRecommendation.totalSavings.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternative Products */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingDown className="h-6 w-6 mr-2 text-green-600" />
                Money-Saving Alternatives
              </h3>
              <div className="space-y-4">
                {analysisResult.alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="font-semibold text-gray-900">{alt.item}</span>
                          <span className="ml-2 text-gray-600">
                            ${alt.currentPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center text-green-600">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          <span className="font-medium">{alt.alternativeProduct}</span>
                          <span className="ml-2">${alt.alternativePrice.toFixed(2)}</span>
                          <span className="ml-2 text-sm">at {alt.store}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Save</p>
                        <p className="text-xl font-bold text-green-600">
                          ${alt.savings.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Receipt className="h-6 w-6 mr-2 text-gray-600" />
                Your Receipt
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analysisResult.receipt.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.item}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 py-6 text-lg font-semibold"
              >
                Analyze Another Receipt
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
              >
                Save Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


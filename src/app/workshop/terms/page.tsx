import Link from 'next/link'
import { WorkshopTermsDocument } from '@/components/workshop/workshop-terms-document'

export default function WorkshopTermsPage() {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Workshop Terms & Conditions</h1>
          <p className="text-gray-300">Lifestacks Workshop Registration Agreement</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <WorkshopTermsDocument />
        </div>

        <div className="flex justify-between items-center mt-8">
          <Link href="/workshop" className="text-white hover:text-gray-300 font-medium">
            ← Back to Workshop Registration
          </Link>
          <Link href="/create-account" className="text-gray-400 hover:text-gray-300 text-sm">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-8">
            <div className="flex items-center justify-center space-x-8">
              {/* Stacked layers icon */}
              <div className="flex flex-col space-y-3">
                <div className="w-24 h-8 bg-white rounded-lg shadow-lg"></div>
                <div className="w-24 h-8 bg-white rounded-lg shadow-lg"></div>
                <div className="w-24 h-8 bg-white rounded-lg shadow-lg"></div>
              </div>
              {/* Life Stacks text */}
              <div className="text-left">
                <div className="text-6xl font-bold text-white leading-none tracking-tight">
                  Life
                </div>
                <div className="text-6xl font-bold text-white leading-none tracking-tight">
                  Stacks
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your privacy is important to us. Learn how we collect, use, and protect your information.
          </p>
        </div>

        {/* Privacy Policy Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-black">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold mb-6">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
            <p className="mb-4">
              When you create an account with Life Stacks, we collect information such as your name, email address, 
              and any information you voluntarily provide. This information is used to provide and improve our services.
            </p>

            <h3 className="text-xl font-semibold mb-3">Usage Data</h3>
            <p className="mb-4">
              We collect information about how you use our platform, including your goals, progress tracking data, 
              and interactions with our AI-powered features. This helps us provide personalized insights and improve our services.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">How We Use Your Information</h2>
            
            <ul className="list-disc pl-6 mb-4">
              <li>Provide and maintain our services</li>
              <li>Generate AI-powered insights and recommendations</li>
              <li>Track your progress and goals</li>
              <li>Send you important updates about your account</li>
              <li>Improve our platform and develop new features</li>
              <li>Provide customer support</li>
            </ul>

            <h2 className="text-2xl font-bold mb-6 mt-8">Data Security</h2>
            <p className="mb-4">
              We implement appropriate security measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. Your data is encrypted and stored securely using industry-standard practices.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Data Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
              except as described in this policy or as required by law.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Payment Information</h2>
            <p className="mb-4">
              Payment processing for subscriptions is handled securely through PayPal. We do not store your payment 
              information on our servers. PayPal's privacy policy applies to payment transactions.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Your Rights</h2>
            <p className="mb-4">
              You have the right to access, update, or delete your personal information. You can also opt out of 
              certain communications from us. To exercise these rights, please contact us at Joseph@SuddenImpactLabs.com.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and 
              provide personalized content. You can control cookie settings through your browser preferences.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Third-Party Services</h2>
            <p className="mb-4">
              Our platform may integrate with third-party services for enhanced functionality. These services 
              have their own privacy policies, and we encourage you to review them.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Changes to This Policy</h2>
            <p className="mb-4">
              We may update this privacy policy from time to time. We will notify you of any significant changes 
              by posting the new policy on this page and updating the "Last Updated" date below.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-8">Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this privacy policy or our data practices, please contact us at:
            </p>
            <p className="mb-8">
              <strong>Email:</strong> Joseph@SuddenImpactLabs.com<br />
              <strong>Subject:</strong> Privacy Policy Inquiry
            </p>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-white hover:text-gray-300 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
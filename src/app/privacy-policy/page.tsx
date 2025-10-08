export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Last updated:</strong> January 8, 2025
            </p>
            <p className="text-sm text-gray-600">
              This Privacy Policy describes how Lifestacks.ai collects, uses, processes, and discloses information, 
              including Google user data, when you use our Relationship Manager module and other Life Stacks applications.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction & Scope</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Purpose</h3>
                <p className="text-gray-700">
                  The Life Stacks platform helps users organize their personal productivity through various modules including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li><strong>Relationship Manager</strong>: Consolidates, organizes, and enhances contact/relationship-related data and optionally links relevant media (e.g. photos) via Google Photos integration</li>
                  <li><strong>Habit Master</strong>: Tracks and optimizes personal habits using psychological frameworks</li>
                  <li><strong>Focus Enhancer</strong>: Analyzes screen time and provides therapeutic conversations for digital wellness</li>
                  <li><strong>Analytics Dashboard</strong>: Provides insights into productivity and goal achievement</li>
                  <li><strong>Business Hacks</strong>: Various productivity and business management tools</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">OAuth & Google APIs</h3>
                <p className="text-gray-700">
                  To support media integration in our Relationship Manager, we allow you to grant the App permission to access your Google Photos via OAuth 2.0. We adhere to Google's OAuth 2.0 policies, Google API Services User Data Policy, and Google Photos API terms.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Minimal access & transparency</h3>
                <p className="text-gray-700">
                  We request only the minimal scopes necessary (e.g. reading photos from your Google Photos library) and clearly disclose how we use any data obtained.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Updates & consent</h3>
                <p className="text-gray-700">
                  If our data practices change (e.g. new scopes or usage), we will update this policy and, where required, re-prompt you to consent before using new Google data.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. What Information We Collect</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">A. Information You Provide Directly</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Account & contact info</strong>. Your name, email address (including the Google email), profile picture, and any username you choose.</li>
                  <li><strong>App-specific data</strong>. Notes, labels, metadata, tags, custom relationships, habits, goals, projects, tasks, and any other data you enter into our applications.</li>
                  <li><strong>User content</strong>. If you choose to upload or link media (photos, images) from Google Photos, or manually upload files, we store metadata and references to those media items.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">B. Google User Data via OAuth / Google Photos</h3>
                <p className="text-gray-700 mb-2">When you grant permission, we may access:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Google Photos read access</strong>. We may list, read, and retrieve media items from your Google Photos library (within the scopes you authorize).</li>
                  <li><strong>Media metadata</strong>. This includes creation timestamp, file type, dimensions, album membership, and other metadata associated with the media item.</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  We do not access or retrieve data outside the scopes you explicitly grant. We do not access unrelated Google account data (e.g. Gmail messages, Drive files beyond the photos scope) unless separately authorized.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">C. Technical / Usage Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Device, browser, operating system, and version.</li>
                  <li>IP address, geolocation (approximate), and network identifiers.</li>
                  <li>Usage logs: date/time of access, features used, errors, performance metrics.</li>
                  <li>Cookies and similar tracking technologies (for authentication, analytics, sessions).</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use the Information</h2>
            <p className="text-gray-700 mb-4">We use your data for:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>Providing the service</strong>. Displaying, organizing, and managing your relationship data, habits, goals, projects, photos, and metadata as intended.</li>
              <li><strong>Synchronization</strong>. Syncing with your Google Photos (within granted scopes) to show images linked to contacts, allowing you to add images from your library.</li>
              <li><strong>AI-powered features</strong>. Using your data to provide personalized insights, habit recommendations, therapeutic conversations, and productivity analysis through our AI-powered modules.</li>
              <li><strong>User experience improvements</strong>. Aggregated analytics and performance metrics to improve features, UI, and system reliability.</li>
              <li><strong>Support and communication</strong>. To respond to user inquiries, send you updates, notifications, or security alerts.</li>
              <li><strong>Security, fraud prevention, compliance</strong>. To detect abuse or unauthorized access, enforce our Terms of Service, and comply with legal obligations.</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">We do not:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Sell or share your Google user data with third parties (e.g. advertising networks, data brokers).</li>
                <li>Use Google user data for advertising or marketing purposes outside the app's features.</li>
                <li>Aggregate or combine Google user data in a way that would allow individual re-identification beyond your own use.</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Share or Disclose Data</h2>
            <p className="text-gray-700 mb-2">We may share your data only in the following limited circumstances:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Service providers / contractors</strong>. E.g. cloud hosting (Supabase), analytics, email providers, AI service providers (OpenAI) — under strict confidentiality and only for service performance.</li>
              <li><strong>With your consent</strong>. In rare cases if you explicitly grant further sharing.</li>
              <li><strong>Legal requirements</strong>. To comply with laws, legal processes, or enforce our rights.</li>
              <li><strong>Business transfers</strong>. In connection with mergers or acquisitions, where new owners commit to maintaining privacy practices.</li>
            </ul>
            <p className="text-gray-700 mt-2">
              Any sharing will be limited to what is needed, and we will require recipients to abide by equivalent privacy and security standards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Storage, Retention & Deletion</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Storage</h3>
                <p className="text-gray-700">
                  We store data on secure servers (Supabase), encrypted at rest and in transit (TLS). Access is limited to authorized systems and personnel.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Retention</h3>
                <p className="text-gray-700">
                  We retain your data for as long as your account is active or as needed to provide the service (and to comply with legal obligations). If you delete your account or revoke Google access, we will delete or anonymize associated Google-linked data within a reasonable period (e.g. 30–90 days).
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Deletion</h3>
                <p className="text-gray-700">
                  You may request the deletion of your account or specific data. Upon deletion, we will remove personal data and references to linked Google media (unless required to retain for legal reasons). Backup copies may persist for limited periods but will be purged.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. User Controls & Choices</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Granting / revoking Google access</strong>. You can revoke Google Photos scopes at any time via your Google account's security settings or within our App settings.</li>
              <li><strong>Data access, correction, deletion</strong>. You may request to review, correct, or delete your personal data stored in our system.</li>
              <li><strong>Opting out of analytics</strong>. Where possible, you may disable non-essential analytics/tracking.</li>
              <li><strong>Notifications of policy changes</strong>. We will notify you (in-app or email) prior to substantive changes in how we use Google data, and require re-acceptance if necessary.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Security & Protection</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>We implement industry-standard security practices (encryption in transit and at rest, access controls, regular audits, secure development processes).</li>
              <li>We limit internal access to systems handling Google user data.</li>
              <li>We monitor for unusual or unauthorized activity and respond with remediation procedures.</li>
              <li>However, no system is 100% secure; in the rare event of a breach, we will notify you and regulators as required by law.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children & Age Restrictions</h2>
            <p className="text-gray-700">
              Our Service is not intended for children under 13. We do not knowingly collect Google data from minors. If you believe a minor has provided us data, contact us to request deletion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700">
              Because our infrastructure may involve servers or service providers outside your country, your data may be transferred, stored, or processed in other countries. We will ensure adequate safeguards (e.g. standard contractual clauses) as required by applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Compliance with Google Requirements & Policies</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>OAuth consent screen & policy linkage</strong>. Our home page and app explicitly include links to this Privacy Policy and Terms of Service, and the policy is submitted in our OAuth consent screen configuration.</li>
              <li><strong>Limited scopes & minimal access</strong>. We request only the scopes strictly needed for the features we offer.</li>
              <li><strong>Transparency and updates</strong>. If we expand our use of Google user data, we will update this policy and require renewed consent.</li>
              <li><strong>No surprise or deceptive use</strong>. We will not use Google user data in ways not disclosed to users.</li>
            </ul>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 font-medium">
                <strong>"Lifestacks.ai's use and transfer of information received from Google APIs to any other app will adhere to Google API Services User Data Policy, including the Limited Use requirements."</strong>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Services</h2>
            <p className="text-gray-700 mb-2">Our applications integrate with the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Supabase</strong>: Database and authentication services</li>
              <li><strong>OpenAI</strong>: AI-powered features and insights</li>
              <li><strong>Google Photos API</strong>: Photo access and synchronization</li>
              <li><strong>Vercel</strong>: Hosting and deployment services</li>
            </ul>
            <p className="text-gray-700 mt-2">
              Each of these services has their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-700 mb-2">We may update this Privacy Policy periodically (e.g. to comply with new laws or Google requirements). When we do, we will:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Post the updated version with a new "Last updated" date.</li>
              <li>Notify users in-app or by email for significant changes.</li>
              <li>Where required (e.g. new Google scopes), ask users to re-consent prior to use.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 mb-2">If you have questions, concerns, or requests (access, correction, deletion), contact:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Lifestacks.ai</strong></p>
              <p className="text-gray-700">342 S High Street Unit 301</p>
              <p className="text-gray-700">Columbus, Ohio 43215</p>
              <p className="text-gray-700">Email: privacy@lifestacks.ai</p>
              <p className="text-gray-700">Website: https://lifestacks.ai</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Terms of Service</h2>
            <p className="text-gray-700">
              This Privacy Policy is part of our Terms of Service. By using our applications, you agree to both this Privacy Policy and our Terms of Service.
            </p>
          </section>

          <div className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-sm text-gray-500">
              <strong>Effective Date:</strong> January 8, 2025<br />
              <strong>Version:</strong> 1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

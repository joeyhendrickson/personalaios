'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Immediate redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Demo...</h2>
        <p className="text-gray-600">Redirecting you to the productivity dashboard...</p>
      </div>
    </div>
  );
}


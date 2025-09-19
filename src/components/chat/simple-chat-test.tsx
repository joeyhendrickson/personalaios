'use client';

import { useState } from 'react';

export function SimpleChatTest() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      console.log('Sending simple chat request:', message);
      const res = await fetch('/api/chat/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }]
        })
      });

      console.log('Simple chat response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Simple chat response data:', data);
        setResponse(data.message || 'No response');
      } else {
        const errorData = await res.json();
        console.error('Simple chat error:', errorData);
        setResponse(`Error: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Simple chat request error:', error);
      setResponse(`Request error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 bg-white rounded-lg shadow-xl border p-4">
      <h3 className="font-semibold mb-3">Simple Chat Test</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {response && (
        <div className="mt-3 p-3 bg-gray-100 rounded-md">
          <strong>Response:</strong>
          <p className="mt-1">{response}</p>
        </div>
      )}
    </div>
  );
}

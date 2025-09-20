// Test script to check admin API
// Run this in browser console while logged in

async function testAdminAPI() {
  try {
    console.log('Testing admin check-status API...');
    
    const response = await fetch('/api/admin/check-status');
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Admin data:', data);
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (err) {
    console.error('API Error:', err);
  }
}

// Run the test
testAdminAPI();

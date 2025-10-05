// Test script to check if the projects API is working
// Run this in your browser console while logged into the dashboard

async function testProjectsAPI() {
  try {
    console.log('Testing projects API...')

    const response = await fetch('/api/projects')
    console.log('Response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      console.log('Projects data:', data)
      console.log('Number of projects:', data.projects?.length || 0)
    } else {
      const error = await response.json()
      console.error('API Error:', error)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Also test the old goals API to see what's there
async function testGoalsAPI() {
  try {
    console.log('Testing goals API...')

    const response = await fetch('/api/goals')
    console.log('Response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      console.log('Goals data:', data)
      console.log('Number of goals:', data.goals?.length || 0)
    } else {
      const error = await response.json()
      console.error('API Error:', error)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Run both tests
testProjectsAPI()
testGoalsAPI()

// Simple debug script to test priority soft delete
const testPriorityDelete = async () => {
  try {
    // Test the DELETE endpoint
    const response = await fetch('/api/priorities/deleted', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Deleted priorities response:', response.status, data);
    
    // Test regular priorities
    const prioritiesResponse = await fetch('/api/priorities', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const prioritiesData = await prioritiesResponse.json();
    console.log('Regular priorities response:', prioritiesResponse.status, prioritiesData);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
};

// Run the test
testPriorityDelete();

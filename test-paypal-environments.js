// Test PayPal in both sandbox and live environments
const PAYPAL_CLIENT_ID = 'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET = 'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'

async function testEnvironment(baseUrl, name) {
  console.log(`\n🔍 Testing ${name}...`)
  
  try {
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    })
    
    const data = await response.json()
    console.log(`Status: ${response.status}`)
    console.log(`Response:`, data)
    
    if (data.access_token) {
      console.log(`✅ ${name} works! Access token received`)
      return data.access_token
    } else {
      console.log(`❌ ${name} failed`)
      return null
    }
    
  } catch (error) {
    console.log(`❌ ${name} error:`, error.message)
    return null
  }
}

async function main() {
  console.log('Testing PayPal credentials in different environments...')
  
  const sandboxToken = await testEnvironment('https://api.sandbox.paypal.com', 'Sandbox')
  const liveToken = await testEnvironment('https://api.paypal.com', 'Live')
  
  if (sandboxToken) {
    console.log('\n🎉 Sandbox works! Let\'s try to create plans...')
    
    // Try to list existing plans
    try {
      const plansResponse = await fetch('https://api.sandbox.paypal.com/v1/billing/plans', {
        headers: {
          'Authorization': `Bearer ${sandboxToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const plans = await plansResponse.json()
      console.log('Existing plans:', plans)
      
    } catch (error) {
      console.log('Error listing plans:', error.message)
    }
  }
  
  if (liveToken) {
    console.log('\n🎉 Live works! But we want to use sandbox for testing.')
  }
  
  if (!sandboxToken && !liveToken) {
    console.log('\n❌ Both environments failed. Possible issues:')
    console.log('1. Credentials are incorrect')
    console.log('2. App doesn\'t have required permissions')
    console.log('3. App is in wrong environment')
    console.log('\n🔧 Try:')
    console.log('1. Double-check the Client ID and Secret')
    console.log('2. Make sure you\'re copying from the right app')
    console.log('3. Check if the app has subscription permissions')
  }
}

main()

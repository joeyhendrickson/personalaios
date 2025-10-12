// Test simple PayPal API call
const PAYPAL_CLIENT_ID =
  'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET =
  'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'

async function testSimpleAPI() {
  try {
    // Try a very simple API call first
    console.log('🔍 Testing basic PayPal API access...')

    const authResponse = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    console.log('Auth response status:', authResponse.status)
    console.log('Auth response headers:', Object.fromEntries(authResponse.headers.entries()))

    const authData = await authResponse.text()
    console.log('Auth response body:', authData)

    if (authResponse.ok) {
      const tokenData = JSON.parse(authData)
      console.log('✅ Got access token!')

      // Try to list existing plans
      console.log('\n🔍 Checking for existing plans...')
      const plansResponse = await fetch('https://api.sandbox.paypal.com/v1/billing/plans', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Plans response status:', plansResponse.status)
      const plansData = await plansResponse.text()
      console.log('Plans response:', plansData)
    } else {
      console.log('❌ Auth failed')

      // Try to get more info about the error
      console.log('\n🔍 Checking if this is a permissions issue...')

      // Try a different endpoint to see if it's a general auth issue
      const testResponse = await fetch(
        'https://api.sandbox.paypal.com/v1/identity/oauth2/userinfo',
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      )

      console.log('Test endpoint status:', testResponse.status)
      const testData = await testResponse.text()
      console.log('Test endpoint response:', testData)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testSimpleAPI()

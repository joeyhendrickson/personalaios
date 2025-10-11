// Test PayPal Authentication
const PAYPAL_CLIENT_ID = 'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET = 'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'

console.log('Client ID:', PAYPAL_CLIENT_ID)
console.log('Secret length:', PAYPAL_CLIENT_SECRET.length)
console.log('Secret starts with:', PAYPAL_CLIENT_SECRET.substring(0, 10) + '...')

// Test basic auth
const authString = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
console.log('Auth string length:', authString.length)
console.log('Auth string starts with:', authString.substring(0, 20) + '...')

async function testAuth() {
  try {
    const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`
      },
      body: 'grant_type=client_credentials'
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('Response data:', data)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testAuth()

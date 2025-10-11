// Debug PayPal credentials
const PAYPAL_CLIENT_ID = 'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET = 'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'

console.log('=== CREDENTIALS DEBUG ===')
console.log('Client ID length:', PAYPAL_CLIENT_ID.length)
console.log('Secret length:', PAYPAL_CLIENT_SECRET.length)
console.log('Client ID starts with:', PAYPAL_CLIENT_ID.substring(0, 10))
console.log('Secret starts with:', PAYPAL_CLIENT_SECRET.substring(0, 10))

// Create auth string
const authString = `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
const encodedAuth = Buffer.from(authString).toString('base64')

console.log('\n=== AUTH STRING ===')
console.log('Auth string length:', authString.length)
console.log('Encoded length:', encodedAuth.length)
console.log('Encoded starts with:', encodedAuth.substring(0, 20))

// Test with curl command
console.log('\n=== CURL COMMAND TO TEST ===')
console.log('You can test this with curl:')
console.log(`curl -X POST https://api.sandbox.paypal.com/v1/oauth2/token \\`)
console.log(`  -H "Accept: application/json" \\`)
console.log(`  -H "Accept-Language: en_US" \\`)
console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\`)
console.log(`  -H "Authorization: Basic ${encodedAuth}" \\`)
console.log(`  -d "grant_type=client_credentials"`)

// Try the request
async function testRequest() {
  console.log('\n=== MAKING REQUEST ===')
  
  try {
    const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedAuth}`
      },
      body: 'grant_type=client_credentials'
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.text()
    console.log('Response body:', data)
    
  } catch (error) {
    console.error('Request error:', error)
  }
}

testRequest()

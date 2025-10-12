// Test PayPal Live environment (instead of sandbox)
const PAYPAL_CLIENT_ID =
  'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET =
  'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'

async function testLiveEnvironment() {
  try {
    console.log('🔍 Testing PayPal LIVE environment...')

    const authResponse = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    console.log('Live Auth response status:', authResponse.status)
    const authData = await authResponse.text()
    console.log('Live Auth response:', authData)

    if (authResponse.ok) {
      console.log('✅ Live environment works!')
    } else {
      console.log('❌ Live environment also failed')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testLiveEnvironment()

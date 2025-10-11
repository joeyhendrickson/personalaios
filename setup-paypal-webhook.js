// Setup PayPal Webhook
const PAYPAL_CLIENT_ID = 'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET = 'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'

async function getAccessToken() {
  const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  })
  
  if (!response.ok) {
    console.error('Auth failed:', response.status, await response.text())
    return null
  }
  
  const data = await response.json()
  return data.access_token
}

async function createWebhook(accessToken) {
  const webhook = {
    url: 'https://www.lifestacks.ai/api/webhooks/paypal',
    event_types: [
      {
        name: 'BILLING.SUBSCRIPTION.CREATED'
      },
      {
        name: 'BILLING.SUBSCRIPTION.ACTIVATED'
      },
      {
        name: 'BILLING.SUBSCRIPTION.CANCELLED'
      },
      {
        name: 'BILLING.SUBSCRIPTION.SUSPENDED'
      },
      {
        name: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
      },
      {
        name: 'BILLING.SUBSCRIPTION.RENEWED'
      },
      {
        name: 'PAYMENT.SALE.COMPLETED'
      }
    ]
  }

  console.log('Creating webhook...')
  const response = await fetch('https://api.sandbox.paypal.com/v1/notifications/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `webhook-${Date.now()}`
    },
    body: JSON.stringify(webhook)
  })

  const result = await response.json()
  console.log('Webhook response:', result)
  return result
}

async function main() {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    console.log('❌ Cannot get access token. Check app permissions.')
    console.log('\n🔧 Try this:')
    console.log('1. Go to PayPal Apps & Credentials')
    console.log('2. Click on your "LifeStacks" app')
    console.log('3. Look for "Features" or "Products" tab')
    console.log('4. Enable "Subscriptions" and "Billing"')
    console.log('5. Save the changes')
    return
  }

  console.log('✅ Got access token, creating webhook...')
  const webhook = await createWebhook(accessToken)
  
  if (webhook.id) {
    console.log('✅ Webhook created!')
    console.log('Webhook ID:', webhook.id)
    console.log('\nAdd this to your .env.local:')
    console.log(`PAYPAL_WEBHOOK_ID=${webhook.id}`)
  } else {
    console.log('❌ Failed to create webhook')
  }
}

main()

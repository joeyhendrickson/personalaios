// Simple PayPal Plan Creation Script
const PAYPAL_CLIENT_ID =
  'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET =
  'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd'
const PAYPAL_BASE_URL = 'https://api.sandbox.paypal.com'

async function getAccessToken() {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en_US',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  console.log('Token response:', data)
  return data.access_token
}

async function createProduct(name, description, accessToken) {
  const product = {
    name: name,
    description: description,
    type: 'SERVICE',
    category: 'SOFTWARE',
  }

  console.log('Creating product:', product)

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `product-${Date.now()}`,
    },
    body: JSON.stringify(product),
  })

  const result = await response.json()
  console.log('Product response:', result)
  return result
}

async function createPlan(productId, planName, price, accessToken) {
  const plan = {
    product_id: productId,
    name: planName,
    description: `${planName} subscription`,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: {
          interval_unit: 'MONTH',
          interval_count: 1,
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: price,
            currency_code: 'USD',
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: '0',
        currency_code: 'USD',
      },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  }

  console.log('Creating plan:', plan)

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `plan-${Date.now()}`,
    },
    body: JSON.stringify(plan),
  })

  const result = await response.json()
  console.log('Plan response:', result)
  return result
}

async function main() {
  try {
    console.log('🔑 Getting access token...')
    const accessToken = await getAccessToken()

    if (!accessToken) {
      console.error('❌ Failed to get access token')
      return
    }

    console.log('✅ Got access token')

    console.log('📦 Creating products...')
    const basicProduct = await createProduct(
      'Life Stacks Basic',
      'Full access to all Life Stacks features',
      accessToken
    )
    const premiumProduct = await createProduct(
      'Life Stacks Premium',
      'Everything in Basic plus personal AI coaching',
      accessToken
    )

    if (!basicProduct.id || !premiumProduct.id) {
      console.error('❌ Failed to create products')
      return
    }

    console.log('✅ Products created')
    console.log('Basic Product ID:', basicProduct.id)
    console.log('Premium Product ID:', premiumProduct.id)

    console.log('📋 Creating plans...')
    const basicPlan = await createPlan(
      basicProduct.id,
      'Life Stacks Basic Monthly',
      '19.99',
      accessToken
    )
    const premiumPlan = await createPlan(
      premiumProduct.id,
      'Life Stacks Premium Monthly',
      '249.99',
      accessToken
    )

    if (basicPlan.id && premiumPlan.id) {
      console.log('🎉 SUCCESS! Plans created:')
      console.log('Basic Plan ID:', basicPlan.id)
      console.log('Premium Plan ID:', premiumPlan.id)
      console.log('\nAdd these to your .env.local:')
      console.log(`NEXT_PUBLIC_PAYPAL_BASIC_PLAN_ID=${basicPlan.id}`)
      console.log(`NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID=${premiumPlan.id}`)
    } else {
      console.error('❌ Failed to create plans')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main()

// Create PayPal Subscription Plans
// Run this with: node create-paypal-plans.js

const PAYPAL_CLIENT_ID =
  'AVxbtUonUHJdE14X47Orrv_2klBv2JyDdySCXepg67wSsedrEF_KDDx9jojWtcGDNtwMuJqOTI-Kqlwm'
const PAYPAL_CLIENT_SECRET =
  'EMljr0UhetSiWgmOvwHQSW4PakotZhS2c7HjD4FjvoDQ8Owv6OWglI5v9r0KJqsoqlgXe6BWvn8cy6Nd' // Click the eye icon to reveal and copy your secret
const PAYPAL_BASE_URL = 'https://api.sandbox.paypal.com' // Sandbox URL

async function createPayPalPlans() {
  try {
    // Get access token
    const authResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    const { access_token } = await authResponse.json()
    console.log('✅ Got PayPal access token')

    // Create Basic Plan
    const basicPlan = {
      product_id: 'PROD_BASIC', // We'll create this first
      name: 'Life Stacks Basic Monthly',
      description: 'Full access to all Life Stacks features',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: '19.99',
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

    // Create Premium Plan
    const premiumPlan = {
      product_id: 'PROD_PREMIUM', // We'll create this first
      name: 'Life Stacks Premium Monthly',
      description: 'Everything in Basic plus personal AI coaching',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: '249.99',
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

    // First, create products
    console.log('📦 Creating products...')

    const basicProduct = await createProduct(
      'Life Stacks Basic',
      'Full access to all Life Stacks features',
      access_token
    )
    const premiumProduct = await createProduct(
      'Life Stacks Premium',
      'Everything in Basic plus personal AI coaching',
      access_token
    )

    console.log('✅ Basic Product Response:', JSON.stringify(basicProduct, null, 2))
    console.log('✅ Premium Product Response:', JSON.stringify(premiumProduct, null, 2))

    // Update plans with product IDs
    basicPlan.product_id = basicProduct.id
    premiumPlan.product_id = premiumProduct.id

    // Create Basic Plan
    console.log('📋 Creating Basic Plan...')
    const basicResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'PayPal-Request-Id': `basic-plan-${Date.now()}`,
      },
      body: JSON.stringify(basicPlan),
    })

    const basicResult = await basicResponse.json()
    console.log('✅ Basic Plan Response:', JSON.stringify(basicResult, null, 2))
    console.log('✅ Basic Plan Created!')
    console.log('📋 Basic Plan ID:', basicResult.id)
    console.log('📋 Basic Plan Name:', basicResult.name)

    // Create Premium Plan
    console.log('📋 Creating Premium Plan...')
    const premiumResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'PayPal-Request-Id': `premium-plan-${Date.now()}`,
      },
      body: JSON.stringify(premiumPlan),
    })

    const premiumResult = await premiumResponse.json()
    console.log('✅ Premium Plan Response:', JSON.stringify(premiumResult, null, 2))
    console.log('✅ Premium Plan Created!')
    console.log('📋 Premium Plan ID:', premiumResult.id)
    console.log('📋 Premium Plan Name:', premiumResult.name)

    console.log('\n🎉 SUCCESS! Add these to your .env.local:')
    console.log(`NEXT_PUBLIC_PAYPAL_BASIC_PLAN_ID=${basicResult.id}`)
    console.log(`NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID=${premiumResult.id}`)
  } catch (error) {
    console.error('❌ Error creating plans:', error)
  }
}

async function createProduct(name, description, accessToken) {
  const product = {
    name: name,
    description: description,
    type: 'SERVICE',
    category: 'SOFTWARE',
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `product-${Date.now()}`,
    },
    body: JSON.stringify(product),
  })

  return await response.json()
}

// Run the script
createPayPalPlans()

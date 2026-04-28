// Create PayPal Subscription Plans for LIVE mode
// Run this with: node create-paypal-plans-live.js

const PAYPAL_CLIENT_ID =
  'ATOFoDlPrvbah41jvuPoYa0-W7sZLN3CKTAWHaUe7WpnrAj-pn37LxNfp6WFUOOStj8cKLVin7gGiOgO' // Your live client ID
const PAYPAL_CLIENT_SECRET =
  'EMwZdLMDMw26zR76SRvYyiPBAdnQfphY8AZVqMZNKMIV9_Ooo-nKeJddqWdMwr9jsEGYu6T8K7VReeEw'
const PAYPAL_BASE_URL = 'https://api.paypal.com' // LIVE URL (not sandbox)

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
    console.log('✅ Got PayPal LIVE access token')

    // Create Standard Plan (only plan for PayPal)
    const standardPlan = {
      product_id: 'PROD_STANDARD', // We'll create this first
      name: 'Life Stacks Standard Monthly',
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
              value: '50.00',
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

    // First, create product
    console.log('📦 Creating product...')

    const standardProduct = await createProduct(
      'Life Stacks Standard',
      'Full access to all Life Stacks features',
      access_token
    )

    console.log('✅ Standard Product Response:', JSON.stringify(standardProduct, null, 2))

    // Update plan with product ID
    standardPlan.product_id = standardProduct.id

    // Create Standard Plan
    console.log('📋 Creating Standard Plan...')
    const standardResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'PayPal-Request-Id': `standard-plan-${Date.now()}`,
      },
      body: JSON.stringify(standardPlan),
    })

    const standardResult = await standardResponse.json()
    console.log('✅ Standard Plan Response:', JSON.stringify(standardResult, null, 2))
    console.log('✅ Standard Plan Created!')
    console.log('📋 Standard Plan ID:', standardResult.id)
    console.log('📋 Standard Plan Name:', standardResult.name)

    console.log('\n🎉 SUCCESS! Add this to your .env.local:')
    console.log(`NEXT_PUBLIC_PAYPAL_STANDARD_PLAN_ID=${standardResult.id}`)
    console.log('Note: This is the ONLY plan - Standard plan only!')
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

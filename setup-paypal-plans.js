#!/usr/bin/env node
/**
 * PayPal Plan Setup Script
 * This script creates PayPal subscription plans and outputs the configuration
 * 
 * Usage:
 *   node setup-paypal-plans.js
 * 
 * Requirements:
 *   - PAYPAL_CLIENT_ID (your PayPal app client ID)
 *   - PAYPAL_CLIENT_SECRET (your PayPal app secret)
 *   - PAYPAL_MODE (sandbox or live)
 */

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function setup() {
  console.log('🚀 PayPal Subscription Plans Setup\n')
  console.log('This script will create subscription plans in your PayPal account.\n')

  // Get PayPal credentials
  const mode = await question('Enter mode (sandbox/live) [sandbox]: ') || 'sandbox'
  const clientId = await question('Enter PayPal Client ID: ')
  const clientSecret = await question('Enter PayPal Client Secret: ')

  if (!clientId || !clientSecret) {
    console.error('❌ Client ID and Secret are required')
    process.exit(1)
  }

  const baseUrl = mode === 'live' 
    ? 'https://api.paypal.com' 
    : 'https://api-m.sandbox.paypal.com'

  console.log(`\n📡 Using ${mode.toUpperCase()} mode: ${baseUrl}\n`)

  try {
    // Get access token
    console.log('🔐 Getting access token...')
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!authResponse.ok) {
      const error = await authResponse.text()
      throw new Error(`Auth failed: ${error}`)
    }

    const { access_token } = await authResponse.json()
    console.log('✅ Access token obtained\n')

    // Create product first
    console.log('📦 Creating product...')
    const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'PayPal-Request-Id': `product-lifestacks-${Date.now()}`,
      },
      body: JSON.stringify({
        name: 'Life Stacks Subscription',
        description: 'Access to all Life Stacks features',
        type: 'SERVICE',
        category: 'SOFTWARE',
      }),
    })

    const product = await productResponse.json()
    console.log(`✅ Product created: ${product.id}\n`)

    // Create Basic Plan ($50/month)
    console.log('📋 Creating Basic Plan ($50/month)...')
    const basicPlanResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'PayPal-Request-Id': `plan-basic-${Date.now()}`,
      },
      body: JSON.stringify({
        product_id: product.id,
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
            total_cycles: 0,
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
      }),
    })

    const basicPlan = await basicPlanResponse.json()
    console.log(`✅ Basic Plan created: ${basicPlan.id}\n`)

    // Create Premium Plan ($500/month)
    console.log('📋 Creating Premium Plan ($500/month)...')
    const premiumPlanResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
        'PayPal-Request-Id': `plan-premium-${Date.now()}`,
      },
      body: JSON.stringify({
        product_id: product.id,
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
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: '500.00',
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
      }),
    })

    const premiumPlan = await premiumPlanResponse.json()
    console.log(`✅ Premium Plan created: ${premiumPlan.id}\n`)

    // Output configuration
    console.log('🎉 SUCCESS! Add these to your .env.local file:\n')
    console.log('# PayPal Configuration')
    console.log(`NEXT_PUBLIC_PAYPAL_CLIENT_ID=${clientId}`)
    console.log(`PAYPAL_CLIENT_ID=${clientId}`)
    console.log(`PAYPAL_CLIENT_SECRET=${clientSecret}`)
    console.log(`NEXT_PUBLIC_PAYPAL_BASIC_PLAN_ID=${basicPlan.id}`)
    console.log(`NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID=${premiumPlan.id}`)
    console.log(`PAYPAL_MODE=${mode}`)
    console.log('\n✅ Setup complete!\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

setup()

const PAYPAL_LIVE_API_BASE = 'https://api-m.paypal.com'
const PAYPAL_SANDBOX_API_BASE = 'https://api-m.sandbox.paypal.com'

export function getPayPalApiBase() {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase()

  if (mode === 'sandbox') {
    return PAYPAL_SANDBOX_API_BASE
  }

  // Default to live for production, live credentials, or values like "Live".
  return PAYPAL_LIVE_API_BASE
}

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to authenticate with PayPal')
  }

  return data.access_token as string
}

export async function getPayPalOrder(orderID: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${orderID}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || data.details?.[0]?.description || 'Failed to fetch PayPal order'
    )
  }

  return data
}

export async function capturePayPalOrder(orderID: string) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || data.details?.[0]?.description || 'Failed to capture PayPal order'
    )
  }

  return data
}

export async function verifyOrCapturePayPalOrder(orderID: string) {
  const order = await getPayPalOrder(orderID)

  if (order.status === 'COMPLETED') {
    return order
  }

  if (order.status === 'APPROVED') {
    return capturePayPalOrder(orderID)
  }

  throw new Error(`PayPal order is ${order.status}. Payment was not completed.`)
}

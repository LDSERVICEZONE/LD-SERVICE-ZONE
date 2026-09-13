export function createRazorpayClient({ keyId, keySecret }) {
  return async function razorpayRequest(endpoint, method, body) {
    if (!keyId || !keySecret) {
      throw new Error("Razorpay keys are not configured")
    }
    const authorization = Buffer.from(`${keyId}:${keySecret}`).toString(
      "base64",
    )
    const response = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
      method,
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error?.description || "Razorpay request failed")
    }
    return data
  }
}

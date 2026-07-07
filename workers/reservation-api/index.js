const ALLOWED_ORIGINS = new Set([
  'https://www.chasseautexas.com',
  'https://chasseautexas.com',
  'http://localhost:3000',
  'https://localhost:3000',
])

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://www.chasseautexas.com'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(body, status, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
    },
  })
}

function sanitizeField(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength)
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      })
    }

    if (request.method !== 'POST') {
      return jsonResponse({ success: false, message: 'Method not allowed' }, 405, request)
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.RESERVATION_TO) {
      return jsonResponse(
        { success: false, message: 'Server configuration incomplete' },
        500,
        request
      )
    }

    let payload

    try {
      payload = await request.json()
    } catch {
      return jsonResponse({ success: false, message: 'Invalid JSON body' }, 400, request)
    }

    const name = sanitizeField(payload.name, 256)
    const email = sanitizeField(payload.email, 256)
    const message = sanitizeField(payload.message, 2000)

    if (!name || !email || !message) {
      return jsonResponse(
        { success: false, message: 'Tous les champs sont obligatoires.' },
        400,
        request
      )
    }

    if (!EMAIL_PATTERN.test(email)) {
      return jsonResponse(
        { success: false, message: 'Adresse e-mail invalide.' },
        400,
        request
      )
    }

    const textBody = `Nom: ${name}\nEmail: ${email}\n\n${message}`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'cat-reservation/1.0',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [env.RESERVATION_TO],
        reply_to: email,
        subject: 'Nouvelle réservation — Chasse au Texas',
        text: textBody,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()

      return jsonResponse(
        {
          success: false,
          message: 'Impossible d’envoyer l’e-mail pour le moment.',
          detail: errorText.slice(0, 300),
        },
        502,
        request
      )
    }

    return jsonResponse({ success: true }, 200, request)
  },
}

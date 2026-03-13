// Vercel serverless function — ElevenLabs TTS proxy
// Accepts: POST { word: string, lang: "en-US" | "es-ES" }
// Returns: audio/mpeg binary

const RATE_LIMIT_WINDOW_MS = 60_000        // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30         // max 30 requests per minute per IP

// In-memory rate-limit store (resets on cold start — good enough for free tier protection)
const ipRequests = new Map()

function isRateLimited(ip) {
  const now = Date.now()
  const entry = ipRequests.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequests.set(ip, { windowStart: now, count: 1 })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return true
  entry.count += 1
  return false
}

// Map locale to ElevenLabs voice IDs
// Using well-supported voices from the free tier
const VOICE_MAP = {
  'en-US': 'nPczCjzI2devNBz1zQrb', // Brian — clear, natural English
  'es-ES': 'pqHfZKP75CvOlQylNhV4', // Bill — works for Spanish; fallback if no native ES voice available
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' })
  }

  const { word, lang } = req.body || {}

  if (!word || typeof word !== 'string' || word.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid "word" parameter.' })
  }

  const cleanWord = word.trim().slice(0, 100) // cap at 100 chars to prevent abuse
  const voiceId = VOICE_MAP[lang] || VOICE_MAP['en-US']
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured.' })
  }

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanWord,
          model_id: 'eleven_turbo_v2_5', // cheapest/fastest model, great for single words
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!elevenRes.ok) {
      // If quota exceeded (status 429 from ElevenLabs), signal the frontend to fall back
      if (elevenRes.status === 429) {
        return res.status(429).json({ error: 'quota_exceeded' })
      }
      const errText = await elevenRes.text()
      console.error('ElevenLabs error:', elevenRes.status, errText)
      return res.status(502).json({ error: 'ElevenLabs API error', detail: errText })
    }

    const audioBuffer = await elevenRes.arrayBuffer()

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400') // CDN cache for 24h
    res.status(200).send(Buffer.from(audioBuffer))
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

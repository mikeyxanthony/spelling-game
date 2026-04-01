import { useEffect, useRef, useState } from 'react'

// ── English vocabulary word list ──────────────────────────────────────────────
export const VOCAB_EN = [
  { word: 'basket', def: '' },
  { word: 'rabbit', def: '' },
  { word: 'lesson', def: '' },
  { word: 'letter', def: '' },
  { word: 'invite', def: '' },
  { word: 'bedtime', def: '' },
  { word: 'mammal', def: '' },
  { word: 'number', def: '' },
  { word: 'fellow', def: '' },
  { word: 'chapter', def: '' },
  { word: 'follow', def: '' },
  { word: 'problem', def: '' },
  { word: 'chicken', def: '' },
  { word: 'butter', def: '' },
  { word: 'napkin', def: '' },
  { word: 'hoping', def: '' },
  { word: 'dances', def: '' },
  { word: 'dropped', def: '' },
  { word: 'suppose', def: '' },
  { word: 'stubborn', def: '' },
]

// ── Spanish vocabulary word list (Unidad 5 Semana 2) ─────────────────────────
export const VOCAB_ES = [
  { word: 'rabino', def: '' },
  { word: 'margen', def: '' },
  { word: 'oveja', def: '' },
  { word: 'espuma', def: '' },
  { word: 'tijeras', def: '' },
  { word: 'taza', def: '' },
  { word: 'crisis', def: '' },
  { word: 'palomitas', def: '' },
  { word: 'cueva', def: '' },
  { word: 'calor', def: '' },
]
// ── Server-side ElevenLabs proxy ─────────────────────────────────────────────
const AUDIO_ENDPOINT = '/api/speak'

// ── useSpeech: ElevenLabs TTS hook (Spanish) / Web Speech API (English) ──────
function useSpeech(lang) {
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef(null)

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
    setLoading(false)
  }

  async function speakAudio(text) {
    stopAudio()
    setLoading(true)
    try {
      const response = await fetch(AUDIO_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: text, lang: lang === 'es' ? 'es-ES' : 'en-US' }),
      })
      if (!response.ok) throw new Error('Audio request failed: ' + response.status)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      setLoading(false)
      setSpeaking(true)
      await audio.play()
    } catch (err) {
      console.error('ElevenLabs TTS failed:', err)
      setLoading(false)
      setSpeaking(false)
    }
  }

  function speak(text) {
    speakAudio(text)
  }

  function stop() {
    stopAudio()
  }

  return { speak, stop, speaking, loading }
}



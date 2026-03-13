import { useEffect, useMemo, useRef, useState } from 'react'

const WORDS_EN = [
  'airplane', 'daytime', 'birthday', 'daylight', 'hairdo',
  'somebody', 'birdhouse', 'barefoot', 'headlight', 'sometime',
  'someone', 'newspaper', 'sidewalks', 'basketball', 'stagecoach',
  'placed', 'office', 'giant', 'handwriting', 'windshield',
]

const WORDS_ES = [
  'empresa', 'catedral', 'veraneo', 'Uruguay', 'aproximar',
  'suavecito', 'feo', 'fantástico', 'recreo', 'oído',
]

const UI = {
  en: {
    langToggle: '🇪🇸 Español',
    title: 'Spelling Practice',
    subtitle: 'A simple mobile-friendly game to help your son practice for his spelling test.',
    practiceWords: 'Practice words',
    triesPerWord: 'Tries per word',
    tipBox: (hearWord, check) => <>Tap <strong>{hearWord}</strong>, type the spelling, and press <strong>{check}</strong>. At the end, he can review missed words and hear them again.</>,
    startPractice: 'Start Practice',
    greatWork: 'Great Work!',
    practiceCompleted: 'Practice round completed.',
    correct: 'Correct',
    accuracy: 'Accuracy',
    wordsToReview: 'Words to review',
    noneAllRight: 'None. He got them all right.',
    playAgain: 'Play Again',
    sameOrder: 'Same Order',
    wordOf: (i, total) => `Word ${i} of ${total}`,
    spellWhatYouHear: 'Spell what you hear',
    score: 'Score',
    listen: 'Listen',
    hearWord: 'Hear Word',
    reveal: 'Reveal',
    typeSpelling: 'Type the spelling',
    placeholder: 'Type the word here',
    check: 'Check',
    clear: 'Clear',
    correctFeedback: 'Correct! Nice job.',
    incorrectFeedback: (word) => `Not quite. The correct spelling is ${word}.`,
    retryFeedback: 'Try again. Tap hear word and listen closely.',
    triesFirst: 'You get 2 tries for each word.',
    triesCount: (n) => `Try ${n} of 2`,
    lang: 'en-US',
  },
  es: {
    langToggle: '🇺🇸 English',
    title: 'Práctica de Ortografía',
    subtitle: 'Un juego móvil sencillo para ayudar a tu hijo a practicar su prueba de ortografía.',
    practiceWords: 'Palabras',
    triesPerWord: 'Intentos',
    tipBox: (hearWord, check) => <>Toca <strong>{hearWord}</strong>, escribe la palabra y presiona <strong>{check}</strong>. Al final, puede repasar las palabras que se le escaparon.</>,
    startPractice: 'Comenzar',
    greatWork: '¡Muy Bien!',
    practiceCompleted: 'Ronda de práctica completada.',
    correct: 'Correctas',
    accuracy: 'Precisión',
    wordsToReview: 'Palabras para repasar',
    noneAllRight: 'Ninguna. ¡Las acertó todas!',
    playAgain: 'Jugar de Nuevo',
    sameOrder: 'Mismo Orden',
    wordOf: (i, total) => `Palabra ${i} de ${total}`,
    spellWhatYouHear: 'Escribe lo que escuchas',
    score: 'Puntos',
    listen: 'Escucha',
    hearWord: 'Escuchar',
    reveal: 'Revelar',
    typeSpelling: 'Escribe la palabra',
    placeholder: 'Escribe la palabra aquí',
    check: 'Verificar',
    clear: 'Borrar',
    correctFeedback: '¡Correcto! Muy bien.',
    incorrectFeedback: (word) => `No es correcto. La ortografía correcta es ${word}.`,
    retryFeedback: 'Intenta de nuevo. Toca escuchar y presta atención.',
    triesFirst: 'Tienes 2 intentos por palabra.',
    triesCount: (n) => `Intento ${n} de 2`,
    lang: 'es-ES',
  },
}

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalize(value) {
  return value.trim().toLowerCase()
}

function maskedWord(word) {
  return word.replace(/[\p{L}]/gu, '_')
}

// ---------------------------------------------------------------------------
// TTS — ElevenLabs via proxy, with localStorage cache + Web Speech fallback
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'tts_v1_'
const QUOTA_FLAG_KEY = 'tts_quota_exceeded'

function getCacheKey(word, lang) {
  return CACHE_PREFIX + lang + '_' + word.toLowerCase()
}

function isCacheFresh(entry) {
  // Cache entries expire after 30 days
  return entry && Date.now() - entry.ts < 30 * 24 * 60 * 60 * 1000
}

function readCache(word, lang) {
  try {
    const raw = localStorage.getItem(getCacheKey(word, lang))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!isCacheFresh(entry)) {
      localStorage.removeItem(getCacheKey(word, lang))
      return null
    }
    return entry.dataUrl
  } catch {
    return null
  }
}

function writeCache(word, lang, dataUrl) {
  try {
    localStorage.setItem(getCacheKey(word, lang), JSON.stringify({ dataUrl, ts: Date.now() }))
  } catch {
    // localStorage full — silently ignore
  }
}

function isQuotaExceeded() {
  try {
    const raw = localStorage.getItem(QUOTA_FLAG_KEY)
    if (!raw) return false
    const { until } = JSON.parse(raw)
    // Auto-reset quota flag on the 1st of each month
    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    if (Date.now() > resetDate && until < resetDate) {
      localStorage.removeItem(QUOTA_FLAG_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

function markQuotaExceeded() {
  try {
    localStorage.setItem(QUOTA_FLAG_KEY, JSON.stringify({ until: Date.now() }))
  } catch {}
}

function speakFallback(text, lang) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.78
  utterance.pitch = 1
  utterance.lang = lang
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

async function speak(text, lang) {
  if (typeof window === 'undefined') return

  // 1. Check quota flag — use fallback immediately if quota exceeded
  if (isQuotaExceeded()) {
    speakFallback(text, lang)
    return
  }

  // 2. Check localStorage cache
  const cached = readCache(text, lang)
  if (cached) {
    const audio = new Audio(cached)
    audio.play().catch(() => speakFallback(text, lang))
    return
  }

  // 3. Fetch from proxy
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: text, lang }),
    })

    if (res.status === 429) {
      // Quota exceeded — mark it and fall back
      markQuotaExceeded()
      speakFallback(text, lang)
      return
    }

    if (!res.ok) {
      // Any other error — fall back silently
      speakFallback(text, lang)
      return
    }

    // Convert to base64 data URL and cache it
    const arrayBuffer = await res.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    const dataUrl = `data:audio/mpeg;base64,${base64}`

    writeCache(text, lang, dataUrl)

    const audio = new Audio(dataUrl)
    audio.play().catch(() => speakFallback(text, lang))
  } catch {
    // Network error — fall back
    speakFallback(text, lang)
  }
}

// ---------------------------------------------------------------------------

function ScorePill({ label, value }) {
  return (
    <div className="score-pill">
      <div className="score-value">{value}</div>
      <div className="score-label">{label}</div>
    </div>
  )
}

export default function App() {
  const [locale, setLocale] = useState('en')
  const t = UI[locale]
  const WORDS = locale === 'en' ? WORDS_EN : WORDS_ES

  const [order, setOrder] = useState(() => shuffleArray(WORDS_EN))
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [tries, setTries] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [showWord, setShowWord] = useState(false)
  const [results, setResults] = useState([])
  const inputRef = useRef(null)

  const currentWord = order[index]
  const finished = started && index >= order.length
  const progress = useMemo(() => (index / order.length) * 100, [index, order.length])
  const missedWords = results.filter((item) => !item.correct)
  const accuracy = results.length ? Math.round((score / results.length) * 100) : 0

  useEffect(() => {
    if (started && !finished) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [started, finished, index])

  useEffect(() => {
    if (started && !finished && currentWord) speak(currentWord, t.lang)
  }, [started, finished, currentWord])

  function toggleLocale() {
    const next = locale === 'en' ? 'es' : 'en'
    setLocale(next)
    if (started) {
      const nextWords = next === 'en' ? WORDS_EN : WORDS_ES
      setOrder(shuffleArray(nextWords))
      setStarted(false)
      setIndex(0)
      setAnswer('')
      setScore(0)
      setTries(0)
      setFeedback(null)
      setShowWord(false)
      setResults([])
    }
  }

  function startGame(shuffle = true) {
    setOrder(shuffle ? shuffleArray(WORDS) : [...WORDS])
    setStarted(true)
    setIndex(0)
    setAnswer('')
    setScore(0)
    setTries(0)
    setFeedback(null)
    setShowWord(false)
    setResults([])
  }

  function advanceRound(result) {
    setResults((prev) => [...prev, result])
    setIndex((prev) => prev + 1)
    setAnswer('')
    setTries(0)
    setFeedback(null)
    setShowWord(false)
  }

  function submitAnswer() {
    if (!currentWord) return
    const clean = normalize(answer)
    if (!clean) return

    if (clean === normalize(currentWord)) {
      setScore((prev) => prev + 1)
      setFeedback({ type: 'correct', text: t.correctFeedback })
      setTimeout(() => {
        advanceRound({ word: currentWord, correct: true, userAnswer: clean })
      }, 800)
      return
    }

    const nextTry = tries + 1
    setTries(nextTry)

    if (nextTry >= 2) {
      setShowWord(true)
      setFeedback({ type: 'incorrect', text: t.incorrectFeedback(currentWord) })
      setTimeout(() => {
        advanceRound({ word: currentWord, correct: false, userAnswer: clean })
      }, 1600)
    } else {
      setFeedback({ type: 'retry', text: t.retryFeedback })
      setTimeout(() => speak(currentWord, t.lang), 200)
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitAnswer()
    }
  }

  const LangToggle = () => (
    <button className="lang-toggle" onClick={toggleLocale}>{t.langToggle}</button>
  )

  // --- INTRO SCREEN ---
  if (!started) {
    return (
      <div className="page-shell">
        <div className="app-card intro-card">
          <LangToggle />
          <div className="icon-badge">✏️</div>
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <div className="stats-grid">
            <ScorePill label={t.practiceWords} value={WORDS.length} />
            <ScorePill label={t.triesPerWord} value="2" />
          </div>
          <div className="tip-box">
            {t.tipBox(t.hearWord, t.check)}
          </div>
          <button className="primary-button" onClick={() => startGame(true)}>{t.startPractice}</button>
        </div>
      </div>
    )
  }

  // --- FINISH SCREEN ---
  if (finished) {
    return (
      <div className="page-shell">
        <div className="app-card finish-card">
          <div className="finish-banner">
            <div className="icon-badge dark">🏆</div>
            <h1>{t.greatWork}</h1>
            <p>{t.practiceCompleted}</p>
          </div>
          <div className="stats-grid">
            <ScorePill label={t.correct} value={`${score}/${order.length}`} />
            <ScorePill label={t.accuracy} value={`${accuracy}%`} />
          </div>
          <div className="review-box">
            <div className="review-title">{t.wordsToReview}</div>
            {missedWords.length === 0 ? (
              <div className="review-empty">{t.noneAllRight}</div>
            ) : (
              <div className="chip-wrap">
                {missedWords.map((item) => (
                  <button key={item.word} className="word-chip" onClick={() => speak(item.word, t.lang)}>
                    {item.word}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={() => startGame(true)}>{t.playAgain}</button>
            <button className="secondary-button" onClick={() => startGame(false)}>{t.sameOrder}</button>
          </div>
        </div>
      </div>
    )
  }

  // --- GAME ROUND SCREEN ---
  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="eyebrow">{t.wordOf(index + 1, order.length)}</div>
          <div className="screen-title">{t.spellWhatYouHear}</div>
        </div>
        <ScorePill label={t.score} value={score} />
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="app-card round-card">
        <div className="listen-panel">
          <div className="listen-label">{t.listen}</div>
          <div className="masked-word">{showWord ? currentWord : maskedWord(currentWord)}</div>
          <div className="button-row compact">
            <button className="primary-button" onClick={() => speak(currentWord, t.lang)}>{t.hearWord}</button>
            <button className="ghost-button" onClick={() => setShowWord(true)}>{t.reveal}</button>
          </div>
        </div>
        <div className="field-block">
          <label htmlFor="spelling-input">{t.typeSpelling}</label>
          <input
            id="spelling-input"
            ref={inputRef}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={submitAnswer}>{t.check}</button>
          <button className="secondary-button" onClick={() => setAnswer('')}>{t.clear}</button>
        </div>
        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}
        <div className="tries-text">
          {tries === 0 ? t.triesFirst : t.triesCount(tries + 1)}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import VocabBuilder from './VocabBuilder.jsx'
import SpeedReader from './components/SpeedReader.jsx'

const WORDS_EN = [
  'basket', 'rabbit', 'lesson', 'letter', 'invite',
  'bedtime', 'mammal', 'number', 'fellow', 'chapter',
  'follow', 'problem', 'chicken', 'butter', 'napkin',
  'hoping', 'dances', 'dropped', 'suppose', 'stubborn',
]

const WORDS_ES = [
  'rabino', 'margen', 'oveja', 'espuma', 'tijeras',
  'taza', 'crisis', 'palomitas', 'cueva', 'calor',
]

const UI = {
  en: {
    langToggle: '🇪🇸 Español',
    title: '✏️ Spelling Practice',
    subtitle: 'A fun game to help your son practice for his spelling test!',
    practiceWords: '📚 Practice Words',
    triesPerWord: '🎯 Tries Per Word',
    tipBox: (hearWord, check) => <>Tap <strong>{hearWord}</strong>, type the spelling, and press <strong>{check}</strong>. At the end, he can review missed words and hear them again.</>,
    startPractice: '📝 Start Practice',
    greatWork: '🎉 Great Work!',
    practiceCompleted: 'Practice round completed!',
    correct: '✅ Correct',
    accuracy: '🎯 Accuracy',
    wordsToReview: '📖 Words to Review',
    noneAllRight: '🌟 None — he got them all right!',
    playAgain: '🔄 Play Again',
    sameOrder: '📋 Same Order',
    wordOf: (i, total) => `Word ${i} of ${total}`,
    spellWhatYouHear: '👂 Spell What You Hear',
    score: '⭐ Score',
    listen: '🔊 Listen',
    hearWord: '🔊 Hear Word',
    typeSpelling: '✍️ Type the Spelling',
    placeholder: 'Type the word here...',
    check: '✅ Check',
    clear: '🗑️ Clear',
    correctFeedback: '✅ Correct! Nice job! 🌟',
    incorrectFeedback: (word) => `❌ Not quite. The correct spelling is "${word}".`,
    retryFeedback: '🔄 Try again! Tap Hear Word and listen closely. 👂',
    triesFirst: '🎯 You get 2 tries for each word.',
    triesCount: (n) => `Try ${n} of 2`,
    lang: 'en-US',
  },
  es: {
    langToggle: '🇺🇸 English',
    title: '✏️ Práctica de Ortografía',
    subtitle: '¡Un juego divertido para ayudar a tu hijo a practicar ortografía!',
    practiceWords: '📚 Palabras',
    triesPerWord: '🎯 Intentos',
    tipBox: (hearWord, check) => <>Toca <strong>{hearWord}</strong>, escribe la palabra y presiona <strong>{check}</strong>. Al final, puede repasar las palabras que se le escaparon.</>,
    startPractice: '📝 Comenzar',
    greatWork: '🎉 ¡Muy Bien!',
    practiceCompleted: '¡Ronda de práctica completada!',
    correct: '✅ Correctas',
    accuracy: '🎯 Precisión',
    wordsToReview: '📖 Palabras para Repasar',
    noneAllRight: '🌟 ¡Ninguna — las acertó todas!',
    playAgain: '🔄 Jugar de Nuevo',
    sameOrder: '📋 Mismo Orden',
    wordOf: (i, total) => `Palabra ${i} de ${total}`,
    spellWhatYouHear: '👂 Escribe lo que Escuchas',
    score: '⭐ Puntos',
    listen: '🔊 Escucha',
    hearWord: '🔊 Escuchar',
    typeSpelling: '✍️ Escribe la Palabra',
    placeholder: 'Escribe la palabra aquí...',
    check: '✅ Verificar',
    clear: '🗑️ Borrar',
    correctFeedback: '✅ ¡Correcto! ¡Muy bien! 🌟',
    incorrectFeedback: (word) => `❌ No es correcto. La ortografía correcta es "${word}".`,
    retryFeedback: '🔄 ¡Intenta de nuevo! Toca escuchar y presta atención. 👂',
    triesFirst: '🎯 Tienes 2 intentos por palabra.',
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

const audioRef = { current: null }

function stopAudio() {
  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    audioRef.current = null
  }
}

async function speak(text, lang) {
  if (typeof window === 'undefined' || !text) return

  stopAudio()

  try {
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: text, lang }),
    })

    if (!response.ok) throw new Error('Audio request failed: ' + response.status)

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => {
      if (audioRef.current === audio) audioRef.current = null
      URL.revokeObjectURL(url)
    }
    await audio.play()
  } catch (error) {
    console.error('ElevenLabs audio failed:', error)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.78
    utterance.pitch = 1
    utterance.lang = lang
    window.speechSynthesis?.cancel()
    window.speechSynthesis?.speak(utterance)
  }
}

function ScorePill({ label, value }) {
  return (
    <div className="score-pill">
      <div className="score-value">{value}</div>
      <div className="score-label">{label}</div>
    </div>
  )
}

// ── Home / Mode-selection screen ─────────────────────────────────────────────
function HomeScreen({ onSelectSpelling, onSelectVocab, onSelectSpeedReader }) {
  return (
    <div className="page-shell">
      <div className="app-card home-card">
        <div className="icon-badge">🎓</div>
        <h1>Word Workshop</h1>
        <p className="subtitle">Choose an activity to get started!</p>
        <div className="mode-grid">
          <button className="mode-tile" onClick={onSelectSpelling}>
            <span className="mode-tile-icon">✏️</span>
            <span className="mode-tile-title">Spelling Practice</span>
            <span className="mode-tile-desc">Hear the word and spell it correctly</span>
          </button>
          <button className="mode-tile" onClick={onSelectVocab}>
            <span className="mode-tile-icon">📖</span>
            <span className="mode-tile-title">Vocabulary Builder</span>
            <span className="mode-tile-desc">Learn what the words mean</span>
          </button>
          <button className="mode-tile" onClick={onSelectSpeedReader}>
            <span className="mode-tile-icon">⚡</span>
            <span className="mode-tile-title">Speed Reader</span>
            <span className="mode-tile-desc">Train your brain to read faster</span>
          </button>
        </div>
      </div>
      <footer className="w-full text-center text-xs text-gray-200 mt-12 pb-12">made with 🧠 by michael sarduy</footer>
    </div>
  )
}

export default function App() {
  // top-level mode: 'home' | 'spelling' | 'vocab' | 'speedreader'
  const [mode, setMode] = useState('home')

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

  function goHome() {
    stopAudio()
    setMode('home')
    setStarted(false)
    setIndex(0)
    setAnswer('')
    setScore(0)
    setTries(0)
    setFeedback(null)
    setResults([])
  }

  function toggleLocale() {
    stopAudio()
    const next = locale === 'en' ? 'es' : 'en'
    const nextWords = next === 'en' ? WORDS_EN : WORDS_ES
    setLocale(next)
    setOrder(shuffleArray(nextWords))
    setStarted(false)
    setIndex(0)
    setAnswer('')
    setScore(0)
    setTries(0)
    setFeedback(null)
    setResults([])
  }

  function startGame(shuffle = true) {
    stopAudio()
    setOrder(shuffle ? shuffleArray(WORDS) : [...WORDS])
    setStarted(true)
    setIndex(0)
    setAnswer('')
    setScore(0)
    setTries(0)
    setFeedback(null)
    setResults([])
  }

  function advanceRound(result) {
    setResults((prev) => [...prev, result])
    setIndex((prev) => prev + 1)
    setAnswer('')
    setTries(0)
    setFeedback(null)
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

  // ── HOME SCREEN ──────────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <HomeScreen
        onSelectSpelling={() => setMode('spelling')}
        onSelectVocab={() => setMode('vocab')}
        onSelectSpeedReader={() => setMode('speedreader')}
      />
    )
  }

  // ── SPEED READER MODE ────────────────────────────────────────────────────
  if (mode === 'speedreader') {
    return <SpeedReader onBack={goHome} />
  }

  // ── VOCAB MODE ───────────────────────────────────────────────────────────
  if (mode === 'vocab') {
    return <VocabBuilder onBack={goHome} />
  }

  // ── SPELLING MODE ────────────────────────────────────────────────────────

  // --- INTRO SCREEN ---
  if (!started) {
    return (
      <div className="page-shell">
        <div className="app-card intro-card">
          <button className="back-btn" onClick={goHome}>← Home</button>
          <LangToggle />
          <div className="icon-badge">🌟</div>
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
        <footer className="w-full text-center text-xs text-gray-200 mt-12 pb-12">made with 🧠 by michael sarduy</footer>
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
          <button className="back-btn" style={{ marginTop: '14px' }} onClick={goHome}>← Home</button>
        </div>
        <footer className="w-full text-center text-xs text-gray-200 mt-12 pb-12">made with 🧠 by michael sarduy</footer>
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
          <div className="masked-word">{maskedWord(currentWord)}</div>
          <button className="primary-button" onClick={() => speak(currentWord, t.lang)}>{t.hearWord}</button>
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
      <footer className="w-full text-center text-xs text-gray-200 mt-12 pb-12">made with 🧠 by michael sarduy</footer>
    </div>
  )
}

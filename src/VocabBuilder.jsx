import { useEffect, useRef, useState } from 'react'

// ── English vocabulary word list ──────────────────────────────────────────────
export const VOCAB_EN = [
  { word: 'Citizenship',  def: 'The position of being a citizen of a country with all of the rights that come with it.' },
  { word: 'Continued',    def: 'Goes on without stopping.' },
  { word: 'Daring',       def: 'Courageous and bold.' },
  { word: 'Horrified',    def: 'Filled with great fear, horror, and dislike.' },
  { word: 'Participate',  def: 'Join with others or take part in something.' },
  { word: 'Proposed',     def: 'Suggested something to others for consideration.' },
  { word: 'Unfairness',   def: 'State of being unfair or unjust.' },
  { word: 'Waver',        def: 'To pause when being unsure.' },
]

// ── Spanish vocabulary word list (Unidad 5 Semana 2) ─────────────────────────
export const VOCAB_ES = [
  { word: 'Antepasado', def: 'Persona de la que descendemos.' },
  { word: 'Arder',      def: 'Prenderse fuego.' },
  { word: 'Envejecer',  def: 'Volverse más viejo.' },
  { word: 'Oficio',     def: 'Trabajo que requiere habilidades manuales.' },
  { word: 'Oxidado',    def: 'Transformado por acción del oxígeno.' },
  { word: 'Reciclar',   def: 'Procesar un material para usarlo nuevamente.' },
  { word: 'Serrar',     def: 'Cortar algo con una sierra.' },
]

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ── ScorePill (local copy so VocabBuilder is self-contained) ─────────────────
function ScorePill({ label, value }) {
  return (
    <div className="score-pill">
      <div className="score-value">{value}</div>
      <div className="score-label">{label}</div>
    </div>
  )
}

// ── ElevenLabs voice ID for Spanish ──────────────────────────────────────────
// Using the "Bella" multilingual voice (supports Spanish natively)
const ELEVENLABS_API_KEY = 'sk_715e7b031ffb11753f47e5f5a63afe43534c4288ca1c1c3f'
const ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL' // Bella — multilingual, clear Spanish

// ── useSpeech: ElevenLabs TTS hook (Spanish) / Web Speech API (English) ──────
function useSpeech(lang) {
  const [speaking, setSpeaking]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const audioRef                  = useRef(null)

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setSpeaking(false)
    setLoading(false)
  }

  async function speakElevenLabs(text) {
    stopAudio()
    setLoading(true)
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      )
      if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`)
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
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

  function speakWebSpeech(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.onstart = () => setSpeaking(true)
    utter.onend   = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utter)
  }

  function speak(text) {
    if (lang === 'es') {
      speakElevenLabs(text)
    } else {
      speakWebSpeech(text)
    }
  }

  function stop() {
    if (lang === 'es') {
      stopAudio()
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }

  return { speak, stop, speaking, loading }
}

// ════════════════════════════════════════════════════════════════════════════
// FLASHCARDS
// ════════════════════════════════════════════════════════════════════════════
function Flashcards({ vocab, lang, onBack }) {
  const [deck] = useState(() => shuffleArray(vocab))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const { speak, stop, speaking, loading } = useSpeech(lang)

  const card = deck[idx]

  // Stop any ongoing speech when card changes
  useEffect(() => { stop() }, [idx])

  function next() {
    if (idx < deck.length - 1) {
      setIdx((i) => i + 1)
      setFlipped(false)
      setReviewed((r) => Math.max(r, idx + 2))
    }
  }

  function prev() {
    if (idx > 0) {
      setIdx((i) => i - 1)
      setFlipped(false)
    }
  }

  function handleFlip() {
    setFlipped((f) => !f)
    if (!flipped && idx + 1 > reviewed) setReviewed(idx + 1)
  }

  function handleSpeak(e) {
    e.stopPropagation() // don't flip the card
    if (speaking) {
      stop()
    } else {
      const text = `${card.word}. ${card.def}`
      speak(text)
    }
  }

  const progress = ((idx + 1) / deck.length) * 100

  return (
    <div className="page-shell">
      <div className="vocab-top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="vocab-eyebrow">Flashcards · {idx + 1} / {deck.length}</div>
        <ScorePill label="Reviewed" value={reviewed} />
      </div>
      <div className="progress-track" style={{ marginBottom: '18px' }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div
        className={`flashcard-scene${flipped ? ' is-flipped' : ''}`}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleFlip()}
        aria-label={flipped ? `Definition: ${card.def}` : `Word: ${card.word}. Tap to flip.`}
      >
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-hint">TAP TO FLIP</div>
            <div className="flashcard-word">{card.word}</div>
            <div className="flashcard-badge">Word</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-hint">TAP TO FLIP BACK</div>
            <div className="flashcard-def">{card.def}</div>
            <div className="flashcard-badge flashcard-badge-def">Definition</div>
          </div>
        </div>
      </div>

      {/* TTS button — only shown for Spanish mode */}
      {lang === 'es' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
          <button
            className={`tts-btn${speaking ? ' tts-btn-speaking' : ''}`}
            onClick={handleSpeak}
            disabled={loading}
            aria-label={speaking ? 'Stop audio' : loading ? 'Loading audio…' : 'Listen to word and definition'}
            title={speaking ? 'Stop' : loading ? 'Loading…' : 'Listen'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '999px',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              background: speaking
                ? 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)'
                : loading
                ? 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
              transition: 'background 0.2s, transform 0.1s',
            }}
          >
            <span style={{ fontSize: '18px' }}>
              {loading ? '⏳' : speaking ? '⏹' : '🔊'}
            </span>
            {loading ? 'Cargando…' : speaking ? 'Detener' : 'Escuchar'}
          </button>
        </div>
      )}

      <div className="fc-nav">
        <button
          className="secondary-button fc-nav-btn"
          onClick={prev}
          disabled={idx === 0}
        >
          ← Prev
        </button>
        <button
          className="primary-button fc-nav-btn"
          onClick={next}
          disabled={idx === deck.length - 1}
        >
          Next →
        </button>
      </div>

      {idx === deck.length - 1 && (
        <div className="fc-done-msg">
          🎉 You've gone through all {deck.length} cards!
        </div>
      )}
      <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// QUIZ
// ════════════════════════════════════════════════════════════════════════════
function buildQuizQuestions(vocab) {
  const shuffled = shuffleArray(vocab)
  return shuffled.map((item) => {
    // pick 3 wrong options from the rest
    const others = vocab.filter((v) => v.word !== item.word)
    const wrong = shuffleArray(others).slice(0, 3)
    const options = shuffleArray([item, ...wrong])
    return { item, options }
  })
}

function Quiz({ vocab, onBack }) {
  const [questions] = useState(() => buildQuizQuestions(vocab))
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[qIdx]
  const answered = selected !== null
  const isCorrect = answered && selected === q.item.word
  const accuracy = Math.round((score / questions.length) * 100)

  function choose(word) {
    if (answered) return
    setSelected(word)
    if (word === q.item.word) setScore((s) => s + 1)
  }

  function next() {
    if (qIdx + 1 >= questions.length) {
      setDone(true)
    } else {
      setQIdx((i) => i + 1)
      setSelected(null)
    }
  }

  if (done) {
    return (
      <div className="page-shell">
        <div className="app-card vocab-result-card">
          <div className="finish-banner">
            <div className="icon-badge dark">🏆</div>
            <h1>Quiz Complete!</h1>
            <p>Great job working through all the words!</p>
          </div>
          <div className="stats-grid">
            <ScorePill label="✅ Correct" value={`${score}/${questions.length}`} />
            <ScorePill label="🎯 Accuracy" value={`${accuracy}%`} />
          </div>
          <div className="button-row" style={{ marginTop: '22px' }}>
            <button className="primary-button" onClick={() => { setQIdx(0); setSelected(null); setScore(0); setDone(false) }}>🔄 Play Again</button>
            <button className="secondary-button" onClick={onBack}>← Back</button>
          </div>
        </div>
        <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
      </div>
    )
  }

  const progress = ((qIdx + 1) / questions.length) * 100

  return (
    <div className="page-shell">
      <div className="vocab-top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="vocab-eyebrow">Quiz · {qIdx + 1} / {questions.length}</div>
        <ScorePill label="⭐ Score" value={score} />
      </div>
      <div className="progress-track" style={{ marginBottom: '18px' }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="app-card quiz-card">
        <div className="quiz-prompt-label">Which word matches this definition?</div>
        <div className="quiz-definition">{q.item.def}</div>
        <div className="quiz-options">
          {q.options.map((opt) => {
            let cls = 'quiz-option'
            if (answered) {
              if (opt.word === q.item.word) cls += ' quiz-option-correct'
              else if (opt.word === selected) cls += ' quiz-option-wrong'
            }
            return (
              <button
                key={opt.word}
                className={cls}
                onClick={() => choose(opt.word)}
                disabled={answered}
              >
                {opt.word}
              </button>
            )
          })}
        </div>
        {answered && (
          <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: '14px' }}>
            {isCorrect ? '✅ Correct! Great job! 🌟' : `❌ Not quite — the answer is "${q.item.word}"`}
          </div>
        )}
        {answered && (
          <button className="primary-button" style={{ marginTop: '14px' }} onClick={next}>
            {qIdx + 1 >= questions.length ? '🏁 See Results' : 'Next →'}
          </button>
        )}
      </div>
      <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MATCHING GAME
// ════════════════════════════════════════════════════════════════════════════
const MATCH_PAIR_COUNT = 6

function buildMatchDeck(vocab) {
  const count = Math.min(MATCH_PAIR_COUNT, vocab.length)
  const chosen = shuffleArray(vocab).slice(0, count)
  const cards = []
  chosen.forEach((item, i) => {
    cards.push({ id: `w-${i}`, pairId: i, type: 'word',       text: item.word })
    cards.push({ id: `d-${i}`, pairId: i, type: 'definition', text: item.def  })
  })
  return shuffleArray(cards)
}

function MatchingGame({ vocab, onBack }) {
  const [cards, setCards] = useState(() => buildMatchDeck(vocab))
  const [flipped, setFlipped] = useState([])    // ids of currently face-up (unmatched) selection
  const [matched, setMatched] = useState([])    // ids of successfully matched cards
  const [wrong, setWrong]     = useState([])    // ids briefly highlighted wrong
  const [moves, setMoves]     = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone]       = useState(false)
  const timerRef = useRef(null)

  const pairCount = cards.length / 2

  // Start timer on first flip
  function ensureTimer() {
    if (!running) {
      setRunning(true)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    }
  }

  useEffect(() => {
    if (done && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [done])

  function flipCard(id) {
    if (matched.includes(id) || wrong.length > 0) return
    if (flipped.includes(id)) return
    if (flipped.length >= 2) return

    ensureTimer()
    const nextFlipped = [...flipped, id]
    setFlipped(nextFlipped)

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1)
      const [aId, bId] = nextFlipped
      const a = cards.find((c) => c.id === aId)
      const b = cards.find((c) => c.id === bId)

      if (a.pairId === b.pairId && a.type !== b.type) {
        // Match!
        const newMatched = [...matched, aId, bId]
        setMatched(newMatched)
        setFlipped([])
        if (newMatched.length === cards.length) {
          setDone(true)
        }
      } else {
        // No match — briefly show wrong state then flip back
        setWrong(nextFlipped)
        setTimeout(() => {
          setFlipped([])
          setWrong([])
        }, 900)
      }
    }
  }

  function restart() {
    clearInterval(timerRef.current)
    timerRef.current = null
    setCards(buildMatchDeck(vocab))
    setFlipped([])
    setMatched([])
    setWrong([])
    setMoves(0)
    setElapsed(0)
    setRunning(false)
    setDone(false)
  }

  const matchCount = matched.length / 2
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')

  if (done) {
    return (
      <div className="page-shell">
        <div className="app-card vocab-result-card">
          <div className="finish-banner">
            <div className="icon-badge dark">🎉</div>
            <h1>All Matched!</h1>
            <p>You found every pair!</p>
          </div>
          <div className="stats-grid">
            <ScorePill label="⏱ Time" value={`${mins}:${secs}`} />
            <ScorePill label="🎯 Moves" value={moves} />
          </div>
          <div className="button-row" style={{ marginTop: '22px' }}>
            <button className="primary-button" onClick={restart}>🔄 Play Again</button>
            <button className="secondary-button" onClick={onBack}>← Back</button>
          </div>
        </div>
        <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="vocab-top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="vocab-eyebrow">Matching</div>
        <div className="match-meta">
          <span>⏱ {mins}:{secs}</span>
          <span>🎯 {matchCount}/{pairCount}</span>
        </div>
      </div>

      <div className="match-grid">
        {cards.map((card) => {
          const isFlipped  = flipped.includes(card.id) || matched.includes(card.id)
          const isMatched  = matched.includes(card.id)
          const isWrong    = wrong.includes(card.id)
          let cls = 'match-card'
          if (isFlipped) cls += ' match-card-flipped'
          if (isMatched) cls += ' match-card-matched'
          if (isWrong)   cls += ' match-card-wrong'

          return (
            <button
              key={card.id}
              className={cls}
              onClick={() => flipCard(card.id)}
              disabled={isMatched}
              aria-label={isFlipped ? card.text : 'Hidden card'}
            >
              {isFlipped ? (
                <span className={`match-card-text${card.type === 'definition' ? ' match-card-text-def' : ''}`}>
                  {card.text}
                </span>
              ) : (
                <span className="match-card-hidden">?</span>
              )}
            </button>
          )
        })}
      </div>
      <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// VOCAB BUILDER ROOT — language picker + activity routing
// ════════════════════════════════════════════════════════════════════════════
export default function VocabBuilder({ onBack }) {
  // lang: null | 'en' | 'es'
  const [lang, setLang] = useState(null)
  // activity: null | 'flashcards' | 'quiz' | 'matching'
  const [activity, setActivity] = useState(null)

  const vocab = lang === 'es' ? VOCAB_ES : VOCAB_EN

  if (lang && activity === 'flashcards') return <Flashcards vocab={vocab} lang={lang} onBack={() => setActivity(null)} />
  if (lang && activity === 'quiz')       return <Quiz       vocab={vocab} onBack={() => setActivity(null)} />
  if (lang && activity === 'matching')   return <MatchingGame vocab={vocab} onBack={() => setActivity(null)} />

  // Language picker
  if (!lang) {
    return (
      <div className="page-shell">
        <div className="app-card vocab-picker-card">
          <button className="back-btn" onClick={onBack}>← Home</button>
          <div className="icon-badge" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}>📖</div>
          <h1>Vocabulary Builder</h1>
          <p className="subtitle">Choose a language to study!</p>
          <div className="activity-list">
            <button className="activity-tile" onClick={() => setLang('en')}>
              <span className="activity-tile-icon">🇺🇸</span>
              <div className="activity-tile-body">
                <div className="activity-tile-title">English</div>
                <div className="activity-tile-desc">{VOCAB_EN.length} words · Spelling &amp; Vocabulary</div>
              </div>
              <span className="activity-tile-arrow">›</span>
            </button>
            <button className="activity-tile" onClick={() => setLang('es')}>
              <span className="activity-tile-icon">🇪🇸</span>
              <div className="activity-tile-body">
                <div className="activity-tile-title">Español — Unidad 5 Semana 2</div>
                <div className="activity-tile-desc">{VOCAB_ES.length} palabras · Vocabulario</div>
              </div>
              <span className="activity-tile-arrow">›</span>
            </button>
          </div>
        </div>
        <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
      </div>
    )
  }

  // Activity picker (after language is chosen)
  return (
    <div className="page-shell">
      <div className="app-card vocab-picker-card">
        <button className="back-btn" onClick={() => setLang(null)}>← Languages</button>
        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}>📖</div>
        <h1>Vocabulary Builder</h1>
        <p className="subtitle">
          {lang === 'es' ? 'Elige una actividad para aprender las palabras!' : 'Choose an activity to learn the words!'}
        </p>
        <div className="activity-list">
          <button className="activity-tile" onClick={() => setActivity('flashcards')}>
            <span className="activity-tile-icon">🃏</span>
            <div className="activity-tile-body">
              <div className="activity-tile-title">Flashcards</div>
              <div className="activity-tile-desc">{vocab.length} cards · Tap to reveal the definition</div>
            </div>
            <span className="activity-tile-arrow">›</span>
          </button>
          <button className="activity-tile" onClick={() => setActivity('quiz')}>
            <span className="activity-tile-icon">🧠</span>
            <div className="activity-tile-body">
              <div className="activity-tile-title">Quiz</div>
              <div className="activity-tile-desc">{vocab.length} questions · Pick the right word</div>
            </div>
            <span className="activity-tile-arrow">›</span>
          </button>
          <button className="activity-tile" onClick={() => setActivity('matching')}>
            <span className="activity-tile-icon">🔗</span>
            <div className="activity-tile-body">
              <div className="activity-tile-title">Matching Game</div>
              <div className="activity-tile-desc">{Math.min(MATCH_PAIR_COUNT, vocab.length)} pairs · Match words to definitions</div>
            </div>
            <span className="activity-tile-arrow">›</span>
          </button>
        </div>
      </div>
      <footer className="w-full text-center text-xs text-gray-300 py-8 mt-auto">made with 🧠 by michael sarduy</footer>
    </div>
  )
}


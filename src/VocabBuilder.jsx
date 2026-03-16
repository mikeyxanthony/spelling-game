import { useEffect, useRef, useState } from 'react'

// ── Vocabulary word list with kid-friendly definitions ────────────────────────
export const VOCAB = [
  { word: 'airplane',    def: 'A large flying machine with wings and engines that carries people through the sky.' },
  { word: 'daytime',     def: 'The part of the day when the sun is up and it is light outside.' },
  { word: 'birthday',    def: 'The special day each year that marks the day you were born.' },
  { word: 'daylight',    def: 'The natural light that comes from the sun during the day.' },
  { word: 'hairdo',      def: 'The way someone styles or arranges the hair on their head.' },
  { word: 'somebody',    def: 'A person; used when you do not know exactly who the person is.' },
  { word: 'birdhouse',   def: 'A small wooden box put outside for birds to live and build their nests in.' },
  { word: 'barefoot',    def: 'Walking or standing without any shoes or socks on your feet.' },
  { word: 'headlight',   def: 'A bright light on the front of a car or bike that helps you see in the dark.' },
  { word: 'sometime',    def: 'At some point in the future or the past, but not at a specific time.' },
  { word: 'someone',     def: 'A person; used when you are not saying exactly which person.' },
  { word: 'newspaper',   def: 'Large folded sheets of paper printed with news, stories, and pictures.' },
  { word: 'sidewalks',   def: 'Paved paths along the side of a street where people walk safely.' },
  { word: 'basketball',  def: 'A sport where two teams try to throw an orange ball through a high hoop.' },
  { word: 'stagecoach',  def: 'An old horse-drawn carriage that carried passengers and mail across long distances.' },
  { word: 'placed',      def: 'Put something carefully in a particular spot or position.' },
  { word: 'office',      def: 'A room or building where people sit at desks and do their work.' },
  { word: 'giant',       def: 'Something or someone that is much bigger than normal size.' },
  { word: 'handwriting', def: 'Words or letters written by hand with a pen or pencil, not typed.' },
  { word: 'windshield',  def: 'The large glass window at the front of a car that protects passengers from wind.' },
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

// ════════════════════════════════════════════════════════════════════════════
// FLASHCARDS
// ════════════════════════════════════════════════════════════════════════════
function Flashcards({ onBack }) {
  const [deck] = useState(() => shuffleArray(VOCAB))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  const card = deck[idx]

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
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// QUIZ
// ════════════════════════════════════════════════════════════════════════════
function buildQuizQuestions() {
  const shuffled = shuffleArray(VOCAB)
  return shuffled.map((item) => {
    // pick 3 wrong options from the rest
    const others = VOCAB.filter((v) => v.word !== item.word)
    const wrong = shuffleArray(others).slice(0, 3)
    const options = shuffleArray([item, ...wrong])
    return { item, options }
  })
}

function Quiz({ onBack }) {
  const [questions] = useState(() => buildQuizQuestions())
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
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MATCHING GAME
// ════════════════════════════════════════════════════════════════════════════
const MATCH_PAIR_COUNT = 8

function buildMatchDeck() {
  const chosen = shuffleArray(VOCAB).slice(0, MATCH_PAIR_COUNT)
  const cards = []
  chosen.forEach((item, i) => {
    cards.push({ id: `w-${i}`, pairId: i, type: 'word',       text: item.word })
    cards.push({ id: `d-${i}`, pairId: i, type: 'definition', text: item.def  })
  })
  return shuffleArray(cards)
}

function MatchingGame({ onBack }) {
  const [cards, setCards] = useState(() => buildMatchDeck())
  const [flipped, setFlipped] = useState([])    // ids of currently face-up (unmatched) selection
  const [matched, setMatched] = useState([])    // ids of successfully matched cards
  const [wrong, setWrong]     = useState([])    // ids briefly highlighted wrong
  const [moves, setMoves]     = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone]       = useState(false)
  const timerRef = useRef(null)

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
    setCards(buildMatchDeck())
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
          <span>🎯 {matchCount}/{MATCH_PAIR_COUNT}</span>
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
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// VOCAB BUILDER ROOT — activity picker + sub-activity routing
// ════════════════════════════════════════════════════════════════════════════
export default function VocabBuilder({ onBack }) {
  // activity: null | 'flashcards' | 'quiz' | 'matching'
  const [activity, setActivity] = useState(null)

  if (activity === 'flashcards') return <Flashcards onBack={() => setActivity(null)} />
  if (activity === 'quiz')       return <Quiz       onBack={() => setActivity(null)} />
  if (activity === 'matching')   return <MatchingGame onBack={() => setActivity(null)} />

  return (
    <div className="page-shell">
      <div className="app-card vocab-picker-card">
        <button className="back-btn" onClick={onBack}>← Home</button>
        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}>📖</div>
        <h1>Vocabulary Builder</h1>
        <p className="subtitle">Choose an activity to learn the words!</p>
        <div className="activity-list">
          <button className="activity-tile" onClick={() => setActivity('flashcards')}>
            <span className="activity-tile-icon">🃏</span>
            <div className="activity-tile-body">
              <div className="activity-tile-title">Flashcards</div>
              <div className="activity-tile-desc">{VOCAB.length} cards · Tap to reveal the definition</div>
            </div>
            <span className="activity-tile-arrow">›</span>
          </button>
          <button className="activity-tile" onClick={() => setActivity('quiz')}>
            <span className="activity-tile-icon">🧠</span>
            <div className="activity-tile-body">
              <div className="activity-tile-title">Quiz</div>
              <div className="activity-tile-desc">{VOCAB.length} questions · Pick the right word</div>
            </div>
            <span className="activity-tile-arrow">›</span>
          </button>
          <button className="activity-tile" onClick={() => setActivity('matching')}>
            <span className="activity-tile-icon">🔗</span>
            <div className="activity-tile-body">
              <div className="activity-tile-title">Matching Game</div>
              <div className="activity-tile-desc">{MATCH_PAIR_COUNT} pairs · Match words to definitions</div>
            </div>
            <span className="activity-tile-arrow">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}

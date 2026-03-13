import { useEffect, useMemo, useRef, useState } from 'react'

const WORDS = [
  'airplane', 'daytime', 'birthday', 'daylight', 'hairdo',
  'somebody', 'birdhouse', 'barefoot', 'headlight', 'sometime',
  'someone', 'newspaper', 'sidewalks', 'basketball', 'stagecoach',
  'placed', 'office', 'giant', 'handwriting', 'windshield',
]

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
  return word.replace(/[a-z]/gi, '_')
}

function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.78
  utterance.pitch = 1
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function ScorePill({ label, value }) {
  return (
    <div className="score-pill">
      <div className="score-value">{value}</div>
      <div className="score-label">{label}</div>
    </div>
  )
}

export default function App() {
  const [order, setOrder] = useState(() => shuffleArray(WORDS))
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
    if (started && !finished && currentWord) speak(currentWord)
  }, [started, finished, currentWord])

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
      setFeedback({ type: 'correct', text: 'Correct! Nice job.' })
      setTimeout(() => {
        advanceRound({ word: currentWord, correct: true, userAnswer: clean })
      }, 800)
      return
    }

    const nextTry = tries + 1
    setTries(nextTry)

    if (nextTry >= 2) {
      setShowWord(true)
      setFeedback({ type: 'incorrect', text: `Not quite. The correct spelling is ${currentWord}.` })
      setTimeout(() => {
        advanceRound({ word: currentWord, correct: false, userAnswer: clean })
      }, 1600)
    } else {
      setFeedback({ type: 'retry', text: 'Try again. Tap hear word and listen closely.' })
      setTimeout(() => speak(currentWord), 200)
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitAnswer()
    }
  }

  if (!started) {
    return (
      <div className="page-shell">
        <div className="app-card intro-card">
          <div className="icon-badge">✏️</div>
          <h1>Spelling Practice</h1>
          <p className="subtitle">A simple mobile-friendly game to help your son practice for his spelling test.</p>
          <div className="stats-grid">
            <ScorePill label="Practice words" value="20" />
            <ScorePill label="Tries per word" value="2" />
          </div>
          <div className="tip-box">
            Tap <strong>Hear Word</strong>, type the spelling, and press <strong>Check</strong>. At the end, he can review missed words and hear them again.
          </div>
          <button className="primary-button" onClick={() => startGame(true)}>Start Practice</button>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="page-shell">
        <div className="app-card finish-card">
          <div className="finish-banner">
            <div className="icon-badge dark">🏆</div>
            <h1>Great Work!</h1>
            <p>Practice round completed.</p>
          </div>
          <div className="stats-grid">
            <ScorePill label="Correct" value={`${score}/${order.length}`} />
            <ScorePill label="Accuracy" value={`${accuracy}%`} />
          </div>
          <div className="review-box">
            <div className="review-title">Words to review</div>
            {missedWords.length === 0 ? (
              <div className="review-empty">None. He got them all right.</div>
            ) : (
              <div className="chip-wrap">
                {missedWords.map((item) => (
                  <button key={item.word} className="word-chip" onClick={() => speak(item.word)}>
                    {item.word}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={() => startGame(true)}>Play Again</button>
            <button className="secondary-button" onClick={() => startGame(false)}>Same Order</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="eyebrow">Word {index + 1} of {order.length}</div>
          <div className="screen-title">Spell what you hear</div>
        </div>
        <ScorePill label="Score" value={score} />
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="app-card round-card">
        <div className="listen-panel">
          <div className="listen-label">Listen</div>
          <div className="masked-word">{showWord ? currentWord : maskedWord(currentWord)}</div>
          <div className="button-row compact">
            <button className="primary-button" onClick={() => speak(currentWord)}>Hear Word</button>
            <button className="ghost-button" onClick={() => setShowWord(true)}>Reveal</button>
          </div>
        </div>
        <div className="field-block">
          <label htmlFor="spelling-input">Type the spelling</label>
          <input
            id="spelling-input"
            ref={inputRef}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type the word here"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={submitAnswer}>Check</button>
          <button className="secondary-button" onClick={() => setAnswer('')}>Clear</button>
        </div>
        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}
        <div className="tries-text">
          {tries === 0 ? 'You get 2 tries for each word.' : `Try ${tries + 1} of 2`}
        </div>
      </div>
    </div>
  )
}

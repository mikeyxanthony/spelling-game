import { useEffect, useRef, useState, useCallback } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────
function chunkArray(words, size) {
  const chunks = []
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '))
  }
  return chunks
}

// ── Preset passages Gabriel can practice with ─────────────────────────────────
const SAMPLE_PASSAGES = [
  {
    label: '🦁 The Lion and the Mouse',
    text: "Once upon a time a lion was sleeping in the jungle. A little mouse ran across his paw and woke him up. The lion was very angry and grabbed the mouse. The mouse begged the lion to let him go and promised to help him one day. The lion laughed but let him go. Later the lion got trapped in a hunter's net. He roared loudly. The little mouse heard him and came running. The mouse chewed through the ropes and set the lion free. Even the smallest friend can be a great help.",
  },
  {
    label: '🚀 Space Explorers',
    text: 'Astronauts are brave explorers who travel into outer space. They live on the International Space Station which orbits Earth every 90 minutes. In space everything floats because there is very little gravity. Astronauts must exercise for two hours every day to keep their muscles strong. They eat special food that is sealed in pouches. From the windows of the station they can see thunderstorms lightning oceans mountains and city lights at night. One day humans hope to travel all the way to Mars.',
  },
  {
    label: '🌊 The Ocean',
    text: 'The ocean covers more than seventy percent of our planet. It is home to millions of creatures from tiny plankton to the enormous blue whale. Coral reefs are sometimes called the rainforests of the sea because so many animals live there. The ocean regulates the temperature of Earth and produces more than half of the oxygen we breathe. Exploring the deep ocean is harder than exploring space because the pressure is so extreme. Scientists are still discovering new species in the deepest parts of the sea.',
  },
]

const DEFAULT_WPM = 250
const DEFAULT_CHUNK = 1
const MIN_WPM = 60
const MAX_WPM = 800
const RSVP_CHUNK_OPTIONS = [1, 2, 3]

// ── Styles (dark-mode, consistent with existing app palette) ──────────────────
const S = {
  shell: {
    minHeight: '100dvh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 16px 40px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#f0f0f0',
  },
  card: {
    background: 'rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '24px 20px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#a0c4ff',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: '12px',
    display: 'block',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#a0c4ff',
    marginBottom: '6px',
  },
  row: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  primaryBtn: {
    flex: 1,
    minWidth: '120px',
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#0a1628',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  secondaryBtn: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#f0f0f0',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
  },
  rsvpBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '120px',
    background: 'rgba(0,0,0,0.35)',
    borderRadius: '16px',
    marginBottom: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  rsvpWord: {
    fontSize: 'clamp(26px, 7vw, 44px)',
    fontWeight: 800,
    letterSpacing: '0.04em',
    color: '#ffffff',
    textAlign: 'center',
    padding: '0 16px',
    lineHeight: 1.2,
  },
  rsvpFocusBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '3px',
    background: 'rgba(79,172,254,0.5)',
    borderRadius: '2px',
  },
  progressTrack: {
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    marginBottom: '14px',
    overflow: 'hidden',
  },
  rangeInput: {
    width: '100%',
    accentColor: '#4facfe',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#f0f0f0',
    fontSize: '14px',
    lineHeight: 1.6,
    padding: '12px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    marginBottom: '10px',
  },
  chunkBtn: (active) => ({
    padding: '7px 16px',
    borderRadius: '8px',
    border: '2px solid',
    borderColor: active ? '#4facfe' : 'rgba(255,255,255,0.2)',
    background: active ? 'rgba(79,172,254,0.15)' : 'transparent',
    color: active ? '#4facfe' : '#ccc',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  }),
  statPill: {
    background: 'rgba(79,172,254,0.12)',
    border: '1px solid rgba(79,172,254,0.3)',
    borderRadius: '10px',
    padding: '6px 14px',
    fontSize: '13px',
    color: '#a0c4ff',
    fontWeight: 600,
  },
  doneText: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '8px',
  },
  passageBtn: (active) => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    marginBottom: '8px',
    borderRadius: '10px',
    border: '2px solid',
    borderColor: active ? '#4facfe' : 'rgba(255,255,255,0.15)',
    background: active ? 'rgba(79,172,254,0.1)' : 'rgba(0,0,0,0.2)',
    color: active ? '#4facfe' : '#ccc',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.15s',
  }),
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SpeedReader({ onBack }) {
  const [screen, setScreen] = useState('setup') // 'setup' | 'reading' | 'done'
  const [wpm, setWpm] = useState(DEFAULT_WPM)
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK)
  const [customText, setCustomText] = useState('')
  const [selectedPassage, setSelectedPassage] = useState(0) // index or -1 for custom
  const [chunks, setChunks] = useState([])
  const [chunkIndex, setChunkIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef(null)

  const msPerChunk = Math.round((60 / wpm) * chunkSize * 1000)

  // Active text
  const activeText =
    selectedPassage === -1
      ? customText
      : SAMPLE_PASSAGES[selectedPassage]?.text ?? ''

  // ── Ticker ──────────────────────────────────────────────────────────────────
  const clearTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTicker = useCallback(
    (startIdx, chunkList, ms) => {
      clearTicker()
      let idx = startIdx
      intervalRef.current = setInterval(() => {
        idx += 1
        if (idx >= chunkList.length) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setChunkIndex(chunkList.length)
          setScreen('done')
        } else {
          setChunkIndex(idx)
        }
      }, ms)
    },
    [clearTicker]
  )

  useEffect(() => {
    return clearTicker
  }, [clearTicker])

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleStart() {
    const words = activeText.trim().split(/\s+/).filter(Boolean)
    if (words.length < 1) return
    const built = chunkArray(words, chunkSize)
    setChunks(built)
    setChunkIndex(0)
    setPaused(false)
    setScreen('reading')
    startTicker(0, built, msPerChunk)
  }

  function handlePause() {
    if (paused) {
      setPaused(false)
      startTicker(chunkIndex, chunks, msPerChunk)
    } else {
      setPaused(true)
      clearTicker()
    }
  }

  function handleRestart() {
    clearTicker()
    setChunkIndex(0)
    setPaused(false)
    setScreen('reading')
    startTicker(0, chunks, msPerChunk)
  }

  function handleBackToSetup() {
    clearTicker()
    setScreen('setup')
    setChunks([])
    setChunkIndex(0)
    setPaused(false)
  }

  // ── Screens ──────────────────────────────────────────────────────────────────

  // DONE screen
  if (screen === 'done') {
    const wordCount = chunks.join(' ').split(/\s+/).length
    const timeTaken = Math.round((wordCount / wpm) * 60)
    return (
      <div style={S.shell}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={S.doneText}>🎉</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '24px' }}>You finished!</h2>
          <p style={{ color: '#a0c4ff', margin: '0 0 20px', fontSize: '15px' }}>
            {wordCount} words · ~{timeTaken}s · {wpm} WPM
          </p>
          <div style={S.row}>
            <button style={S.primaryBtn} onClick={handleRestart}>🔄 Read Again</button>
            <button style={S.secondaryBtn} onClick={handleBackToSetup}>📝 New Text</button>
          </div>
          <button style={S.backBtn} onClick={onBack}>← Home</button>
        </div>
      </div>
    )
  }

  // READING screen
  if (screen === 'reading') {
    const progress = chunks.length ? (chunkIndex / chunks.length) * 100 : 0
    const currentChunk = chunks[chunkIndex] ?? ''
    const remaining = chunks.length - chunkIndex
    const secsLeft = Math.round((remaining * chunkSize) / wpm * 60)
    return (
      <div style={S.shell}>
        <div style={{ ...S.card, maxWidth: '520px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <button style={S.backBtn} onClick={handleBackToSetup} aria-label="Back to setup">
              ← Setup
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={S.statPill}>{wpm} WPM</span>
              <span style={S.statPill}>~{secsLeft}s left</span>
            </div>
          </div>
          <div style={S.progressTrack}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4facfe, #00f2fe)',
                borderRadius: '3px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <div style={S.rsvpBox} aria-live="polite" aria-label="Current word">
            <div style={S.rsvpFocusBar} />
            <div style={S.rsvpWord}>{currentChunk}</div>
          </div>
          <div style={S.row}>
            <button style={S.primaryBtn} onClick={handlePause}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button style={S.secondaryBtn} onClick={handleRestart}>↩ Restart</button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#888', marginTop: '4px' }}>
            {chunkIndex + 1} / {chunks.length} chunks
          </div>
        </div>
      </div>
    )
  }

  // SETUP screen
  return (
    <div style={S.shell}>
      <div style={{ ...S.card, maxWidth: '520px', width: '100%' }}>
        <button style={S.backBtn} onClick={onBack}>← Home</button>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '6px' }}>⚡</div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>Speed Reader</h1>
          <p style={{ margin: '6px 0 0', color: '#a0c4ff', fontSize: '14px' }}>
            Train your brain to read faster!
          </p>
        </div>

        {/* WPM Slider */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ ...S.label, display: 'flex', justifyContent: 'space-between' }}>
            <span>⚡ Speed</span>
            <span style={{ color: '#fff' }}>{wpm} WPM</span>
          </div>
          <input
            type="range"
            min={MIN_WPM}
            max={MAX_WPM}
            step={10}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            style={S.rangeInput}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#777', marginTop: '2px' }}>
            <span>{MIN_WPM} WPM</span>
            <span>{MAX_WPM} WPM</span>
          </div>
        </div>

        {/* Chunk size */}
        <div style={{ marginBottom: '18px' }}>
          <div style={S.label}>📦 Words per flash</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {RSVP_CHUNK_OPTIONS.map((n) => (
              <button
                key={n}
                style={S.chunkBtn(chunkSize === n)}
                onClick={() => setChunkSize(n)}
              >
                {n} {n === 1 ? 'word' : 'words'}
              </button>
            ))}
          </div>
        </div>

        {/* Passage picker */}
        <div style={{ marginBottom: '18px' }}>
          <div style={S.label}>📖 Choose a passage</div>
          {SAMPLE_PASSAGES.map((p, i) => (
            <button
              key={i}
              style={S.passageBtn(selectedPassage === i)}
              onClick={() => setSelectedPassage(i)}
            >
              {p.label}
            </button>
          ))}
          <button
            style={S.passageBtn(selectedPassage === -1)}
            onClick={() => setSelectedPassage(-1)}
          >
            ✏️ Use my own text
          </button>
        </div>

        {/* Custom text area */}
        {selectedPassage === -1 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={S.label}>✏️ Paste or type your text</div>
            <textarea
              style={S.textarea}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Paste any text here — a book passage, a news article, vocab definitions..."
              rows={5}
            />
          </div>
        )}

        <button
          style={{
            ...S.primaryBtn,
            width: '100%',
            opacity: activeText.trim().length < 3 ? 0.45 : 1,
          }}
          onClick={handleStart}
          disabled={activeText.trim().length < 3}
        >
          ▶ Start Reading
        </button>
      </div>
      <footer style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
        made with 🧠 by michael sarduy
      </footer>
    </div>
  )
}


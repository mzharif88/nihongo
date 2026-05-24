import { useState } from 'react'
import { SENTENCE_PATTERNS } from '../data/index.js'

// Color scheme for each part type
const TYPE_COLORS = {
  subject:   { bg: 'rgba(77,141,255,0.15)',  border: '#4D8DFF', text: '#4D8DFF',  label: '👤 Subject' },
  topic:     { bg: 'rgba(77,141,255,0.15)',  border: '#4D8DFF', text: '#4D8DFF',  label: '📌 Topic' },
  object:    { bg: 'rgba(52,211,153,0.15)', border: '#34D399', text: '#34D399', label: '🎯 Object' },
  verb:      { bg: 'rgba(255,90,95,0.15)',   border: '#FF5A5F', text: '#FF5A5F',  label: '⚡ Verb' },
  particle:  { bg: 'rgba(255,178,62,0.15)', border: '#FFB23E', text: '#FFB23E', label: '🔗 Particle' },
  adjective: { bg: 'rgba(167,139,250,0.15)',border: '#A78BFA', text: '#A78BFA', label: '🎨 Adjective' },
  time:      { bg: 'rgba(6,182,212,0.15)',  border: '#06B6D4', text: '#06B6D4', label: '🕐 Time' },
  place:     { bg: 'rgba(244,114,182,0.15)',border: '#F472B6', text: '#F472B6', label: '📍 Place' },
  connector: { bg: 'rgba(156,163,175,0.15)',border: '#9CA3AF', text: '#9CA3AF', label: '🔄 Connector' },
}

function PartChip({ part, hovered, onHover }) {
  const style = TYPE_COLORS[part.type] || TYPE_COLORS.connector
  const isHovered = hovered === part.type
  return (
    <div
      onMouseEnter={() => onHover(part.type)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, cursor: 'default', transition: 'all 0.2s',
        transform: isHovered ? 'translateY(-4px) scale(1.05)' : 'none',
      }}>
      {/* Furigana / romaji */}
      <div style={{ fontSize: 11, color: style.text, fontWeight: 700, opacity: 0.8 }}>
        {part.romaji}
      </div>
      {/* Main character chip */}
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: isHovered ? style.bg.replace('0.15', '0.3') : style.bg,
        border: `2px solid ${style.border}`,
        fontFamily: "'Noto Serif JP', serif",
        fontSize: 24, fontWeight: 700,
        color: isHovered ? '#fff' : style.text,
        boxShadow: isHovered ? `0 4px 16px ${style.border}40` : 'none',
        transition: 'all 0.2s',
        minWidth: 48, textAlign: 'center',
      }}>
        {part.text}
      </div>
      {/* Type label */}
      <div style={{
        fontSize: 10, fontWeight: 800, color: style.text,
        opacity: isHovered ? 1 : 0.6,
        textAlign: 'center', maxWidth: 70, lineHeight: 1.2,
        transition: 'opacity 0.2s',
      }}>
        {style.label}
      </div>
    </div>
  )
}

export default function SentenceBuilder({ onBack }) {
  const [idx, setIdx]         = useState(0)
  const [hovered, setHovered] = useState(null)
  const [showNote, setShowNote] = useState(false)

  const pattern = SENTENCE_PATTERNS[idx]
  const hoveredStyle = hovered ? TYPE_COLORS[hovered] : null

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>

      <div className="page-title">🏗️ Sentence Builder</div>
      <div className="page-sub">See how Japanese sentences are constructed — hover each block to learn its role</div>

      {/* Color legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {Object.entries(TYPE_COLORS).map(([type, s]) => (
          <div key={type} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: s.bg, border: `1px solid ${s.border}`,
            fontSize: 11, fontWeight: 800, color: s.text,
            opacity: hovered && hovered !== type ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Pattern navigation */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {SENTENCE_PATTERNS.map((p, i) => (
          <button key={p.id} onClick={() => { setIdx(i); setHovered(null); setShowNote(false) }}
            className={`btn ${i === idx ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}>
            {i + 1}. {p.title.split(' — ')[0]}
          </button>
        ))}
      </div>

      {/* Main sentence display */}
      <div className="card pop-in" style={{ padding: 32, marginBottom: 20 }} key={idx}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 800, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
          Pattern {idx + 1} of {SENTENCE_PATTERNS.length}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{pattern.title}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, marginBottom: 28 }}>
          English: <em>"{pattern.english}"</em>
        </div>

        {/* Color-coded parts */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
          {pattern.parts.map((part, i) => (
            <PartChip key={i} part={part} hovered={hovered} onHover={setHovered} />
          ))}
        </div>

        {/* Full sentence assembled */}
        <div style={{
          background: 'var(--bg3)', borderRadius: 12, padding: '14px 20px',
          fontFamily: "'Noto Serif JP', serif", fontSize: 22, fontWeight: 700,
          letterSpacing: 2, marginBottom: 16,
        }}>
          {pattern.parts.map(p => p.text).join('')}
        </div>

        {/* Hovered part detail */}
        {hovered && hoveredStyle && (
          <div className="slide-up" style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 12,
            background: hoveredStyle.bg, border: `1px solid ${hoveredStyle.border}`,
          }}>
            {pattern.parts.filter(p => p.type === hovered).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 22, color: hoveredStyle.text, fontWeight: 900 }}>{p.text}</span>
                <span style={{ fontSize: 13, color: hoveredStyle.text, fontWeight: 800 }}>({p.romaji})</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>→ {p.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grammar note toggle */}
        <button className="btn btn-icon" onClick={() => setShowNote(n => !n)} style={{ fontSize: 13 }}>
          📝 {showNote ? 'Hide' : 'Show'} grammar note
        </button>
        {showNote && (
          <div className="slide-up" style={{ marginTop: 12, padding: '14px 18px', background: 'rgba(255,178,62,0.08)', border: '1px solid rgba(255,178,62,0.3)', borderRadius: 10, fontSize: 14, color: 'var(--text)', fontWeight: 600, lineHeight: 1.7 }}>
            💡 {pattern.note}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => { setIdx(i => Math.max(0, i - 1)); setHovered(null); setShowNote(false) }}
          disabled={idx === 0} style={{ opacity: idx === 0 ? 0.4 : 1 }}>← Previous</button>
        <button className="btn btn-primary" onClick={() => { setIdx(i => Math.min(SENTENCE_PATTERNS.length - 1, i + 1)); setHovered(null); setShowNote(false) }}
          disabled={idx === SENTENCE_PATTERNS.length - 1} style={{ opacity: idx === SENTENCE_PATTERNS.length - 1 ? 0.4 : 1 }}>Next →</button>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, alignSelf: 'center' }}>{idx + 1} / {SENTENCE_PATTERNS.length} patterns</span>
      </div>
    </div>
  )
}

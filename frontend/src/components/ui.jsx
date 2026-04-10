/** Small shared UI primitives */

// ── Buttons ────────────────────────────────────────────────────────────────

const btnBase = {
  background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9',
  padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
  fontFamily: 'monospace',
}

export function Btn({ onClick, children, variant = 'default' }) {
  const extra =
    variant === 'primary' ? { background: '#238636', borderColor: '#2ea043', color: '#fff' }
    : variant === 'danger'  ? { background: '#b91c1c', borderColor: '#dc2626', color: '#fff' }
    : {}
  return <button onClick={onClick} style={{ ...btnBase, ...extra }}>{children}</button>
}

// ── readyState badge ───────────────────────────────────────────────────────

const rsColors = {
  'rs-connecting': { color: '#e3b341', borderColor: '#e3b341', background: '#21262d' },
  'rs-open':       { color: '#3fb950', borderColor: '#2ea043', background: '#0f2a1a' },
  'rs-closed':     { color: '#8b949e', borderColor: '#30363d', background: '#21262d' },
}

export function ReadyStateBadge({ rsClass, rsLabel }) {
  return (
    <span style={{
      fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12,
      border: '1px solid', fontFamily: 'monospace',
      ...rsColors[rsClass],
    }}>
      {rsLabel}
    </span>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

const statusColors = {
  connected:    { background: '#0f2a1a', borderColor: '#2ea043', color: '#3fb950' },
  disconnected: { background: '#21262d', borderColor: '#30363d', color: '#8b949e' },
  error:        { background: '#2d1111', borderColor: '#dc2626', color: '#f85149' },
}

export function StatusBadge({ state }) {
  return (
    <span style={{
      fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12,
      border: '1px solid', fontFamily: 'monospace',
      ...statusColors[state] ?? statusColors.disconnected,
    }}>
      {state}
    </span>
  )
}

// ── Meta row (Last-Event-ID etc.) ──────────────────────────────────────────

export function MetaRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem', color: '#8b949e' }}>
      <span>{label}:</span>
      <span style={{ color: '#79c0ff', fontFamily: 'monospace' }}>{value ?? '—'}</span>
    </div>
  )
}

// ── Log area ───────────────────────────────────────────────────────────────

const logColors = {
  info:   '#58a6ff',
  alert:  '#f85149',
  manual: '#d2a679',
  system: '#8b949e',
}

export function LogArea({ lines, height = 200 }) {
  return (
    <div style={{
      background: '#010409', border: '1px solid #30363d', borderRadius: 4,
      padding: 10, height, overflowY: 'auto', fontSize: '0.78rem', lineHeight: 1.6,
      display: 'flex', flexDirection: 'column-reverse',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {lines.map(({ text, cls = 'system', key }) => (
          <div key={key} style={{ color: logColors[cls] ?? logColors.system }}>{text}</div>
        ))}
      </div>
    </div>
  )
}

// ── Text input row ─────────────────────────────────────────────────────────

export function InputRow({ value, onChange, onSubmit, placeholder, submitLabel = 'Send' }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        placeholder={placeholder}
        style={{
          flex: 1, background: '#010409', border: '1px solid #30363d', color: '#c9d1d9',
          padding: '5px 10px', borderRadius: 6, fontSize: '0.8rem', fontFamily: 'monospace',
        }}
      />
      <Btn onClick={onSubmit}>{submitLabel}</Btn>
    </div>
  )
}

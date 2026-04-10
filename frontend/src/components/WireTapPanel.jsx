import { useWireTap } from '../context/WireTapContext'
import { Btn } from './ui'

const STREAM_COLOR = {
  notifications: '#58a6ff',
  progress:      '#d2a679',
  logs:          '#8b949e',
  ai:            '#58a6ff',
  unstable:      '#f85149',
  broadcast:     '#d2a679',
}

const STREAMS = ['all', 'notifications', 'progress', 'logs', 'ai', 'unstable', 'broadcast']

export function WireTapPanel() {
  const { frames, filter, setFilter, clear } = useWireTap()

  const visible = filter === 'all'
    ? frames
    : frames.filter((f) => f.streamName === filter)

  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      marginTop: 16,
    }}>
      <h2 style={{ fontSize: '1rem', color: '#f0f6fc' }}>Wire Tap — Raw SSE Frames</h2>
      <p style={{ fontSize: '0.78rem', color: '#8b949e', lineHeight: 1.5 }}>
        Reconstructs the actual <code style={code}>text/event-stream</code> wire format
        from every event fired across all streams — no DevTools needed.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Stream:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9',
            padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontFamily: 'monospace',
          }}
        >
          {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Btn onClick={clear}>Clear</Btn>
      </div>

      <div style={{
        background: '#010409', border: '1px solid #30363d', borderRadius: 4,
        padding: 10, height: 260, overflowY: 'auto', fontSize: '0.76rem',
        lineHeight: 1.7, display: 'flex', flexDirection: 'column-reverse',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visible.map(({ streamName, frame, key }) => (
            <div key={key}>
              <span style={{ color: '#8b949e' }}>[{streamName}]  </span>
              <span style={{ color: STREAM_COLOR[streamName] ?? '#c9d1d9' }}>{frame}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const code = {
  background: '#010409', border: '1px solid #30363d',
  borderRadius: 3, padding: '1px 5px', color: '#79c0ff',
}

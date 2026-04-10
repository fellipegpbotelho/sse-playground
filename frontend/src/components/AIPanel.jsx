import { useState } from 'react'
import { useWireTap } from '../context/WireTapContext'
import { useSSE } from '../hooks/useSSE'
import { Btn, MetaRow, ReadyStateBadge, StatusBadge } from './ui'
import { Panel } from './Panel'

export function AIPanel() {
  const { connect, disconnect, readyState, rsLabel, rsClass, lastEventId } =
    useSSE('/stream/ai')
  const { record } = useWireTap()
  const [status, setStatus] = useState('disconnected')
  const [text,   setText]   = useState('')

  function handleGenerate() {
    setStatus('connected')
    setText('')
    connect({
      onMessage: (e) => {
        record('ai', null, e.data, e.lastEventId)
        const d = JSON.parse(e.data)
        // Append each token — this is exactly how ChatGPT / Claude stream responses
        setText((prev) => prev + d.token)
        if (d.done) {
          disconnect()
          setStatus('disconnected')
        }
      },
      onError: () => setStatus('error'),
    })
  }

  function handleStop() {
    disconnect()
    setStatus('disconnected')
  }

  return (
    <Panel
      title="Stream 4 — AI Token Streaming"
      description="Yields a response one word at a time — the exact pattern used by ChatGPT, Claude, and every LLM chat UI. Each token carries an <code>id:</code> so streaming can resume mid-sentence on reconnect."
      controls={<>
        <Btn variant="primary" onClick={handleGenerate}>Generate</Btn>
        <Btn variant="danger"  onClick={handleStop}>Stop</Btn>
        <StatusBadge state={status} />
        <ReadyStateBadge rsClass={rsClass} rsLabel={rsLabel} />
      </>}
    >
      <MetaRow label="last-event-id" value={lastEventId} />
      <div style={{
        background: '#010409', border: '1px solid #30363d', borderRadius: 4,
        padding: 10, minHeight: 80, fontSize: '0.85rem', lineHeight: 1.7,
        color: '#c9d1d9', whiteSpace: 'pre-wrap',
      }}>
        {text || <span style={{ color: '#8b949e' }}>Press Generate…</span>}
      </div>
    </Panel>
  )
}

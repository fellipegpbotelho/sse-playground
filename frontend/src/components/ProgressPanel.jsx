import { useState } from 'react'
import { useWireTap } from '../context/WireTapContext'
import { useSSE } from '../hooks/useSSE'
import { Btn, LogArea, MetaRow, ReadyStateBadge, StatusBadge } from './ui'
import { Panel } from './Panel'

export function ProgressPanel() {
  const { connect, disconnect, readyState, rsLabel, rsClass, lastEventId } =
    useSSE('/stream/progress')
  const { record } = useWireTap()
  const [status,  setStatus]  = useState('disconnected')
  const [percent, setPercent] = useState(0)
  const [lines,   setLines]   = useState([])

  const addLine = (text, cls = 'system') =>
    setLines((prev) => [...prev, { text, cls, key: `${Date.now()}-${Math.random()}` }])

  function handleStart() {
    setStatus('connected')
    setPercent(0)
    setLines([])
    connect({
      onMessage: (e) => {
        record('progress', null, e.data, e.lastEventId)
        const d = JSON.parse(e.data)
        setPercent(d.percent)
        addLine(
          `step ${d.step}/10 → ${d.percent}%  [id: ${e.lastEventId}]${d.done ? '  ✓ DONE' : ''}`,
          d.done ? 'info' : 'system'
        )
        if (d.done) {
          disconnect()
          setStatus('disconnected')
        }
      },
      onError: () => {
        setStatus('error')
        addLine('⚠ Dropped — browser will retry with Last-Event-ID…', 'alert')
      },
    })
  }

  return (
    <Panel
      title="Stream 2 — Progress"
      description="One-shot stream with <code>id:</code> and <code>retry:</code>. On reconnect the browser sends <code>Last-Event-ID</code> so the server resumes from the right step."
      controls={<>
        <Btn variant="primary" onClick={handleStart}>Start</Btn>
        <StatusBadge state={status} />
        <ReadyStateBadge rsClass={rsClass} rsLabel={rsLabel} />
      </>}
    >
      <MetaRow label="last-event-id" value={lastEventId} />
      <progress value={percent} max={100} style={{ width: '100%', height: 14 }} />
      <div style={{ fontSize: '0.8rem', color: '#3fb950', textAlign: 'right' }}>{percent}%</div>
      <LogArea lines={lines} />
    </Panel>
  )
}

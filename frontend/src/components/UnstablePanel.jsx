import { useState } from 'react'
import { useWireTap } from '../context/WireTapContext'
import { useSSE } from '../hooks/useSSE'
import { Btn, LogArea, MetaRow, ReadyStateBadge, StatusBadge } from './ui'
import { Panel } from './Panel'

export function UnstablePanel() {
  const { connect, disconnect, readyState, rsLabel, rsClass, lastEventId } =
    useSSE('/stream/unstable')
  const { record } = useWireTap()
  const [status, setStatus] = useState('disconnected')
  const [lines,  setLines]  = useState([])

  const addLine = (text, cls = 'system') =>
    setLines((prev) => [...prev, { text, cls, key: `${Date.now()}-${Math.random()}` }])

  function handleConnect() {
    setStatus('connected')
    connect({
      onMessage: (e) => {
        record('unstable', null, e.data, e.lastEventId)
        const d       = JSON.parse(e.data)
        const resumed = d.resumed_from ? ` (resumed from id ${d.resumed_from})` : ''
        addLine(
          `count: ${d.count}  drop in: ${d.will_drop_in} event(s)${resumed}`,
          d.will_drop_in === 1 ? 'alert' : 'system'
        )
      },
      // onerror fires when the server intentionally closes — browser will auto-reconnect
      onError: () => addLine('↩ dropped — reconnecting with Last-Event-ID…', 'manual'),
    })
  }

  function handleDisconnect() {
    disconnect()
    setStatus('disconnected')
    addLine('— disconnected —')
  }

  return (
    <Panel
      title="Stream 6 — Unstable Connection"
      description="Server closes after 2–5 events. Watch <code>readyState</code> cycle OPEN → CLOSED → CONNECTING → OPEN. The counter never resets because <code>Last-Event-ID</code> carries the position across reconnects."
      controls={<>
        <Btn variant="primary" onClick={handleConnect}>Connect</Btn>
        <Btn variant="danger"  onClick={handleDisconnect}>Disconnect</Btn>
        <StatusBadge state={status} />
        <ReadyStateBadge rsClass={rsClass} rsLabel={rsLabel} />
      </>}
    >
      <MetaRow label="last-event-id" value={lastEventId} />
      <LogArea lines={lines} />
    </Panel>
  )
}

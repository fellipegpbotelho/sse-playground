import { useState } from 'react'
import { useWireTap } from '../context/WireTapContext'
import { useSSE } from '../hooks/useSSE'
import { Btn, InputRow, LogArea, ReadyStateBadge, StatusBadge } from './ui'
import { Panel } from './Panel'

export function LogsPanel() {
  const { connect, disconnect, readyState, rsLabel, rsClass } = useSSE('/stream/logs')
  const { record } = useWireTap()
  const [status, setStatus] = useState('disconnected')
  const [lines,  setLines]  = useState([])
  const [input,  setInput]  = useState('')

  const addLine = (text, cls = 'system') =>
    setLines((prev) => [...prev, { text, cls, key: `${Date.now()}-${Math.random()}` }])

  function handleConnect() {
    setStatus('connected')
    connect({
      onMessage: (e) => {
        record('logs', null, e.data, e.lastEventId)
        const d   = JSON.parse(e.data)
        const cls = d.level === 'MANUAL' ? 'manual' : d.level === 'INFO' ? 'info' : 'system'
        addLine(`[${d.ts}] ${d.level}: ${d.msg}`, cls)
      },
      onError: () => {
        setStatus('error')
        addLine('⚠ Connection error', 'alert')
      },
    })
  }

  function handleDisconnect() {
    disconnect()
    setStatus('disconnected')
    addLine('— disconnected —')
  }

  async function handleSend() {
    const msg = input.trim() || 'Ping from browser'
    setInput('')
    await fetch('/trigger-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg }),
    })
  }

  return (
    <Panel
      title="Stream 3 — Logs"
      description="Events queued server-side via <code>asyncio.Queue</code>. Sends SSE comment lines (<code>: heartbeat</code>) every 15 s to keep the connection alive through proxies."
      controls={<>
        <Btn variant="primary" onClick={handleConnect}>Connect</Btn>
        <Btn variant="danger"  onClick={handleDisconnect}>Disconnect</Btn>
        <StatusBadge state={status} />
        <ReadyStateBadge rsClass={rsClass} rsLabel={rsLabel} />
      </>}
    >
      <InputRow
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        placeholder="Custom log message…"
      />
      <LogArea lines={lines} />
    </Panel>
  )
}

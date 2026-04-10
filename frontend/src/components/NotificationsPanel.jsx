import { useEffect, useId, useState } from 'react'
import { useWireTap } from '../context/WireTapContext'
import { useSSE } from '../hooks/useSSE'
import { Btn, LogArea, ReadyStateBadge, StatusBadge } from './ui'
import { Panel } from './Panel'

export function NotificationsPanel() {
  const { connect, disconnect, readyState, rsLabel, rsClass } = useSSE('/stream/notifications')
  const { record } = useWireTap()
  const [status, setStatus] = useState('disconnected')
  const [lines,  setLines]  = useState([])

  const addLine = (text, cls = 'system') =>
    setLines((prev) => [...prev, { text, cls, key: `${Date.now()}-${Math.random()}` }])

  function handleConnect() {
    setStatus('connected')
    // useEffect cleanup will close on unmount; we store the cleanup to call on disconnect
    connect({
      // Named events — browser routes to these via addEventListener, not onmessage
      events: {
        info: (e) => {
          record('notifications', 'info', e.data, e.lastEventId)
          const d = JSON.parse(e.data)
          addLine(`[INFO #${d.id}] ${d.message}`, 'info')
        },
        alert: (e) => {
          record('notifications', 'alert', e.data, e.lastEventId)
          const d = JSON.parse(e.data)
          addLine(`[ALERT #${d.id}] ${d.message}`, 'alert')
        },
      },
      onError: () => {
        setStatus('error')
        addLine('⚠ Connection error — browser will retry…', 'alert')
      },
    })
  }

  function handleDisconnect() {
    disconnect()
    setStatus('disconnected')
    addLine('— disconnected —')
  }

  return (
    <Panel
      title="Stream 1 — Notifications"
      description="Periodic push every 2 s. Uses the <code>event:</code> field so the browser distinguishes <em>info</em> vs <em>alert</em> via <code>addEventListener</code>."
      controls={<>
        <Btn variant="primary" onClick={handleConnect}>Connect</Btn>
        <Btn variant="danger"  onClick={handleDisconnect}>Disconnect</Btn>
        <StatusBadge state={status} />
        <ReadyStateBadge rsClass={rsClass} rsLabel={rsLabel} />
      </>}
    >
      <LogArea lines={lines} />
    </Panel>
  )
}

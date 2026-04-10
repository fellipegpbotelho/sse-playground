import { WireTapProvider } from './context/WireTapContext'
import { AIPanel }           from './components/AIPanel'
import { BroadcastPanel }    from './components/BroadcastPanel'
import { LogsPanel }         from './components/LogsPanel'
import { NotificationsPanel } from './components/NotificationsPanel'
import { ProgressPanel }     from './components/ProgressPanel'
import { UnstablePanel }     from './components/UnstablePanel'
import { WireTapPanel }      from './components/WireTapPanel'

export default function App() {
  return (
    <WireTapProvider>
      <div style={{ fontFamily: 'monospace', background: '#0d1117', color: '#c9d1d9', minHeight: '100vh', padding: 24 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 4, color: '#58a6ff' }}>SSE Playground — React</h1>
        <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: 24 }}>
          Same six streams as the vanilla JS version — now with React hooks.
          See <code style={code}>src/hooks/useSSE.js</code> for the core pattern.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
        }}>
          <NotificationsPanel />
          <ProgressPanel />
          <LogsPanel />
          <AIPanel />
          <BroadcastPanel />
          <UnstablePanel />
        </div>

        <WireTapPanel />
      </div>
    </WireTapProvider>
  )
}

const code = {
  background: '#010409', border: '1px solid #30363d',
  borderRadius: 3, padding: '1px 5px', color: '#79c0ff',
}

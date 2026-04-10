/** Shared panel shell — title, description, controls row, children */
export function Panel({ title, description, controls, children }) {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.desc} dangerouslySetInnerHTML={{ __html: description }} />
      {controls && <div style={styles.controls}>{controls}</div>}
      {children}
    </div>
  )
}

const styles = {
  panel: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  title: { fontSize: '1rem', color: '#f0f6fc' },
  desc:  { fontSize: '0.78rem', color: '#8b949e', lineHeight: 1.5 },
  controls: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
}

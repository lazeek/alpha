import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, get, update, remove } from 'firebase/database'

// ── Globals ────────────────────────────────────────────────────────────────
const DEVICE_ID = Math.random().toString(36).slice(2, 10).toUpperCase()
const STALE_MS = 8000
let db = null

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem('cc_config') || 'null')
  } catch { return null }
}
function saveConfig(cfg) {
  localStorage.setItem('cc_config', JSON.stringify(cfg))
}

// ── Styles ─────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000;font-family:'Rajdhani',sans-serif;-webkit-tap-highlight-color:transparent}

@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
@keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes slide-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes flicker{0%,19.999%,22%,62.999%,64%,64.999%,70%,100%{opacity:1}20%,21.999%,63%,63.999%,65%,69.999%{opacity:.4}}
@keyframes glow{0%,100%{box-shadow:0 0 8px #00ff9030,0 0 20px #00ff9010}50%{box-shadow:0 0 16px #00ff9060,0 0 40px #00ff9020}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes cmd-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}

.root{min-height:100vh;background:#020302;color:#e0ffe0;font-family:'Rajdhani',sans-serif;position:relative;overflow:hidden}
.root::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,60,.018) 2px,rgba(0,255,60,.018) 4px);pointer-events:none;z-index:0}
.root::after{content:'';position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#00ff90,transparent);animation:scan 6s linear infinite;opacity:.15;pointer-events:none;z-index:1}

.wrap{position:relative;z-index:2;max-width:480px;margin:0 auto;padding:20px 18px;animation:fade-in .6s ease}

.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #0d2b0d;padding-bottom:14px;margin-bottom:8px}
.title{font-family:'Share Tech Mono',monospace;font-size:15px;letter-spacing:3px;color:#00ff90;text-transform:uppercase;animation:flicker 8s infinite}
.dot-wrap{display:flex;align-items:center;gap:8px}
.dot{width:8px;height:8px;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite;flex-shrink:0}
.dot.g{background:#00ff90;box-shadow:0 0 6px #00ff9080}
.dot.a{background:#f59e0b;box-shadow:0 0 6px #f59e0b80}
.dot.r{background:#ef4444;box-shadow:0 0 6px #ef444480}
.slabel{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;color:#4d8c4d}

.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:3px;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}
.badge.ctrl{background:rgba(0,100,255,.12);border:1px solid #0040ff50;color:#4d90ff}
.badge.recv{background:rgba(0,200,100,.08);border:1px solid #00ff9030;color:#00cc70}

.hero{text-align:center;margin-bottom:28px}
.alpha-wrap{width:72px;height:72px;border-radius:50%;background:#0a1a0a;border:1px solid #00ff9025;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;animation:glow 3s ease-in-out infinite}
.alpha{font-family:'Share Tech Mono',monospace;font-size:28px;color:#00ff90}
.hero-title{font-size:20px;font-weight:600;color:#c8ffc8;margin-bottom:6px}
.hero-sub{font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:1px;color:#3a5e3a}

.ai-box{background:#050f05;border:1px solid #00ff9025;border-left:3px solid #00ff90;border-radius:4px;padding:14px;margin-bottom:18px;animation:slide-in .4s ease}
.ai-label{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:2px;color:#00ff90;margin-bottom:8px}
.ai-text{font-size:14px;color:#a0e8a0;line-height:1.6}

.inp-wrap{background:#080f08;border:1px solid #0d2b0d;border-radius:6px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:12px;transition:border-color .2s}
.inp-wrap:focus-within{border-color:#00ff9045;box-shadow:0 0 0 1px #00ff9015}
.prompt{font-family:'Share Tech Mono',monospace;font-size:14px;color:#00ff9060}
.inp{flex:1;background:transparent;border:none;outline:none;color:#c8ffc8;font-family:'Share Tech Mono',monospace;font-size:14px;caret-color:#00ff90}
.inp::placeholder{color:#2a4a2a}

.btn{width:100%;background:#00ff90;color:#000;border:none;border-radius:5px;padding:13px 0;font-family:'Share Tech Mono',monospace;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;cursor:pointer;transition:all .2s;margin-bottom:24px}
.btn:hover:not(:disabled){background:#33ffaa;box-shadow:0 0 20px #00ff9040}
.btn:disabled{background:#0a1a0a;color:#2a4a2a;border:1px solid #0d2b0d;cursor:not-allowed}

.sec-label{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:3px;color:#2a5a2a;margin-bottom:10px}

.status-block{background:#080f08;border:1px solid #0d2b0d;border-radius:6px;padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:22px}
.status-name{font-size:15px;font-weight:600;color:#c8ffc8;margin-bottom:3px}
.status-detail{font-family:'Share Tech Mono',monospace;font-size:11px;color:#3a6a3a}

.cmds-block{background:#080f08;border:1px solid #0d2b0d;border-radius:6px;overflow:hidden}
.cmd-item{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #0a1a0a;animation:cmd-in .3s ease;transition:background .15s}
.cmd-item:last-child{border-bottom:none}
.cmd-item:hover{background:#0a160a}
.cmd-text{font-size:14px;color:#90d090}
.cmd-time{font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a4a2a}
.empty{padding:18px 14px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#1e3a1e;text-align:center;letter-spacing:1px}

.recv-box{background:#050f05;border:1px dashed #0d2b0d;border-radius:6px;padding:18px;text-align:center;margin-bottom:24px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#2a5a2a;letter-spacing:1px;line-height:2}

.spinner{width:16px;height:16px;border:2px solid #00ff9020;border-top-color:#00ff90;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
.spinner-lg{width:36px;height:36px;border:2px solid #0d2b0d;border-top-color:#00ff90;border-radius:50%;animation:spin .9s linear infinite}

.footer{text-align:center;margin-top:24px;font-family:'Share Tech Mono',monospace;font-size:10px;color:#1a301a;letter-spacing:2px}

/* Blocked */
.blocked{min-height:100vh;background:#020302;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;animation:fade-in .5s ease;text-align:center;padding:24px}
.blocked-icon{font-size:44px}
.blocked-title{font-size:22px;font-weight:700;color:#ef4444;letter-spacing:2px}
.blocked-sub{font-family:'Share Tech Mono',monospace;font-size:12px;color:#4a2a2a;letter-spacing:1px;line-height:2}

/* Connecting */
.connecting{min-height:100vh;background:#020302;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.connecting-text{font-family:'Share Tech Mono',monospace;font-size:12px;color:#2a5a2a;letter-spacing:3px}

/* Setup screen */
.setup{min-height:100vh;background:#020302;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:40px 20px;animation:fade-in .5s ease}
.setup-title{font-family:'Share Tech Mono',monospace;font-size:18px;letter-spacing:3px;color:#00ff90;margin-bottom:6px}
.setup-sub{font-family:'Share Tech Mono',monospace;font-size:11px;color:#2a5a2a;letter-spacing:2px;margin-bottom:32px;text-align:center}
.setup-card{width:100%;max-width:440px;background:#080f08;border:1px solid #0d2b0d;border-radius:8px;padding:20px;margin-bottom:16px}
.setup-card-title{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;color:#00ff90;margin-bottom:14px}
.setup-label{font-family:'Share Tech Mono',monospace;font-size:11px;color:#3a6a3a;margin-bottom:6px;letter-spacing:1px;display:block}
.setup-input{width:100%;background:#020302;border:1px solid #0d2b0d;border-radius:4px;padding:10px 12px;color:#c8ffc8;font-family:'Share Tech Mono',monospace;font-size:13px;outline:none;transition:border-color .2s;margin-bottom:12px}
.setup-input:focus{border-color:#00ff9045}
.setup-textarea{width:100%;background:#020302;border:1px solid #0d2b0d;border-radius:4px;padding:10px 12px;color:#c8ffc8;font-family:'Share Tech Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;margin-bottom:12px;min-height:120px;resize:vertical}
.setup-textarea:focus{border-color:#00ff9045}
.setup-hint{font-family:'Share Tech Mono',monospace;font-size:10px;color:#1e4a1e;letter-spacing:.5px;line-height:1.8;margin-top:-8px;margin-bottom:12px}
.setup-err{font-family:'Share Tech Mono',monospace;font-size:11px;color:#ef4444;margin-bottom:12px;letter-spacing:1px}
.setup-btn{width:100%;max-width:440px;background:#00ff90;color:#000;border:none;border-radius:5px;padding:14px 0;font-family:'Share Tech Mono',monospace;font-size:14px;letter-spacing:3px;font-weight:700;cursor:pointer;transition:all .2s}
.setup-btn:hover{background:#33ffaa;box-shadow:0 0 20px #00ff9040}
.setup-btn:disabled{background:#0a1a0a;color:#2a4a2a;border:1px solid #0d2b0d;cursor:not-allowed}
.reset-btn{background:transparent;border:1px solid #2a1a1a;color:#3a2a2a;border-radius:4px;padding:6px 12px;font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;transition:all .2s;margin-top:12px}
.reset-btn:hover{border-color:#ef444440;color:#ef4444}
`

function injectCSS() {
  if (document.getElementById('cc-styles')) return
  const s = document.createElement('style')
  s.id = 'cc-styles'
  s.textContent = css
  document.head.appendChild(s)
}

// ── Setup Screen ───────────────────────────────────────────────────────────
function SetupScreen({ onDone }) {
  const [apiKey, setApiKey] = useState('')
  const [fbJson, setFbJson] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function handleSave() {
    setErr('')
    if (!apiKey.trim().startsWith('sk-ant-')) {
      setErr('❌ Anthropic API key must start with sk-ant-'); return
    }
    let fbConfig
    try {
      fbConfig = JSON.parse(fbJson.trim())
      if (!fbConfig.apiKey || !fbConfig.databaseURL) throw new Error()
    } catch {
      setErr('❌ Invalid Firebase config JSON. Make sure it includes apiKey and databaseURL.'); return
    }
    setSaving(true)
    try {
      const app = initializeApp(fbConfig)
      db = getDatabase(app)
      saveConfig({ anthropicKey: apiKey.trim(), firebase: fbConfig })
      onDone({ anthropicKey: apiKey.trim() })
    } catch (e) {
      setErr('❌ Firebase init failed: ' + e.message)
      setSaving(false)
    }
  }

  return (
    <div className="setup">
      <div className="setup-title">COMMAND CENTER</div>
      <div className="setup-sub">FIRST-TIME SETUP — ENTER YOUR CREDENTIALS</div>

      <div className="setup-card">
        <div className="setup-card-title">① ANTHROPIC API KEY</div>
        <label className="setup-label">Your API Key</label>
        <input className="setup-input" type="password" placeholder="sk-ant-api03-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
        <div className="setup-hint">
          Get it at: console.anthropic.com → API Keys<br />
          Starts with: sk-ant-api03-...
        </div>
      </div>

      <div className="setup-card">
        <div className="setup-card-title">② FIREBASE CONFIG (JSON)</div>
        <label className="setup-label">Paste your Firebase config object</label>
        <textarea
          className="setup-textarea"
          placeholder={`{\n  "apiKey": "AIza...",\n  "authDomain": "your-project.firebaseapp.com",\n  "databaseURL": "https://your-project-default-rtdb.firebaseio.com",\n  "projectId": "your-project",\n  "storageBucket": "your-project.appspot.com",\n  "messagingSenderId": "123456",\n  "appId": "1:123456:web:abcdef"\n}`}
          value={fbJson}
          onChange={e => setFbJson(e.target.value)}
        />
        <div className="setup-hint">
          Firebase Console → Project Settings → Your Apps → Web App → Config
        </div>
      </div>

      {err && <div className="setup-err">{err}</div>}
      <button className="setup-btn" onClick={handleSave} disabled={saving || !apiKey || !fbJson}>
        {saving ? 'INITIALIZING...' : 'LAUNCH COMMAND CENTER'}
      </button>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false)
  const [cfg, setCfg] = useState(null)
  const [role, setRole] = useState(null)
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [appState, setAppState] = useState({
    status: 'System Idle',
    statusDetail: 'Listening for commands...',
    recentCommands: [],
    aiResponse: null,
  })
  const roleRef = useRef(null)
  const hbRef = useRef(null)

  useEffect(() => { injectCSS() }, [])

  useEffect(() => {
    const saved = getConfig()
    if (saved) {
      try {
        const app = initializeApp(saved.firebase)
        db = getDatabase(app)
        setCfg(saved)
        setReady(true)
      } catch { setCfg(null); setReady(true) }
    } else {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!cfg || !db) return
    init()
    hbRef.current = setInterval(heartbeat, 2500)
    // Listen to state changes
    const stateRef = ref(db, 'cc/state')
    const unsub = onValue(stateRef, snap => {
      if (snap.exists()) setAppState(snap.val())
    })
    return () => {
      clearInterval(hbRef.current)
      deregister()
      unsub()
    }
  }, [cfg])

  async function init() {
    const devRef = ref(db, 'cc/devices')
    const snap = await get(devRef)
    const now = Date.now()
    let devices = snap.exists() ? snap.val() : {}
    // Prune stale
    Object.keys(devices).forEach(k => {
      if (now - devices[k].lastSeen > STALE_MS) delete devices[k]
    })
    if (devices[DEVICE_ID]) {
      roleRef.current = devices[DEVICE_ID].role
      setRole(devices[DEVICE_ID].role)
    } else if (Object.keys(devices).length < 2) {
      const myRole = Object.keys(devices).length === 0 ? 'controller' : 'receiver'
      devices[DEVICE_ID] = { role: myRole, lastSeen: now }
      await set(devRef, devices)
      roleRef.current = myRole
      setRole(myRole)
    } else {
      setRole('blocked')
    }
  }

  async function heartbeat() {
    if (!db || !roleRef.current || roleRef.current === 'blocked') return
    const devRef = ref(db, 'cc/devices')
    const snap = await get(devRef)
    const now = Date.now()
    let devices = snap.exists() ? snap.val() : {}
    Object.keys(devices).forEach(k => {
      if (now - devices[k].lastSeen > STALE_MS) delete devices[k]
    })
    if (!devices[DEVICE_ID] && Object.keys(devices).length < 2) {
      devices[DEVICE_ID] = { role: roleRef.current, lastSeen: now }
    } else if (devices[DEVICE_ID]) {
      devices[DEVICE_ID].lastSeen = now
    }
    await set(devRef, devices)
    const others = Object.keys(devices).filter(k => k !== DEVICE_ID)
    setOtherOnline(others.length > 0)
  }

  async function deregister() {
    if (!db) return
    try { await remove(ref(db, `cc/devices/${DEVICE_ID}`)) } catch {}
  }

  async function executeCommand() {
    if (!command.trim() || loading) return
    const cmd = command.trim()
    setLoading(true)
    setCommand('')
    const pending = {
      status: 'Processing...', statusDetail: `> ${cmd}`,
      recentCommands: appState.recentCommands, aiResponse: null,
    }
    setAppState(pending)
    await set(ref(db, 'cc/state'), pending)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 300,
          system: 'You are the AI core of a Command Center terminal. Process device commands and respond concisely—2-3 sentences max. Describe what action would be taken, confirm execution, or return a brief result. Use a calm, technical tone. No markdown.',
          messages: [{ role: 'user', content: cmd }],
        }),
      })
      const data = await res.json()
      const aiText = data.content?.[0]?.text || 'Command acknowledged.'
      const newCmds = [
        { text: cmd, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...appState.recentCommands,
      ].slice(0, 6)
      const done = {
        status: 'Command Executed', statusDetail: 'Awaiting next command...',
        recentCommands: newCmds, aiResponse: aiText,
      }
      setAppState(done)
      await set(ref(db, 'cc/state'), done)
    } catch {
      const errState = { ...appState, status: 'Error', statusDetail: 'Execution failed. Check connection.', aiResponse: null }
      setAppState(errState)
      await set(ref(db, 'cc/state'), errState)
    }
    setLoading(false)
  }

  function handleReset() {
    if (window.confirm('Reset all credentials? You will need to set up again.')) {
      localStorage.removeItem('cc_config')
      window.location.reload()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (!ready) return (
    <div className="connecting">
      <div className="spinner-lg" />
      <div className="connecting-text">LOADING...</div>
    </div>
  )

  if (!cfg) return <SetupScreen onDone={c => { setCfg(c) }} />

  if (role === null) return (
    <div className="connecting">
      <div className="spinner-lg" />
      <div className="connecting-text">CONNECTING...</div>
    </div>
  )

  if (role === 'blocked') return (
    <div className="blocked root">
      <div className="blocked-icon">⛔</div>
      <div className="blocked-title">ACCESS DENIED</div>
      <div className="blocked-sub">
        Command Center is at max capacity<br />
        [ 2 / 2 DEVICES ACTIVE ]<br />
        Please try again later.
      </div>
    </div>
  )

  const dotColor = loading ? 'a' : appState.status === 'Error' ? 'r' : 'g'

  return (
    <div className="root">
      <div className="wrap">
        {/* Header */}
        <div className="hdr">
          <div className="title">Command Center</div>
          <div className="dot-wrap">
            <div className={`dot ${otherOnline ? 'g' : 'a'}`} />
            <span className="slabel">{otherOnline ? '2/2 ONLINE' : '1/2 ONLINE'}</span>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <div className={`badge ${role === 'controller' ? 'ctrl' : 'recv'}`}>
            {role === 'controller' ? '⬡ CONTROLLER' : '◈ RECEIVER'}
          </div>
        </div>

        {/* Hero */}
        <div className="hero">
          <div className="alpha-wrap"><div className="alpha">α</div></div>
          <div className="hero-title">How can I help with your device?</div>
          <div className="hero-sub">ENTER A COMMAND TO AUTOMATE YOUR DEVICE</div>
        </div>

        {/* AI Response */}
        {appState.aiResponse && (
          <div className="ai-box">
            <div className="ai-label">▸ AI RESPONSE</div>
            <div className="ai-text">{appState.aiResponse}</div>
          </div>
        )}

        {/* Controller input */}
        {role === 'controller' ? (
          <>
            <div className="inp-wrap">
              <span className="prompt">$</span>
              <input className="inp" value={command}
                onChange={e => setCommand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && executeCommand()}
                placeholder="Enter your command..." disabled={loading} />
            </div>
            <button className="btn" onClick={executeCommand} disabled={loading || !command.trim()}>
              {loading ? <><span className="spinner" />EXECUTING</> : 'EXECUTE'}
            </button>
          </>
        ) : (
          <div className="recv-box">
            ◈ RECEIVER MODE ACTIVE<br />
            Monitoring commands from Controller...<br />
            <span style={{ color: '#1a3a1a' }}>Output appears here in real-time.</span>
          </div>
        )}

        {/* Status */}
        <div className="sec-label">STATUS</div>
        <div className="status-block">
          <div className={`dot ${dotColor}`} />
          <div style={{ flex: 1 }}>
            <div className="status-name">{appState.status}</div>
            <div className="status-detail">{appState.statusDetail}</div>
          </div>
          {loading && <div className="spinner" />}
        </div>

        {/* Recent commands */}
        <div className="sec-label">RECENT COMMANDS</div>
        <div className="cmds-block">
          {appState.recentCommands.length === 0
            ? <div className="empty">NO COMMANDS YET</div>
            : appState.recentCommands.map((c, i) => (
              <div className="cmd-item" key={i}>
                <span className="cmd-text">{c.text}</span>
                <span className="cmd-time">{c.time}</span>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="footer">
          DEVICE {DEVICE_ID} · {role.toUpperCase()} · SESSION ACTIVE
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="reset-btn" onClick={handleReset}>RESET CREDENTIALS</button>
        </div>
      </div>
    </div>
  )
}

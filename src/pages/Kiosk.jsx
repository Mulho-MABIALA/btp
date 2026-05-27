import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, XCircle, Camera, CameraOff, Clock, Loader2, LogIn, LogOut, KeyRound } from 'lucide-react'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Clock ─────────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-center">
      <p className="text-6xl font-black text-white tabular-nums tracking-tight">
        {String(time.getHours()).padStart(2,'0')}
        <span className="animate-pulse">:</span>
        {String(time.getMinutes()).padStart(2,'0')}
        <span className="text-white/40 text-4xl">:{String(time.getSeconds()).padStart(2,'0')}</span>
      </p>
      <p className="text-white/60 text-lg font-medium mt-1 capitalize">
        {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
}

// ── States ────────────────────────────────────────────────────────────────────
const STATE = {
  IDLE:     'idle',
  SCANNING: 'scanning',
  LOADING:  'loading',
  SUCCESS:  'success',
  ERROR:    'error',
}

const DEPT_GRADIENT = {
  'Chantier':            'from-blue-500 to-blue-700',
  "Bureau d'études":     'from-violet-500 to-violet-700',
  'Direction':           'from-slate-500 to-slate-700',
  'Comptabilité':        'from-emerald-500 to-emerald-700',
  'Ressources humaines': 'from-pink-500 to-pink-700',
  'Commercial':          'from-orange-500 to-orange-700',
  'Logistique':          'from-yellow-500 to-yellow-700',
}

export default function Kiosk() {
  const [state,      setState]     = useState(STATE.IDLE)
  const [result,     setResult]    = useState(null)    // { employee, action, time, message }
  const [error,      setError]     = useState('')
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [cameraErr,  setCameraErr]  = useState(false)
  const [lastScanned,setLastScanned]= useState('')      // debounce same code

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const frameRef  = useRef(null)
  const resetRef  = useRef(null)

  // ── Auto-reset after success/error ───────────────────────────────────────
  const resetToIdle = useCallback(() => {
    setState(STATE.IDLE)
    setResult(null)
    setError('')
    setManualCode('')
    setLastScanned('')
  }, [])

  // ── Process QR / employee ID ──────────────────────────────────────────────
  const processCode = useCallback(async (raw) => {
    if (raw === lastScanned) return
    setLastScanned(raw)

    // Extract empId from QR: "EMP:xxxx" or just the id
    let empId = raw.trim()
    if (empId.startsWith('EMP:')) empId = empId.slice(4)
    if (!empId) return

    setState(STATE.LOADING)
    stopCamera()
    clearTimeout(resetRef.current)

    try {
      // Try to get GPS location (non-blocking — fails silently)
      let latitude, longitude
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            pos => { latitude = pos.coords.latitude; longitude = pos.coords.longitude; resolve() },
            () => resolve(),
            { timeout: 2000 }
          )
        })
      } catch (_) {}

      const r = await api.post('/kiosk/checkin', { empId, latitude, longitude })
      setResult(r.data)
      setState(STATE.SUCCESS)
    } catch (e) {
      const status = e.response?.status
      setError(
        status === 404 ? 'Employé introuvable — badge non reconnu' :
        status === 403 ? 'Compte inactif — accès refusé' :
        e.response?.data?.error || 'Erreur de connexion au serveur'
      )
      setState(STATE.ERROR)
    }

    // Auto-reset after 5 seconds
    resetRef.current = setTimeout(resetToIdle, 5000)
  }, [lastScanned, resetToIdle])

  // ── Camera ───────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraErr(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (e) {
      setCameraErr(true)
    }
  }, [])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ── QR scanning loop ──────────────────────────────────────────────────────
  const scan = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(scan)
      return
    }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0)
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
    if (code?.data) {
      processCode(code.data)
    } else {
      frameRef.current = requestAnimationFrame(scan)
    }
  }, [processCode])

  // ── Toggle scan mode ──────────────────────────────────────────────────────
  useEffect(() => {
    if (state === STATE.SCANNING) {
      startCamera().then(() => {
        // Wait for video to load then start scan loop
        const waitVideo = setInterval(() => {
          if (videoRef.current?.readyState >= 2) {
            clearInterval(waitVideo)
            frameRef.current = requestAnimationFrame(scan)
          }
        }, 100)
      })
    }
    return () => {
      if (state !== STATE.SCANNING) stopCamera()
    }
  }, [state, startCamera, stopCamera, scan])

  useEffect(() => () => {
    stopCamera()
    clearTimeout(resetRef.current)
  }, [stopCamera])

  // ── Manual submit ─────────────────────────────────────────────────────────
  const handleManual = e => {
    e.preventDefault()
    if (manualCode.trim()) processCode(manualCode.trim())
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const gradient = result?.employee ? (DEPT_GRADIENT[result.employee.department] || 'from-blue-500 to-blue-700') : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col select-none overflow-hidden">
      {/* Hidden canvas for jsQR */}
      <canvas ref={canvasRef} className="hidden"/>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">C</span>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-wide">CONSTRUCTPRO</p>
            <p className="text-white/40 text-xs">Terminal de pointage</p>
          </div>
        </div>
        <a href="/admin/attendance"
          className="text-xs text-white/30 hover:text-white/60 transition-colors">
          ← Administration
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {/* ── IDLE ──────────────────────────────────────────────────────── */}
        {state === STATE.IDLE && (
          <>
            <LiveClock/>

            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
              {/* Scan button */}
              <button
                onClick={() => setState(STATE.SCANNING)}
                className="group w-full flex flex-col items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-3xl px-8 py-8 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="w-20 h-20 bg-blue-500/20 group-hover:bg-blue-500/30 rounded-2xl flex items-center justify-center transition-colors">
                  <Camera size={36} className="text-blue-400 group-hover:text-blue-300"/>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">Scanner le badge</p>
                  <p className="text-white/50 text-sm mt-0.5">Présentez votre badge devant la caméra</p>
                </div>
              </button>

              {/* Manual input toggle */}
              <button onClick={() => setShowManual(s => !s)}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
                <KeyRound size={14}/>
                Saisir le code manuellement
              </button>

              {showManual && (
                <form onSubmit={handleManual} className="w-full flex gap-2">
                  <input
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    placeholder="ID employé ou EMP:xxxx"
                    autoFocus
                    className="flex-1 bg-white/5 border border-white/10 focus:border-blue-400 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none"
                  />
                  <button type="submit"
                    className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors text-sm">
                    OK
                  </button>
                </form>
              )}
            </div>

            <p className="text-white/20 text-xs">v3.0.0 · CONSTRUCTPRO Kiosk</p>
          </>
        )}

        {/* ── SCANNING ──────────────────────────────────────────────────── */}
        {state === STATE.SCANNING && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            <div className="text-center">
              <p className="text-white text-xl font-bold">Approchez votre badge</p>
              <p className="text-white/50 text-sm mt-1">Placez le QR code devant la caméra</p>
            </div>

            {/* Camera view */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-blue-400/30 shadow-xl shadow-blue-500/10">
              {cameraErr ? (
                <div className="w-80 h-80 bg-white/5 flex flex-col items-center justify-center gap-3">
                  <CameraOff size={40} className="text-white/30"/>
                  <p className="text-white/50 text-sm text-center px-4">Caméra non disponible<br/>Utilisez la saisie manuelle</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="w-80 h-80 object-cover" muted playsInline/>
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 relative">
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg"/>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg"/>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg"/>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg"/>
                      {/* Scan line animation */}
                      <div className="absolute left-2 right-2 h-0.5 bg-blue-400/80 animate-[scanline_2s_ease-in-out_infinite]" style={{ top: '50%' }}/>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { stopCamera(); setShowManual(true); setState(STATE.IDLE) }}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm rounded-xl transition-colors flex items-center gap-2">
                <KeyRound size={13}/> Saisie manuelle
              </button>
              <button onClick={() => { stopCamera(); setState(STATE.IDLE) }}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-sm rounded-xl transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ───────────────────────────────────────────────────── */}
        {state === STATE.LOADING && (
          <div className="flex flex-col items-center gap-6">
            <LiveClock/>
            <div className="flex flex-col items-center gap-4 bg-white/5 rounded-3xl px-12 py-10">
              <Loader2 size={48} className="animate-spin text-blue-400"/>
              <p className="text-white text-lg font-semibold">Identification en cours…</p>
            </div>
          </div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────────────── */}
        {state === STATE.SUCCESS && result && (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            {/* Action banner */}
            <div className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r ${result.action === 'in' ? 'from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30' : 'from-orange-500/20 to-orange-600/10 border border-orange-500/30'}`}>
              {result.action === 'in'
                ? <LogIn size={24} className="text-emerald-400"/>
                : <LogOut size={24} className="text-orange-400"/>
              }
              <div>
                <p className={`font-black text-xl ${result.action === 'in' ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {result.action === 'in' ? '▶ ENTRÉE' : '◀ SORTIE'}
                </p>
                <p className="text-white/60 text-sm">{result.time}</p>
              </div>
            </div>

            {/* Employee card */}
            <div className={`w-full bg-gradient-to-br ${gradient} rounded-3xl overflow-hidden shadow-2xl`}>
              <div className="flex items-center gap-5 px-6 py-6">
                {result.employee.photo
                  ? <img src={result.employee.photo} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shrink-0"/>
                  : <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <span className="text-white text-3xl font-black">
                        {result.employee.firstName?.[0]}{result.employee.lastName?.[0]}
                      </span>
                    </div>
                }
                <div>
                  <p className="text-white font-black text-2xl leading-tight">
                    {result.employee.firstName} {result.employee.lastName}
                  </p>
                  <p className="text-white/70 text-sm mt-0.5">{result.employee.position}</p>
                  <p className="text-white/50 text-xs mt-1">{result.employee.department}</p>
                </div>
              </div>
              <div className="bg-black/20 px-6 py-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-white/70"/>
                <p className="text-white/80 text-sm">{result.message}</p>
              </div>
            </div>

            {/* Reset info */}
            <p className="text-white/30 text-sm">Réinitialisation automatique dans 5 secondes…</p>
            <button onClick={resetToIdle} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-sm rounded-xl transition-colors">
              Nouveau pointage
            </button>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────────── */}
        {state === STATE.ERROR && (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            <LiveClock/>
            <div className="w-full bg-red-500/10 border border-red-500/30 rounded-3xl px-8 py-8 flex flex-col items-center gap-4 text-center">
              <XCircle size={56} className="text-red-400"/>
              <div>
                <p className="text-white font-bold text-xl">Accès refusé</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setState(STATE.SCANNING); setLastScanned('') }}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                <Camera size={14}/> Réessayer
              </button>
              <button onClick={resetToIdle}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-sm rounded-xl transition-colors">
                Accueil
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Scan line CSS animation */}
      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-60px); opacity: 0.3; }
          50% { transform: translateY(60px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

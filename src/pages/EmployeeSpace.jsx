import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import jsQR from 'jsqr'
import {
  Search, User, LogIn, LogOut, Calendar, Clock, ChevronLeft,
  CheckCircle2, XCircle, AlertCircle, Coffee, Sun, Sunset,
  Loader2, QrCode, Camera, CameraOff, Building2, CalendarDays,
  TrendingUp, Star, X
} from 'lucide-react'

const api = axios.create({ baseURL: '/api' })

// ── Dept colours ─────────────────────────────────────────────────────────────
const DEPT_GRAD = {
  'Chantier':            ['#3b82f6','#1d4ed8'],
  "Bureau d'études":     ['#8b5cf6','#6d28d9'],
  'Direction':           ['#475569','#334155'],
  'Comptabilité':        ['#10b981','#047857'],
  'Ressources humaines': ['#ec4899','#be185d'],
  'Commercial':          ['#f97316','#c2410c'],
  'Logistique':          ['#eab308','#a16207'],
}
const deptGrad = d => DEPT_GRAD[d] || DEPT_GRAD['Chantier']

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  present:    { label: 'Présent',   icon: CheckCircle2, cls: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-500/10',  border: 'border-green-200' },
  absent:     { label: 'Absent',    icon: XCircle,      cls: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-500/10',      border: 'border-red-200'   },
  late:       { label: 'Retard',    icon: AlertCircle,  cls: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10',border: 'border-orange-200'},
  'half-day': { label: 'Mi-temps',  icon: Sun,          cls: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10',border: 'border-yellow-200'},
  holiday:    { label: 'Congé',     icon: Coffee,       cls: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10',    border: 'border-blue-200'  },
}

function nowHHMM() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
}
function fmtTime(t) { return t || '—' }

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <p className="text-white/80 text-sm font-medium tabular-nums">
      {String(t.getHours()).padStart(2,'0')}:{String(t.getMinutes()).padStart(2,'0')}
      <span className="text-white/40">:{String(t.getSeconds()).padStart(2,'0')}</span>
    </p>
  )
}

// ── QR scanner for employee lookup ───────────────────────────────────────────
function QRScanner({ onDetect, onClose }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => {})
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const scan = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height)
    if (code?.data) {
      let id = code.data.trim()
      if (id.startsWith('EMP:')) id = id.slice(4)
      streamRef.current?.getTracks().forEach(t => t.stop())
      onDetect(id)
    } else {
      rafRef.current = requestAnimationFrame(scan)
    }
  }, [onDetect])

  useEffect(() => { rafRef.current = requestAnimationFrame(scan) }, [scan])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <p className="text-white font-bold text-sm">Scanner votre badge QR</p>
        <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20}/></button>
      </div>
      <div className="flex-1 relative">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
        <canvas ref={canvasRef} className="hidden"/>
        {/* Scan frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 relative">
            <div className="absolute inset-0 border-2 border-white/30 rounded-2xl"/>
            {/* Corners */}
            {[['top-0 left-0','border-t-2 border-l-2'],['top-0 right-0','border-t-2 border-r-2'],['bottom-0 left-0','border-b-2 border-l-2'],['bottom-0 right-0','border-b-2 border-r-2']].map(([pos, border]) => (
              <div key={pos} className={`absolute w-8 h-8 ${pos} ${border} border-blue-400 rounded-sm`}/>
            ))}
            {/* Scanline */}
            <div className="absolute left-2 right-2 h-0.5 bg-blue-400/80 rounded" style={{ animation: 'scanline 2s linear infinite', top: '50%' }}/>
          </div>
        </div>
        <style>{`@keyframes scanline { 0%{transform:translateY(-100px)} 50%{transform:translateY(100px)} 100%{transform:translateY(-100px)} }`}</style>
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'today',    label: "Aujourd'hui", icon: Sun },
  { id: 'month',   label: 'Ce mois',     icon: Calendar },
  { id: 'schedule',label: 'Planning',    icon: CalendarDays },
]

// ── Employee dashboard ────────────────────────────────────────────────────────
function EmployeeDashboard({ employee, onLogout }) {
  const [tab, setTab]             = useState('today')
  const [todayRecord, setTodayRecord] = useState(null)
  const [monthRecords, setMonthRecords] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading]     = useState(true)

  const [c1, c2] = deptGrad(employee.department)
  const empNum = `EMP-${employee._id?.slice(-6).toUpperCase()}`

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const now      = new Date()
      const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

      const [attR, schR] = await Promise.all([
        api.get(`/kiosk/attendance/${employee._id}`, { params: { month: monthStr } }),
        api.get(`/kiosk/schedule/${employee._id}`),
      ])

      const records = attR.data || []
      const todayRec = records.find(r => new Date(r.date).toDateString() === now.toDateString())
      setTodayRecord(todayRec || null)
      setMonthRecords(records)
      setSchedules(schR.data || [])
    } finally { setLoading(false) }
  }, [employee._id])

  useEffect(() => { loadData() }, [loadData])

  const now         = new Date()
  const monthDays   = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
  const presentDays = monthRecords.filter(r => ['present','late'].includes(r.status)).length
  const absentDays  = monthRecords.filter(r => r.status === 'absent').length
  const totalHours  = monthRecords.reduce((s, r) => s + (r.hoursWorked || 0), 0)
  const rate        = monthDays > 0 ? Math.round((presentDays / monthDays) * 100) : 0

  // Upcoming schedules (next 7 days)
  const upcoming = schedules.filter(s => {
    const d = new Date(s.date)
    return d >= now && d <= new Date(now.getTime() + 7*24*60*60*1000)
  }).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 7)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-navy-950 flex flex-col max-w-md mx-auto">

      {/* Header card */}
      <div className="relative overflow-hidden px-5 pt-10 pb-6"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
        {/* Back + logout */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onLogout} className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium">
            <ChevronLeft size={16}/> Changer
          </button>
          <LiveClock/>
        </div>

        {/* Employee info */}
        <div className="flex items-center gap-4">
          {employee.photo
            ? <img src={employee.photo} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30" alt=""/>
            : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black border-2 border-white/30"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </div>
          }
          <div>
            <p className="text-white font-black text-xl leading-tight">{employee.firstName}</p>
            <p className="text-white font-black text-xl leading-tight">{employee.lastName?.toUpperCase()}</p>
            <p className="text-white/70 text-sm mt-0.5">{employee.position}</p>
          </div>
        </div>

        {/* Dept + ID */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            {employee.department}
          </span>
          <span className="text-white/50 text-xs font-mono">{empNum}</span>
        </div>

        {/* Today punch summary */}
        {todayRecord && (
          <div className="mt-4 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="flex items-center gap-3">
              {todayRecord.checkIn && (
                <div className="flex items-center gap-1.5">
                  <span className="text-green-300 font-black">↑</span>
                  <span className="text-white font-bold text-sm tabular-nums">{fmtTime(todayRecord.checkIn)}</span>
                </div>
              )}
              {todayRecord.checkOut && (
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-300 font-black">↓</span>
                  <span className="text-white font-bold text-sm tabular-nums">{fmtTime(todayRecord.checkOut)}</span>
                </div>
              )}
              {todayRecord.checkIn && !todayRecord.checkOut && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse"/>
                  <span className="text-white/80 text-xs font-semibold">En cours</span>
                </div>
              )}
              {todayRecord.hoursWorked > 0 && (
                <div className="ml-auto">
                  <span className="text-white font-black text-sm">{todayRecord.hoursWorked.toFixed(1)}h</span>
                  <span className="text-white/60 text-xs ml-1">travaillé</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-700 px-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[11px] font-semibold transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}>
              <Icon size={16}/>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500"/></div>
        ) : tab === 'today' ? (
          <TodayTab record={todayRecord} employee={employee}/>
        ) : tab === 'month' ? (
          <MonthTab
            records={monthRecords}
            presentDays={presentDays}
            absentDays={absentDays}
            totalHours={totalHours}
            rate={rate}
            month={now}
          />
        ) : (
          <ScheduleTab upcoming={upcoming}/>
        )}
      </div>
    </div>
  )
}

// ── Today tab ─────────────────────────────────────────────────────────────────
function TodayTab({ record, employee }) {
  const now      = new Date()
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const sc       = record ? (STATUS[record.status] || STATUS.present) : null

  return (
    <div className="space-y-3">
      {/* Greeting */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5 text-center">
        <p className="text-slate-500 text-sm">{greeting} 👋</p>
        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{employee.firstName}</p>
        <p className="text-xs text-slate-400 mt-1 capitalize">
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {record ? (
        <>
          {/* Status */}
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${sc.bg} ${sc.border}`}>
            <sc.icon size={24} className={sc.cls}/>
            <div>
              <p className={`font-black text-base ${sc.cls}`}>{sc.label}</p>
              <p className="text-xs text-slate-500">Statut du jour</p>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 text-center">
              <span className="text-green-500 text-2xl font-black">↑</span>
              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
                {fmtTime(record.checkIn)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Arrivée</p>
            </div>
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 text-center">
              {record.checkOut ? (
                <>
                  <span className="text-orange-500 text-2xl font-black">↓</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
                    {fmtTime(record.checkOut)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Départ</p>
                </>
              ) : (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse mt-1"/>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-2">En cours</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pas encore sorti</p>
                </>
              )}
            </div>
          </div>

          {/* Hours */}
          {record.hoursWorked > 0 && (
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                <Clock size={18} className="text-blue-500"/>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{record.hoursWorked.toFixed(1)}h</p>
                <p className="text-xs text-slate-400">heures travaillées aujourd'hui</p>
              </div>
            </div>
          )}

          {record.site && (
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 flex items-center gap-3">
              <Building2 size={18} className="text-slate-400 shrink-0"/>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{record.site}</p>
                <p className="text-xs text-slate-400">Chantier du jour</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6 text-center">
          <LogIn size={32} className="mx-auto mb-3 text-slate-300"/>
          <p className="text-slate-500 text-sm font-medium">Pas encore pointé aujourd'hui</p>
          <p className="text-xs text-slate-400 mt-1">Rendez-vous au terminal kiosque pour pointer</p>
        </div>
      )}
    </div>
  )
}

// ── Month tab ─────────────────────────────────────────────────────────────────
function MonthTab({ records, presentDays, absentDays, totalHours, rate, month }) {
  const monthName = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate()

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide capitalize">{monthName}</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Présences',    value: `${presentDays}j`,          color: 'text-green-500'  },
          { label: 'Absences',     value: `${absentDays}j`,           color: 'text-red-500'    },
          { label: 'Heures total', value: `${totalHours.toFixed(0)}h`, color: 'text-blue-500'   },
          { label: 'Taux présence',value: `${rate}%`,                 color: 'text-violet-500' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Progression mensuelle</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">{presentDays} / {daysInMonth} jours</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
            style={{ width: `${Math.min(100, (presentDays / daysInMonth) * 100)}%` }}/>
        </div>
      </div>

      {/* Records list */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-navy-700">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Détail des jours</p>
        </div>
        {records.length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-400">Aucun pointage ce mois</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-navy-800">
            {records.slice().sort((a,b) => new Date(b.date)-new Date(a.date)).map(r => {
              const sc = STATUS[r.status] || STATUS.present
              const Icon = sc.icon
              return (
                <div key={r._id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon size={14} className={`shrink-0 ${sc.cls}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white capitalize">
                      {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] tabular-nums">
                    {r.checkIn  && <span className="text-green-600 font-bold">↑ {r.checkIn}</span>}
                    {r.checkOut && <span className="text-orange-600 font-bold">↓ {r.checkOut}</span>}
                    {r.hoursWorked > 0 && <span className="text-slate-400">{r.hoursWorked.toFixed(1)}h</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Schedule tab ──────────────────────────────────────────────────────────────
function ScheduleTab({ upcoming }) {
  const SHIFT_COLORS = {
    'Matin':        ['#f97316','#ea580c'],
    'Journée':      ['#3b82f6','#2563eb'],
    'Après-midi':   ['#8b5cf6','#7c3aed'],
    'Nuit':         ['#475569','#334155'],
    'Personnalisé': ['#10b981','#059669'],
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Planning 7 prochains jours</p>

      {upcoming.length === 0 ? (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6 text-center">
          <CalendarDays size={28} className="mx-auto mb-2 text-slate-300"/>
          <p className="text-slate-400 text-sm">Aucun planning prévu</p>
        </div>
      ) : upcoming.map(s => {
        const [c1, c2] = SHIFT_COLORS[s.shiftType] || SHIFT_COLORS['Journée']
        const date = new Date(s.date)
        const isToday = date.toDateString() === new Date().toDateString()
        return (
          <div key={s._id} className={`rounded-2xl overflow-hidden border ${isToday ? 'border-blue-300 dark:border-blue-500/40' : 'border-slate-200 dark:border-navy-700'}`}>
            {/* Day header */}
            <div className="flex items-center gap-3 px-4 py-3"
              style={{ background: `linear-gradient(to right, ${c1}, ${c2})` }}>
              <div className="flex-1">
                <p className="text-white font-black text-sm capitalize">
                  {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  {isToday && <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">Aujourd'hui</span>}
                </p>
                <p className="text-white/70 text-xs">{s.shiftType}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-sm">{s.startTime} – {s.endTime}</p>
                {s.site && <p className="text-white/70 text-xs">{s.site}</p>}
              </div>
            </div>
            {/* Breaks */}
            {s.breaks?.length > 0 && (
              <div className="bg-white dark:bg-navy-900 px-4 py-2 space-y-1">
                {s.breaks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Coffee size={11} className="text-slate-400 shrink-0"/>
                    <span>{b.type} : {b.startTime} – {b.endTime}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Notes */}
            {s.notes && (
              <div className="bg-slate-50 dark:bg-navy-800 px-4 py-2">
                <p className="text-xs text-slate-400 italic">{s.notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Search screen ─────────────────────────────────────────────────────────────
function SearchScreen({ onSelect }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [manualId, setManualId]   = useState('')
  const [error, setError]         = useState('')

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const r = await api.get('/kiosk/search', { params: { q } })
      setResults(r.data || [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  const handleQrDetect = useCallback(async (id) => {
    setShowScanner(false)
    setError('')
    try {
      const r = await api.get(`/kiosk/employee/${id}`)
      onSelect(r.data)
    } catch {
      setError('Badge non reconnu — employé introuvable')
    }
  }, [onSelect])

  const handleManualId = async () => {
    if (!manualId.trim()) return
    setError('')
    try {
      let id = manualId.trim().toUpperCase()
      if (id.startsWith('EMP-')) id = id.slice(4)
      const r = await api.get(`/kiosk/badge/${id}`)
      onSelect(r.data)
    } catch {
      setError('Badge non reconnu — identifiant introuvable')
    }
  }

  if (showScanner) return <QRScanner onDetect={handleQrDetect} onClose={() => setShowScanner(false)}/>

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-8 text-center">
        <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
          <Building2 size={28} className="text-white"/>
        </div>
        <h1 className="text-2xl font-black text-white">Mon Espace</h1>
        <p className="text-blue-200 text-sm mt-1">CONSTRUCTPRO · Espace employé</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white dark:bg-navy-900 rounded-t-3xl px-5 pt-8 pb-8 space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Identifiez-vous</h2>
          <p className="text-slate-400 text-sm mt-0.5">Recherchez votre nom ou scannez votre badge</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
            <XCircle size={14} className="text-red-500 shrink-0"/>
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Search input */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Votre nom</label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Prénom, Nom…"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              autoFocus
            />
            {loading && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"/>}
          </div>

          {/* Results dropdown */}
          {results.length > 0 && (
            <div className="mt-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl overflow-hidden shadow-lg">
              {results.map(e => (
                <button key={e._id} onClick={() => { onSelect(e); setQuery('') }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-navy-800 border-b border-slate-50 dark:border-navy-800 last:border-0 text-left transition-colors">
                  {e.photo
                    ? <img src={e.photo} className="w-8 h-8 rounded-lg object-cover shrink-0" alt=""/>
                    : <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {e.firstName?.[0]}{e.lastName?.[0]}
                      </div>
                  }
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{e.firstName} {e.lastName}</p>
                    <p className="text-xs text-slate-400">{e.department}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-navy-700"/>
          <span className="text-xs text-slate-400">ou</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-navy-700"/>
        </div>

        {/* QR scan button */}
        <button onClick={() => setShowScanner(true)}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-bold text-sm transition-colors">
          <QrCode size={18}/> Scanner mon badge QR
        </button>

        {/* Manual badge ID */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
            Numéro de badge (6 derniers chiffres)
          </label>
          <div className="flex gap-2">
            <input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualId()}
              placeholder="ex: A1B2C3"
              maxLength={6}
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono uppercase"
            />
            <button onClick={handleManualId}
              className="px-4 py-3 bg-slate-900 dark:bg-navy-700 hover:bg-slate-700 rounded-xl text-white font-bold text-sm transition-colors">
              OK
            </button>
          </div>
        </div>

        {/* Info note */}
        <p className="text-center text-[11px] text-slate-400">
          Votre numéro de badge figure sur votre carte CONSTRUCTPRO
        </p>
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────
export default function EmployeeSpace() {
  const [employee, setEmployee] = useState(null)

  if (!employee) return <SearchScreen onSelect={setEmployee}/>
  return <EmployeeDashboard employee={employee} onLogout={() => setEmployee(null)}/>
}

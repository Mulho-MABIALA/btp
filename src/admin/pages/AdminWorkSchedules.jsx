import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  X, Check, Coffee, Utensils, Sun, Sunset, Moon, Clock,
  CalendarDays, Copy, Users, AlertCircle, ChevronDown, MapPin
} from 'lucide-react'
import { adminWorkSchedules, adminEmployees } from '../adminApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_TEMPLATES = [
  { label: 'Matin',      icon: Sun,     type: 'Matin',        start: '06:00', end: '14:00', breaks: [{ startTime: '10:00', endTime: '10:15', type: 'Café' }] },
  { label: 'Journée',    icon: Sun,     type: 'Journée',      start: '08:00', end: '17:00', breaks: [{ startTime: '12:30', endTime: '13:30', type: 'Déjeuner' }] },
  { label: 'Après-midi', icon: Sunset,  type: 'Après-midi',   start: '14:00', end: '22:00', breaks: [{ startTime: '17:00', endTime: '17:15', type: 'Café' }] },
  { label: 'Nuit',       icon: Moon,    type: 'Nuit',         start: '22:00', end: '06:00', breaks: [{ startTime: '02:00', endTime: '02:30', type: 'Café' }] },
]

const BREAK_TYPES = ['Déjeuner', 'Café', 'Prière', 'Autre']
const BREAK_ICON  = { Déjeuner: Utensils, Café: Coffee, Prière: '🕌', Autre: Clock }
const BREAK_COLOR = { Déjeuner: 'text-orange-500', Café: 'text-amber-500', Prière: 'text-emerald-500', Autre: 'text-slate-400' }

const STATUS_CFG = {
  'planifié':  { label: 'Planifié',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',    dot: 'bg-blue-400' },
  'confirmé':  { label: 'Confirmé',  cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400', dot: 'bg-green-400' },
  'complété':  { label: 'Complété',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400', dot: 'bg-slate-400' },
  'absent':    { label: 'Absent',    cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',         dot: 'bg-red-400' },
}

const DEPT_COLOR = {
  'Chantier':           { bg: 'bg-blue-500',    light: 'bg-blue-100 dark:bg-blue-500/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-300 dark:border-blue-500/40',   hex: '#3b82f6' },
  'Bureau d\'études':   { bg: 'bg-violet-500',  light: 'bg-violet-100 dark:bg-violet-500/20',text: 'text-violet-700 dark:text-violet-300',border: 'border-violet-300 dark:border-violet-500/40', hex: '#8b5cf6' },
  'Direction':          { bg: 'bg-slate-600',   light: 'bg-slate-100 dark:bg-slate-500/20',  text: 'text-slate-700 dark:text-slate-300',  border: 'border-slate-300 dark:border-slate-500/40',  hex: '#475569' },
  'Comptabilité':       { bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-500/20',text:'text-emerald-700 dark:text-emerald-300',border:'border-emerald-300',                         hex: '#10b981' },
  'Ressources humaines':{ bg: 'bg-pink-500',    light: 'bg-pink-100 dark:bg-pink-500/20',    text: 'text-pink-700 dark:text-pink-300',    border: 'border-pink-300 dark:border-pink-500/40',    hex: '#ec4899' },
  'Commercial':         { bg: 'bg-orange-500',  light: 'bg-orange-100 dark:bg-orange-500/20',text: 'text-orange-700 dark:text-orange-300',border: 'border-orange-300',                          hex: '#f97316' },
  'Logistique':         { bg: 'bg-yellow-500',  light: 'bg-yellow-100 dark:bg-yellow-500/20',text: 'text-yellow-700 dark:text-yellow-300',border: 'border-yellow-300',                          hex: '#eab308' },
}
const deptColor = dept => DEPT_COLOR[dept] || DEPT_COLOR['Chantier']

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMinutes(t = '00:00') {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
function minutesToHHMM(m) {
  if (m < 0) return '—'
  const h = Math.floor(m / 60); const mn = m % 60
  return `${h}h${mn > 0 ? String(mn).padStart(2, '0') : ''}`
}
function calcNet(start, end, breaks = []) {
  let total = timeToMinutes(end) - timeToMinutes(start)
  if (total < 0) total += 24 * 60  // overnight
  const pauseMin = breaks.reduce((s, b) => {
    let d = timeToMinutes(b.endTime) - timeToMinutes(b.startTime)
    if (d < 0) d = 0
    return s + d
  }, 0)
  return { total, pauseMin, net: Math.max(0, total - pauseMin) }
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day  // Monday as first day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}
function dateKey(date) {
  return new Date(date).toISOString().split('T')[0]
}

// ── Mini-timeline bar ─────────────────────────────────────────────────────────
const TL_MIN = 5 * 60   // 05:00
const TL_MAX = 23 * 60  // 23:00
const TL_RANGE = TL_MAX - TL_MIN

function toPercent(timeStr) {
  const m = timeToMinutes(timeStr)
  return Math.max(0, Math.min(100, ((m - TL_MIN) / TL_RANGE) * 100))
}

function MiniTimeline({ startTime, endTime, breaks = [], color = '#3b82f6' }) {
  // Build segments: working → break → working …
  const sorted = [...breaks].filter(b => b.startTime && b.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const segs = []
  let cur = startTime
  for (const br of sorted) {
    if (timeToMinutes(br.startTime) > timeToMinutes(cur)) {
      segs.push({ type: 'work', s: cur, e: br.startTime })
    }
    segs.push({ type: 'break', s: br.startTime, e: br.endTime })
    cur = br.endTime
  }
  if (timeToMinutes(cur) < timeToMinutes(endTime)) {
    segs.push({ type: 'work', s: cur, e: endTime })
  }

  return (
    <div className="relative h-2 rounded-full bg-slate-100 dark:bg-navy-700 overflow-hidden mt-1.5">
      {segs.map((seg, i) => {
        const left  = toPercent(seg.s)
        const width = Math.max(0, toPercent(seg.e) - left)
        return (
          <div key={i}
            style={{ left: `${left}%`, width: `${width}%`, backgroundColor: seg.type === 'work' ? color : 'transparent' }}
            className={`absolute h-full transition-all ${seg.type === 'break' ? 'opacity-0' : ''}`}
          />
        )
      })}
      {/* Break gap marks (thin white lines) */}
      {sorted.map((br, i) => (
        <div key={`gap-${i}`}
          style={{ left: `${toPercent(br.startTime)}%`, width: `${Math.max(1, toPercent(br.endTime) - toPercent(br.startTime))}%` }}
          className="absolute h-full bg-white/70 dark:bg-navy-900/80"
        />
      ))}
    </div>
  )
}

// ── Shift card (inside grid cell) ─────────────────────────────────────────────
function ShiftCard({ schedule, onClick, onDelete, deleting }) {
  const { net, pauseMin } = calcNet(schedule.startTime, schedule.endTime, schedule.breaks)
  const dc = deptColor(schedule.employee?.department)
  const sc = STATUS_CFG[schedule.status] || STATUS_CFG['planifié']
  return (
    <div
      onClick={onClick}
      className={`relative group rounded-xl border ${dc.border} ${dc.light} px-2.5 pt-2 pb-1.5 cursor-pointer hover:shadow-md transition-all select-none`}
    >
      {/* Status dot */}
      <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
      {/* Times */}
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold ${dc.text}`}>{schedule.startTime} – {schedule.endTime}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dc.bg} text-white`}>{minutesToHHMM(net)}</span>
      </div>
      {/* Mini timeline */}
      <MiniTimeline startTime={schedule.startTime} endTime={schedule.endTime} breaks={schedule.breaks} color={dc.hex}/>
      {/* Breaks pills */}
      {schedule.breaks?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {schedule.breaks.map((b, i) => (
            <span key={i} className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
              {b.type === 'Café' ? <Coffee size={8}/> : b.type === 'Déjeuner' ? <Utensils size={8}/> : <Clock size={8}/>}
              {b.startTime}–{b.endTime}
            </span>
          ))}
        </div>
      )}
      {/* Site */}
      {schedule.site && <p className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-1"><MapPin size={8}/>{schedule.site}</p>}
      {/* Delete on hover */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(schedule._id) }}
        disabled={deleting === schedule._id}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
        style={{ marginTop: 0 }}
      >
        {deleting === schedule._id ? <Loader2 size={10} className="animate-spin"/> : <X size={10}/>}
      </button>
    </div>
  )
}

// ── Day timeline view ─────────────────────────────────────────────────────────
const TL_HOURS = Array.from({ length: 19 }, (_, i) => i + 5)  // 05 → 23

function DayTimeline({ schedules, employees }) {
  // Group by employee
  const byEmp = {}
  for (const s of schedules) {
    const eid = s.employee?._id || s.employee
    if (!byEmp[eid]) byEmp[eid] = []
    byEmp[eid].push(s)
  }
  const scheduledEmps = employees.filter(e => byEmp[e._id])

  if (scheduledEmps.length === 0) return (
    <div className="text-center py-12 text-slate-400">
      <CalendarDays size={28} className="mx-auto mb-2 opacity-30"/>
      <p className="text-sm">Aucun créneau planifié aujourd'hui</p>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      {/* Time axis */}
      <div className="min-w-[700px]">
        <div className="flex items-center border-b border-slate-100 dark:border-navy-700 pb-2 mb-2">
          <div className="w-40 shrink-0"/>
          <div className="flex-1 relative h-5">
            {TL_HOURS.map(h => (
              <span key={h} style={{ left: `${((h - 5) / 18) * 100}%` }}
                className="absolute -translate-x-1/2 text-[10px] text-slate-400 font-medium">
                {String(h).padStart(2,'0')}h
              </span>
            ))}
          </div>
        </div>

        {scheduledEmps.map(emp => {
          const empShifts = byEmp[emp._id] || []
          const dc = deptColor(emp.department)
          return (
            <div key={emp._id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-navy-800 last:border-0">
              {/* Employee name */}
              <div className="w-40 shrink-0 flex items-center gap-2">
                {emp.photo
                  ? <img src={emp.photo} className="w-7 h-7 rounded-full object-cover shrink-0" alt=""/>
                  : <div className={`w-7 h-7 rounded-full ${dc.bg} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-[10px] font-bold">{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative h-9 bg-slate-50 dark:bg-navy-800 rounded-xl overflow-hidden">
                {/* Hour grid lines */}
                {TL_HOURS.map(h => (
                  <div key={h} style={{ left: `${((h - 5) / 18) * 100}%` }}
                    className="absolute top-0 h-full w-px bg-slate-200 dark:bg-navy-700 opacity-50"/>
                ))}
                {/* Shift bars */}
                {empShifts.map(s => {
                  const left  = toPercent(s.startTime)
                  const width = Math.max(1, toPercent(s.endTime) - left)
                  const { net, pauseMin } = calcNet(s.startTime, s.endTime, s.breaks)
                  return (
                    <div key={s._id}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      className="absolute top-1 bottom-1 rounded-lg overflow-hidden group cursor-pointer"
                      title={`${s.startTime}–${s.endTime} · ${minutesToHHMM(net)} effectives${pauseMin > 0 ? ` · ${minutesToHHMM(pauseMin)} pauses` : ''}`}
                    >
                      {/* Working background */}
                      <div className="absolute inset-0 opacity-80" style={{ backgroundColor: dc.hex }}/>
                      {/* Break gaps */}
                      {s.breaks?.map((b, bi) => {
                        const bl = toPercent(b.startTime)
                        const bw = Math.max(1, toPercent(b.endTime) - bl)
                        const relLeft  = ((bl - left) / width) * 100
                        const relWidth = (bw / width) * 100
                        return (
                          <div key={bi}
                            style={{ left: `${relLeft}%`, width: `${relWidth}%` }}
                            className="absolute inset-y-0 bg-white/50 dark:bg-navy-800/70 border-x border-white/30"
                          />
                        )
                      })}
                      {/* Label inside bar */}
                      <div className="absolute inset-0 flex items-center px-1.5 overflow-hidden">
                        <span className="text-white text-[10px] font-bold whitespace-nowrap drop-shadow-sm">
                          {s.startTime}–{s.endTime} {minutesToHHMM(net)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Break editor row ──────────────────────────────────────────────────────────
function BreakRow({ br, onChange, onRemove }) {
  const duration = Math.max(0, timeToMinutes(br.endTime) - timeToMinutes(br.startTime))
  const Icon = BREAK_ICON[br.type] || Clock
  const iconIsString = typeof Icon === 'string'
  return (
    <div className="flex items-center gap-2 bg-slate-50 dark:bg-navy-800 rounded-xl px-3 py-2">
      {iconIsString
        ? <span className="text-sm">{Icon}</span>
        : <Icon size={13} className={BREAK_COLOR[br.type] || 'text-slate-400'}/>
      }
      <select value={br.type} onChange={e => onChange({ ...br, type: e.target.value })}
        className="text-xs bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none w-24">
        {BREAK_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <span className="text-slate-300 dark:text-navy-600 text-xs">De</span>
      <input type="time" value={br.startTime} onChange={e => onChange({ ...br, startTime: e.target.value })}
        className="text-xs bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg px-2 py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-[90px]"/>
      <span className="text-slate-300 dark:text-navy-600 text-xs">à</span>
      <input type="time" value={br.endTime} onChange={e => onChange({ ...br, endTime: e.target.value })}
        className="text-xs bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg px-2 py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-[90px]"/>
      <span className="text-[10px] font-bold text-slate-400 w-10 text-right shrink-0">{minutesToHHMM(duration)}</span>
      <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors ml-auto shrink-0"><X size={13}/></button>
    </div>
  )
}

// ── Shift Modal ───────────────────────────────────────────────────────────────
function ShiftModal({ open, onClose, onSave, editing, employees, prefillEmp, prefillDate }) {
  const [empId,    setEmpId]    = useState('')
  const [date,     setDate]     = useState('')
  const [start,    setStart]    = useState('08:00')
  const [end,      setEnd]      = useState('17:00')
  const [breaks,   setBreaks]   = useState([])
  const [shiftType,setShiftType]= useState('Journée')
  const [site,     setSite]     = useState('')
  const [status,   setStatus]   = useState('planifié')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setEmpId(editing.employee?._id || editing.employee || '')
      setDate(dateKey(editing.date))
      setStart(editing.startTime || '08:00')
      setEnd(editing.endTime || '17:00')
      setBreaks((editing.breaks || []).map((b, i) => ({ ...b, _id: i })))
      setShiftType(editing.shiftType || 'Journée')
      setSite(editing.site || '')
      setStatus(editing.status || 'planifié')
      setNotes(editing.notes || '')
    } else {
      setEmpId(prefillEmp || '')
      setDate(prefillDate || dateKey(new Date()))
      setStart('08:00'); setEnd('17:00')
      setBreaks([{ _id: 0, type: 'Déjeuner', startTime: '12:30', endTime: '13:30' }])
      setShiftType('Journée'); setSite(''); setStatus('planifié'); setNotes('')
    }
    setErr('')
  }, [open, editing, prefillEmp, prefillDate])

  const applyTemplate = tpl => {
    setStart(tpl.start); setEnd(tpl.end); setShiftType(tpl.type)
    setBreaks(tpl.breaks.map((b, i) => ({ ...b, _id: i })))
  }

  const addBreak = () => setBreaks(b => [...b, { _id: Date.now(), type: 'Déjeuner', startTime: '12:00', endTime: '13:00' }])
  const updateBreak = (id, val) => setBreaks(b => b.map(x => x._id === id ? { ...x, ...val } : x))
  const removeBreak = id => setBreaks(b => b.filter(x => x._id !== id))

  const { total, pauseMin, net } = calcNet(start, end, breaks)

  const handleSave = async () => {
    if (!empId) return setErr('Sélectionner un employé')
    if (!date)  return setErr('Sélectionner une date')
    setSaving(true); setErr('')
    try {
      const payload = {
        employee: empId, date, startTime: start, endTime: end,
        breaks: breaks.map(({ type, startTime, endTime }) => ({ type, startTime, endTime })),
        shiftType, site: site || undefined, status, notes: notes || undefined
      }
      await onSave(payload, editing?._id)
      onClose()
    } catch (e) { setErr(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  if (!open) return null

  const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between sticky top-0 bg-white dark:bg-navy-900 z-10">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {editing ? 'Modifier le créneau' : 'Nouveau créneau'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Templates */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Modèles rapides</p>
            <div className="grid grid-cols-4 gap-2">
              {SHIFT_TEMPLATES.map(tpl => {
                const Icon = tpl.icon
                return (
                  <button key={tpl.label} type="button" onClick={() => applyTemplate(tpl)}
                    className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 transition-all text-[11px] font-semibold">
                    <Icon size={15}/>
                    {tpl.label}
                    <span className="text-[9px] text-slate-400 font-normal">{tpl.start}–{tpl.end}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Employee + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Employé *</label>
              <select value={empId} onChange={e => setEmpId(e.target.value)} className={inp}>
                <option value="">— Choisir —</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.department})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp}/>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Début</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fin</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)} className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
              <select value={shiftType} onChange={e => setShiftType(e.target.value)} className={inp}>
                {['Matin','Journée','Après-midi','Nuit','Personnalisé'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Live calculation */}
          <div className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-500/5 dark:to-violet-500/5 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xl font-black text-blue-500">{minutesToHHMM(net)}</p>
                <p className="text-[10px] text-slate-400">Heures effectives</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">{minutesToHHMM(total)}</p>
                <p className="text-[10px] text-slate-400">Durée totale</p>
              </div>
              {pauseMin > 0 && (
                <div className="text-center">
                  <p className="text-base font-bold text-orange-500">{minutesToHHMM(pauseMin)}</p>
                  <p className="text-[10px] text-slate-400">Pauses</p>
                </div>
              )}
            </div>
            {/* Mini preview */}
            <div className="flex-1 min-w-[120px] max-w-[180px]">
              <MiniTimeline startTime={start} endTime={end} breaks={breaks} color="#3b82f6"/>
              <p className="text-[9px] text-slate-400 mt-1 text-center">{start} → {end}</p>
            </div>
          </div>

          {/* Breaks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pauses ({breaks.length})</p>
              <button type="button" onClick={addBreak}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-semibold">
                <Plus size={12}/> Ajouter une pause
              </button>
            </div>
            {breaks.length === 0
              ? <p className="text-xs text-slate-400 italic text-center py-2">Aucune pause planifiée</p>
              : <div className="space-y-2">
                  {breaks.map(br => (
                    <BreakRow key={br._id} br={br}
                      onChange={val => updateBreak(br._id, val)}
                      onRemove={() => removeBreak(br._id)}
                    />
                  ))}
                </div>
            }
          </div>

          {/* Site + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Chantier / Site</label>
              <input type="text" value={site} onChange={e => setSite(e.target.value)} placeholder="Tour Horizon…" className={inp}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Statut</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inp}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className={`${inp} resize-none`} placeholder="Instructions particulières…"/>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">
              <AlertCircle size={13}/> {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-navy-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-navy-900">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            {editing ? 'Enregistrer' : 'Créer le créneau'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminWorkSchedules() {
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [weekStart, setWeekStart] = useState(getWeekStart(today))
  const [employees, setEmployees] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('semaine')   // 'semaine' | 'jour'
  const [deptFilter, setDeptFilter] = useState('Tous')
  const [siteFilter, setSiteFilter] = useState('')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [prefillEmp, setPrefillEmp] = useState('')
  const [prefillDate,setPrefillDate] = useState('')
  const [deleting,  setDeleting]  = useState(null)
  const [copying,   setCopying]   = useState(false)
  const [toast,     setToast]     = useState(null)

  const weekDays  = getWeekDays(weekStart)
  const weekEnd   = weekDays[6]

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const start = dateKey(weekStart)
    const endDate = new Date(weekStart); endDate.setDate(endDate.getDate() + 6)
    const end = dateKey(endDate)
    try {
      const [empR, schR] = await Promise.all([
        adminEmployees.getAll(),
        adminWorkSchedules.getAll({ start, end })
      ])
      setEmployees(empR.data.filter(e => e.status === 'Actif'))
      setSchedules(schR.data)
    } finally { setLoading(false) }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const handleSave = async (payload, editId) => {
    if (editId) await adminWorkSchedules.update(editId, payload)
    else        await adminWorkSchedules.create(payload)
    await load()
    showToast(editId ? 'Créneau modifié' : 'Créneau créé')
  }

  const handleDelete = async id => {
    setDeleting(id)
    try { await adminWorkSchedules.delete(id); await load(); showToast('Créneau supprimé') }
    finally { setDeleting(null) }
  }

  const openAdd = (empId = '', date = '') => {
    setEditing(null); setPrefillEmp(empId); setPrefillDate(date); setModal(true)
  }
  const openEdit = sch => { setEditing(sch); setPrefillEmp(''); setPrefillDate(''); setModal(true) }

  const copyWeek = async () => {
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    setCopying(true)
    try {
      const r = await adminWorkSchedules.copyWeek({
        fromStart: dateKey(prevWeekStart),
        toStart:   dateKey(weekStart)
      })
      await load()
      showToast(`${r.data.count} créneaux copiés de la semaine précédente`)
    } catch(e) { showToast(e.response?.data?.error || 'Erreur', 'error') }
    finally { setCopying(false) }
  }

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }
  const goToday  = () => setWeekStart(getWeekStart(today))

  // ── Filtered employees ─────────────────────────────────────────────────────
  const filteredEmps = useMemo(() => employees.filter(e => {
    if (deptFilter !== 'Tous' && e.department !== deptFilter) return false
    if (siteFilter) {
      const empSch = schedules.filter(s => (s.employee?._id || s.employee) === e._id)
      if (!empSch.some(s => s.site?.toLowerCase().includes(siteFilter.toLowerCase()))) return false
    }
    return true
  }), [employees, schedules, deptFilter, siteFilter])

  // ── Schedule lookup ────────────────────────────────────────────────────────
  const getShifts = (empId, date) => {
    const dk = dateKey(date)
    return schedules.filter(s => (s.employee?._id || s.employee) === empId && dateKey(s.date) === dk)
  }
  const todayShifts = schedules.filter(s => dateKey(s.date) === dateKey(today))

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalSlots  = schedules.length
  const scheduledEmpsSet = new Set(schedules.map(s => s.employee?._id || s.employee))
  const scheduledEmpsCount = scheduledEmpsSet.size
  const { totalH, totalPauseH, totalNetH } = useMemo(() => {
    let totalH = 0, totalPauseH = 0, totalNetH = 0
    for (const s of schedules) {
      const { total, pauseMin, net } = calcNet(s.startTime, s.endTime, s.breaks)
      totalH += total; totalPauseH += pauseMin; totalNetH += net
    }
    return { totalH: Math.round(totalH / 60), totalPauseH: Math.round(totalPauseH / 60), totalNetH: Math.round(totalNetH / 60) }
  }, [schedules])

  const depts = ['Tous', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]
  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.type === 'error' ? <AlertCircle size={15}/> : <Check size={15}/>}
          {toast.msg}
        </div>
      )}

      <ShiftModal open={modal} onClose={() => setModal(false)} onSave={handleSave}
        editing={editing} employees={employees} prefillEmp={prefillEmp} prefillDate={prefillDate}/>

      <div className="space-y-5">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Planning des horaires</h1>
            <p className="text-slate-500 text-sm mt-1">
              Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy week */}
            <button onClick={copyWeek} disabled={copying}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 font-medium transition-colors disabled:opacity-60">
              {copying ? <Loader2 size={13} className="animate-spin"/> : <Copy size={13}/>} Copier sem. préc.
            </button>
            {/* Add */}
            <button onClick={() => openAdd()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus size={15}/> Nouveau créneau
            </button>
          </div>
        </div>

        {/* ── KPI cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Employés planifiés', value: `${scheduledEmpsCount}/${employees.length}`, color: 'text-blue-500', icon: Users, sub: 'cette semaine' },
            { label: 'Heures brutes',      value: `${totalH}h`,   color: 'text-violet-500', icon: Clock,      sub: 'planifiées' },
            { label: 'Heures effectives',  value: `${totalNetH}h`,color: 'text-emerald-500',icon: Check,      sub: 'sans pauses' },
            { label: 'Temps de pause',     value: `${totalPauseH}h`,color:'text-orange-500',icon: Coffee,     sub: `sur ${totalSlots} créneaux` },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                  <div className={`w-8 h-8 rounded-xl bg-slate-50 dark:bg-navy-800 flex items-center justify-center`}>
                    <Icon size={15} className={k.color}/>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{k.label}</p>
                <p className="text-[10px] text-slate-400">{k.sub}</p>
              </div>
            )
          })}
        </div>

        {/* ── Controls bar ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Week nav */}
          <div className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl p-1">
            <button onClick={prevWeek} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"><ChevronLeft size={16}/></button>
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">Aujourd'hui</button>
            <button onClick={nextWeek} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"><ChevronRight size={16}/></button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dept filter */}
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
            {/* Site filter */}
            <input value={siteFilter} onChange={e => setSiteFilter(e.target.value)} placeholder="Chantier…"
              className="px-3 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white w-36"/>
            {/* View toggle */}
            <div className="flex bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl p-1 gap-1">
              {[{ key: 'semaine', label: 'Semaine' }, { key: 'jour', label: "Aujourd'hui" }].map(v => (
                <button key={v.key} onClick={() => setView(v.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === v.key ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
        ) : view === 'jour' ? (
          /* ── Day timeline ─────────────────────────────────────────────── */
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm capitalize">
                {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <span className="text-xs text-slate-400">{todayShifts.length} créneau{todayShifts.length > 1 ? 'x' : ''}</span>
            </div>
            <div className="p-5">
              {/* Hour labels */}
              <div className="flex items-center mb-3 ml-[164px]">
                {TL_HOURS.map(h => (
                  <div key={h} className="flex-1 text-center text-[10px] text-slate-400 font-medium">
                    {String(h).padStart(2,'0')}h
                  </div>
                ))}
              </div>
              <DayTimeline schedules={todayShifts} employees={filteredEmps}/>
            </div>
          </div>
        ) : (
          /* ── Week grid ────────────────────────────────────────────────── */
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
            {filteredEmps.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CalendarDays size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Aucun employé{deptFilter !== 'Tous' ? ` dans "${deptFilter}"` : ''}</p>
                <button onClick={() => openAdd()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-600">
                  <Plus size={14}/> Créer un créneau
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-navy-700">
                      {/* Employee col header */}
                      <th className="text-left px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wide sticky left-0 bg-white dark:bg-navy-900 z-10 min-w-[170px]">
                        Employé
                      </th>
                      {/* Day headers */}
                      {weekDays.map((d, i) => {
                        const isToday    = dateKey(d) === dateKey(today)
                        const isWeekend  = d.getDay() === 0 || d.getDay() === 6
                        return (
                          <th key={i} className={`text-center px-2 py-3 min-w-[130px] ${isWeekend ? 'bg-slate-50/80 dark:bg-navy-800/40' : ''}`}>
                            <div className={`text-xs font-bold ${isToday ? 'text-blue-500' : 'text-slate-500'}`}>{DAY_NAMES[i]}</div>
                            <div className={`text-sm font-black mt-0.5 ${isToday ? 'text-blue-500' : 'text-slate-800 dark:text-white'}`}>
                              {isToday
                                ? <span className="inline-flex w-7 h-7 bg-blue-500 text-white rounded-full items-center justify-center text-sm font-black">{d.getDate()}</span>
                                : d.getDate()
                              }
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 capitalize">{d.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                          </th>
                        )
                      })}
                      {/* Total col */}
                      <th className="text-center px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wide min-w-[72px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                    {filteredEmps.map(emp => {
                      const dc = deptColor(emp.department)
                      let weekNet = 0

                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/40 dark:hover:bg-navy-800/20 transition-colors align-top">
                          {/* Employee cell */}
                          <td className="px-4 py-3 sticky left-0 bg-white dark:bg-navy-900 z-[5]">
                            <div className="flex items-center gap-2.5">
                              {emp.photo
                                ? <img src={emp.photo} className="w-8 h-8 rounded-full object-cover shrink-0" alt=""/>
                                : <div className={`w-8 h-8 rounded-full ${dc.bg} flex items-center justify-center shrink-0`}>
                                    <span className="text-white text-[11px] font-bold">{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                                  </div>
                              }
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{emp.firstName} {emp.lastName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>
                              </div>
                            </div>
                          </td>

                          {/* Day cells */}
                          {weekDays.map((d, di) => {
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6
                            const shifts = getShifts(emp._id, d)
                            shifts.forEach(s => { weekNet += calcNet(s.startTime, s.endTime, s.breaks).net })

                            return (
                              <td key={di} className={`px-2 py-2.5 align-top ${isWeekend ? 'bg-slate-50/60 dark:bg-navy-800/20' : ''}`}
                                style={{ minWidth: 130 }}>
                                <div className="space-y-1.5">
                                  {shifts.map(s => (
                                    <ShiftCard key={s._id} schedule={s}
                                      onClick={() => openEdit(s)}
                                      onDelete={handleDelete}
                                      deleting={deleting}
                                    />
                                  ))}
                                  {/* Add button */}
                                  {!isWeekend && (
                                    <button
                                      onClick={() => openAdd(emp._id, dateKey(d))}
                                      className={`w-full rounded-xl border-2 border-dashed transition-all py-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold
                                        ${shifts.length === 0
                                          ? 'border-slate-200 dark:border-navy-700 text-slate-300 dark:text-navy-600 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'
                                          : 'border-slate-100 dark:border-navy-800 text-slate-200 dark:text-navy-700 hover:border-blue-200 hover:text-blue-400'
                                        }`}
                                    >
                                      <Plus size={10}/> {shifts.length === 0 ? 'Ajouter' : ''}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )
                          })}

                          {/* Weekly total */}
                          <td className="px-3 py-3 text-center align-middle">
                            <p className={`text-sm font-black ${weekNet > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-navy-700'}`}>
                              {weekNet > 0 ? minutesToHHMM(weekNet) : '—'}
                            </p>
                            {weekNet > 0 && (
                              <div className="mt-1 w-10 mx-auto h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (weekNet / (40 * 60)) * 100)}%` }}/>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Clock, ChevronLeft, ChevronRight, UserCheck, Download, X, Check, BarChart2, Grid } from 'lucide-react'
import { adminAttendance, adminEmployees } from '../adminApi'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const STATUS_CONFIG = {
  present:   { label: 'Présent',   cls: 'bg-green-500',  text: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10',  border: 'border-green-200 dark:border-green-500/30' },
  absent:    { label: 'Absent',    cls: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-500/10',      border: 'border-red-200 dark:border-red-500/30' },
  late:      { label: 'Retard',    cls: 'bg-orange-400', text: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/30' },
  'half-day':{ label: 'Mi-temps', cls: 'bg-yellow-400', text: 'text-yellow-600 dark:text-yellow-400',bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/30' },
  holiday:   { label: 'Congé',     cls: 'bg-blue-400',   text: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-500/10',    border: 'border-blue-200 dark:border-blue-500/30' },
}

const DEPT_LIST = ['Tous', 'Direction', 'Bureau d\'études', 'Gros œuvre', 'Second œuvre', 'Électricité', 'Plomberie', 'Logistique', 'RH / Paie', 'Commercial']

function MonthNav({ date, onChange }) {
  const prev = () => { const d = new Date(date); d.setMonth(d.getMonth() - 1); onChange(d) }
  const next = () => { const d = new Date(date); d.setMonth(d.getMonth() + 1); onChange(d) }
  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"><ChevronLeft size={16}/></button>
      <span className="text-sm font-bold text-slate-900 dark:text-white capitalize w-36 text-center">
        {date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
      </span>
      <button onClick={next} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"><ChevronRight size={16}/></button>
    </div>
  )
}

// ── Inline cell popup ─────────────────────────────────────────────────────────
function CellPopup({ emp, day, month, record, onSave, onClose }) {
  const [status, setStatus]   = useState(record?.status || 'present')
  const [checkIn, setCheckIn] = useState(record?.checkIn || '')
  const [checkOut, setCheckOut] = useState(record?.checkOut || '')
  const [hours, setHours]     = useState(record?.hoursWorked ?? '')
  const [site, setSite]       = useState(record?.site || '')
  const [saving, setSaving]   = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSave = async () => {
    setSaving(true)
    try {
      const date = new Date(month.getFullYear(), month.getMonth(), day).toISOString()
      await onSave({ employee: emp._id, date, status, checkIn: checkIn || undefined, checkOut: checkOut || undefined, hoursWorked: hours !== '' ? Number(hours) : undefined, site: site || undefined })
      onClose()
    } finally { setSaving(false) }
  }

  const sc = STATUS_CONFIG[status]
  const dateStr = new Date(month.getFullYear(), month.getMonth(), day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div ref={ref} className="absolute z-50 w-72 bg-white dark:bg-navy-900 rounded-2xl shadow-xl border border-slate-200 dark:border-navy-600 p-4"
      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-slate-800 dark:text-white">{emp.firstName} {emp.lastName}</p>
          <p className="text-[10px] text-slate-400 capitalize">{dateStr}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
      </div>

      {/* Status selector */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <button key={k} type="button"
            onClick={() => setStatus(k)}
            className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${status === k ? `${v.bg} ${v.text} ${v.border}` : 'border-slate-100 dark:border-navy-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-800'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Time & details */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Arrivée</label>
            <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Départ</label>
            <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Heures</label>
            <input type="number" step="0.5" min="0" max="24" value={hours} onChange={e => setHours(e.target.value)} placeholder="8"
              className="w-full text-xs bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Chantier</label>
            <input type="text" value={site} onChange={e => setSite(e.target.value)} placeholder="Projet A"
              className="w-full text-xs bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button type="button" onClick={onClose} className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-navy-600 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
          {saving ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Enregistrer
        </button>
      </div>
    </div>
  )
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCsv(employees, records, days, month) {
  const monthStr = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const header = ['Employé', 'Département', ...days.map(d => `${d}/${month.getMonth() + 1}`), 'Présences', 'Absences', 'Heures totales']
  const rows = employees.map(emp => {
    const empRecs = records.filter(r => r.employee?._id === emp._id)
    const present = empRecs.filter(r => ['present','late'].includes(r.status)).length
    const absent  = empRecs.filter(r => r.status === 'absent').length
    const totalH  = empRecs.reduce((s, r) => s + (r.hoursWorked || 0), 0)
    const cells = days.map(d => {
      const date = new Date(month.getFullYear(), month.getMonth(), d)
      const rec = empRecs.find(r => new Date(r.date).toDateString() === date.toDateString())
      if (!rec) return ''
      let v = STATUS_CONFIG[rec.status]?.label || rec.status
      if (rec.checkIn)    v += ` ${rec.checkIn}`
      if (rec.checkOut)   v += `-${rec.checkOut}`
      if (rec.hoursWorked) v += ` (${rec.hoursWorked}h)`
      return v
    })
    return [`${emp.firstName} ${emp.lastName}`, emp.department || '', ...cells, present, absent, totalH]
  })
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `pointage_${monthStr.replace(' ','_')}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Stats panel ───────────────────────────────────────────────────────────────
const DEPT_COLORS_CHART = ['#3b82f6','#8b5cf6','#10b981','#f97316','#ec4899','#eab308','#ef4444','#6366f1']

function CustomTooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-slate-800 dark:text-white mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.stroke }}/>
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-900 dark:text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatsPanel({ employees, records, days, month }) {
  const monthName = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // 1. Status distribution (pie)
  const statusCounts = {
    present:  records.filter(r => r.status === 'present').length,
    late:     records.filter(r => r.status === 'late').length,
    absent:   records.filter(r => r.status === 'absent').length,
    'half-day': records.filter(r => r.status === 'half-day').length,
    holiday:  records.filter(r => r.status === 'holiday').length,
  }
  const pieData = [
    { name: 'Présent',  value: statusCounts.present,    color: '#22c55e' },
    { name: 'Retard',   value: statusCounts.late,        color: '#f97316' },
    { name: 'Absent',   value: statusCounts.absent,      color: '#ef4444' },
    { name: 'Mi-temps', value: statusCounts['half-day'], color: '#eab308' },
    { name: 'Congé',    value: statusCounts.holiday,     color: '#3b82f6' },
  ].filter(d => d.value > 0)

  // 2. By department bar chart
  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))]
  const deptData = depts.map(dept => {
    const empIds = employees.filter(e => e.department === dept).map(e => e._id)
    const dRecs  = records.filter(r => empIds.includes(r.employee?._id))
    return {
      dept: dept.length > 12 ? dept.slice(0, 10) + '…' : dept,
      fullDept: dept,
      Présents: dRecs.filter(r => ['present','late'].includes(r.status)).length,
      Absents:  dRecs.filter(r => r.status === 'absent').length,
      Retards:  dRecs.filter(r => r.status === 'late').length,
    }
  }).filter(d => d.Présents + d.Absents + d.Retards > 0)

  // 3. Daily line chart
  const dailyData = days.map(d => {
    const date    = new Date(month.getFullYear(), month.getMonth(), d)
    const dayRecs = records.filter(r => new Date(r.date).toDateString() === date.toDateString())
    return {
      jour: d,
      Présents: dayRecs.filter(r => ['present','late'].includes(r.status)).length,
      Absents:  dayRecs.filter(r => r.status === 'absent').length,
    }
  })

  // 4. Employee ranking by rate
  const ranking = employees.map(emp => {
    const empRecs   = records.filter(r => r.employee?._id === emp._id)
    const present   = empRecs.filter(r => ['present','late'].includes(r.status)).length
    const totalHrs  = empRecs.reduce((s, r) => s + (r.hoursWorked || 0), 0)
    const rate      = empRecs.length > 0 ? Math.round((present / empRecs.length) * 100) : 0
    return { emp, present, total: empRecs.length, totalHrs, rate }
  }).filter(e => e.total > 0).sort((a, b) => b.rate - a.rate)

  const totalEntries   = records.length
  const totalPresent   = records.filter(r => ['present','late'].includes(r.status)).length
  const globalRate     = totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 0
  const avgHours       = records.filter(r => r.hoursWorked > 0).length > 0
    ? (records.reduce((s, r) => s + (r.hoursWorked||0), 0) / records.filter(r => r.hoursWorked > 0).length).toFixed(1)
    : '—'

  return (
    <div className="space-y-6">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide capitalize">{monthName} · Statistiques de présence</p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Taux global',       value: `${globalRate}%`,   sub: `${totalPresent} présences`,   color: 'text-green-500'  },
          { label: 'Total enregistrés', value: totalEntries,        sub: `${employees.length} employés`,color: 'text-blue-500'   },
          { label: 'Absences',          value: statusCounts.absent, sub: `${statusCounts.late} retards`,color: 'text-red-500'    },
          { label: 'Moy. heures/jour',  value: `${avgHours}h`,      sub: 'par présence',                color: 'text-violet-500' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 px-5 py-4">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">{k.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Row: Bar chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart by department */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
          <p className="text-sm font-bold text-slate-800 dark:text-white mb-4">Présences par département</p>
          {deptData.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip content={<CustomTooltipBar/>}/>
                <Legend wrapperStyle={{ fontSize: 11, marginTop: 8 }}/>
                <Bar dataKey="Présents" fill="#22c55e" radius={[4,4,0,0]}/>
                <Bar dataKey="Absents"  fill="#ef4444" radius={[4,4,0,0]}/>
                <Bar dataKey="Retards"  fill="#f97316" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
          <p className="text-sm font-bold text-slate-800 dark:text-white mb-4">Répartition des statuts</p>
          {pieData.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">Aucune donnée</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 10 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }}/>
                      <span className="text-slate-500 dark:text-slate-400">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Line chart — daily trend */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
        <p className="text-sm font-bold text-slate-800 dark:text-white mb-4">Évolution journalière des présences</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
            <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              tickFormatter={d => d % 5 === 0 || d === 1 ? d : ''}/>
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            <Line type="monotone" dataKey="Présents" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
            <Line type="monotone" dataKey="Absents"  stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Employee ranking */}
      {ranking.length > 0 && (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700">
            <p className="text-sm font-bold text-slate-800 dark:text-white">Classement par taux de présence</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-navy-800">
            {ranking.slice(0, 10).map(({ emp, present, total, totalHrs, rate }, i) => (
              <div key={emp._id} className="flex items-center gap-3 px-5 py-3">
                <span className={`text-sm font-black w-6 shrink-0 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-slate-300'}`}>
                  #{i+1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">{emp.department}</p>
                </div>
                {/* Rate bar */}
                <div className="w-24 hidden sm:block">
                  <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${rate}%`, background: rate >= 90 ? '#22c55e' : rate >= 70 ? '#f97316' : '#ef4444' }}/>
                  </div>
                </div>
                <span className={`text-sm font-black w-12 text-right ${rate >= 90 ? 'text-green-500' : rate >= 70 ? 'text-orange-500' : 'text-red-500'}`}>
                  {rate}%
                </span>
                <span className="text-xs text-slate-400 w-16 text-right hidden md:block">{totalHrs.toFixed(0)}h total</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminAttendance() {
  const today = new Date()
  const [month, setMonth]         = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [employees, setEmployees] = useState([])
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [popup, setPopup]         = useState(null)   // { empId, day }
  const [dept, setDept]           = useState('Tous')
  const [siteFilter, setSiteFilter] = useState('')
  const [view, setView]           = useState('grid') // 'grid' | 'stats'

  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [empR, attR] = await Promise.all([
        adminEmployees.getAll(),
        adminAttendance.getAll({ month: monthStr })
      ])
      setEmployees(empR.data.filter(e => e.status === 'Actif'))
      setRecords(attR.data)
    } finally { setLoading(false) }
  }, [monthStr])
  useEffect(() => { load() }, [load])

  const getRecord = (empId, day) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    return records.find(r => r.employee?._id === empId && new Date(r.date).toDateString() === date.toDateString())
  }

  const handleSave = async (payload) => {
    await adminAttendance.create(payload)
    await load()
  }

  // ── KPI calculations ──────────────────────────────────────────────────────
  const todayStr = today.toDateString()
  const isCurrentMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()
  const todayRecords   = records.filter(r => new Date(r.date).toDateString() === todayStr)
  const todayPresent   = todayRecords.filter(r => ['present','late'].includes(r.status)).length
  const todayAbsent    = todayRecords.filter(r => r.status === 'absent').length
  const totalPresent   = records.filter(r => ['present','late'].includes(r.status)).length
  const totalAbsent    = records.filter(r => r.status === 'absent').length
  const totalHours     = records.reduce((s, r) => s + (r.hoursWorked || 0), 0)
  const attendanceRate = (records.length > 0) ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) || 0 : 0

  const filteredEmployees = employees.filter(e => {
    if (dept !== 'Tous' && e.department !== dept) return false
    if (siteFilter) {
      const empRecs = records.filter(r => r.employee?._id === e._id)
      if (!empRecs.some(r => r.site?.toLowerCase().includes(siteFilter.toLowerCase()))) return false
    }
    return true
  })

  // Employees currently "in" (checked in today but not out)
  const inProgressToday = todayRecords.filter(r => r.checkIn && !r.checkOut).length

  const kpis = [
    {
      label: isCurrentMonth ? "Présents aujourd'hui" : 'Présents',
      value: todayPresent,
      sub: inProgressToday > 0 ? `${inProgressToday} encore sur site` : null,
      color: 'text-green-500',
    },
    {
      label: isCurrentMonth ? "Absents aujourd'hui" : 'Absents',
      value: todayAbsent,
      sub: null,
      color: 'text-red-500',
    },
    {
      label: 'Taux de présence',
      value: `${attendanceRate}%`,
      sub: `${totalPresent} jours enregistrés`,
      color: 'text-blue-500',
    },
    {
      label: 'Heures travaillées',
      value: totalHours > 0 ? `${totalHours.toFixed(1)}h` : '0h',
      sub: `ce mois (sorties confirmées)`,
      color: 'text-violet-500',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Pointage / Présence</h1>
          <p className="text-slate-500 text-sm mt-1">{employees.length} employés actifs</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900">
            <button onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${view === 'grid' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
              <Grid size={13}/> Grille
            </button>
            <button onClick={() => setView('stats')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${view === 'stats' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
              <BarChart2 size={13}/> Statistiques
            </button>
          </div>
          <select value={dept} onChange={e => setDept(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white">
            {DEPT_LIST.map(d => <option key={d}>{d}</option>)}
          </select>
          <input value={siteFilter} onChange={e => setSiteFilter(e.target.value)} placeholder="Chantier…"
            className="px-3 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white w-36"/>
          <MonthNav date={month} onChange={setMonth}/>
          <button onClick={() => exportCsv(filteredEmployees, records, days, month)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 font-medium transition-colors">
            <Download size={14}/> CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 px-5 py-4">
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
              {k.label.includes('Présents') && inProgressToday > 0 && (
                <span className="flex items-center gap-1 mb-0.5 text-[10px] font-bold text-green-500">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                  {inProgressToday} en cours
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">{k.label}</p>
            {k.sub && <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${v.cls}`}/>
            <span className="text-xs text-slate-500">{v.label}</span>
          </div>
        ))}
        <div className="h-4 w-px bg-slate-200 dark:bg-navy-700 mx-1"/>
        <div className="flex items-center gap-1.5">
          <span className="text-green-500 font-black text-sm">↑</span>
          <span className="text-xs text-slate-500">Entrée</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-orange-500 font-black text-sm">↓</span>
          <span className="text-xs text-slate-500">Sortie</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
          <span className="text-xs text-slate-500">En cours (pas encore sorti)</span>
        </div>
        <span className="text-xs text-slate-400 ml-1">· Cliquer pour éditer</span>
      </div>

      {/* Stats view */}
      {view === 'stats' && !loading && (
        <StatsPanel employees={filteredEmployees} records={records} days={days} month={month}/>
      )}

      {/* Grid */}
      {view === 'grid' && (loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
      : filteredEmployees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700">
          <UserCheck size={32} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Aucun employé {dept !== 'Tous' ? `dans le département "${dept}"` : 'actif'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wide sticky left-0 bg-white dark:bg-navy-900 z-10 min-w-[160px]">Employé</th>
                  {days.map(d => {
                    const date = new Date(month.getFullYear(), month.getMonth(), d)
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    const isToday   = date.toDateString() === today.toDateString()
                    return (
                      <th key={d} className={`text-center px-0.5 py-3 font-bold min-w-[62px] ${isWeekend ? 'text-slate-300 dark:text-navy-600 bg-slate-50 dark:bg-navy-800/50' : 'text-slate-500'} ${isToday ? 'text-blue-500' : ''}`}>
                        <div className={`${isToday ? 'bg-blue-500 text-white w-5 h-5 rounded-full mx-auto flex items-center justify-center text-[10px]' : ''}`}>{d}</div>
                        <div className="font-normal text-[9px] mt-0.5">{date.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</div>
                      </th>
                    )
                  })}
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wide min-w-[80px]">Présences</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wide min-w-[70px]">Heures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {filteredEmployees.map(emp => {
                  const empRecords = records.filter(r => r.employee?._id === emp._id)
                  const presCount  = empRecords.filter(r => ['present','late'].includes(r.status)).length
                  const totalH     = empRecords.reduce((s, r) => s + (r.hoursWorked || 0), 0)
                  return (
                    <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/20">
                      <td className="px-4 py-2 sticky left-0 bg-white dark:bg-navy-900 z-[5]">
                        <p className="font-semibold text-slate-800 dark:text-white truncate max-w-[140px]">{emp.firstName} {emp.lastName}</p>
                        <p className="text-slate-400 text-[10px]">{emp.department}</p>
                      </td>
                      {days.map(d => {
                        const rec       = getRecord(emp._id, d)
                        const sc        = rec ? STATUS_CONFIG[rec.status] : null
                        const date      = new Date(month.getFullYear(), month.getMonth(), d)
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                        const isOpen    = popup?.empId === emp._id && popup?.day === d
                        const hasIn     = !!rec?.checkIn
                        const hasOut    = !!rec?.checkOut
                        const inProgress = hasIn && !hasOut  // checked in, not yet out

                        return (
                          <td key={d} className={`px-0.5 py-1.5 align-top relative ${isWeekend ? 'bg-slate-50/80 dark:bg-navy-800/30' : ''}`}>
                            <button
                              onClick={() => !isWeekend && setPopup(isOpen ? null : { empId: emp._id, day: d })}
                              disabled={isWeekend}
                              className={`w-[58px] mx-auto rounded-xl transition-all hover:opacity-90 disabled:cursor-default text-left overflow-hidden
                                ${isOpen ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                                ${sc
                                  ? `${sc.bg} border ${sc.border}`
                                  : isWeekend ? ''
                                  : 'bg-slate-100 dark:bg-navy-700 border border-transparent hover:border-slate-200 dark:hover:border-navy-600'
                                }`}
                            >
                              {sc ? (
                                <div className="px-1.5 py-1.5 space-y-0.5">
                                  {/* Status badge */}
                                  <div className={`flex items-center gap-1`}>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.cls}`}/>
                                    <span className={`text-[9px] font-black uppercase tracking-wide ${sc.text}`}>
                                      {rec.status === 'present' ? 'Présent' :
                                       rec.status === 'late'    ? 'Retard'  :
                                       rec.status === 'absent'  ? 'Absent'  :
                                       rec.status === 'half-day'? 'Mi-tps'  : 'Congé'}
                                    </span>
                                  </div>

                                  {/* Check-IN line */}
                                  {hasIn && (
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-green-500 font-black text-[10px] leading-none">↑</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                        {rec.checkIn}
                                      </span>
                                    </div>
                                  )}

                                  {/* Check-OUT line OR "en cours" */}
                                  {hasOut ? (
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-orange-500 font-black text-[10px] leading-none">↓</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                        {rec.checkOut}
                                      </span>
                                    </div>
                                  ) : inProgress ? (
                                    <div className="flex items-center gap-0.5">
                                      <span className="inline-block w-1 h-1 rounded-full bg-green-400 animate-pulse"/>
                                      <span className="text-[8px] text-green-600 dark:text-green-400 font-semibold italic">en cours</span>
                                    </div>
                                  ) : null}

                                  {/* Hours worked */}
                                  {rec.hoursWorked > 0 && (
                                    <div className="mt-0.5 bg-white/60 dark:bg-navy-900/50 rounded-md px-1 py-0.5 text-center">
                                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">
                                        {rec.hoursWorked % 1 === 0 ? rec.hoursWorked : rec.hoursWorked.toFixed(1)}h
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : isWeekend ? null : (
                                <div className="h-10 flex items-center justify-center">
                                  <span className="text-slate-300 dark:text-navy-600 text-lg font-bold">+</span>
                                </div>
                              )}
                            </button>

                            {isOpen && (
                              <CellPopup
                                emp={emp} day={d} month={month}
                                record={rec}
                                onSave={handleSave}
                                onClose={() => setPopup(null)}
                              />
                            )}
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-2">
                        <span className="font-bold text-slate-900 dark:text-white">{presCount}</span>
                        <span className="text-slate-400">/{daysInMonth}</span>
                        <div className="w-12 h-1 bg-slate-100 dark:bg-navy-700 rounded-full mt-1 mx-auto overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.round((presCount / daysInMonth) * 100)}%` }}/>
                        </div>
                      </td>
                      <td className="text-center px-3 py-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{totalH > 0 ? `${totalH}h` : '—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

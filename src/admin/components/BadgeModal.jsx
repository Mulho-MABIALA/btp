import { useRef } from 'react'
import { X, Printer, QrCode, ExternalLink } from 'lucide-react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

// ── Department colours ────────────────────────────────────────────────────────
const DEPT_COLORS = {
  'Chantier':            { bg: '#3b82f6', dark: '#1d4ed8', text: '#eff6ff' },
  "Bureau d'études":     { bg: '#8b5cf6', dark: '#6d28d9', text: '#f5f3ff' },
  'Direction':           { bg: '#475569', dark: '#334155', text: '#f8fafc' },
  'Comptabilité':        { bg: '#10b981', dark: '#047857', text: '#ecfdf5' },
  'Ressources humaines': { bg: '#ec4899', dark: '#be185d', text: '#fdf2f8' },
  'Commercial':          { bg: '#f97316', dark: '#c2410c', text: '#fff7ed' },
  'Logistique':          { bg: '#eab308', dark: '#a16207', text: '#fefce8' },
}
const deptC = dept => DEPT_COLORS[dept] || DEPT_COLORS['Chantier']

// ── Visual preview (Tailwind, shown in modal) ─────────────────────────────────
function BadgePreview({ emp }) {
  const c      = deptC(emp.department)
  const empNum = `EMP-${emp._id?.slice(-6).toUpperCase() || '000000'}`
  const joinY  = emp.startDate ? new Date(emp.startDate).getFullYear() : null

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      style={{ width: 323, height: 204, fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: `linear-gradient(to right, ${c.bg}, ${c.dark})` }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>C</div>
          <span className="font-black text-xs tracking-wide text-white">CONSTRUCTPRO</span>
        </div>
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,.65)', fontSize: 8 }}>Badge d'accès</span>
      </div>

      {/* Body */}
      <div className="flex gap-2.5 px-3 py-2.5" style={{ height: 138 }}>
        {/* Photo */}
        <div className="shrink-0">
          {emp.photo
            ? <img src={emp.photo} className="rounded-xl object-cover border-2 border-slate-100"
                style={{ width: 62, height: 82 }} alt=""/>
            : <div className="rounded-xl flex items-center justify-center text-white text-xl font-black border-2 border-slate-100"
                style={{ width: 62, height: 82, background: `linear-gradient(135deg, ${c.bg}, ${c.dark})` }}>
                {emp.firstName?.[0]}{emp.lastName?.[0]}
              </div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-black text-slate-900 leading-tight truncate" style={{ fontSize: 13 }}>
            {emp.firstName} {emp.lastName?.toUpperCase()}
          </p>
          <p className="font-semibold text-slate-500 mt-0.5 truncate" style={{ fontSize: 10 }}>
            {emp.position || '—'}
          </p>
          <div className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-white font-bold"
            style={{ fontSize: 8, background: c.bg }}>
            {emp.department}
          </div>
          <div className="mt-2 space-y-0.5">
            <p className="font-mono text-slate-400" style={{ fontSize: 8 }}>{empNum}</p>
            {joinY && <p className="text-slate-400" style={{ fontSize: 8 }}>En poste depuis {joinY}</p>}
          </div>
        </div>

        {/* QR */}
        <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
          <div className="rounded-xl p-1.5 border border-slate-100 bg-white shadow-sm">
            <QRCodeSVG value={`EMP:${emp._id}`} size={66} bgColor="#fff" fgColor="#0f172a" level="M"/>
          </div>
          <p className="text-center text-slate-400 leading-tight" style={{ fontSize: 8 }}>
            Scanner pour<br/>pointer
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <span className="text-slate-500 tracking-widest uppercase" style={{ fontSize: 7 }}>
          Valide uniquement avec photo
        </span>
        <span className="text-slate-500 font-mono" style={{ fontSize: 7 }}>{empNum}</span>
      </div>
    </div>
  )
}

// ── Print function — pure inline styles, no Tailwind ─────────────────────────
function buildPrintHtml(emp, qrDataUrl) {
  const c      = deptC(emp.department)
  const empNum = `EMP-${emp._id?.slice(-6).toUpperCase() || '000000'}`
  const joinY  = emp.startDate ? new Date(emp.startDate).getFullYear() : null

  const photoBlock = emp.photo
    ? `<img src="${emp.photo}" style="width:62px;height:82px;object-fit:cover;border-radius:10px;border:2px solid #e2e8f0;display:block;flex-shrink:0;"/>`
    : `<div style="width:62px;height:82px;border-radius:10px;background:linear-gradient(135deg,${c.bg},${c.dark});display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:900;border:2px solid #e2e8f0;flex-shrink:0;">${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}</div>`

  const qrBlock = qrDataUrl
    ? `<img src="${qrDataUrl}" style="width:68px;height:68px;display:block;border-radius:6px;"/>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Badge – ${emp.firstName} ${emp.lastName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .badge {
      width: 323px;
      height: 204px;
      background: white;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
      display: flex;
      flex-direction: column;
      position: relative;
    }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { background: white; }
      @page { size: 85.6mm 53.98mm; margin: 0; }
      .badge {
        width: 85.6mm;
        height: 53.98mm;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="badge">

    <!-- Header band -->
    <div style="background:linear-gradient(to right,${c.bg},${c.dark});padding:8px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:22px;height:22px;background:rgba(255,255,255,.2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:11px;">C</div>
        <span style="color:white;font-weight:900;font-size:11px;letter-spacing:.05em;">CONSTRUCTPRO</span>
      </div>
      <span style="color:rgba(255,255,255,.65);font-size:7.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Badge d'accès</span>
    </div>

    <!-- Body -->
    <div style="flex:1;display:flex;gap:10px;padding:10px 12px 30px 12px;overflow:hidden;">

      <!-- Photo -->
      ${photoBlock}

      <!-- Info -->
      <div style="flex:1;min-width:0;padding-top:2px;">
        <p style="font-weight:900;font-size:13px;color:#0f172a;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${emp.firstName || ''} ${(emp.lastName || '').toUpperCase()}
        </p>
        <p style="font-weight:600;font-size:9.5px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${emp.position || ''}
        </p>
        <div style="display:inline-block;margin-top:6px;padding:2px 9px;border-radius:20px;font-size:8px;font-weight:700;color:white;background:${c.bg};">
          ${emp.department || ''}
        </div>
        <div style="margin-top:8px;">
          <p style="font-size:8px;color:#94a3b8;font-family:monospace;">${empNum}</p>
          ${joinY ? `<p style="font-size:8px;color:#94a3b8;margin-top:2px;">En poste depuis ${joinY}</p>` : ''}
        </div>
      </div>

      <!-- QR code -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:5px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
          ${qrBlock}
        </div>
        <p style="font-size:7px;color:#94a3b8;text-align:center;line-height:1.35;">Scanner pour<br/>pointer</p>
      </div>

    </div>

    <!-- Footer band -->
    <div style="position:absolute;bottom:0;left:0;right:0;background:#0f172a;padding:4px 12px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:7px;color:#475569;letter-spacing:.1em;text-transform:uppercase;">Valide uniquement avec photo</span>
      <span style="font-size:7px;color:#475569;font-family:monospace;">${empNum}</span>
    </div>

  </div>
</body>
</html>`
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function BadgeModal({ employee, onClose }) {
  const canvasRef = useRef(null)

  if (!employee) return null

  const handlePrint = () => {
    // Get QR canvas (rendered hidden) → base64 PNG
    const canvas  = canvasRef.current?.querySelector('canvas')
    const qrSrc   = canvas ? canvas.toDataURL('image/png') : ''
    const html    = buildPrintHtml(employee, qrSrc)
    const win     = window.open('', '_blank', 'width=600,height=500')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 600)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>

      <div className="relative bg-white dark:bg-navy-900 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-blue-500"/>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Badge employé</h3>
          </div>
          <div className="flex items-center gap-2">
            <a href="/kiosk" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-semibold">
              <ExternalLink size={11}/> Terminal
            </a>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Badge preview */}
        <div className="p-6 flex justify-center bg-slate-100 dark:bg-navy-800">
          <BadgePreview emp={employee}/>
        </div>

        {/* Hidden QRCodeCanvas for print (must be mounted to get canvas) */}
        <div ref={canvasRef} style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none' }}>
          <QRCodeCanvas value={`EMP:${employee._id}`} size={80} bgColor="#ffffff" fgColor="#0f172a" level="M"/>
        </div>

        {/* QR info */}
        <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-500/10 border-t border-blue-100 dark:border-blue-500/20 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Code QR : <span className="font-bold font-mono">EMP:{employee._id}</span>
          </p>
          <p className="text-[10px] text-blue-400 mt-0.5">Scannable depuis la page Terminal kiosque</p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
            Fermer
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2">
            <Printer size={14}/> Imprimer le badge
          </button>
        </div>

      </div>
    </div>
  )
}

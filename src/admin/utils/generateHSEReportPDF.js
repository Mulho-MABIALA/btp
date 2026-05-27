import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateHSEReportPDF(inc, settings = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w   = doc.internal.pageSize.getWidth()
  const company = settings.companyName || 'CONSTRUCTPRO'

  const SEVERITY_LABELS = { minor: 'Mineur', moderate: 'Modéré', major: 'Majeur', critical: 'Critique' }
  const SEVERITY_COLORS = { minor: [34, 197, 94], moderate: [234, 179, 8], major: [249, 115, 22], critical: [220, 38, 38] }
  const STATUS_LABELS   = { open: 'Ouvert', in_progress: 'En traitement', closed: 'Clôturé' }

  const sevColor = SEVERITY_COLORS[inc.severity] || [100, 116, 139]
  const sevLabel = SEVERITY_LABELS[inc.severity] || inc.severity

  // ── Header ───────────────────────────────────────────────────────────────────
  doc.setFillColor(11, 22, 40)
  doc.rect(0, 0, w, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(company, 15, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('RAPPORT D\'INCIDENT HSE', 15, 26)
  doc.text(`Date : ${new Date(inc.date).toLocaleDateString('fr-FR')}`, 15, 33)
  ;[settings.address,
    settings.city && settings.country ? `${settings.city}, ${settings.country}` : settings.city,
    settings.phone,
  ].filter(Boolean).forEach((line, i) => {
    doc.setFontSize(7.5); doc.setTextColor(148, 163, 184)
    doc.text(line, w - 15, 13 + i * 5, { align: 'right' })
  })

  // ── Severity badge ───────────────────────────────────────────────────────────
  const bY = 48
  doc.setFillColor(...sevColor)
  doc.roundedRect(15, bY, 40, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(sevLabel.toUpperCase(), 35, bY + 8, { align: 'center' })

  doc.setTextColor(71, 85, 105)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Statut : ${STATUS_LABELS[inc.status] || inc.status}`, 60, bY + 8)
  if (inc.type) doc.text(`Type : ${inc.type}`, 110, bY + 8)

  // ── Title ────────────────────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(inc.title, 15, bY + 24)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  const meta = [inc.site, inc.reportedBy ? `Signalé par ${inc.reportedBy}` : ''].filter(Boolean).join(' · ')
  if (meta) doc.text(meta, 15, bY + 32)

  // ── Content sections ─────────────────────────────────────────────────────────
  const sections = [
    { label: 'Description', value: inc.description },
    { label: 'Personne blessée / concernée', value: inc.injuredPerson },
    { label: 'Témoins', value: inc.witnesses },
    { label: 'Cause identifiée', value: inc.cause },
    { label: 'Action corrective mise en place', value: inc.correctiveAction },
  ].filter(s => s.value)

  autoTable(doc, {
    startY: bY + 40,
    margin: { left: 15, right: 15 },
    head: [['SECTION', 'DÉTAIL']],
    body: sections.map(s => [s.label, s.value]),
    theme: 'grid',
    headStyles: { fillColor: [11, 22, 40], textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] }, 1: { cellWidth: 'auto' } },
  })

  // ── Footer ───────────────────────────────────────────────────────────────────
  const fy = 275
  doc.setFillColor(248, 250, 252)
  doc.rect(0, fy, w, 22, 'F')
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Document confidentiel — ${company} — Généré le ${new Date().toLocaleDateString('fr-FR')}`, w / 2, fy + 10, { align: 'center' })

  doc.save(`rapport-hse-${inc._id || 'incident'}.pdf`)
}

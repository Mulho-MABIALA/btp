import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt0 = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

function fmtMonth(s) {
  const [y, m] = s.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function generatePayslipPDF(p, settings = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w   = doc.internal.pageSize.getWidth()
  const emp = p.employee || {}
  const company = settings.companyName || 'CONSTRUCTPRO'
  const monthLabel = fmtMonth(p.month)

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(11, 22, 40)
  doc.rect(0, 0, w, 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(company, 15, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('BULLETIN DE PAIE', 15, 26)
  doc.text(`Période : ${monthLabel}`, 15, 33)

  // Company info right
  ;[settings.address,
    settings.city && settings.country ? `${settings.city}, ${settings.country}` : settings.city,
    settings.phone, settings.email,
  ].filter(Boolean).forEach((line, i) => {
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(line, w - 15, 13 + i * 5, { align: 'right' })
  })

  // ── Employee + Période blocks ────────────────────────────────────────────
  const bY = 48
  // Employé
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, bY, 88, 40, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYÉ', 20, bY + 7)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`${emp.firstName || ''} ${(emp.lastName || '').toUpperCase()}`, 20, bY + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(emp.position || emp.role || '—', 20, bY + 22)
  doc.text(emp.department || '—', 20, bY + 29)
  if (emp.cnss) doc.text(`N° CNSS : ${emp.cnss}`, 20, bY + 36)

  // Période
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(w - 88, bY, 73, 40, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('PÉRIODE', w - 83, bY + 7)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), w - 83, bY + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Jours travaillés : ${p.workingDays || 0}`, w - 83, bY + 22)
  doc.text(`Jours d'absence  : ${p.absenceDays || 0}`, w - 83, bY + 29)
  if (p.otHours > 0) doc.text(`Heures sup : ${(p.otHours).toFixed(1)} h`, w - 83, bY + 36)

  // ── Tableau Rémunération / Retenues ──────────────────────────────────────
  const startY = bY + 48

  // Colonne gauche — Rémunération
  const remLines = [
    ['Salaire de base', `${fmt0(p.baseSalary)} MAD`],
  ]
  if (p.otAmount > 0) remLines.push([`H. sup (${(p.otHours||0).toFixed(1)}h × ×1.25)`, `+ ${fmt0(p.otAmount)} MAD`])
  if (p.bonuses  > 0) remLines.push(['Primes / Gratifications', `+ ${fmt0(p.bonuses)} MAD`])
  if (p.transport> 0) remLines.push(['Indemnité transport', `+ ${fmt0(p.transport)} MAD`])
  if (p.meal     > 0) remLines.push(['Indemnité repas', `+ ${fmt0(p.meal)} MAD`])

  autoTable(doc, {
    startY,
    margin: { left: 15, right: w / 2 + 2 },
    head: [['RÉMUNÉRATION', 'Montant']],
    body: [...remLines, [{ content: `SALAIRE BRUT`, styles: { fontStyle: 'bold' } }, { content: `${fmt0(p.grossSalary)} MAD`, styles: { fontStyle: 'bold' } }]],
    theme: 'grid',
    headStyles: { fillColor: [11, 22, 40], textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 28 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  const leftEnd = doc.lastAutoTable.finalY

  // Colonne droite — Retenues
  const retLines = [
    [`CNSS salarié (4.48%)`, `− ${fmt0(p.cnssEmployee)} MAD`],
    [`AMO salarié (2.26%)`,  `− ${fmt0(p.amoEmployee)} MAD`],
    [`Net imposable`,        `${fmt0(p.netImposable)} MAD`],
    [`IR mensuel`,           `− ${fmt0(p.irAmount)} MAD`],
  ]
  if (p.advances > 0) retLines.push([`Avances déduites`, `− ${fmt0(p.advances)} MAD`])

  autoTable(doc, {
    startY,
    margin: { left: w / 2 + 2, right: 15 },
    head: [['RETENUES & COTISATIONS', 'Montant']],
    body: [...retLines, [{ content: 'TOTAL RETENUES', styles: { fontStyle: 'bold' } }, { content: `− ${fmt0(p.totalDeductions)} MAD`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }]],
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 28 } },
    alternateRowStyles: { fillColor: [255, 241, 242] },
  })

  const rightEnd = doc.lastAutoTable.finalY
  const netY = Math.max(leftEnd, rightEnd) + 6

  // ── NET À PAYER ──────────────────────────────────────────────────────────
  doc.setFillColor(11, 22, 40)
  doc.roundedRect(15, netY, w - 30, 16, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('NET À PAYER', 24, netY + 10)
  doc.setFontSize(14)
  doc.setTextColor(96, 165, 250)
  doc.text(`${fmt0(p.netSalary)} MAD`, w - 20, netY + 10, { align: 'right' })

  // ── Charges patronales (encart) ──────────────────────────────────────────
  const cpY = netY + 22
  doc.setFillColor(254, 252, 232)
  doc.roundedRect(15, cpY, w - 30, 24, 2, 2, 'F')
  doc.setDrawColor(251, 191, 36)
  doc.setLineWidth(0.3)
  doc.roundedRect(15, cpY, w - 30, 24, 2, 2, 'S')
  doc.setTextColor(161, 98, 7)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('CHARGES PATRONALES (information employeur)', 20, cpY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(92, 63, 0)
  const cpItems = [
    { label: `CNSS employeur (21.09%)`, val: fmt0(p.cnssEmployer) },
    { label: `AMO employeur (4.11%)`,   val: fmt0(p.amoEmployer) },
    { label: `Coût employeur total`,    val: fmt0(p.employerCost) },
  ]
  cpItems.forEach((item, i) => {
    const x = 20 + i * 60
    doc.text(item.label, x, cpY + 14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${item.val} MAD`, x, cpY + 20)
    doc.setFont('helvetica', 'normal')
  })

  // ── RIB / Paiement ───────────────────────────────────────────────────────
  if (emp.rib) {
    const ribY = cpY + 30
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(15, ribY, w - 30, 14, 2, 2, 'F')
    doc.setTextColor(59, 130, 246)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('VIREMENT BANCAIRE', 20, ribY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(8)
    doc.text(`RIB : ${emp.rib}`, 20, ribY + 12)
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const fy = 275
  doc.setFillColor(248, 250, 252)
  doc.rect(0, fy, w, 22, 'F')
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const legal = [
    settings.ice     && `ICE : ${settings.ice}`,
    settings.rc      && `RC : ${settings.rc}`,
    settings.patente && `Patente : ${settings.patente}`,
    settings.tvaNumber && `IF : ${settings.tvaNumber}`,
  ].filter(Boolean)
  if (legal.length) doc.text(legal.join('  ·  '), w / 2, fy + 7, { align: 'center' })
  doc.setTextColor(200, 210, 220)
  doc.text(`Bulletin généré le ${new Date().toLocaleDateString('fr-FR')} — Document confidentiel — ${company}`, w / 2, fy + 15, { align: 'center' })

  doc.save(`bulletin_${emp.lastName || ''}_${p.month}.pdf`)
}

const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

const payrollSchema = new mongoose.Schema({
  employee:     { type: ObjectId, ref: 'Employee', required: true },
  month:        { type: String, required: true },   // "2026-05"
  year:         { type: Number, required: true },

  // ── Rémunération ──────────────────────────────────────────────────────
  baseSalary:   { type: Number, default: 0 },       // Salaire de base brut
  hoursWorked:  { type: Number, default: 0 },       // Heures réellement travaillées
  workingDays:  { type: Number, default: 0 },       // Jours travaillés
  absenceDays:  { type: Number, default: 0 },       // Jours d'absence déduits

  // ── Heures supplémentaires ────────────────────────────────────────────
  otHours:      { type: Number, default: 0 },       // Nb heures sup
  otRate:       { type: Number, default: 1.25 },    // Taux (+25% légal Maroc)
  otAmount:     { type: Number, default: 0 },       // Montant heures sup

  // ── Primes & avantages ────────────────────────────────────────────────
  bonuses:      { type: Number, default: 0 },       // Primes diverses
  transport:    { type: Number, default: 0 },       // Indemnité transport
  meal:         { type: Number, default: 0 },       // Indemnité repas

  // ── Brut imposable ────────────────────────────────────────────────────
  grossSalary:  { type: Number, default: 0 },       // = base + OT + primes

  // ── CNSS (Caisse Nationale de Sécurité Sociale) ───────────────────────
  cnssEmployee: { type: Number, default: 0 },       // 4.48% plafonné à 6,000 MAD/mois brut
  cnssEmployer: { type: Number, default: 0 },       // 21.09%

  // ── AMO (Assurance Maladie Obligatoire) ───────────────────────────────
  amoEmployee:  { type: Number, default: 0 },       // 2.26%
  amoEmployer:  { type: Number, default: 0 },       // 4.11%

  // ── IR (Impôt sur le Revenu) ──────────────────────────────────────────
  netImposable: { type: Number, default: 0 },       // Brut - CNSS - AMO salarié
  irAmount:     { type: Number, default: 0 },

  // ── Déductions diverses ───────────────────────────────────────────────
  advances:     { type: Number, default: 0 },       // Avances déduites ce mois
  otherDeductions: { type: Number, default: 0 },

  // ── Net à payer ───────────────────────────────────────────────────────
  totalDeductions: { type: Number, default: 0 },
  netSalary:    { type: Number, default: 0 },

  // ── Coût employeur total ──────────────────────────────────────────────
  employerCost: { type: Number, default: 0 },       // Brut + CNSS employeur + AMO employeur

  // ── Statut ────────────────────────────────────────────────────────────
  status:       { type: String, enum: ['brouillon', 'validé', 'payé'], default: 'brouillon' },
  paidDate:     Date,
  notes:        String,
}, { timestamps: true })

// Unique constraint: one payroll per employee per month
payrollSchema.index({ employee: 1, month: 1 }, { unique: true })
payrollSchema.index({ month: 1 })

module.exports = mongoose.model('Payroll', payrollSchema)

const mongoose = require('mongoose')

const emergencyContactSchema = new mongoose.Schema({
  name:     String,
  phone:    String,
  relation: String,
}, { _id: false })

const advanceSchema = new mongoose.Schema({
  date:   { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  reason: String,
  status: { type: String, enum: ['en attente', 'déduit'], default: 'en attente' },
}, { timestamps: true })

const trainingSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  date:       Date,
  expiryDate: Date,           // For certifications that expire
  organiser:  String,
  type:       { type: String, enum: ['Formation', 'Habilitation', 'Permis', 'Certification', 'Autre'], default: 'Formation' },
  notes:      String,
}, { timestamps: true })

const employeeSchema = new mongoose.Schema({
  // Identité
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  position:     String,   // Poste / Fonction (standardisé — anciennement "role")
  role:         String,   // Gardé pour rétrocompatibilité
  department:   { type: String, enum: ['Direction', 'Chantier', "Bureau d'études", 'Comptabilité', 'Ressources humaines', 'Commercial', 'Logistique'], default: 'Chantier' },
  email:        String,
  phone:        String,
  cin:          String,
  address:      String,

  // Contrat
  contractType: { type: String, enum: ['CDI', 'CDD', 'Intérim', 'Stage', 'Freelance'], default: 'CDI' },
  salary:       { type: Number, default: 0 },
  startDate:    Date,
  endDate:      Date,
  status:       { type: String, enum: ['Actif', 'Congé', 'Absent', 'Archivé'], default: 'Actif' },

  // Administratif
  cnss:         String,
  rib:          String,

  // Contact d'urgence
  emergencyContact: emergencyContactSchema,

  // Compétences
  skills:       [String],

  // Formations & certifications
  trainings:    [trainingSchema],

  // Avances sur salaire
  advances:     [advanceSchema],

  // Médias
  photo:        String,

  // Divers
  notes:        String,
}, { timestamps: true })

// Virtual: ancienneté en mois
employeeSchema.virtual('seniorityMonths').get(function () {
  if (!this.startDate) return 0
  const now   = new Date()
  const start = new Date(this.startDate)
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
})

// Virtual: fullName
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Virtual: effective position (position || role for backward compat)
employeeSchema.virtual('effectivePosition').get(function () {
  return this.position || this.role || ''
})

module.exports = mongoose.model('Employee', employeeSchema)

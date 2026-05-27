const mongoose = require('mongoose')

const breakSchema = new mongoose.Schema({
  startTime: { type: String, required: true },  // "12:00"
  endTime:   { type: String, required: true },  // "13:00"
  type:      { type: String, enum: ['Déjeuner', 'Café', 'Prière', 'Autre'], default: 'Déjeuner' },
}, { _id: false })

const workScheduleSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:      { type: Date, required: true },
  startTime: { type: String, required: true },  // "08:00"
  endTime:   { type: String, required: true },  // "17:00"
  breaks:    { type: [breakSchema], default: [] },
  shiftType: {
    type: String,
    enum: ['Matin', 'Journée', 'Après-midi', 'Nuit', 'Personnalisé'],
    default: 'Journée'
  },
  site:   String,
  status: {
    type: String,
    enum: ['planifié', 'confirmé', 'complété', 'absent'],
    default: 'planifié'
  },
  notes: String,
}, { timestamps: true })

// Index for efficient week queries
workScheduleSchema.index({ employee: 1, date: 1 })

module.exports = mongoose.model('WorkSchedule', workScheduleSchema)

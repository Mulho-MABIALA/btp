const mongoose = require('mongoose')

const kioskLogSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  action:    { type: String, enum: ['in', 'out', 're-in'], required: true },
  time:      { type: String, required: true },   // HH:MM
  site:      { type: String },
  latitude:  { type: Number },
  longitude: { type: Number },
  message:   { type: String },
}, { timestamps: true })

kioskLogSchema.index({ employee: 1, createdAt: -1 })
kioskLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('KioskLog', kioskLogSchema)

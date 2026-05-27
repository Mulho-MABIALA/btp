const mongoose = require('mongoose')

// Stocke les alertes automatiques "snoozetées" par l'utilisateur
const autoSnoozeSchema = new mongoose.Schema({
  alertId:      { type: String, required: true, unique: true }, // ex: "inv_64abc..."
  snoozedUntil: { type: Date, required: true },
}, { timestamps: true })

// Index TTL : supprime automatiquement l'entrée quand la date est dépassée
autoSnoozeSchema.index({ snoozedUntil: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('AutoSnooze', autoSnoozeSchema)

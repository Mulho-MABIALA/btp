const mongoose = require('mongoose')

const clientSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  type:    { type: String, enum: ['particulier', 'entreprise'], default: 'entreprise' },
  email:   { type: String, trim: true },
  phone:   String,
  address: String,
  city:    String,
  ice:     String,   // Identifiant Commun de l'Entreprise
  notes:   String,
}, { timestamps: true })

module.exports = mongoose.model('Client', clientSchema)

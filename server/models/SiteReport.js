const mongoose = require('mongoose')

const siteReportSchema = new mongoose.Schema({
  date:          { type: Date, required: true, default: Date.now },
  project:       { type: String, required: true },
  weather:       { type: String, enum: ['Ensoleillé', 'Nuageux', 'Pluvieux', 'Venteux', 'Orageux'], default: 'Ensoleillé' },
  temperature:   Number,
  workersCount:  Number,         // nombre d'ouvriers présents
  teamPresent:   String,         // noms / équipes
  worksDone:     String,
  materials:     String,         // matériaux utilisés / livrés
  issues:        String,
  nextDayPlan:   String,
  progress:      { type: Number, min: 0, max: 100, default: 0 },
  author:        String,
  photos:        [String],       // URLs images
}, { timestamps: true })

module.exports = mongoose.model('SiteReport', siteReportSchema)

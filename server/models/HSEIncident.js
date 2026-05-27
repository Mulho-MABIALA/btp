const mongoose = require('mongoose')

const hseIncidentSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  date:             { type: Date, default: Date.now },
  site:             String,
  type:             { type: String, enum: ["Accident", "Incident", "Presqu'accident", 'Observation', 'Non-conformité'], default: 'Incident' },
  severity:         { type: String, enum: ['minor', 'moderate', 'major', 'critical'], default: 'minor' },
  description:      String,
  injuredPerson:    String,
  witnesses:        String,
  cause:            String,
  correctiveAction: String,
  status:           { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
  reportedBy:       String,
  closedDate:       Date,
  photos:           [{ url: String, filename: String, caption: String, uploadedAt: { type: Date, default: Date.now } }],
}, { timestamps: true })

module.exports = mongoose.model('HSEIncident', hseIncidentSchema)

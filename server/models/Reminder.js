const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  type:          { type: String, enum: ['Facture', 'Contrat', 'Maintenance', 'Réunion', 'RH', 'Autre'], default: 'Autre' },
  dueDate:       Date,
  priority:      { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status:        { type: String, enum: ['pending', 'done', 'snoozed'], default: 'pending' },
  notes:         String,
  assignedTo:    String,
  relatedEntity: String,
}, { timestamps: true })

module.exports = mongoose.model('Reminder', reminderSchema)

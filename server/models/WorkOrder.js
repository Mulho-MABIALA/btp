const mongoose = require('mongoose')

const workOrderSchema = new mongoose.Schema({
  number:         { type: String, unique: true },
  project:        String,
  site:           String,
  title:          { type: String, required: true },
  description:    String,
  assignedTo:     String,
  priority:       { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status:         { type: String, enum: ['pending', 'in_progress', 'done', 'cancelled'], default: 'pending' },
  startDate:      Date,
  endDate:        Date,
  estimatedHours: Number,
  actualHours:    Number,
  materials:      String,
  notes:          String,
}, { timestamps: true })

module.exports = mongoose.model('WorkOrder', workOrderSchema)

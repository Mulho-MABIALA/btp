const mongoose = require('mongoose')

const leaveSchema = new mongoose.Schema({
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type:       { type: String, enum: ['Congé annuel', 'Congé maladie', 'Congé maternité', 'Congé sans solde', 'Événement familial', 'Autre'], default: 'Congé annuel' },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  days:       Number,
  reason:     String,
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: String,
  notes:      String,
}, { timestamps: true })

module.exports = mongoose.model('Leave', leaveSchema)

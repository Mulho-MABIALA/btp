const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
  employee:    { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:        { type: Date, required: true },
  site:        String,
  status:      { type: String, enum: ['present', 'absent', 'late', 'half-day', 'holiday'], default: 'present' },
  checkIn:     String,
  checkOut:    String,
  hoursWorked: { type: Number, default: 8 },
  overtime:    { type: Number, default: 0 },
  notes:       String,
}, { timestamps: true })

module.exports = mongoose.model('Attendance', attendanceSchema)

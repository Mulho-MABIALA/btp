const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
  category:      { type: String, required: true },
  description:   { type: String, required: true },
  amount:        { type: Number, required: true },
  date:          { type: Date, default: Date.now },
  project:       String,
  supplier:      String,
  paymentMethod: { type: String, enum: ['cash', 'virement', 'cheque', 'carte'], default: 'virement' },
}, { timestamps: true })

module.exports = mongoose.model('Expense', expenseSchema)

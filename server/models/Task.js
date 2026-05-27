const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: String,
  // Liens par ObjectId (fiables)
  employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  projectRef:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project',  default: null },
  // Champs texte conservés pour affichage rapide + rétrocompat
  assignee:    String,
  project:     String,
  priority:    { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status:      { type: String, enum: ['todo', 'in-progress', 'review', 'done'], default: 'todo' },
  dueDate:     Date,
  tags:        [String],
}, { timestamps: true })

module.exports = mongoose.model('Task', taskSchema)

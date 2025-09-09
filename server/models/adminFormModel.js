const mongoose = require('mongoose');

const adminFormSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  businessName: { type: String },
  businessType: { type: String },
  cardDesign: { type: String },
  status: { type: String, default: 'Pending' }, // options: Pending, Approved, Rejected
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminForm', adminFormSchema);

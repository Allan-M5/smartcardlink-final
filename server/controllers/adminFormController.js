// C:\Users\ADMIN\Desktop\smartcardlink-app\server\controllers\adminFormController.js
const AdminForm = require('../models/adminFormModel');

/**
 * POST  /api/submit-admin-form
 * Save a new admin form submission
 */
exports.submitAdminForm = async (req, res) => {
  try {
    const newForm = new AdminForm(req.body);
    await newForm.save();
    res.status(201).json({ message: 'Form submitted successfully', formId: newForm._id });
  } catch (err) {
    console.error('Error saving admin form:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET  /api/adminform
 * Fetch all admin form submissions
 */
exports.getAllAdminForms = async (_req, res) => {
  try {
    const forms = await AdminForm.find().sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT  /api/adminform/:id
 * Update form status (e.g., Approved / Rejected)
 */
exports.updateAdminFormStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expect “Approved”, “Rejected”, etc.
    const updated = await AdminForm.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Form not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE  /api/adminform/:id
 * Remove a submission
 */
exports.deleteAdminForm = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AdminForm.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Form not found' });
    res.json({ message: 'Form deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

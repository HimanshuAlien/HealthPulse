const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');

// GET /api/doctors?specialization=Dentist
router.get('/', async (req, res) => {
  try {
    const { specialization } = req.query;

    const filter = specialization
      ? { specialization: { $regex: specialization, $options: 'i' } }
      : {};

    const doctors = await Doctor.find(filter).sort({ name: 1 });
    res.json(doctors);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

module.exports = router;

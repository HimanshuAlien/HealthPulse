const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
    name: String,
    specialization: String,
    phone: String,
    hospital: String
}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);
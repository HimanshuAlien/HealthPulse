const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors({
    origin: true,
    credentials: true
})); // Modern CORS setup for Fitbit sessions
app.use(express.json());

// Serve the front-end web pages natively through localhost:3000
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Test Fitbit auth
app.get("/", (req, res) => {
    res.json({
        message: "HealthPulse Backend Ready",
        fitbitEndpoints: ["/api/fitbit/login", "/api/fitbit/summary", "/api/fitbit/heartrate", "/api/fitbit/sleep"],
        status: "⚠️ Check Fitbit auth at /api/fitbit/login (or check frontend)"
    });
});
const diagnosisRoute = require("./routes/diagnosis");
app.use("/api/diagnosis", diagnosisRoute);

// Handle Fitbit OAuth redirect URI root path
app.get("/callback", (req, res) => {
    res.redirect("/api/fitbit" + req.originalUrl);
});

const PORT = process.env.PORT || 3000;
const hospitalRoutes = require("./routes/hospitals");
const doctorRoutes = require("./routes/doctors");

app.use("/api/hospitals", hospitalRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/fitbit", require("./routes/fitbit"));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
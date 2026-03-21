const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    age: Number,
    heartRate: Number,
    steps: Number,
    sleepHours: Number,
    fitbitAccessToken: String,
    fitbitRefreshToken: String,
    fitbitExpiresAt: Date,
    fitbitUserId: String,
    latestFitbitData: {
        summary: Object,
        heartrate: Object,
        sleep: Object,
        activity: Object,
        body: Object,
        water: Object,
        stress: Object,
        device: Object,
        weekly: Object,
        cycle: Object,
        lastSync: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);
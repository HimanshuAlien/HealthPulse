const express = require("express");
const router = express.Router();
const axios = require("axios");
const User = require("../models/User");
require("dotenv").config();

let globalTokens = null;
let apiCache = {}; // Cache to store last fetched results and reduce API calls
const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache to stay under 150 requests/hr limit

const CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";

// Token refresh helper
async function refreshTokenIfNeeded(tokens) {
    if (!tokens || !tokens.access_token || !tokens.expires_at || new Date(tokens.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
        if (!tokens || !tokens.refresh_token) {
            throw new Error("No valid tokens. Please authorize first.");
        }

        // Refresh token
        const response = await axios.post("https://api.fitbit.com/oauth2/token", new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: tokens.refresh_token,
            client_id: CLIENT_ID
        }), {
            headers: {
                Authorization: `Basic ${Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const newTokens = response.data;
        newTokens.expires_at = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

        // Save globally
        globalTokens = newTokens;

        // Save to first user or create demo user
        await User.findOneAndUpdate(
            {},
            { fitbitAccessToken: newTokens.access_token, fitbitRefreshToken: newTokens.refresh_token, fitbitExpiresAt: newTokens.expires_at },
            { upsert: true, returnDocument: 'after' }
        );

        return newTokens;
    }
    return tokens;
}

// Get Fitbit client with valid tokens
async function getFitbitClient() {
    if (!globalTokens) {
        const user = await User.findOne();
        if (user && user.fitbitAccessToken) {
            globalTokens = {
                access_token: user.fitbitAccessToken,
                refresh_token: user.fitbitRefreshToken,
                expires_at: user.fitbitExpiresAt
            };
        }
    }

    if (!globalTokens || !globalTokens.access_token) {
        throw new Error("No fitbit token available");
    }

    globalTokens = await refreshTokenIfNeeded(globalTokens);

    return {
        get: async (url) => {
            const res = await axios.get("https://api.fitbit.com" + url, {
                headers: {
                    Authorization: "Bearer " + globalTokens.access_token,
                    "Accept-Language": "en_US"
                }
            });
            return res.data;
        }
    };
}

// OAuth login
router.get("/login", (req, res) => {
    const scope = "activity heartrate sleep profile weight settings nutrition oxygen_saturation temperature";
    const url = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}`;
    res.redirect(url);
});

// OAuth callback
router.get("/callback", async (req, res) => {
    try {
        const code = req.query.code;

        const response = await axios.post("https://api.fitbit.com/oauth2/token", new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
            code
        }), {
            headers: {
                Authorization: `Basic ${Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokens = response.data;
        tokens.expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        globalTokens = tokens;

        // Save to DB
        await User.findOneAndUpdate(
            {},
            {
                fitbitAccessToken: tokens.access_token,
                fitbitRefreshToken: tokens.refresh_token,
                fitbitExpiresAt: tokens.expires_at
            },
            { upsert: true, returnDocument: 'after' }
        );

        res.send(`
            <html>
                <head>
                    <title>Fitbit Connected</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; background: #F4F7FC; color: #0F1C3F; }
                        h1 { color: #10B981; }
                        .btn { background: #1B6FEB; font-weight: bold; color: white; padding: 12px 24px; border: none; border-radius: 20px; text-decoration: none; cursor: pointer; display: inline-block; margin-top: 20px;}
                    </style>
                </head>
                <body>
                    <h1>Γ£à Fitbit Connected Successfully!</h1>
                    <p>Your HealthPulse application is now linked to your Fitbit account.</p>
                    <p>You can safely close this page and return to the dashboard.</p>
                    <button class="btn" onclick="window.close(); history.back();">Return to Dashboard</button>
                    <script>
                        if (window.opener) {
                            window.opener.location.reload();
                        }
                        setTimeout(() => { window.close(); }, 3000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Data endpoints
router.get("/summary", async (req, res) => {
    try {
        const now = Date.now();
        if (apiCache.summary && (now - apiCache.summary.timestamp < CACHE_TTL)) {
            console.log("Serving Summary from Cache");
            return res.json(apiCache.summary.data);
        }

        const client = await getFitbitClient();
        const today = new Date().toISOString().split('T')[0];

        const [activities, sleep] = await Promise.all([
            client.get("/1/user/-/activities/date/" + today + ".json"),
            client.get("/1.2/user/-/sleep/date/" + today + ".json")
        ]);

        // ≡ƒöÑ Random Mock Heart Rate for Pitch
        const mockHR = Math.floor(Math.random() * (90 - 74 + 1)) + 74;

        const data = {
            date: today,
            steps: activities?.summary?.steps || 0,
            stepsGoal: activities?.goals?.steps || 10000,
            heartRate: mockHR, 
            calories: activities?.summary?.caloriesOut || 0,
            caloriesGoal: activities?.goals?.caloriesOut || 2500,
            sleep: 7.2, // Hardcoded Sleep for Pitch
            distance: activities?.summary?.distances?.find(d => d.activity === 'total')?.distance || 0
        };

        apiCache.summary = { timestamp: now, data };
        res.json(data);
    } catch (error) {
        console.error("Summary API Error:", error.message);
        const lastData = apiCache.summary?.data || {
            date: new Date().toISOString().split('T')[0],
            steps: 3241, stepsGoal: 10000, heartRate: 72, calories: 1432, caloriesGoal: 2500, sleep: 7.2, distance: 4.8
        };
        res.json(lastData);
    }
});

router.get("/heartrate", async (req, res) => {
    try {
        const now = Date.now();
        // ≡ƒöÑ Live Mocked HeartRate for Pitch
        const mockCurrent = Math.floor(Math.random() * (90 - 74 + 1)) + 74;
        const data = {
            current: mockCurrent,
            resting: 68,
            min: 58,
            max: 142,
            avg: 76,
            intraday: Array.from({length: 50}, () => Math.floor(Math.random() * (85 - 70 + 1)) + 70)
        };

        apiCache.heartrate = { timestamp: now, data };
        res.json(data);
    } catch (error) {
        const mockCurrent = Math.floor(Math.random() * (90 - 74 + 1)) + 74;
        res.json({ 
            current: mockCurrent, resting: 68, min: 58, max: 142, avg: 76, 
            intraday: Array.from({length: 50}, () => Math.floor(Math.random() * (85 - 70 + 1)) + 70)
        });
    }
});

router.get("/sleep", async (req, res) => {
    // ≡ƒÆñ Using high-quality Mock Sleep Data only for this portion to ensure visual accuracy
    res.json({
        totalHours: 7.2, 
        score: 78, 
        bedtime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), 
        wakeTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), 
        efficiency: 91, 
        latencyMin: 15, 
        awakenings: 2, 
        hrv: 42, 
        breathingRate: 15.4, 
        skinTempDelta: 0.2,
        stages: { awakeMin: 25, remMin: 90, lightMin: 210, deepMin: 120 }
    });
});

router.get("/activity", async (req, res) => {
    // Permanent Mock to save API rate limits
    res.json({
        hourlySteps: [0,0,0,0,50,120,400,800,1200,900,400,200,600,800,1000,0,0,0,0,0,0,0,0,0], 
        fairlyActiveMin: 45, 
        veryActiveMin: 20, 
        sedentaryMin: 480
    });
});

router.get("/body", async (req, res) => {
    // Permanent Mock to save API rate limits
    res.json({ 
        weight: 68.5, 
        bmi: 22.4, 
        bodyFatPct: 22.1, 
        vo2max: 44, 
        spo2: 98 
    });
});

router.get("/water", async (req, res) => {
    // Permanent Mock
    res.json({ consumed: 1850, goal: 2500 });
});

router.get("/stress", async (req, res) => {
    // Permanent Mock
    res.json({ score: 72, label: "Low", hrv: 45, breathingRate: 15.2, mindfulMin: 15 });
});

router.get("/device", async (req, res) => {
    // Permanent Mock
    res.json({ lastSync: new Date().toISOString(), batteryLevel: "High" });
});

router.get("/weekly", async (req, res) => {
    try {
        const client = await getFitbitClient();
        const response = await client.get("/1/user/-/activities/steps/date/today/7d.json");
        
        const timeSeries = response?.["activities-steps"] || [];
        const days = timeSeries.map(d => d.dateTime.split('-')[2] + "/" + d.dateTime.split('-')[1]);
        const steps = timeSeries.map(d => parseInt(d.value) || 0);

        res.json({ days, steps });
    } catch (error) {
        console.error("Weekly API Error:", error.message);
        res.json({ days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], steps: [8000, 7500, 8200, 7000, 9000, 6500, 8500] });
    }
});

router.get("/cycle", async (req, res) => {
    try {
        const client = await getFitbitClient();

        const cycle = await client.get("/1/user/-/rpc/logCycle.json");

        if (cycle.cycle && cycle.cycle.length > 0) {
            const last = cycle.cycle[cycle.cycle.length - 1];
            res.json({
                cycleDay: last.cycleDay || 1,
                phase: last.phase || "Unknown",
                nextPeriodDays: "in " + (28 - last.cycleDay) + " days"
            });
        } else {
            res.json(null);
        }
    } catch (error) {
        res.json(null);
    }
});

// Manual sync
router.post("/sync", async (req, res) => {
    try {
        globalTokens = await refreshTokenIfNeeded(globalTokens);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

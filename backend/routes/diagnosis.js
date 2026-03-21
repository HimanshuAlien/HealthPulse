const express = require("express");
const router = express.Router();

router.post("/analyze", async (req, res) => {
    try {
        const { symptoms, area, followups, vitals } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
        }

        // ── Build structured prompt ──────────────────────────────────────────
        const followupText = Array.isArray(followups)
            ? followups.map((f, i) => `Q${i + 1}: ${f.q}\nA: ${f.a}`).join("\n")
            : "";

        const prompt = `You are a medical AI assistant. A patient has submitted the following health data.

SYMPTOMS: ${Array.isArray(symptoms) ? symptoms.join(", ") : symptoms}
BODY AREA: ${area || "Not specified"}
FOLLOW-UP ANSWERS:
${followupText}
VITALS:
- Heart Rate: ${vitals?.heartRate || "N/A"}
- Temperature: ${vitals?.temperature || "N/A"}
- SpO2: ${vitals?.spo2 || "N/A"}
- Blood Pressure: ${vitals?.bloodPressure || "N/A"}

CRITICAL INSTRUCTIONS:
- You MUST respond with ONLY a valid JSON object.
- Do NOT include markdown, backticks, code fences, or any text before or after the JSON.
- Do NOT truncate the response. Complete the full JSON object.
- Start your response with { and end with }

Use exactly this schema:
{
  "riskScore": <number 0-100>,
  "riskLevel": "<Low|Moderate|High>",
  "riskSummary": "<one sentence summary>",
  "escalate": <true|false>,
  "escalateMessage": "<2 sentence instruction for patient>",
  "conditions": [
    {"name": "<condition>", "severity": "<Low|Medium|High>", "probability": <0-100>, "description": "<1-2 sentences>"},
    {"name": "<condition>", "severity": "<Low|Medium|High>", "probability": <0-100>, "description": "<1-2 sentences>"},
    {"name": "<condition>", "severity": "<Low|Medium|High>", "probability": <0-100>, "description": "<1-2 sentences>"}
  ],
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    "<recommendation 3>",
    "<recommendation 4>"
  ],
  "confidence": <number 70-98>,
  "disclaimer": "This is AI-generated and does not replace professional medical advice."
}`;

        // ── Call Gemini ──────────────────────────────────────────────────────
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,   // ← was 500 — too small, caused truncation
                        responseMimeType: "application/json"  // tells Gemini to return pure JSON
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Gemini API error:", response.status, errorData);
            return res.status(500).json({ error: `Gemini API error: ${response.status}` });
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]) {
            console.error("No candidates in response:", JSON.stringify(data));
            return res.status(500).json({ error: "No response from Gemini" });
        }

        const raw = data.candidates[0]?.content?.parts?.[0]?.text || "";

        if (!raw) {
            console.error("Empty text in response:", JSON.stringify(data));
            return res.status(500).json({ error: "Empty response from Gemini" });
        }

        console.log("Raw Gemini response:", raw);

        // ── Extract and parse JSON ───────────────────────────────────────────
        // Strip markdown fences if present (fallback — responseMimeType should prevent them)
        let clean = raw
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        // Find the outermost JSON object
        const openBrace = clean.indexOf("{");
        const closeBrace = clean.lastIndexOf("}");

        if (openBrace === -1 || closeBrace === -1 || closeBrace <= openBrace) {
            console.error("Could not find JSON braces. First 500 chars:", clean.substring(0, 500));
            return res.status(500).json({
                error: "Gemini returned incomplete JSON. Try again.",
                raw: clean.substring(0, 300)  // include snippet for debugging
            });
        }

        clean = clean.substring(openBrace, closeBrace + 1);

        let result;
        try {
            result = JSON.parse(clean);
        } catch (parseErr) {
            console.error("JSON parse error:", parseErr.message);
            console.error("Attempted to parse:", clean.substring(0, 500));
            return res.status(500).json({
                error: "Could not parse Gemini response: " + parseErr.message,
                raw: clean.substring(0, 300)
            });
        }

        // ── Validate required fields ─────────────────────────────────────────
        const required = ["riskScore", "riskLevel", "conditions", "recommendations"];
        for (const field of required) {
            if (result[field] === undefined) {
                console.error("Missing required field:", field, result);
                return res.status(500).json({ error: `Gemini response missing field: ${field}` });
            }
        }

        res.json(result);

    } catch (err) {
        console.error("Diagnosis route error:", err.message);
        res.status(500).json({ error: "AI processing failed: " + err.message });
    }
});

module.exports = router;
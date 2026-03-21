const express = require("express");
const router = express.Router();

router.post("/analyze", async (req, res) => {
    try {
        const { symptoms, area, followups, vitals } = req.body;

        if (!process.env.GEMINI_KEY) {
            return res.status(500).json({ error: "GEMINI_KEY not configured" });
        }

        const prompt = `Symptoms: ${symptoms.join(",")} Area: ${area} Temp: ${vitals.temp}. Return only: {"riskScore":70,"riskLevel":"Moderate","riskSummary":"fever and cough","escalate":false,"escalateMessage":"","conditions":[{"name":"Cold","severity":"Medium","probability":80,"description":"viral infection"},{"name":"Flu","severity":"Medium","probability":60,"description":"influenza"}],"recommendations":["rest","hydrate"],"confidence":85}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 500
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
            console.error("No candidates in response:", data);
            return res.status(500).json({ error: "No response from Gemini" });
        }

        const raw = data.candidates[0]?.content?.parts?.[0]?.text || "";

        if (!raw) {
            console.error("No text content in response:", data);
            return res.status(500).json({ error: "Empty response from Gemini" });
        }

        console.log("Raw Gemini response:", raw);

        // Remove markdown code blocks more carefully
        let clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

        // Extract JSON object - find opening and closing braces
        const openBrace = clean.indexOf('{');
        const closeBrace = clean.lastIndexOf('}');

        if (openBrace === -1 || closeBrace === -1 || closeBrace <= openBrace) {
            console.error("Could not find JSON braces in response:", clean.substring(0, 300));
            return res.status(500).json({ error: "Invalid JSON structure from Gemini" });
        }

        clean = clean.substring(openBrace, closeBrace + 1);

        // Parse and validate JSON
        let result;
        try {
            result = JSON.parse(clean);
        } catch (parseErr) {
            console.error("JSON parse error:", parseErr.message);
            console.error("Attempted to parse:", clean.substring(0, 300));
            return res.status(500).json({ error: "Invalid JSON from Gemini: " + parseErr.message });
        }

        res.json(result);

    } catch (err) {
        console.error("Diagnosis error:", err.message);
        res.status(500).json({ error: "AI processing failed: " + err.message });
    }
});

module.exports = router;
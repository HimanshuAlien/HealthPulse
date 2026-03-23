// backend/routes/prescription.js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Standardize the variable name

router.post('/analyze', async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        const apiKey = GEMINI_API_KEY; // Update to use the standardized variable
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY not configured in .env' });
        }

        const prompt = `You are a medical AI assistant. Analyze this prescription or medical document image carefully.
Return ONLY a valid JSON object with NO markdown, NO code fences, NO extra text.

Use this exact structure:
{
  "patientName": "extracted patient name or Unknown",
  "doctorName": "extracted doctor name or Unknown",
  "date": "prescription date or Unknown",
  "severity": {
    "score": <number 1-10>,
    "level": "Mild | Moderate | Severe | Critical",
    "explanation": "one sentence why this severity"
  },
  "diagnosis": "primary diagnosis or condition name",
  "symptoms": ["symptom 1", "symptom 2"],
  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage amount",
      "frequency": "how often",
      "duration": "for how long",
      "purpose": "what it treats"
    }
  ],
  "healingTime": "estimated recovery time",
  "avoidFoods": ["food/drink to avoid 1", "food/drink to avoid 2"],
  "actions": [
    { "title": "action title", "description": "what to do" }
  ],
  "warnings": ["important warning 1", "important warning 2"],
  "summary": "2 sentence plain English summary for the patient"
}`;

        const body = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType || 'image/jpeg',
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048
            }
        };

        const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini error:', errText);
            return res.status(geminiRes.status).json({ error: `Gemini API error: ${geminiRes.status}` });
        }

        const data = await geminiRes.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Strip any markdown fences just in case
        rawText = rawText.replace(/```json|```/g, '').trim();

        let report;
        try {
            report = JSON.parse(rawText);
        } catch (parseErr) {
            console.error('JSON parse error:', rawText);
            return res.status(500).json({ error: 'Could not parse Gemini response', raw: rawText });
        }

        return res.json({ success: true, report });

    } catch (err) {
        console.error('Prescription route error:', err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
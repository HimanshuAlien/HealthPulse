// Test script for diagnosis endpoint
const payload = {
    symptoms: ["fever", "cough", "headache"],
    area: "chest",
    followups: [
        { q: "How long have you had these symptoms?", a: "2 days" },
        { q: "Any difficulty breathing?", a: "No" }
    ],
    vitals: {
        temp: 101.5,
        BP: "120/80",
        HR: 95
    }
};

fetch('http://localhost:5000/api/diagnosis/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
    .then(r => r.json())
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(e => console.error('Error:', e.message));

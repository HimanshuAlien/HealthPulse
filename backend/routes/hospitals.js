const express = require("express");
const router = express.Router();

// 🔹 Get nearby hospitals using Overpass API (FREE - OpenStreetMap data)
router.get("/nearby", async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: "lat/lng required" });
        }

        // Use Overpass API to query OpenStreetMap for hospitals
        // This is completely free and requires no API key
        const lat_num = parseFloat(lat);
        const lng_num = parseFloat(lng);

        // Using Nominatim for reverse geocoding and hospital search
        // First get hospitals using OverPass with proper query string
        const bbox = `${lat_num - 0.04},${lng_num - 0.04},${lat_num + 0.04},${lng_num + 0.04}`;
        const overpassQuery = `[out:json];(node["amenity"="hospital"](${bbox});way["amenity"="hospital"](${bbox}););out center;`;

        const url = `https://overpass-api.de/api/interpreter`;

        const response = await fetch(url, {
            method: 'POST',
            body: overpassQuery,
            headers: { 'Content-Type': 'application/osm3s' }
        });

        const text = await response.text();

        if (text.includes('<?xml')) {
            console.error("Got XML response, trying alternative approach");
            // Fallback to simpler query
            return res.status(500).json({ error: "Overpass API temporarily unavailable" });
        }

        const data = JSON.parse(text);

        if (!data.elements || data.elements.length === 0) {
            return res.status(404).json({ error: "No hospitals found" });
        }

        const hospitals = data.elements
            .filter(e => e.lat && e.lon)
            .map((elem, idx) => ({
                id: elem.id,
                name: elem.tags?.name || "Hospital " + (idx + 1),
                address: elem.tags?.["addr:full"] || elem.tags?.["addr:street"] || "Address not available",
                lat: elem.lat,
                lng: elem.lon,
                phone: elem.tags?.["contact:phone"] || elem.tags?.phone || null,
                website: elem.tags?.website || null,
                operator: elem.tags?.operator || null
            }))
            .slice(0, 15);

        res.json(hospitals);

    } catch (err) {
        console.error("Hospital fetch error:", err.message);
        res.status(500).json({ error: "Failed to fetch hospitals: " + err.message });
    }
});

// 🔹 Get photos (using Wikimedia Commons)
router.get("/photos", async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: "Hospital ID required" });
        }

        // Return placeholder medical images
        // In production, would query Wikimedia Commons or similar
        const photos = [
            "https://images.unsplash.com/photo-1631217314830-f47dcd3f7ffd?w=300&h=200&fit=crop", // Hospital building
            "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=200&fit=crop", // Emergency room
            "https://images.unsplash.com/photo-1631217314897-27f22490e5d3?w=300&h=200&fit=crop"  // Medical staff
        ];

        res.json(photos);

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch photos: " + err.message });
    }
});

// 🔹 Get hospital details
router.get("/details", async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: "Hospital ID required" });
        }

        // Return sample details (in production would get from OSM tags)
        res.json({
            phone: null,
            website: null,
            hours: "24/7",
            services: ["Emergency Room", "Surgery", "ICU", "Maternity"]
        });

    } catch (err) {
        console.error("Details fetch error:", err);
        res.status(500).json({ error: "Failed to fetch details: " + err.message });
    }
});

module.exports = router;
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

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

// Serve the main dashboard on the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

// Test Fitbit auth (moved to /api/status so it doesn't block the frontend)
app.get("/api/status", (req, res) => {
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

// --- WebRTC Socket.IO Server Logic ---
const rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, role, name }) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = {};
        rooms[roomId][role] = { socketId: socket.id, name };
        
        socket.to(roomId).emit('peer-joined', { role, name });
        socket.emit('room-state', rooms[roomId]);
    });

    socket.on('offer', (data) => socket.to(data.roomId).emit('offer', data));
    socket.on('answer', (data) => socket.to(data.roomId).emit('answer', data));
    socket.on('ice-candidate', (data) => socket.to(data.roomId).emit('ice-candidate', data));
    
    socket.on('chat-message', (data) => {
        io.to(data.roomId).emit('chat-message', { ...data, socketId: socket.id });
    });

    socket.on('toggle-audio', (data) => socket.to(data.roomId).emit('toggle-audio', data));
    socket.on('toggle-video', (data) => socket.to(data.roomId).emit('toggle-video', data));

    socket.on('end-call', (data) => socket.to(data.roomId).emit('call-ended', { name: "Participant" }));

    socket.on('disconnecting', () => {
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id && rooms[roomId]) {
                const room = rooms[roomId];
                if (room.doctor && room.doctor.socketId === socket.id) {
                    socket.to(roomId).emit('peer-left', { role: 'doctor', name: room.doctor.name });
                    delete room.doctor;
                }
                if (room.patient && room.patient.socketId === socket.id) {
                    socket.to(roomId).emit('peer-left', { role: 'patient', name: room.patient.name });
                    delete room.patient;
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
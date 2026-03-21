// backend/routes/video.js
// Socket.io signaling for WebRTC video calling
// This file is required by server.js — do NOT run it directly

module.exports = (io) => {

    // Track rooms: roomId -> { doctor, patient }
    const rooms = {};

    io.on('connection', (socket) => {
        console.log('🔌 Socket connected:', socket.id);

        // ── JOIN ROOM ──────────────────────────────────────────
        // Called when doctor or patient clicks "Join"
        socket.on('join-room', ({ roomId, role, name }) => {
            socket.join(roomId);
            socket.roomId = roomId;
            socket.role = role;
            socket.name = name;

            if (!rooms[roomId]) rooms[roomId] = {};
            rooms[roomId][role] = { id: socket.id, name };

            console.log(`👤 ${name} (${role}) joined room ${roomId}`);

            // Tell everyone else in room that someone joined
            socket.to(roomId).emit('peer-joined', { role, name, socketId: socket.id });

            // Send current room state back to the joiner
            socket.emit('room-state', rooms[roomId]);
        });

        // ── WebRTC SIGNALING ───────────────────────────────────
        // Offer: sender -> everyone else in room
        socket.on('offer', ({ offer, roomId }) => {
            socket.to(roomId).emit('offer', { offer, from: socket.id });
        });

        // Answer: receiver -> everyone else in room
        socket.on('answer', ({ answer, roomId }) => {
            socket.to(roomId).emit('answer', { answer, from: socket.id });
        });

        // ICE candidates: relay to everyone else in room
        socket.on('ice-candidate', ({ candidate, roomId }) => {
            socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
        });

        // ── CHAT MESSAGES ──────────────────────────────────────
        socket.on('chat-message', ({ roomId, message, name, role, time }) => {
            // Broadcast to everyone in room INCLUDING sender (so it shows for all)
            io.to(roomId).emit('chat-message', { message, name, role, time, socketId: socket.id });
        });

        // ── CALL CONTROLS ──────────────────────────────────────
        socket.on('toggle-video', ({ roomId, enabled }) => {
            socket.to(roomId).emit('peer-video-toggle', { enabled, role: socket.role });
        });

        socket.on('toggle-audio', ({ roomId, enabled }) => {
            socket.to(roomId).emit('peer-audio-toggle', { enabled, role: socket.role });
        });

        socket.on('end-call', ({ roomId }) => {
            socket.to(roomId).emit('call-ended', { by: socket.role, name: socket.name });
        });

        // ── DISCONNECT ─────────────────────────────────────────
        socket.on('disconnect', () => {
            const { roomId, role, name } = socket;
            if (roomId && rooms[roomId]) {
                delete rooms[roomId][role];
                if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
                io.to(roomId).emit('peer-left', { role, name });
            }
            console.log(`❌ ${name || 'Unknown'} disconnected`);
        });
    });

};
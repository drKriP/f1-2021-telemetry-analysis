require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { startUDP } = require("./udp");
const { startBroadcast } = require("./broadcaster");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

// socket connection
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
});

// start broadcaster
startBroadcast(io);

// start UDP listener
startUDP(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
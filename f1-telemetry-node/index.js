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
startUDP();

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
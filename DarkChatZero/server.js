const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

let waitingSocketId = null;
const roomsBySocket = new Map();

function onlineCount() {
  return io.engine.clientsCount;
}

function emitOnlineCount() {
  io.emit("online-count", onlineCount());
}

function roomOf(socketId) {
  return roomsBySocket.get(socketId);
}

function cleanupSocket(socket) {
  const roomId = roomOf(socket.id);

  if (waitingSocketId === socket.id) {
    waitingSocketId = null;
  }

  if (roomId) {
    socket.to(roomId).emit("peer-left");
    roomsBySocket.delete(socket.id);

    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      for (const id of room) {
        roomsBySocket.delete(id);
        const peer = io.sockets.sockets.get(id);
        if (peer) peer.leave(roomId);
      }
    }
  }
}

io.on("connection", socket => {
  emitOnlineCount();

  socket.on("join-random", () => {
    cleanupSocket(socket);

    if (waitingSocketId && waitingSocketId !== socket.id && io.sockets.sockets.has(waitingSocketId)) {
      const peer = io.sockets.sockets.get(waitingSocketId);
      waitingSocketId = null;

      const roomId = `room-${peer.id}-${socket.id}`;

      peer.join(roomId);
      socket.join(roomId);
      roomsBySocket.set(peer.id, roomId);
      roomsBySocket.set(socket.id, roomId);

      peer.emit("matched", { roomId, initiator: true });
      socket.emit("matched", { roomId, initiator: false });
      return;
    }

    waitingSocketId = socket.id;
    socket.emit("waiting");
  });

  socket.on("offer", payload => {
    const roomId = roomOf(socket.id);
    if (roomId) socket.to(roomId).emit("offer", payload);
  });

  socket.on("answer", payload => {
    const roomId = roomOf(socket.id);
    if (roomId) socket.to(roomId).emit("answer", payload);
  });

  socket.on("ice-candidate", payload => {
    const roomId = roomOf(socket.id);
    if (roomId) socket.to(roomId).emit("ice-candidate", payload);
  });

  socket.on("chat-message", message => {
    const roomId = roomOf(socket.id);
    if (!roomId) return;

    const clean = String(message || "").slice(0, 800).trim();
    if (!clean) return;

    socket.to(roomId).emit("chat-message", clean);
  });

  socket.on("skip", () => {
    const oldRoom = roomOf(socket.id);

    if (oldRoom) {
      socket.to(oldRoom).emit("peer-left");
      const members = io.sockets.adapter.rooms.get(oldRoom);

      if (members) {
        for (const id of [...members]) {
          roomsBySocket.delete(id);
          const member = io.sockets.sockets.get(id);
          if (member) member.leave(oldRoom);
        }
      }
    }

    socket.emit("skipped");
    socket.emit("ready-for-next");
  });

  socket.on("leave-chat", () => {
    cleanupSocket(socket);
    socket.emit("left-chat");
  });

  socket.on("disconnect", () => {
    cleanupSocket(socket);
    emitOnlineCount();
  });
});

server.listen(PORT, () => {
  console.log(`VOIDCHAT running on http://localhost:${PORT}`);
});

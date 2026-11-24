const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const { Chess } = require("chess.js");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
const rooms = new Map();

function newCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}
function snapshot(room) {
  return {
    code: room.code,
    fen: room.game.fen(),
    pgn: room.game.pgn(),
    turn: room.game.turn(),
    players: room.players,
    spectators: room.spectators,
    status: room.game.isGameOver()
      ? (room.game.isCheckmate() ? "Checkmate" : room.game.isDraw() ? "Draw" : "Game over")
      : room.game.isCheck() ? "Check" : "In progress",
    result: room.game.isCheckmate()
      ? (room.game.turn() === "w" ? "Black wins" : "White wins")
      : room.game.isDraw() ? "Draw" : ""
  };
}
function broadcast(room) {
  io.to(room.code).emit("state", snapshot(room));
}

app.get("/api/room/:code/qr", async (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found" });
  const url = `${req.protocol}://${req.get("host")}/?room=${room.code}`;
  try {
    res.json({ url, qr: await QRCode.toDataURL(url, { width: 320, margin: 2 }) });
  } catch {
    res.status(500).json({ error: "Could not create QR code" });
  }
});

io.on("connection", socket => {
  socket.on("create-room", (_, cb) => {
    let code;
    do { code = newCode(); } while (rooms.has(code));
    const room = { code, game: new Chess(), players: { w: null, b: null }, spectators: 0 };
    rooms.set(code, room);
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "host";
    cb({ ok: true, code, state: snapshot(room) });
    broadcast(room);
  });

  socket.on("join-room", ({ code, name }, cb) => {
    code = String(code || "").toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: "Room not found. Ask the host for a new QR code." });

    let role = "spectator";
    if (!room.players.w) { room.players.w = { id: socket.id, name: String(name || "White").slice(0, 20) }; role = "white"; }
    else if (!room.players.b) { room.players.b = { id: socket.id, name: String(name || "Black").slice(0, 20) }; role = "black"; }
    else room.spectators++;

    socket.join(code);
    socket.data.room = code;
    socket.data.role = role;
    cb({ ok: true, role, state: snapshot(room) });
    broadcast(room);
  });

  socket.on("move", ({ from, to, promotion }, cb) => {
    const room = rooms.get(socket.data.room);
    if (!room || !["white", "black"].includes(socket.data.role))
      return cb({ ok: false, error: "Only the two players can move." });

    const expected = socket.data.role === "white" ? "w" : "b";
    if (room.game.turn() !== expected)
      return cb({ ok: false, error: "It is not your turn." });

    try {
      const move = room.game.move({ from, to, promotion: promotion || "q" });
      if (!move) return cb({ ok: false, error: "Illegal move." });
      cb({ ok: true });
      broadcast(room);
    } catch {
      cb({ ok: false, error: "Illegal move." });
    }
  });

  socket.on("reset-game", cb => {
    const room = rooms.get(socket.data.room);
    if (!room || socket.data.role !== "host")
      return cb({ ok: false, error: "Only the tournament host can reset the game." });
    room.game = new Chess();
    cb({ ok: true });
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    for (const side of ["w", "b"]) {
      if (room.players[side]?.id === socket.id) room.players[side] = null;
    }
    if (socket.data.role === "spectator") room.spectators = Math.max(0, room.spectators - 1);
    broadcast(room);
    // Keep rooms alive so spectators can finish watching/reconnect.
  });
});

server.listen(PORT, () => console.log(`Chess Arena running on port ${PORT}`));

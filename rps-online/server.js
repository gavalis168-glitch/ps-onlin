const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  if (waitingPlayer) {
    // Create room with two players
    const room = socket.id + "#" + waitingPlayer.id;
    socket.join(room);
    waitingPlayer.join(room);
    socket.room = room;
    waitingPlayer.room = room;
    socket.opponent = waitingPlayer;
    waitingPlayer.opponent = socket;
    waitingPlayer = null;

    io.to(room).emit("result", { you: "-", opponent: "-", result: "Game started! Pick a move." });
  } else {
    waitingPlayer = socket;
  }

  socket.on("playerChoice", (choice) => {
    socket.choice = choice;
    if (socket.opponent && socket.opponent.choice) {
      const opponentChoice = socket.opponent.choice;
      const result = getResult(choice, opponentChoice);

      socket.emit("result", { you: choice, opponent: opponentChoice, result });
      socket.opponent.emit("result", {
        you: opponentChoice,
        opponent: choice,
        result: result.includes("win") ? "You lose!" : result.includes("lose") ? "You win!" : "Draw!"
      });

      socket.choice = null;
      socket.opponent.choice = null;
    }
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    if (socket.opponent) {
      socket.opponent.emit("result", { you: "-", opponent: "-", result: "Opponent disconnected." });
    }
    if (waitingPlayer === socket) waitingPlayer = null;
  });
});

function getResult(p1, p2) {
  if (p1 === p2) return "Draw!";
  if (
    (p1 === "stone" && p2 === "scissors") ||
    (p1 === "paper" && p2 === "stone") ||
    (p1 === "scissors" && p2 === "paper")
  ) return "You win!";
  return "You lose!";
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("✅ Server running on port " + PORT));

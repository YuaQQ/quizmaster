import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import mammoth from "mammoth";
// @ts-ignore
import pdf from "pdf-parse";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const upload = multer({ storage: multer.memoryStorage() });

  // Game State
  const rooms = new Map<string, {
    hostId: string;
    status: 'lobby' | 'playing' | 'ended';
    questions: any[];
    currentQuestionIndex: number;
    players: Map<string, {
      id: string;
      nickname: string;
      avatar: string;
      score: number;
      lastAnswerTime?: number;
      isCorrect?: boolean;
    }>;
    timer?: NodeJS.Timeout;
    timeLeft: number;
  }>();

  app.use(express.json());

  // AI Parsing Endpoint
  app.post("/api/parse-quiz", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      let text = "";
      if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (req.file.mimetype === "application/pdf") {
        const data = await pdf(req.file.buffer);
        text = data.text;
      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Extract multiple-choice questions from the following text. 
        Return a JSON array of objects with the following structure:
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswerIndex": number (0-3),
          "timeLimit": number (default 30),
          "points": number (default 1000)
        }
        Text: ${text}`
      });

      const jsonText = response.text.replace(/```json|```/g, "").trim();
      const questions = JSON.parse(jsonText);

      res.json({ questions });
    } catch (error) {
      console.error("Parsing error:", error);
      res.status(500).json({ error: "Failed to parse document" });
    }
  });

  // Socket.io Logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("host:create", (questions) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms.set(roomId, {
        hostId: socket.id,
        status: 'lobby',
        questions,
        currentQuestionIndex: -1,
        players: new Map(),
        timeLeft: 0
      });
      socket.join(roomId);
      socket.emit("host:room-created", roomId);
    });

    socket.on("player:join", ({ roomId, nickname, avatar }) => {
      const room = rooms.get(roomId);
      if (!room) return socket.emit("error", "Room not found");
      if (room.status !== 'lobby') return socket.emit("error", "Game already started");

      const player = { id: socket.id, nickname, avatar, score: 0 };
      room.players.set(socket.id, player);
      socket.join(roomId);
      
      io.to(roomId).emit("room:update", {
        players: Array.from(room.players.values()),
        status: room.status
      });
      socket.emit("player:joined", { roomId, player });
    });

    socket.on("host:start-game", (roomId) => {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) return;

      room.status = 'playing';
      nextQuestion(roomId);
    });

    socket.on("player:answer", ({ roomId, answerIndex }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== 'playing') return;

      const player = room.players.get(socket.id);
      if (!player || player.lastAnswerTime !== undefined) return;

      const question = room.questions[room.currentQuestionIndex];
      const isCorrect = answerIndex === question.correctAnswerIndex;
      
      if (isCorrect) {
        // Speed bonus: max points at start, linear decrease to 50% at end
        const timeSpent = question.timeLimit - room.timeLeft;
        const speedFactor = 1 - (timeSpent / question.timeLimit) * 0.5;
        player.score += Math.round(question.points * speedFactor);
      }
      
      player.isCorrect = isCorrect;
      player.lastAnswerTime = Date.now();

      // Check if all players answered
      const allAnswered = Array.from(room.players.values()).every(p => p.lastAnswerTime !== undefined);
      if (allAnswered) {
        clearTimeout(room.timer);
        showResults(roomId);
      }
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          io.to(roomId).emit("room:update", {
            players: Array.from(room.players.values()),
            status: room.status
          });
        }
      });
    });
  });

  function nextQuestion(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.currentQuestionIndex++;
    if (room.currentQuestionIndex >= room.questions.length) {
      room.status = 'ended';
      const finalLeaderboard = Array.from(room.players.values())
        .sort((a, b) => b.score - a.score);
      io.to(roomId).emit("game:ended", finalLeaderboard);
      return;
    }

    const question = room.questions[room.currentQuestionIndex];
    room.timeLeft = question.timeLimit;
    
    // Reset player answer states
    room.players.forEach(p => {
      p.lastAnswerTime = undefined;
      p.isCorrect = undefined;
    });

    io.to(roomId).emit("game:question", {
      question: {
        text: question.question,
        options: question.options,
        timeLimit: question.timeLimit,
        index: room.currentQuestionIndex,
        total: room.questions.length
      },
      timeLeft: room.timeLeft
    });

    room.timer = setInterval(() => {
      room.timeLeft--;
      io.to(roomId).emit("game:timer", room.timeLeft);
      if (room.timeLeft <= 0) {
        clearInterval(room.timer);
        showResults(roomId);
      }
    }, 1000);
  }

  function showResults(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const question = room.questions[room.currentQuestionIndex];
    const leaderboard = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score);

    io.to(roomId).emit("game:results", {
      correctAnswerIndex: question.correctAnswerIndex,
      leaderboard,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        isCorrect: p.isCorrect,
        nickname: p.nickname
      }))
    });

    // Wait 5 seconds before next question
    setTimeout(() => {
      nextQuestion(roomId);
    }, 5000);
  }

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

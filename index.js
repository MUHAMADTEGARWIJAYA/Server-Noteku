import express from "express";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import connectDB from "./configs/db.js";
import groupRouter from "./routes/groupRouter.js";
import bodyParser from "body-parser";
import cors from "cors";
import userRouter from "./routes/userRouter.js";
import cookieParser from "cookie-parser";
import noteRouter from "./routes/noteRouter.js";
import helmet from "helmet";
import ExpressMongoSanitize from "express-mongo-sanitize";
import Note from "./models/noteModel.js"; // ✅ Import model Note

dotenv.config();
const app = express();
const port = 4000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://client-noteku.vercel.app"], 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
     transports: ["websocket", "polling"], 

  },
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.userId = decoded.id; // Set userId di socket
        next();
    } catch (err) {
        next(new Error("Invalid token"));
    }
});



io.on("connection", async (socket) => {
  const userId = socket.userId; // Ambil user ID dari token yang sudah diverifikasi

  if (!userId) return;

  // Set user sebagai online di DB
  await User.findByIdAndUpdate(userId, { status: "online" });

  io.emit("update-status", { userId, status: "online" });

  console.log("User Connected:", socket.id);

  socket.on("join-group", (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
  });

socket.on("edit-note", async ({ groupId, noteId, content, userId }) => {
  try {
    console.log(`✏️ Edit Request dari User ${userId} untuk Note ${noteId} di Group ${groupId}`);

    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      { content, lastEditedBy: userId },
      { new: true }
    );

    if (updatedNote) {
      console.log(`✅ Note ${noteId} diperbarui, mengirim update ke grup ${groupId}`);
      io.to(groupId).emit("note-updated", { noteId, content, userId });
    } else {
      console.log(`⚠️ Note ${noteId} tidak ditemukan`);
    }
  } catch (error) {
    console.error("❌ Error updating note:", error);
  }
});

  socket.on("disconnect", async () => {
    console.log("User Disconnected:", socket.id);
     await User.findByIdAndUpdate(userId, {
      status: "offline",
      lastSeen: new Date(),
    });

    io.emit("update-status", { userId, status: "offline" });
  });
});

connectDB();

app.use(express.json());
app.use(helmet());
app.use(ExpressMongoSanitize());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://client-noteku.vercel.app"], 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.use("/api/v1/auth", userRouter);
app.use("/api/v1/note", noteRouter);
app.use("/api/v1/groups", groupRouter);

// ✅ Gunakan server.listen, bukan app.listen
server.listen(port, () => {
  console.log(`Aplikasi berjalan di port ${port}`);
});

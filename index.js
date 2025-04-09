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
    origin: ["http://localhost:3000", "https://client-noteku.vercel.app", "https://catatansaya.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    transports: ["websocket", "polling"],
  },
});

const onlineUsers = {}; // Menyimpan user online di grup
const userSockets = {}; // Mapping userId -> socketId

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  // Event saat user join ke grup
  socket.on("join-group", ({ groupId, userId }) => {
    socket.join(groupId);
    console.log(`📌 User ${userId} (${socket.id}) joined group ${groupId}`);

    // Simpan mapping userId ke socketId
    userSockets[userId] = socket.id;

    if (!onlineUsers[groupId]) onlineUsers[groupId] = new Set();
    onlineUsers[groupId].add(userId);

    io.to(groupId).emit("update-online-users", Array.from(onlineUsers[groupId]));
    console.log("👥 User online di grup", Array.from(onlineUsers[groupId]));
  });

  // Event saat user keluar dari grup
  socket.on("leave-group", ({ groupId, userId }) => {
    if (onlineUsers[groupId]) {
      onlineUsers[groupId].delete(userId);
      io.to(groupId).emit("update-online-users", Array.from(onlineUsers[groupId]));
      console.log(`🚪 User ${userId} left group ${groupId}`);
    }
  });

  // Event saat user logout atau disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User Disconnected: ${socket.id}`);

    let userIdToRemove = null;

    // Temukan userId berdasarkan socketId
    for (const [userId, socketId] of Object.entries(userSockets)) {
      if (socketId === socket.id) {
        userIdToRemove = userId;
        delete userSockets[userId]; // Hapus mapping userId -> socketId
        break;
      }
    }

    if (userIdToRemove) {
      for (const groupId in onlineUsers) {
        if (onlineUsers[groupId].has(userIdToRemove)) {
          onlineUsers[groupId].delete(userIdToRemove);
          io.to(groupId).emit("update-online-users", Array.from(onlineUsers[groupId]));
          io.to(groupId).emit("user-disconnected", userIdToRemove);
          console.log(`📤 User ${userIdToRemove} removed from group ${groupId}`);
        }
      }
    }
  });

  // Event untuk mengedit catatan dalam grup
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
});

connectDB();

app.use(express.json());
app.use(helmet());
app.use(ExpressMongoSanitize());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://client-noteku.vercel.app", "https://catatansaya.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.use("/api/v1/auth", userRouter);
app.use("/api/v1/note", noteRouter);
app.use("/api/v1/groups", groupRouter);

server.listen(port, () => {
  console.log(`🚀 Aplikasi berjalan di port ${port}`);
});

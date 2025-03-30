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

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join-group", (userId, groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
      if (!onlineUsers.has(groupId)) {
    onlineUsers.set(groupId, new Set());
  }
   onlineUsers.get(groupId).add(userId);
    // Kirim daftar user online ke semua anggota grup
    io.to(groupId).emit("update-online-users", Array.from(onlineUsers.get(groupId)));
  });

  socket.on("leave-group", ({ userId, groupId }) => {
    if (onlineUsers.has(groupId)) {
      onlineUsers.get(groupId).delete(userId);

      // Update daftar user online
      io.to(groupId).emit("update-online-users", Array.from(onlineUsers.get(groupId)));
    }
    socket.leave(groupId);
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

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
    
      // Hapus user dari semua grup
     onlineUsers.forEach((users, groupId) => {
      users.forEach((userId) => {
        users.delete(userId);
      });
      io.to(groupId).emit("update-online-users", Array.from(users));
    });
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

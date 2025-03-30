import express from "express";
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
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
import Note from "./models/noteModel.js";

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
const socketToUser = new Map();

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  try {
    // Get token from handshake (sent from client)
    const token = socket.handshake.auth?.token || 
                 socket.request.headers?.cookie?.split('accessToken=')[1]?.split(';')[0];
    
    if (!token) {
      console.log('❌ No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('❌ Invalid token:', err.message);
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Attach user data to socket
      socket.userData = {
        userId: decoded._id, // Make sure this matches your JWT structure
        username: decoded.username
      };
      console.log(`✅ Authenticated user: ${socket.userData.userId}`);
      next();
    });
  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    next(new Error('Authentication error'));
  }
});

io.on("connection", (socket) => {
  console.log(`🔗 New connection: ${socket.id} | User: ${socket.userData?.userId || 'Unauthenticated'}`);

  // Join group event
  socket.on("join-group", (groupId) => {
    if (!socket.userData) {
      console.log('⚠️ Unauthenticated join-group attempt');
      return;
    }

    const { userId } = socket.userData;
    socketToUser.set(socket.id, { userId, groupId });
    socket.join(groupId);

    // Update online users
    if (!onlineUsers.has(groupId)) {
      onlineUsers.set(groupId, new Set());
    }
    onlineUsers.get(groupId).add(userId);
    
    io.to(groupId).emit("update-online-users", Array.from(onlineUsers.get(groupId)));
    console.log(`👥 User ${userId} joined group ${groupId}`);
  });

  // Leave group event
  socket.on("leave-group", (groupId) => {
    if (!socket.userData) return;

    const { userId } = socket.userData;
    if (onlineUsers.has(groupId)) {
      onlineUsers.get(groupId).delete(userId);
      io.to(groupId).emit("update-online-users", Array.from(onlineUsers.get(groupId)));
    }
    socket.leave(groupId);
    console.log(`👋 User ${userId} left group ${groupId}`);
  });

  // Edit note event
  socket.on("edit-note", async ({ groupId, noteId, content }) => {
    if (!socket.userData) return;

    try {
      const { userId } = socket.userData;
      console.log(`✏️ Edit request from ${userId} for note ${noteId}`);

      const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        { content, lastEditedBy: userId },
        { new: true }
      );

      if (updatedNote) {
        io.to(groupId).emit("note-updated", { 
          noteId, 
          content, 
          userId,
          username: socket.userData.username 
        });
        console.log(`✅ Note ${noteId} updated`);
      } else {
        console.log(`⚠️ Note ${noteId} not found`);
      }
    } catch (error) {
      console.error("❌ Note update error:", error);
    }
  });

  // Disconnect event
  socket.on("disconnect", () => {
    const userData = socketToUser.get(socket.id);
    if (userData) {
      const { userId, groupId } = userData;
      if (onlineUsers.has(groupId)) {
        onlineUsers.get(groupId).delete(userId);
        io.to(groupId).emit("update-online-users", Array.from(onlineUsers.get(groupId)));
      }
      socketToUser.delete(socket.id);
    }
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

// Database and middleware setup
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

// Routes
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/note", noteRouter);
app.use("/api/v1/groups", groupRouter);

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
import express from "express";
import { createGroup, addUserToGroup, getGroupById, addNoteToGroup, getGroupsByUser, getNotesInGroup } from "../controllers/groupController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/create", verifyToken, createGroup);
router.post("/add-user", addUserToGroup);
router.get("/dapat/:id", verifyToken, getGroupById);
router.post("/add-note", verifyToken, addNoteToGroup);
router.get("/dapat", verifyToken, getGroupsByUser);
router.get("/group/notes/:id", getNotesInGroup);

export default router;

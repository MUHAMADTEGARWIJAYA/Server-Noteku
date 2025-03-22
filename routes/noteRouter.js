import express from "express";
import { createNote, getNotes, getNoteById, updateNote, deleteNote } from "../controllers/noteController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/create', verifyToken, createNote);
router.get('/dapatsemua', verifyToken, getNotes);
router.get('/dapat/:id', verifyToken, getNoteById);
router.put('/update/:id', verifyToken, updateNote);
router.delete('/delete/:id', verifyToken, deleteNote);

export default router;
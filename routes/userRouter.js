import express from "express";
import { register, login, refreshToken, logout, getName } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.get("/name", verifyToken, getName);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", verifyToken, logout);

export default router;

import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken; // Ambil token dari cookie
        if (!token) {
            return res.status(401).json({ message: "Akses ditolak. Token tidak tersedia." });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User tidak ditemukan." });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token tidak valid atau telah kedaluwarsa." });
    }
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validasi input
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Semua field harus diisi" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "Email dan Username sudah digunakan" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
        });

        await user.save();
        res.status(201).json({ message: "Registrasi berhasil" });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email dan password wajib diisi" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User tidak ditemukan" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Password salah" });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save();

        // Set refresh token di cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false, // True jika di production
            path: "/",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            // Bisa tambahkan maxAge untuk expiration jika diinginkan
        });

        // Set access token di cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false, // True jika di production
            sameSite: "strict",
            path: "/",
            maxAge: 15 * 60 * 1000,
            // Optional: tambahkan maxAge sesuai durasi access token
            // misal: maxAge: 15 * 60 * 1000 untuk 15 menit
        });

        // Response tetap mengirim accessToken agar client bisa tahu login berhasil
        res.json({ message: "Login berhasil", user: { username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

export const refreshToken = async (req, res) => {
    try {
        console.log("Cookies:", req.cookies); // Log cookie yang diterima
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) return res.status(401).json({ message: "Token tidak diberikan" });

        const user = await User.findOne({ refreshToken });

        if (!user) return res.status(403).json({ message: "Refresh token tidak valid" });

        console.log("User ditemukan:", user);

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                user.refreshToken = "";
                await user.save();
                return res.status(403).json({ message: "Token tidak valid" });
            }

            const newAccessToken = generateAccessToken(user);
            console.log("Access token baru:", newAccessToken);

            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: false, 
                sameSite: "strict",
                maxAge: 15 * 60 * 1000,
            });

            res.json({ message: "Token berhasil diperbarui" });
        });
    } catch (error) {
        console.error("Error saat refresh token:", error);
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};


export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        console.log('Refresh Token dari Cookies:', refreshToken); // Log refresh token

        if (!refreshToken) {
            return res.status(401).json({ message: "User tidak login" });
        }

        const user = await User.findOne({ refreshToken });
        console.log('User dari Database:', user); // Log user

        if (!user) {
            return res.status(403).json({ message: "User tidak ditemukan" });
        }

        // Hapus token dari database
        user.refreshToken = "";
        await user.save();
        console.log('Refresh Token di Database Dihapus'); // Log penghapusan token

        // Hapus kedua cookies
        res.clearCookie("refreshToken", { 
            httpOnly: true, 
            secure: false, 
            sameSite: "None",
            path: "/"
        });
        
        res.clearCookie("accessToken", { 
            httpOnly: true, 
            secure: false, 
            sameSite: "None",
            path: "/"
        });

        console.log('Cookies Dihapus'); // Log penghapusan cookies
        return res.status(200).json({ message: "Logout berhasil" });
    } catch (error) {
        console.error('Error saat logout:', error); // Log error
        return res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};
export const getName = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
        res.json({ name: user.username });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

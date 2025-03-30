import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { PasswordReset } from "../models/forgotPassword.js";
import crypto from "crypto";import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";


dotenv.config();
export const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: "Semua field harus diisi" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "Email dan Username sudah digunakan" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            role,
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

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "None",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
        });

        res.json({
            message: "Login berhasil",
            accessToken, // Simpan di localStorage di frontend
            user: { username: user.username, email: user.email },
        });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ message: "Token tidak diberikan" });

        const user = await User.findOne({ refreshToken });
        if (!user) return res.status(403).json({ message: "Refresh token tidak valid" });

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                user.refreshToken = "";
                await user.save();
                res.clearCookie("refreshToken", { path: "/" });
                return res.status(403).json({ message: "Token tidak valid" });
            }

            const newAccessToken = generateAccessToken(user);
            res.json({ message: "Token berhasil diperbarui", accessToken: newAccessToken });
        });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ message: "User tidak login" });

        const user = await User.findOne({ refreshToken });
        if (!user) return res.status(403).json({ message: "User tidak ditemukan" });

        user.refreshToken = "";
        await user.save();

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "None",
            path: "/",
        });

        return res.status(200).json({ message: "Logout berhasil" });
    } catch (error) {
        return res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

export const getName = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) return res.status(403).json({ message: "Token tidak valid" });

            const user = await User.findById(decoded.id);
            if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

            res.json({ name: user.username, role: user.role }); 
        });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await PasswordReset.findOneAndUpdate(
      { email },
      { token, expires_at: expiresAt },
      { upsert: true, new: true }
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:5000/api/v1/auth/reset/${token}`;
    const mailOptions = {
      from: `Your App Name <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.json({ message: "Password reset email sent successfully", resetLink });
    } catch (error) {
      return res.status(500).json({ message: "Error sending reset email", error });
    }
  } catch (error) {
    console.error("Error processing password reset:", error);
    res.status(500).json({ message: "Error processing password reset", error });
  }
};


export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const resetEntry = await PasswordReset.findOne({ token });
        if (!resetEntry) return res.status(400).json({ message: "Invalid token" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email: resetEntry.email }, { password: hashedPassword });
        await PasswordReset.deleteOne({ email: resetEntry.email });

        res.json({ message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ message: "Error resetting password", error: error.message });
    }
};

// ✅ Update Status User
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id; // User ID dari middleware auth

    if (!status) {
      return res.status(400).json({ message: "Status harus diisi" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status, lastSeen: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json({ message: "Status diperbarui", user });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
  }
};

// ✅ Get Status User
export const getUserStatus = async (req, res) => {
  try {
    const userId = req.user.id; // Ambil user ID dari token

    const user = await User.findById(userId).select("username status lastSeen");

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
  }
};

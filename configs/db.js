import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI); // Hapus opsi deprecated
        console.log("Database terhubung ✅");
    } catch (error) {
        console.error("Database connection error:", error);
        throw error;
    }
};

export default connectDB;

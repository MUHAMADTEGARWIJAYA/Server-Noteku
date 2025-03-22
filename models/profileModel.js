import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true }, // One-to-One ke User
    fullName: { type: String, required: true },
    bio: { type: String },
    avatar: { type: String } // URL gambar profil
});

const Profile = mongoose.model("Profile", profileSchema);
export default Profile;

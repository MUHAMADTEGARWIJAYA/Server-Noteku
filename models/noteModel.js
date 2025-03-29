import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // One-to-Many ke User
    title: { type: String, required: true },
    content: { type: String, required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null }, // One-to-Many ke Group
  },
  { timestamps: true } // Menambahkan createdAt & updatedAt secara otomatis
);

const Note = mongoose.model("Note", noteSchema);
export default Note;

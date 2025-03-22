import Note from "../models/noteModel.js";

// Create Note
export const createNote = async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.user.id; // Dapatkan user ID dari token

        if (!title || !content) {
            return res.status(400).json({ message: "Judul dan konten harus diisi" });
        }

        const newNote = new Note({
            user: userId,
            title,
            content,
        });

        await newNote.save();
        res.status(201).json({ message: "Catatan berhasil dibuat", note: newNote });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

// Get All Notes for User
export const getNotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await Note.find({ user: userId });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

// Get Single Note
export const getNoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const note = await Note.findOne({ _id: id, user: userId });

        if (!note) return res.status(404).json({ message: "Catatan tidak ditemukan" });
        res.json(note);
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

// Update Note
export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const userId = req.user.id;

        const note = await Note.findOneAndUpdate(
            { _id: id, user: userId },
            { title, content },
            { new: true }
        );

        if (!note) return res.status(404).json({ message: "Catatan tidak ditemukan" });
        res.json({ message: "Catatan berhasil diperbarui", note });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

// Delete Note
export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const note = await Note.findOneAndDelete({ _id: id, user: userId });

        if (!note) return res.status(404).json({ message: "Catatan tidak ditemukan" });
        res.json({ message: "Catatan berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan", error: error.message });
    }
};

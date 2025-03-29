import Group from "../models/groupModel.js";
import Note from "../models/noteModel.js";
import User from "../models/userModel.js"
// Buat grup baru
export const createGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const newGroup = new Group({ name, members: [userId] });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat grup", error });
  }
};

// Tambahkan user ke grup
export const addUserToGroup = async (req, res) => {
  try {
    const { groupId, email } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Grup tidak ditemukan" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    if (!group.members.includes(user._id)) {
      group.members.push(user._id);
      await group.save();
    }

    res.status(200).json({ message: "User ditambahkan ke grup", group });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan user", error });
  }
};


export const addNoteToGroup = async (req, res) => {
  try {
    const { groupId, title, content, noteId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Grup tidak ditemukan" });
    const userId = req.user.id;
    let note;
    if (noteId) {
      // Jika noteId ada, tambahkan catatan yang sudah ada
      note = await Note.findById(noteId);
      if (!note) return res.status(404).json({ message: "Catatan tidak ditemukan" });
    } else {
      // Jika noteId tidak ada, buat catatan baru
      note = new Note({ title, content, user: userId, groupId });
      await note.save();
    }

    // Pastikan note belum ada di grup
    if (!group.notes.includes(note._id)) {
      group.notes.push(note._id);
      await group.save();
    }

    res.status(200).json({ message: "Catatan berhasil ditambahkan ke grup", group, note });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan catatan", error });
  }
};

export const getGroupsByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("User ID dari token:", userId); // DEBUG

    const groups = await Group.find({ members: userId })
      .populate({
        path: "members",
        select: "username email" // Ambil hanya `name` & `email`
      });

    res.status(200).json({ groups });
  } catch (error) {
    console.error("Error backend:", error);
    res.status(500).json({ message: "Gagal mengambil grup", error });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari grup berdasarkan ID dan populate members dan notes
    const group = await Group.findById(id)
      .populate("members", "name email") // Ambil data nama & email anggota
      .populate("notes"); // Ambil daftar catatan dalam grup

    if (!group) return res.status(404).json({ message: "Grup tidak ditemukan" });

    res.status(200).json({ group });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil grup", error });
  }
};



export const getNotesInGroup = async (req, res) => {
  try {
    const {id } = req.params;

    // Cari grup berdasarkan ID dan populate catatan
    const group = await Group.findById(id).populate("notes");

    if (!group) return res.status(404).json({ message: "Grup tidak ditemukan" });

    res.status(200).json({ notes: group.notes });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil catatan dalam grup", error });
  }
};

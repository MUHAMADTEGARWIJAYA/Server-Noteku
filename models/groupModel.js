import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }]
});

export default mongoose.model("Group", GroupSchema);

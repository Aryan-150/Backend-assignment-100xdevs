import mongoose from "mongoose";

export const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
  },
  { timestamps: true },
);

export const classModel = mongoose.model("Classes", classSchema);

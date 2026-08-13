import mongoose from "mongoose";

export enum UserRole {
  Teacher = "teacher",
  Student = "student",
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    role: {
      type: String,
      required: true,
      enum: UserRole
    },
  },
  { timestamps: true },
);

export const userModel = mongoose.model("Users", userSchema);

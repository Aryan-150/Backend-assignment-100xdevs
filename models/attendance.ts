import mongoose from "mongoose";

export enum AttendanceStatus {
  Present = "present",
  Absent = "absent",
}

export const attendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classes",
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    status: {
      type: String,
      enum: AttendanceStatus,
    },
  },
  { timestamps: true },
);

export const attendanceModel = mongoose.model("Attendances", attendanceSchema);

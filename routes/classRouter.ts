import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { teacherRoleMiddleware } from "../middlewares/teacherRoleMiddleware";
import { addClassSchema, addStudentSchema, type Student } from "../types";
import { classModel } from "../models/class";
import { userModel, UserRole } from "../models/user";
import mongoose from "mongoose";
import { attendanceModel } from "../models/attendance";

export const classRouter: Router = Router();

classRouter.post(
  "/",
  authMiddleware,
  teacherRoleMiddleware,
  async (req, res) => {
    // authMiddleware takes care of 401 error...
    // teacherRoleMiddleware takes care of the 403 error(role check)...
    const { success, data } = addClassSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
      return;
    }
    try {
      // userId -> existingUserWithUserId -> create 'newClass' with className & userId
      // (!existingUserWithUserId) -> return 404

      const newClass = await classModel.create({
        className: data.className,
        teacherId: req.userId,
        studentIds: [],
      });

      res.status(201).json({
        success: true,
        data: {
          _id: newClass._id,
          className: newClass.className,
          teacherId: newClass.teacherId,
          studentIds: newClass.studentIds,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Internal server error...",
      });
    }
  },
);

classRouter.post(
  "/:id/add-student",
  authMiddleware,
  teacherRoleMiddleware,
  async (req, res) => {
    const { success, data } = addStudentSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
      return;
    }
    try {
      const classId = req.params.id;
      if (!classId) throw new Error("malformed classId...");

      const { userId, role } = req;
      if (!userId || !role) throw new Error("malformed userId or role...");

      // existingClassWithClassId -> existingUserWithStudentId -> (existingClassWithClassId.teacherId === req.userId) -> check for duplicate studentIds -> update the record...
      // -> !existingClassWithClassId -> return 404
      // -> !existingUserWithStudentId -> return 404
      // -> existingClassWithClassId.teacherId !== req.userId -> return 403 (ownership check)

      const existingClassWithClassId = await classModel.findOne({
        _id: classId,
      });
      if (!existingClassWithClassId) {
        res.status(404).json({
          success: false,
          error: "Class not found",
        });
        return;
      }

      const existingUserWithStudentId = await userModel.findOne({
        _id: data.studentId,
      });
      if (!existingUserWithStudentId) {
        res.status(404).json({
          success: false,
          error: "Student not found",
        });
        return;
      }

      // ownership-check...
      if (
        !existingClassWithClassId.teacherId ||
        existingClassWithClassId.teacherId.toString() !== userId
      ) {
        res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
        return;
      }

      // check duplicate...
      const studentIdExistsInClass = await classModel.exists({
        _id: classId,
        studentIds: data.studentId,
      });
      if (studentIdExistsInClass) {
        res.status(200).json({
          success: true,
          data: {
            _id: existingClassWithClassId._id,
            className: existingClassWithClassId.className,
            teacherId: existingClassWithClassId.teacherId,
            studentIds: existingClassWithClassId.studentIds.map((id) =>
              id.toString(),
            ),
          },
        });
        return;
      }

      // update the record...
      const updatedClassRecord = await classModel.findByIdAndUpdate(
        classId,
        { $addToSet: { studentIds: data.studentId } },
        { returnDocument: "after" },
      );
      if (!updatedClassRecord) throw new Error("update class record failed");

      res.status(200).json({
        success: true,
        data: {
          _id: updatedClassRecord._id,
          className: updatedClassRecord.className,
          teacherId: updatedClassRecord.teacherId,
          studentIds: updatedClassRecord.studentIds.map((id) => id.toString()),
        },
      });
    } catch (error: any) {
      if (error.message.trim() !== "") {
        res.status(500).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: "Internal server error...",
      });
    }
  },
);

classRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const classId = req.params.id;
    if (!classId) throw new Error("malformed clasId...");

    const { userId, role } = req;
    if (!userId || !role) throw new Error("malformed userId or role...");

    //
    // existingClassWithClassId -> existingUserWithUserId -> based on role:
    // -> teacher: ownership-check
    // -> student: enrollment-check
    // -> !existingClassWithClassId -> return 404
    // -> !existingUserWithUserId -> return 404

    const existingClassWithClassId = await classModel
      .findOne({
        _id: classId,
      })
      .populate<{ studentIds: Student[] }>("studentIds", [
        "_id",
        "name",
        "email",
      ])
      .lean()
      .exec();
    if (!existingClassWithClassId) {
      res.status(404).json({
        success: false,
        error: "Class not found",
      });
      return;
    }

    const existingUserWithUserId = await userModel.findOne({
      _id: userId,
    });
    if (!existingUserWithUserId) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    if (role === UserRole.Teacher) {
      // ownership-check...
      if (
        !existingClassWithClassId.teacherId ||
        existingClassWithClassId.teacherId.toString() !== userId
      ) {
        res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
        return;
      }
    } else if (role === UserRole.Student) {
      // enrollment-check...
      const exists = await classModel.exists({
        _id: classId,
        studentIds: userId,
      });
      if (!exists) {
        res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        _id: existingClassWithClassId._id,
        className: existingClassWithClassId.className,
        teacherId: existingClassWithClassId.teacherId,
        students: existingClassWithClassId.studentIds,
      },
    });
  } catch (error: unknown) {
    console.error("Unhandled API Error:", error);
    const message =
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : "Internal server error";

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

classRouter.get("/:id/my-attendance", authMiddleware, async (req, res) => {
  try {
    const { userId, role } = req;
    if (!userId || !role) throw new Error("malformed userId and role...");

    const classId = req.params.id;
    if (!classId) throw new Error("malformed classId...");

    // existingUserWithUserId -> existingClassWithClassId -> role-check: "student" -> enrollment-check -> get status
    // -> !existingUserWithUserId -> return 404
    // -> !existingClassWithClassId -> return 404

    const existingUserWithUserId = await userModel.findOne({
      _id: userId,
      role: role,
    });
    if (!existingUserWithUserId) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    const existingClassWithClassId = await classModel.findOne({
      _id: classId,
    });
    if (!existingClassWithClassId) {
      res.status(404).json({
        success: false,
        error: "Class not found",
      });
      return;
    }

    // role-check
    if (
      !existingUserWithUserId.role ||
      existingUserWithUserId.role !== UserRole.Student
    ) {
      res.status(403).json({
        success: false,
        error: "Forbidden, student access required",
      });
      return;
    }

    // enrollment-check
    const enrollmentCheck = existingClassWithClassId.studentIds.includes(
      new mongoose.Types.ObjectId(existingUserWithUserId._id),
    );
    console.log(enrollmentCheck);

    if (!enrollmentCheck) {
      res.status(403).json({
        success: false,
        error: "Forbidden, not enrolled in class",
      });
      return;
    }

    const attendanceRecord = await attendanceModel.findOne({
      classId: existingClassWithClassId._id,
      studentId: existingUserWithUserId._id,
    });
    if (
      !attendanceRecord ||
      !attendanceRecord.status ||
      attendanceRecord.status === null
    ) {
      res.status(200).json({
        success: true,
        data: {
          classId: existingClassWithClassId._id,
          status: null,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        classId: existingClassWithClassId._id,
        status: attendanceRecord.status,
      },
    });
  } catch (error: unknown) {
    console.error("unhandled API error: ", error);

    const message =
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : "Internal server error";

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

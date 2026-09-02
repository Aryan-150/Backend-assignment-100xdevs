import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { teacherRoleMiddleware } from "../middlewares/teacherRoleMiddleware";
import { attendanceStartSchema } from "../types";
import { classModel } from "../models/class";
import { activeSession, allSockets } from "../websockets";

export const attendanceRouter: Router = Router();

attendanceRouter.post(
  "/start",
  authMiddleware,
  teacherRoleMiddleware,
  async (req, res) => {
    const { success, data } = attendanceStartSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
      return;
    }
    try {
      // data.classId -> existingClassWithClassId -> ownership-check -> sets the new activeSession object instance
      // -> !existingClassWithClassId -> return 404
      
      const { userId, role } = req;
      if (!userId || !role) throw new Error("malformed userId or role...");

      const existingClassWithClassId = await classModel.findOne({
        _id: data.classId,
      });
      if (!existingClassWithClassId) {
        res.status(404).json({
          success: false,
          error: "Class not found",
        });
        return;
      }

      // ownership-check: existingClassWithClassId.teacherId === userId
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

      activeSession.classId = data.classId;
      activeSession.teacherId = existingClassWithClassId.teacherId.toString();
      activeSession.startedAt = new Date().toISOString();
      activeSession.attendance = {};

      for (const socket of allSockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      }

      allSockets.length = 0;

      res.status(200).json({
        success: true,
        data: {
          classId: activeSession.classId,
          startedAt: activeSession.startedAt,
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
  },
);

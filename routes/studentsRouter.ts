import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { teacherRoleMiddleware } from "../middlewares/teacherRoleMiddleware";
import { userModel, UserRole } from "../models/user";

export const studentsRouter: Router = Router();

studentsRouter.get(
  "/",
  authMiddleware,
  teacherRoleMiddleware,
  async (req, res) => {
    try {
      const users = await userModel
        .find({
          role: UserRole.Student,
        })
        .select(["_id", "name", "email"])
        .lean()
        .exec();

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "internal server error...",
      });
    }
  },
);

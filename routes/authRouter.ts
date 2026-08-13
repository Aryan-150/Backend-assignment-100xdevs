import { Router } from "express";
import { signInSchema, signUpSchema } from "../types";
import { userModel } from "../models/user";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { authMiddleware } from "../middlewares/authMiddleware";

export const authRouter: Router = Router();

authRouter.post("/signup", async (req, res) => {
  const { success, data } = signUpSchema.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      success: false,
      error: "Invalid request schema",
    });
    return;
  }

  // existingUserWithEmail -> !existingUserWithEmail -> add to db
  //                       -> existingUserWithEmail -> return 400
  try {
    const existingUserWithEmail = await userModel.findOne({
      email: data.email,
    });
    if (existingUserWithEmail) {
      res.status(400).json({
        success: false,
        error: "Email already exists",
      });
      return;
    }

    const newUser = await userModel.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    res.status(411).json({
      success: false,
      error: error.message,
    });
  }
});

authRouter.post("/login", async (req, res) => {
  const { success, data } = signInSchema.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      success: false,
      error: "Invalid request schema",
    });
    return;
  }

  try {
    // existingUserWithEmail -> existingUserWithEmail -> (data.password === existingUserWithEmail.password) -> create jwt token -> return 200
    // -> !existingUserWithEmail -> return 400
    // -> (data.password !== existingUserWithEmail.password) -> return 400

    const existingUserWithEmail = await userModel.findOne({
      email: data.email,
    });
    if (
      !existingUserWithEmail ||
      data.password !== existingUserWithEmail.password
    ) {
      res.status(400).json({
        success: false,
        error: "Invalid email or password",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: existingUserWithEmail._id.toString(),
        role: existingUserWithEmail.role,
      },
      JWT_SECRET,
    );

    res.status(200).json({
      success: true,
      data: {
        token: token,
      },
    });
  } catch (error: any) {
    res.status(411).json({
      success: false,
      error: error.message,
    });
  }
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const role = req.role;
  if (!userId || !role) {
    res.status(401).json({
      success: false,
      error: "Unauthorized, token missing or invalid",
    });
    return;
  }

  try {
    // userId -> existingUserWithUserIdAndRole -> retrun 200
    // -> !existingUserWithUserIdAndRole -> return 404

    const existingUserWithUserIdAndRole = await userModel.findOne({
      _id: userId,
      role: role,
    });
    if (!existingUserWithUserIdAndRole) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: existingUserWithUserIdAndRole._id,
        name: existingUserWithUserIdAndRole.name,
        email: existingUserWithUserIdAndRole.email,
        role: existingUserWithUserIdAndRole.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

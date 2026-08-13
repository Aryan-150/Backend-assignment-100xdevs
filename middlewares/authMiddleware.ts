import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import type { UserRole } from "../models/user";

interface CustomJwtPayload extends JwtPayload {
  userId?: string;
  role?: UserRole;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers["authorization"];
    if (!token) {
      res.status(401).json({
        success: false,
        error: "Unauthorized, token missing or invalid",
      });
      return;
    }

    const { userId, role } = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    if (!userId || !role) {
      res.status(401).json({
        success: false,
        error: "Unauthorized, token missing or invalid",
      });
      return;
    }

    req.userId = userId;
    req.role = role;
    next();
  } catch (error) {
    if(error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: "Unauthorized, token missing or invalid",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Unauthorized, token missing or invalid",
    });
  }
}

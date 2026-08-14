import type { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/user";

export function teacherRoleMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.role;
    if(!role || role !== UserRole.Teacher) throw new Error();
    
    next();
    
  } catch (error) {
    res.status(403).json({
      success: false,
      error: "Forbidden, teacher access required"
    })
  }
}
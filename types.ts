import * as z from "zod";
import { UserRole } from "./models/user";
import type { JwtPayload } from "jsonwebtoken";

export const signUpSchema = z.object({
  name: z.string().trim(),
  email: z.email().toLowerCase().trim(),
  password: z.string().trim().min(6),
  role: z.enum(UserRole),
});

export const signInSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().trim().min(6),
});

export const addClassSchema = z.object({
  className: z.string(),
});

export const addStudentSchema = z.object({
  studentId: z.string(),
});

export const attendanceStartSchema = z.object({
  classId: z.string(),
});

//* TypeScript Types:
export interface Student {
  _id: string;
  name: string;
  email: string;
}

export type ActiveSession = {
  classId: string;
  teacherId: string;
  startedAt: string;
  attendance: Record<string, string>;
};

export const WebSocketEvents = {
  ATTENDANCE_MARKED: "ATTENDANCE_MARKED",
  TODAY_SUMMARY: "TODAY_SUMMARY",
  MY_ATTENDANCE: "MY_ATTENDANCE",
  DONE: "DONE",
  ERROR: "ERROR"
} as const;

export type WebSocketEventsType = (typeof WebSocketEvents)[keyof typeof WebSocketEvents];

export type ParsedMessage = {
  event: WebSocketEventsType;
  data?: Record<string, string>;
};

export interface CustomJwtPayload extends JwtPayload {
  userId?: string;
  role?: UserRole;
}

/**
 * type ValueOf<T> = T[keyof T]
 * type WebSocketEventsType = ValueOf<typeof WebSocketEvents>;
 */
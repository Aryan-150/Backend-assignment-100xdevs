import * as z from "zod";
import { UserRole } from "./models/user";

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

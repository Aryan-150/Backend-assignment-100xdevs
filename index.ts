import express from "express";
import mongoose from "mongoose";
import { MONGODB_URI, PORT } from "./config";
import type { UserRole } from "./models/user";
import { authRouter } from "./routes/authRouter";
import { classRouter } from "./routes/classRouter";
import { studentsRouter } from "./routes/studentsRouter";
import { attendanceRouter } from "./routes/attendanceRouter";

const app = express();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: UserRole;
    }
  }
}

app.use(express.json());
app.use("/auth", authRouter);
app.use("/class", classRouter);
app.use("/students", studentsRouter);
app.use("/attendance", attendanceRouter);

async function main() {
  try {
    await mongoose.connect(`${MONGODB_URI}`);
    console.log("Db connected...");
    app.listen(PORT, () => {
      console.log(`server is listening at port: ${PORT}`);
    });
  } catch (error: any) {
    console.error(error);
  }
}

main();

/**
 * /auth
 * /class
 * /students
 * /attendance
 *
 *
 */

import express from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import { MONGODB_URI, PORT } from "./config";
import type { UserRole } from "./models/user";
import { authRouter } from "./routes/authRouter";
import { classRouter } from "./routes/classRouter";
import { studentsRouter } from "./routes/studentsRouter";
import { attendanceRouter } from "./routes/attendanceRouter";
import { wss } from "./websockets";

const app = express();
export const server = createServer(app);
server.on("upgrade", (request, socket, head) => {
  if (!request.url) {
    socket.destroy();
    return;
  }
  const { pathname } = new URL(request.url, "ws://localhost");

  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

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
    server.listen(PORT, () => {
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
 */

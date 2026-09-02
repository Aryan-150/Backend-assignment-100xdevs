import { WebSocket, WebSocketServer } from "ws";
import { WebSocketEvents, type ActiveSession, type CustomJwtPayload, type ParsedMessage } from "./types";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";
import { UserRole } from "./models/user";
import { classModel } from "./models/class";
import { AttendanceStatus } from "./models/attendance";

export const wss = new WebSocketServer({ noServer: true });

export let activeSession: ActiveSession = {
  classId: "",
  teacherId: "",
  startedAt: "",
  attendance: {},
};
export let allSockets: WebSocket[] = [];

wss.on("connection", (ws, request) => {
  try {
    if(!request.url) throw new Error("request url is malformed");
    const { searchParams } = new URL(request.url, "ws://localhost");
    const token = searchParams.get("token")?.trim();
    if(!token) throw new Error("Unauthorized or invalid token");
    
    const { userId, role } = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    if(!userId || !role) throw new Error("Unauthorized or invalid token");

    // TODO: db call -> userId already exists in the activeSession.classId

    ws.user = {
      userId: userId,
      role: role
    };
    allSockets.push(ws);

  } catch (error: unknown) {
    const message =
      error instanceof jwt.JsonWebTokenError
        ? "Unauthorized or invalid token"
        : error instanceof Error && error.message.trim() !== ""
          ? error.message
          : "Internal server Error";
    ws.send(
      JSON.stringify({
        event: WebSocketEvents.ERROR,
        data: {
          message: message,
        },
      }),
    );
    ws.close();
    return;
  }

  ws.on("error", console.error);

  ws.on("message", async (data) => {
    const message = data.toString();
    if (!message || message.trim() === "") {
      ws.close();
    }

    const parsedMessage: ParsedMessage = JSON.parse(message);
    switch (parsedMessage.event) {
      case WebSocketEvents.ATTENDANCE_MARKED:
        try {
          if (ws.user && ws.user.role !== UserRole.Teacher)
            throw new Error("Forbidden, teacher event only");

          if (activeSession.classId.trim() === "" || activeSession.teacherId !== ws.user?.userId)
            throw new Error("No active attendance session");

          if (
            !parsedMessage.data ||
            !parsedMessage.data.studentId ||
            !parsedMessage.data.status
          )
            throw new Error("malformed input 'data' field");

          const studentId = parsedMessage.data.studentId;
          const status = parsedMessage.data.status;
          
          activeSession.attendance[studentId] = status;
          allSockets.forEach((client) => {
            if(client.readyState === WebSocket.OPEN){
              client.send(JSON.stringify(parsedMessage));
            }
          });
          
        } catch (error: unknown) {
          const message =
            error instanceof Error && error.message.trim() !== ""
              ? error.message
              : "Internal server error";

          ws.send(
            JSON.stringify({
              event: WebSocketEvents.ERROR,
              data: {
                message: message,
              },
            }),
          );
          ws.close();
          return;
        }
        break;
    
      case WebSocketEvents.TODAY_SUMMARY:
        try {
          if (ws.user && ws.user.role !== UserRole.Teacher)
            throw new Error("Forbidden, teacher event only");

          if (activeSession.classId.trim() === "" || activeSession.teacherId !== ws.user?.userId)
            throw new Error("No active attendance session");

          const currentClass = await classModel
            .findOne({
              _id: activeSession.classId,
            })
            .lean();
          if(!currentClass) 
            throw new Error("Class not found");
          
          const total = currentClass.studentIds.length;
          const present = Object.values(activeSession.attendance).filter(
            (x) => x === AttendanceStatus.Present,
          ).length;
          const absent = total - present;

          allSockets.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  event: WebSocketEvents.TODAY_SUMMARY,
                  data: {
                    present: present,
                    absent: absent,
                    total: total,
                  },
                }),
              );
            }
          });

        } catch (error: unknown) {
          const message =
            error instanceof Error && error.message.trim() !== ""
              ? error.message
              : "Internal server error";

          ws.send(
            JSON.stringify({
              event: WebSocketEvents.ERROR,
              data: {
                message: message,
              },
            }),
          );
        }
        break;
      
      default:
        break;
    }
  });
});

import { WebSocket, WebSocketServer } from "ws";
import { WebSocketEvents, type ActiveSession, type CustomJwtPayload, type ParsedMessage } from "./types";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config";
import { UserRole } from "./models/user";

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

  ws.on("message", (data) => {
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
            console.log("control reached here inside clients callback");
            client.send(JSON.stringify(parsedMessage));
          });
          // wss.clients.forEach((client) => {
          //   console.log("control reached here inside clients callback");
          //   console.log(client, JSON.stringify(parsedMessage));
            
          //   if (client.readyState === WebSocket.OPEN) {
          //     console.log("message starting to be sent");
          //     client.send(JSON.stringify(parsedMessage));
          //     console.log("message got sent");
          //   }
          // });
          
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

        break;
      
      default:
        break;
    }
  });
});

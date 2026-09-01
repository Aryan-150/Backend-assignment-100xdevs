import "ws";
import type { UserRole } from "./models/user";

declare module "ws" {
  interface WebSocket {
    user?: {
      userId?: string;
      role?: UserRole;
    };
  }
}

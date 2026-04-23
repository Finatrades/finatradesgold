import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: "user" | "admin";
    }
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

export {};

import { User, Employee } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, never> {}
    interface Request {
      user?: import("@shared/schema").User;
      // Attached by ensureAdminAsync / requireSelfOrAdmin / requireUserType middlewares.
      adminUser?: import("@shared/schema").User;
      adminEmployee?: import("@shared/schema").Employee | undefined | null;
      currentUser?: import("@shared/schema").User;
      isAuthenticated(): boolean;
    }
  }
}

export {};

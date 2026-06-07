declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      userId?: string;
      email?: string;
      name?: string;
      fullName?: string;
      role?: any;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};

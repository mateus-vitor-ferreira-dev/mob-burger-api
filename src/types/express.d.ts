declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      type: 'staff' | 'customer';
      role?: string;
    };
  }
}

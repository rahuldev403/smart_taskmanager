export type AuthUser = {
  _id?: string;
  userName: string;
  email: string;
  userType?: "admin" | "user";
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  bootstrapped: boolean;

  registerActiion: (payload: {
    userName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  loginAction: (payload: { email: string; password: string }) => Promise<void>;
  logoutAction: () => Promise<void>;
  bootstrapAuth: () => Promise<void>;
  clearError: () => void;
};

import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthResult {
  readonly error: Error | null;
}

export interface AuthContextValue {
  readonly user: User | null;
  readonly session: Session | null;
  /** True until the initial session check settles. Guards route redirects. */
  readonly isLoading: boolean;
  readonly signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<AuthResult>;
  readonly signIn: (email: string, password: string) => Promise<AuthResult>;
  readonly signInWithGoogle: () => Promise<AuthResult>;
  readonly resetPassword: (email: string) => Promise<AuthResult>;
  readonly signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

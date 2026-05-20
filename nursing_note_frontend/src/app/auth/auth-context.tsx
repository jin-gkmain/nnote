import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type AuthUser,
  loginRequest,
  meRequest,
  readStoredToken,
  writeStoredToken,
} from "@/app/data/auth-api";
import { queryKeys } from "@/app/query/query-keys";
import { useMeQuery } from "@/app/query/use-app-query";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const meQuery = useMeQuery(token);
  const user = token ? (meQuery.data ?? null) : null;
  const isReady = token ? meQuery.isFetched : true;

  useEffect(() => {
    if (!token) return;
    if (!meQuery.isFetched) return;
    if (meQuery.data) return;
    writeStoredToken(null);
    setToken(null);
    queryClient.removeQueries({ queryKey: ["auth"] });
  }, [token, meQuery.isFetched, meQuery.data, queryClient]);

  const loginMutation = useMutation({
    mutationFn: ({ loginId, password }: { loginId: string; password: string }) =>
      loginRequest(loginId, password),
  });

  const login = useCallback(
    async (loginId: string, password: string) => {
      const { accessToken, user: loggedInUser } = await loginMutation.mutateAsync({
        loginId,
        password,
      });
      writeStoredToken(accessToken);
      setToken(accessToken);
      queryClient.setQueryData(queryKeys.auth.me(accessToken), loggedInUser);
    },
    [loginMutation, queryClient],
  );

  const refreshMe = useCallback(async () => {
    const nextToken = readStoredToken();
    if (!nextToken) {
      writeStoredToken(null);
      setToken(null);
      queryClient.removeQueries({ queryKey: ["auth"] });
      return;
    }
    setToken(nextToken);
    const next = await queryClient.fetchQuery({
      queryKey: queryKeys.auth.me(nextToken),
      queryFn: () => meRequest(nextToken),
      staleTime: 0,
    });
    if (!next) {
      writeStoredToken(null);
      setToken(null);
      queryClient.removeQueries({ queryKey: ["auth"] });
    }
  }, [queryClient]);

  const logout = useCallback(() => {
    writeStoredToken(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      token,
      isReady,
      login,
      logout,
      refreshMe,
    }),
    [user, token, isReady, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}

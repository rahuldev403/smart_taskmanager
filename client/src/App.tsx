import { useEffect, useState } from "react";
import { LoginModal } from "./components/auth/LoginModal";
import { RegisterModal } from "./components/auth/RegisterModal";
import { Button } from "./components/ui/button";
import { useAuthStore } from "./store/auth.store";

function App() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    bootstrapped,
    registerAction,
    loginAction,
    logoutAction,
    bootstrapAuth,
    clearError,
  } = useAuthStore();

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  async function handleLogin(payload: { email: string; password: string }) {
    clearError();
    try {
      await loginAction(payload);
      setLoginOpen(false);
    } catch {}
  }

  async function handleRegister(payload: {
    userName: string;
    email: string;
    password: string;
  }) {
    clearError();
    try {
      await registerAction(payload);
      setRegisterOpen(false);
    } catch {}
  }

  if (!bootstrapped) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
        <span className="mb-4 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          Smart TaskManager
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Plan better. Finish faster.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A focused workspace to track your tasks, reduce distractions, and stay
          consistent every day.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!isAuthenticated ? (
            <>
              <Button
                onClick={() => {
                  clearError();
                  setLoginOpen(true);
                }}
              >
                Login
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  clearError();
                  setRegisterOpen(true);
                }}
              >
                Register
              </Button>
            </>
          ) : (
            <>
              <p className="rounded-md border bg-card px-4 py-2 text-sm">
                Logged in as {user?.userName ?? user?.email ?? "User"}
              </p>
              <Button
                variant="outline"
                onClick={logoutAction}
                disabled={isLoading}
              >
                {isLoading ? "Logging out..." : "Logout"}
              </Button>
            </>
          )}
        </div>
      </section>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSubmit={handleLogin}
        isLoading={isLoading}
        error={loginOpen ? error : null}
      />

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSubmit={handleRegister}
        isLoading={isLoading}
        error={registerOpen ? error : null}
      />
    </main>
  );
}

export default App;

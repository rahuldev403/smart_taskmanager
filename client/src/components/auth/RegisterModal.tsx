import { type FormEvent, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";

const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "At least 1 number",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "symbol",
    label: "At least 1 special character",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

type RegisterModalProps = {
  open: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    userName: string;
    email: string;
    password: string;
  }) => Promise<void>;
};

export function RegisterModal({
  open,
  isLoading,
  error,
  onClose,
  onSubmit,
}: RegisterModalProps) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const isPasswordValid = passwordChecks.every((rule) => rule.passed);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isPasswordValid) {
      setClientError("Password does not meet the required rules");
      return;
    }

    setClientError(null);
    await onSubmit({ userName, email, password });
    setPassword("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create account"
      description="Get started by creating your Smart TaskManager account."
    >
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <Input
          type="text"
          placeholder="Username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            className="pr-16"
            onChange={(e) => {
              setPassword(e.target.value);
              if (clientError) setClientError(null);
            }}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <ul className="space-y-1 text-left text-xs text-muted-foreground">
          {passwordChecks.map((rule) => (
            <li
              key={rule.id}
              className={
                rule.passed ? "text-green-500" : "text-muted-foreground"
              }
            >
              {rule.passed ? "✓" : "•"} {rule.label}
            </li>
          ))}
        </ul>
        {clientError ? (
          <p className="text-sm text-destructive">{clientError}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Register"}
        </Button>
      </form>
    </Modal>
  );
}

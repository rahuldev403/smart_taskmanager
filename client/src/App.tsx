import { useEffect, useState } from "react";
import {
  FiEdit2,
  FiLogOut,
  FiMoon,
  FiPlus,
  FiSun,
  FiTrash2,
} from "react-icons/fi";
import { LoginModal } from "./components/auth/LoginModal";
import { RegisterModal } from "./components/auth/RegisterModal";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { ToastViewport, type ToastItem } from "./components/ui/toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "./lib/api";
import { useAuthStore } from "./store/auth.store";
import type {
  TaskItem,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  UsersListResponse,
} from "./store/task.types";
import type { AuthUser } from "./store/auth.types";

type TaskFormState = {
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedUserName: string;
};
// note here
const STATUS_OPTIONS: TaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"];
const TOAST_DURATION_MS = 3500;
const TOAST_EXIT_MS = 180;
const THEME_STORAGE_KEY = "smart-taskmanager-theme";

function normalizeDateForInput(value: string) {
  if (!value) return "";
  if (value.length >= 10) return value.slice(0, 10);
  return value;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

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

  const isAdmin = user?.userType === "admin";

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });

  const [createForm, setCreateForm] = useState<TaskFormState>({
    title: "",
    description: "",
    dueDate: "",
    status: "pending",
    priority: "high",
    assignedUserName: "",
  });

  const [editForm, setEditForm] = useState<TaskFormState>({
    title: "",
    description: "",
    dueDate: "",
    status: "pending",
    priority: "high",
    assignedUserName: "",
  });

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  }

  function removeToastNow(id: number) {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }

  function dismissToast(id: number) {
    setToasts((previous) =>
      previous.map((toast) =>
        toast.id === id ? { ...toast, isClosing: true } : toast,
      ),
    );

    window.setTimeout(() => {
      removeToastNow(id);
    }, TOAST_EXIT_MS);
  }

  function pushToast(toast: Omit<ToastItem, "id" | "isClosing">) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const duration = toast.duration ?? TOAST_DURATION_MS;
    setToasts((previous) => [
      ...previous,
      { ...toast, id, duration, isClosing: false },
    ]);
    window.setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  useEffect(() => {
    if (!isAuthenticated || !bootstrapped) return;

    if (isAdmin) {
      async function loadUsersForAdmin() {
        try {
          const response = await apiGet<UsersListResponse>("/api/auth/users");
          setUsers(response.data?.users ?? []);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch users";
          pushToast({
            title: "Could not load users",
            description: message,
            variant: "error",
          });
        }
      }

      loadUsersForAdmin();
    } else {
      setUsers([]);
      setSelectedUserId("");
    }
  }, [isAuthenticated, bootstrapped, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !bootstrapped) return;

    async function loadTasks() {
      setTasksLoading(true);
      setTaskError(null);
      try {
        const query = new URLSearchParams();
        if (filters.status) query.set("status", filters.status);
        if (filters.priority) query.set("priority", filters.priority);
        if (filters.search.trim()) query.set("search", filters.search.trim());
        if (isAdmin && selectedUserId) query.set("userId", selectedUserId);

        const response = await apiGet<TaskListResponse>(
          `/api/tasks${query.toString() ? `?${query.toString()}` : ""}`,
        );

        setTasks(response.data?.tasks ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch tasks";
        setTaskError(message);
        pushToast({
          title: "Could not load tasks",
          description: message,
          variant: "error",
        });
      } finally {
        setTasksLoading(false);
      }
    }

    loadTasks();
  }, [isAuthenticated, bootstrapped, filters, isAdmin, selectedUserId]);

  async function handleLogin(payload: { email: string; password: string }) {
    clearError();
    try {
      await loginAction(payload);
      setLoginOpen(false);
      pushToast({ title: "Welcome back", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      pushToast({
        title: "Login failed",
        description: message,
        variant: "error",
      });
    }
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
      pushToast({ title: "Account created", variant: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      pushToast({
        title: "Registration failed",
        description: message,
        variant: "error",
      });
    }
  }

  async function handleLogout() {
    await logoutAction();
    pushToast({ title: "Logged out", variant: "info" });
  }

  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTaskError(null);

    if (
      !createForm.title.trim() ||
      !createForm.description.trim() ||
      !createForm.dueDate
    ) {
      setTaskError("Title, description, and due date are required");
      pushToast({
        title: "Validation error",
        description: "Title, description, and due date are required",
        variant: "error",
      });
      return;
    }

    setTaskActionLoading(true);
    try {
      const response = await apiPost<TaskItem>("/api/tasks", {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        dueDate: createForm.dueDate,
        status: createForm.status,
        priority: createForm.priority,
        ...(isAdmin && createForm.assignedUserName.trim()
          ? { assignedUserName: createForm.assignedUserName.trim() }
          : {}),
      });

      const createdTask = response.data;
      if (createdTask) {
        setTasks((previous) => [createdTask, ...previous]);
      }

      setCreateForm({
        title: "",
        description: "",
        dueDate: "",
        status: "pending",
        priority: "high",
        assignedUserName: "",
      });
      pushToast({ title: "Task created", variant: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create task";
      setTaskError(message);
      pushToast({
        title: "Create failed",
        description: message,
        variant: "error",
      });
    } finally {
      setTaskActionLoading(false);
    }
  }

  function startEditing(task: TaskItem) {
    const assignedUser = users.find(
      (candidate) => candidate._id === task.assignedTo,
    );

    setEditingTaskId(task._id);
    setEditForm({
      title: task.title,
      description: task.description,
      dueDate: normalizeDateForInput(task.dueDate),
      status: task.status,
      priority: task.priority,
      assignedUserName: assignedUser?.userName ?? "",
    });
  }

  async function handleSaveTask(taskId: string) {
    setTaskError(null);

    if (
      !editForm.title.trim() ||
      !editForm.description.trim() ||
      !editForm.dueDate
    ) {
      setTaskError("Title, description, and due date are required");
      pushToast({
        title: "Validation error",
        description: "Title, description, and due date are required",
        variant: "error",
      });
      return;
    }

    setTaskActionLoading(true);
    try {
      const response = await apiPatch<TaskItem>(`/api/tasks/${taskId}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        dueDate: editForm.dueDate,
        status: editForm.status,
        priority: editForm.priority,
        ...(isAdmin
          ? {
              assignedUserName: editForm.assignedUserName.trim()
                ? editForm.assignedUserName.trim()
                : "",
            }
          : {}),
      });

      const updatedTask = response.data;
      if (updatedTask) {
        setTasks((previous) =>
          previous.map((task) => (task._id === taskId ? updatedTask : task)),
        );
      }

      setEditingTaskId(null);
      pushToast({ title: "Task updated", variant: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update task";
      setTaskError(message);
      pushToast({
        title: "Update failed",
        description: message,
        variant: "error",
      });
    } finally {
      setTaskActionLoading(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    setTaskError(null);
    setTaskActionLoading(true);
    try {
      await apiDelete<null>(`/api/tasks/${taskId}`);
      setTasks((previous) => previous.filter((task) => task._id !== taskId));
      pushToast({ title: "Task deleted", variant: "info" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      setTaskError(message);
      pushToast({
        title: "Delete failed",
        description: message,
        variant: "error",
      });
    } finally {
      setTaskActionLoading(false);
    }
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
      <div className="fixed right-4 top-4 z-40">
        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? (
            <FiSun className="mr-2" />
          ) : (
            <FiMoon className="mr-2" />
          )}
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
      </div>

      {!isAuthenticated ? (
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
          <span className="mb-4 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            Smart TaskManager
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plan better. Finish faster.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A focused workspace to track your tasks, reduce distractions, and
            stay consistent every day.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div>
              <h1 className="text-xl font-semibold">Smart TaskManager</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user?.userName ?? user?.email ?? "User"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <FiLogOut className="mr-2" />
              {isLoading ? "Logging out..." : "Logout"}
            </Button>
          </header>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-6">
              <div className="rounded-lg border bg-card p-4">
                <h2 className="mb-3 text-base font-semibold">Create Task</h2>
                <form className="grid gap-3" onSubmit={handleCreateTask}>
                  <Input
                    placeholder="Title"
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                  />
                  <textarea
                    placeholder="Description"
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    className="calendar-input"
                    value={createForm.dueDate}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={createForm.status}
                      onChange={(event) =>
                        setCreateForm((previous) => ({
                          ...previous,
                          status: event.target.value as TaskStatus,
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={createForm.priority}
                      onChange={(event) =>
                        setCreateForm((previous) => ({
                          ...previous,
                          priority: event.target.value as TaskPriority,
                        }))
                      }
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isAdmin ? (
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={createForm.assignedUserName}
                      onChange={(event) =>
                        setCreateForm((previous) => ({
                          ...previous,
                          assignedUserName: event.target.value,
                        }))
                      }
                    >
                      <option value="">Assign by user (optional)</option>
                      {users.map((candidate) => (
                        <option key={candidate._id} value={candidate.userName}>
                          {candidate.userName}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <Button type="submit" disabled={taskActionLoading}>
                    <FiPlus className="mr-2" />
                    {taskActionLoading ? "Saving..." : "Create Task"}
                  </Button>
                </form>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h2 className="mb-3 text-base font-semibold">Filters</h2>
                <div className="grid gap-3">
                  {isAdmin ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Click a user card to view their tasks.
                      </p>
                      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                        <button
                          type="button"
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                            selectedUserId === ""
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background"
                          }`}
                          onClick={() => setSelectedUserId("")}
                        >
                          All users
                        </button>
                        {users.map((candidate) => (
                          <button
                            key={candidate._id}
                            type="button"
                            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                              selectedUserId === candidate._id
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background"
                            }`}
                            onClick={() =>
                              setSelectedUserId(candidate._id ?? "")
                            }
                          >
                            <p className="font-medium">{candidate.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.email}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Input
                    placeholder="Search title or description"
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((previous) => ({
                        ...previous,
                        search: event.target.value,
                      }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={filters.status}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="">All status</option>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={filters.priority}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          priority: event.target.value,
                        }))
                      }
                    >
                      <option value="">All priority</option>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </aside>

            <section className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Your Tasks</h2>
                <span className="text-sm text-muted-foreground">
                  {tasks.length} items
                </span>
              </div>

              {taskError ? (
                <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {taskError}
                </p>
              ) : null}

              {tasksLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading tasks...
                </p>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks found. Create your first task.
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const isEditing = editingTaskId === task._id;

                    return (
                      <article key={task._id} className="rounded-md border p-3">
                        {isEditing ? (
                          <div className="grid gap-2">
                            <Input
                              value={editForm.title}
                              onChange={(event) =>
                                setEditForm((previous) => ({
                                  ...previous,
                                  title: event.target.value,
                                }))
                              }
                            />
                            <textarea
                              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={editForm.description}
                              onChange={(event) =>
                                setEditForm((previous) => ({
                                  ...previous,
                                  description: event.target.value,
                                }))
                              }
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="date"
                                className="calendar-input"
                                value={editForm.dueDate}
                                onChange={(event) =>
                                  setEditForm((previous) => ({
                                    ...previous,
                                    dueDate: event.target.value,
                                  }))
                                }
                              />
                              <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={editForm.status}
                                onChange={(event) =>
                                  setEditForm((previous) => ({
                                    ...previous,
                                    status: event.target.value as TaskStatus,
                                  }))
                                }
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={editForm.priority}
                                onChange={(event) =>
                                  setEditForm((previous) => ({
                                    ...previous,
                                    priority: event.target
                                      .value as TaskPriority,
                                  }))
                                }
                              >
                                {PRIORITY_OPTIONS.map((priority) => (
                                  <option key={priority} value={priority}>
                                    {priority}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {isAdmin ? (
                              <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={editForm.assignedUserName}
                                onChange={(event) =>
                                  setEditForm((previous) => ({
                                    ...previous,
                                    assignedUserName: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Unassigned</option>
                                {users.map((candidate) => (
                                  <option
                                    key={candidate._id}
                                    value={candidate.userName}
                                  >
                                    {candidate.userName}
                                  </option>
                                ))}
                              </select>
                            ) : null}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={taskActionLoading}
                                onClick={() => handleSaveTask(task._id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTaskId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium">{task.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {task.description}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditing(task)}
                                >
                                  <FiEdit2 className="mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={taskActionLoading}
                                  onClick={() => handleDeleteTask(task._id)}
                                >
                                  <FiTrash2 className="mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded border px-2 py-1">
                                Status: {task.status}
                              </span>
                              <span className="rounded border px-2 py-1">
                                Priority: {task.priority}
                              </span>
                              <span className="rounded border px-2 py-1">
                                Due: {formatDate(task.dueDate)}
                              </span>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>
      )}

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

      <ToastViewport toasts={toasts} onRemove={dismissToast} />
    </main>
  );
}

export default App;

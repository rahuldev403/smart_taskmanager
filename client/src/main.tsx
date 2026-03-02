import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const savedTheme = localStorage.getItem("smart-taskmanager-theme");
const initialTheme = savedTheme === "light" ? "light" : "dark";
document.documentElement.classList.toggle("dark", initialTheme === "dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

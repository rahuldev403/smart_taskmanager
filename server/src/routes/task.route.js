import express from "express";
import {
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
  getMyTasks,
} from "../controllers/task.controller.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const taskRouter = express.Router();

taskRouter.post("/", requireAuth, createTask);
taskRouter.get("/", requireAuth, getMyTasks);
taskRouter.patch("/:taskId", requireAuth, updateTask);
taskRouter.delete("/:taskId", requireAuth, deleteTask);
taskRouter.get("/:taskId", requireAuth, getTaskById);

export default taskRouter;

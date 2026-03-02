import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandeler from "../utils/asyncHandler.js";
import validator from "validator";

const allowedStatus = ["pending", "in_progress", "completed", "cancelled"];
const allowedPriority = ["low", "medium", "high"];

function ensureValidTaskId(taskId) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task id");
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveAssignedUserId({ assignedTo, assignedUserName }) {
  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === "") {
      return null;
    }

    if (!mongoose.Types.ObjectId.isValid(String(assignedTo))) {
      throw new ApiError(400, "Invalid assigned user id");
    }

    const user = await User.findById(assignedTo).select("_id");
    if (!user) {
      throw new ApiError(404, "Assigned user not found");
    }

    return user._id;
  }

  if (assignedUserName !== undefined) {
    const normalizedUserName = String(assignedUserName || "").trim();
    if (!normalizedUserName) {
      return null;
    }

    const user = await User.findOne({
      userName: {
        $regex: `^${escapeRegex(normalizedUserName)}$`,
        $options: "i",
      },
    }).select("_id");

    if (!user) {
      throw new ApiError(404, "Assigned user not found");
    }

    return user._id;
  }

  return undefined;
}

export const createTask = asyncHandeler(async (req, res) => {
  const user = req.user;
  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedUserName,
  } = req.body;

  if (!user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  if (!title || !title.trim() || !description || !description.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  if (status && !allowedStatus.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  if (!dueDate || !validator.isDate(String(dueDate))) {
    throw new ApiError(400, "Invalid due date");
  }

  if (priority && !allowedPriority.includes(priority)) {
    throw new ApiError(400, "Invalid priority");
  }

  const isAdmin = user.userType === "admin";

  if (
    (assignedTo !== undefined || assignedUserName !== undefined) &&
    !isAdmin
  ) {
    throw new ApiError(403, "Only admin can assign tasks");
  }

  const resolvedAssignedTo = isAdmin
    ? await resolveAssignedUserId({ assignedTo, assignedUserName })
    : undefined;

  const newTask = await Task.create({
    title: title.trim(),
    description: description.trim(),
    status: status || "pending",
    priority: priority || "high",
    dueDate,
    assignedTo: resolvedAssignedTo,
    createdBy: user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newTask, "Task created successfully"));
});

export const updateTask = asyncHandeler(async (req, res) => {
  const user = req.user;
  const { taskId } = req.params;
  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedUserName,
  } = req.body;

  if (!user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  ensureValidTaskId(taskId);

  const task = await Task.findOne({ _id: taskId, isDeleted: false });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const isAdmin = user.userType === "admin";
  const isOwner = String(task.createdBy) === String(user._id);

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, "User is not allowed to modify this task");
  }

  if (title !== undefined && !String(title).trim()) {
    throw new ApiError(400, "Title cannot be empty");
  }

  if (description !== undefined && !String(description).trim()) {
    throw new ApiError(400, "Description cannot be empty");
  }

  if (status !== undefined && !allowedStatus.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  if (priority !== undefined && !allowedPriority.includes(priority)) {
    throw new ApiError(400, "Invalid priority");
  }

  if (dueDate !== undefined && !validator.isDate(String(dueDate))) {
    throw new ApiError(400, "Invalid due date");
  }

  if (
    (assignedTo !== undefined || assignedUserName !== undefined) &&
    !isAdmin
  ) {
    throw new ApiError(403, "Only admin can assign tasks");
  }

  const resolvedAssignedTo = isAdmin
    ? await resolveAssignedUserId({ assignedTo, assignedUserName })
    : undefined;

  if (title !== undefined) task.title = String(title).trim();
  if (description !== undefined) task.description = String(description).trim();
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (resolvedAssignedTo !== undefined) task.assignedTo = resolvedAssignedTo;

  const updatedTask = await task.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

export const deleteTask = asyncHandeler(async (req, res) => {
  const user = req.user;
  if (!user?._id) throw new ApiError(401, "User Authentication required");

  const { taskId } = req.params;
  ensureValidTaskId(taskId);

  const task = await Task.findOne({ _id: taskId, isDeleted: false });
  if (!task) throw new ApiError(404, "Task not found");

  const isAdmin = user.userType === "admin";
  const isOwner = String(task.createdBy) === String(user._id);

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, "User not allowed to perform deletion");
  }

  task.isDeleted = true;
  await task.save();

  return res
    .status(200)
    .json(new ApiResponse(200, task, "task deleted successfully"));
});

export const getTaskById = asyncHandeler(async (req, res) => {
  const { taskId } = req.params;
  const user = req.user;
  ensureValidTaskId(taskId);

  if (!user) {
    throw new ApiError(401, "User Authetication required");
  }
  const task = await Task.findOne({ _id: taskId, isDeleted: false });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }
  const isAllowed =
    String(user._id) === String(task.createdBy) ||
    user.userType === "admin" ||
    String(task.assignedTo) === String(user._id);

  if (!isAllowed) {
    throw new ApiError(403, "User not allowed to view the task");
  }
  return res.status(200).json(new ApiResponse(200, task, "task fetched"));
});

export const getMyTasks = asyncHandeler(async (req, res) => {
  const user = req.user;
  const {
    status,
    priority,
    search,
    fromDate,
    toDate,
    userId,
    page = 1,
    limit = 10,
  } = req.query;
  if (!user?._id) {
    throw new ApiError(401, "User Authentication required");
  }

  if (status && !allowedStatus.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  if (priority && !allowedPriority.includes(priority)) {
    throw new ApiError(400, "Invalid priority");
  }

  if (fromDate && !validator.isDate(String(fromDate))) {
    throw new ApiError(400, "Invalid fromDate");
  }

  if (toDate && !validator.isDate(String(toDate))) {
    throw new ApiError(400, "Invalid toDate");
  }

  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    throw new ApiError(400, "fromDate cannot be after toDate");
  }

  const andConditions = [{ isDeleted: false }];

  if (user.userType !== "admin") {
    andConditions.push({
      $or: [{ createdBy: user._id }, { assignedTo: user._id }],
    });
  } else if (userId) {
    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      throw new ApiError(400, "Invalid userId filter");
    }

    andConditions.push({
      $or: [{ createdBy: userId }, { assignedTo: userId }],
    });
  }

  if (status) andConditions.push({ status });
  if (priority) andConditions.push({ priority });

  if (search) {
    andConditions.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (fromDate || toDate) {
    const dueDateFilter = {};
    if (fromDate) dueDateFilter.$gte = new Date(fromDate);
    if (toDate) dueDateFilter.$lte = new Date(toDate);
    andConditions.push({ dueDate: dueDateFilter });
  }

  const query =
    andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

  const pageNum = Number.isInteger(Number(page))
    ? Math.max(1, Number(page))
    : 1;
  const limitNum = Number.isInteger(Number(limit))
    ? Math.min(100, Math.max(1, Number(limit)))
    : 10;
  const skip = limitNum * (pageNum - 1);

  const [tasks, total] = await Promise.all([
    Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Task.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tasks,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Tasks fetched successfully",
    ),
  );
});

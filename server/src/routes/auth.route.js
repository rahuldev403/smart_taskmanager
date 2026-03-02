import express from "express";
import {
  register,
  refresh,
  logIn,
  logOut,
} from "../controllers/auth.controller.js";
import rateLimit from "express-rate-limit";
import { requireAdmin, requireAuth } from "../middlewares/authMiddleware.js";
import ApiResponse from "../utils/ApiResponse.js";

const authRouter = express.Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "too many login attempts, try again later",
});

authRouter.post("/register", register);
authRouter.post("/refresh", refresh);
authRouter.post("/login", authLimiter, logIn);
authRouter.post("/logout", logOut);

authRouter.get("/me", requireAuth, (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Authenticated user"));
});

authRouter.get("/admin", requireAuth, requireAdmin, (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Welcome admin"));
});

export default authRouter;

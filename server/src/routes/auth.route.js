import express from "express";
import {
  register,
  refresh,
  logIn,
  logOut,
} from "../controllers/auth.controller.js";
import rateLimit from "express-rate-limit";

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

export default authRouter;

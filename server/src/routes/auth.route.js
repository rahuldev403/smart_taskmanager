import express from "express";
import {
  register,
  refresh,
  logIn,
  logOut,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/refresh", refresh);
authRouter.post("/login", logIn);
authRouter.post("/logout", logOut);

export default authRouter;

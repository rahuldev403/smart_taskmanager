import express from "express";
import "dotenv/config";
import authRouter from "./src/routes/auth.route.js";
import taskRouter from "./src/routes/task.route.js";
import cookieParser from "cookie-parser";
import connectDb from "./src/config/db.js";
import rateLimit from "express-rate-limit";
import cors from "cors";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "too many requests,please try again later",
});

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(globalLimiter);

const port = process.env.PORT || 5000;

app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
  });
});

app.listen(port, () => {
  console.log(`app is running on port:http://localhost:${port} 🐦`);
  connectDb();
});

import express from "express";
import "dotenv/config";
import authRouter from "./src/routes/auth.route.js";
import cookieParser from "cookie-parser";
import connectDb from "./src/config/db.js";


const app = express();

app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 5000;

app.use("/api/auth", authRouter);

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
  console.log(`app is running on port:http://localhost:${port}🐦`);
  connectDb()
});

import mongoose from "mongoose";
import asyncHandeler from "../utils/asyncHandler.js";

const connectDb = asyncHandeler(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("mogodb connected successfully 🏪");
});

export default connectDb;

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import isStrongPassword from "validator/lib/isStrongPassword.js";
import isEmail from "validator/lib/isEmail.js";

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (value) => isEmail(value),
      message: "email is not valid",
    },
  },
  password: {
    type: String,
    required: true,
    validate: {
      validator: (value) => isStrongPassword(value),
      message: "password is not strong enough",
    },
  },
  userType: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
    required: true,
  },
  refreshToken: {
    type: String,
  },
});

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { userId: this._id, role: this.userType },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
    },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { userId: this._id, role: this.userType },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

const User = mongoose.model("User", userSchema);

export default User;

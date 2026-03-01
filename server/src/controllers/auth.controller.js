import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandeler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";

export const refresh = asyncHandeler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(404, "no refreshToken");
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken != refreshToken) {
    throw new ApiError(403, "invalid refreshtoken");
  }

  const newAccessToken = user.generateAccessToken();
  const isProduction = process.env.NODE_ENV == "production";

  const accessTokenOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    maxAge: 15 * 60 * 1000,
  };

  return res
    .cookie("accessToken", newAccessToken, accessTokenOptions)
    .json(new ApiResponse(200, null, "accesstoken refresh successfull"));
});
export const register = asyncHandeler(async (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    throw new ApiError(400, "all fields are required");
  }

  if (!validator.isEmail(email)) {
    throw new ApiError(400, "invalid email format");
  }

  if (!validator.isStrongPassword(password)) {
    throw new ApiError(400, "password is not strong");
  }

  const user = await User.findOne({ email });
  
  if (user) {
    throw new ApiError(400, "user already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    userName,
    email,
    password: hashedPassword,
  });

  const accessToken = newUser.generateAccessToken();
  const refreshToken = newUser.generateRefreshToken();
  const isProduction = process.env.NODE_ENV === "production";

  const accessTokenCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    maxAge: 15 * 60 * 1000,
  };

  const refreshTokenCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  newUser.refreshToken = refreshToken;
  await newUser.save({ validateBeforeSave: false });

  const safeUser = newUser.toObject();
  delete safeUser.password;
  delete safeUser.refreshToken;

  return res
    .status(201)
    .cookie("accessToken", accessToken, accessTokenCookieOptions)
    .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: safeUser,
        },
        "user registered successfully",
      ),
    );
});

export const logIn = asyncHandeler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "all feilds are required");
  }

  if (!validator.isEmail(email)) {
    throw new ApiError(400, "invalid email format");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "user not found");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "invalid credentials");
  }

  const accessToken = user.generateAccessToken();
  const refreshtoken = user.generateRefreshToken();
  user.refreshToken = refreshtoken;
  await user.save({ validateBeforeSave: false });

  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.refreshToken;

  const isProduction = process.env.NODE_ENV == "production";

  const accessTokenOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    maxAge: 15 * 60 * 1000,
  };
  const refreshTokenOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("refreshToken", refreshtoken, refreshTokenOptions)
    .json(new ApiResponse(200, safeUser, "user signin successfully"));
});

export const logOut = asyncHandeler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.userId, {
        refreshToken: null,
      });
    } catch (error) {}
  }

  return res
    .status(200)
    .clearCookie("refreshToken")
    .clearCookie("accessToken")
    .json(new ApiResponse(200, null, "user loggedout successfully"));
});

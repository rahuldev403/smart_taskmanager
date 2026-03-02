import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandeler from "../utils/asyncHandler.js";

export const requireAuth = asyncHandeler(async (req, res, next) => {
  const accessTokenFromCookie = req.cookies?.accessToken;
  const accessTokenFromHeader = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  const accessToken = accessTokenFromCookie || accessTokenFromHeader;

  if (!accessToken) {
    throw new ApiError(401, "Authentication required");
  }

  let decoded;
  try {
    decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await User.findById(decoded.userId).select(
    "_id userName email userType",
  );
  
  if (!user) throw new ApiError(401, "User no longer exists");

  req.user = user;
  next();
});

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return next(new ApiError(403, "Forbidden: insufficient role"));
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");

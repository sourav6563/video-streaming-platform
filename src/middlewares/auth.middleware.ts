import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { env } from "../env";
import { userModel } from "../models/user.model";

const verifyToken = asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
  // here if you use headers its case sensative so than we have to use small letter
  const token = req.cookies?.accessToken || req.header("authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "unauthorized");
  }

  try {
    const decodedToken = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;

    const user = await userModel.findById(decodedToken._id).select("-password -refreshToken");
    if (!user) {
      throw new ApiError(401, "unauthorized");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, (error as Error)?.message || "invalid accessToken");
  }
});

export { verifyToken };

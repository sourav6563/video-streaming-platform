import { Types } from "mongoose";
import { userModel } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { asyncHandler } from "../utils/asyncHandler";
import { apiResponse } from "../utils/apiResponse";
import { sendEmail } from "../email/mailer";
import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../env";
import jwt from "jsonwebtoken";

export const generateToken = async (userId: string | Types.ObjectId) => {
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Error in generateAccessAndRefreshToken:", error);
    throw new ApiError(500, "something went wrong while generating access and refresh token");
  }
};

export const checkUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.query;

  const existingVerifiedUser = await userModel.findOne({
    username,
    isVerified: true,
  });

  return res.status(200).json(
    new apiResponse(
      200,
      existingVerifiedUser ? "Username is already taken" : "Username is available",
      {
        available: !existingVerifiedUser,
      },
    ),
  );
});

export const signUpUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, username, password } = req.body;

  const userByEmail = await userModel.findOne({ email });
  const userByUsername = await userModel.findOne({ username });

  if (
    userByEmail &&
    userByUsername &&
    userByEmail._id.toString() !== userByUsername._id.toString()
  ) {
    throw new ApiError(409, "Email and username belong to different accounts");
  }

  if (userByEmail?.isVerified) {
    throw new ApiError(409, "Email already exists");
  }

  if (userByUsername?.isVerified) {
    throw new ApiError(409, "Username already exists");
  }

  const verifyCode = crypto.randomInt(100000, 1000000).toString();
  const verifyExpiry = new Date(Date.now() + 15 * 60 * 1000);

  const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name,
  )}&background=random`;

  const user = userByEmail || userByUsername;
  if (user) {
    user.name = name;
    user.email = email;
    user.username = username;
    user.password = password;
    user.profileImage = defaultImage;
    user.emailVerificationCode = verifyCode;
    user.emailVerificationExpires = verifyExpiry;

    await user.save();
  } else {
    await userModel.create({
      name,
      email,
      username,
      password,
      profileImage: defaultImage,
      isVerified: false,
      emailVerificationCode: verifyCode,
      emailVerificationExpires: verifyExpiry,
    });
  }

  const mail = await sendEmail("VERIFY", email, username, verifyCode);
  if (!mail.success) {
    throw new ApiError(500, "Failed to send verification email");
  }

  return res.status(201).json(new apiResponse(201, "User registered. Please verify your email"));
});

export const verifyAccount = asyncHandler(async (req: Request, res: Response) => {
  const { code, email } = req.body;
  console.log(email, code);

  const user = await userModel.findOne({ email: email });
  console.log(user);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified) {
    throw new ApiError(400, "User already verified");
  }

  const isCodeValid = user.emailVerificationCode === code;
  const isCodeNotExpired =
    user.emailVerificationExpires && new Date(user.emailVerificationExpires) > new Date();

  if (!isCodeNotExpired) {
    throw new ApiError(400, "Verification code expired. Please sign up again");
  }

  if (!isCodeValid) {
    throw new ApiError(400, "Invalid verification code");
  }

  user.isVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new apiResponse(200, "Email verified successfully"));
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const user = await userModel.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  });

  if (!user || !user.isVerified) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateToken(user._id);
  const loggedInUser = await userModel.findById(user._id).select("-password -refreshToken");
  if (!loggedInUser) {
    throw new ApiError(500, "something went wrong while logging in user");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new apiResponse(200, "User logged in successfully", loggedInUser));
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.header("authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken) {
    throw new ApiError(401, "UNAUTHORIZED");
  }

  let decodedToken: jwt.JwtPayload;

  try {
    decodedToken = jwt.verify(incomingRefreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN");
  }

  const user = await userModel.findById(decodedToken._id);

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN");
  }

  const { accessToken, refreshToken } = await generateToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new apiResponse(200, "Access token refreshed successfully"));
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.user?._id;
  if (!id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await userModel.findByIdAndUpdate(
    id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true },
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new apiResponse(200, "User logged out successfully"));
});
export const getUserInfo = asyncHandler(async (req, res) => {
  return res.status(200).json(new apiResponse(200, "User details fetched successfully", req.user));
});
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const user = await userModel.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "update password failed User not found");
  }

  const ispasswordValidated = await user?.isPasswordCorrect(oldPassword);

  if (!ispasswordValidated) {
    throw new ApiError(401, "old password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new apiResponse(200, "Password changed successfully"));
});
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await userModel.findOne({ email });

  // if (!user) {
  //   throw new ApiError(404, "User not found");
  // }

  if (!user || !user.isVerified) {
    throw new ApiError(400, "User not found");
  }

  const resetCode = crypto.randomInt(100000, 1000000).toString();
  const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.passwordResetCode = resetCode;
  user.passwordResetExpires = resetExpiry;

  await user.save({ validateBeforeSave: false });

  const mail = await sendEmail("RESET", user.email, user.username, resetCode);

  if (!mail.success) {
    throw new ApiError(500, "Failed to send reset password email");
  }

  return res.status(200).json(new apiResponse(200, "Password reset code sent to your email"));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  const user = await userModel.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isCodeValid = user.passwordResetCode === code;
  const isCodeNotExpired =
    user.passwordResetExpires && new Date(user.passwordResetExpires) > new Date();

  if (!isCodeNotExpired) {
    throw new ApiError(400, "Reset code expired. Please try again");
  }

  if (!isCodeValid) {
    throw new ApiError(400, "Invalid reset code");
  }

  user.password = newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;

  await user.save({ validateBeforeSave: false });
  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new apiResponse(200, "Password reset successful. Please login again"));
});

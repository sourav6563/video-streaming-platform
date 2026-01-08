import { Types } from "mongoose";
import { userModel } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { asyncHandler } from "../utils/asyncHandler";
import { apiResponse } from "../utils/apiResponse";
import { sendEmail } from "../utils/mailer";
import crypto from "crypto";

export const generateAccessAndRefreshToken = async (userId: string | Types.ObjectId) => {
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

export const signUpUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  const userByEmail = await userModel.findOne({ email });
  const userByUsername = await userModel.findOne({ username });

  if (
    userByEmail &&
    userByUsername &&
    userByEmail._id.toString() !== userByUsername._id.toString()
  ) {
    throw new ApiError(409, "Email and username belong to different accounts");
  }

  if (userByEmail?.isEmailVerified) {
    throw new ApiError(409, "Email already exists");
  }

  if (userByUsername?.isEmailVerified) {
    throw new ApiError(409, "Username already exists");
  }

  const verifyCode = crypto.randomInt(100000, 1000000).toString();
  const verifyExpiry = new Date(Date.now() + 60 * 60 * 1000);

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullname,
  )}&background=random`;

  const user = userByEmail || userByUsername;
  if (user) {
    user.fullname = fullname;
    user.email = email;
    user.username = username;
    user.password = password;
    user.profileImage = defaultAvatar;
    user.emailVerificationCode = verifyCode;
    user.emailVerificationExpires = verifyExpiry;

    await user.save();
  } else {
    await userModel.create({
      fullname,
      email,
      username,
      password,
      profileImage: defaultAvatar,
      isEmailVerified: false,
      emailVerificationCode: verifyCode,
      emailVerificationExpires: verifyExpiry,
    });
  }

  const mail = await sendEmail("VERIFY", email, username, verifyCode);
  if (!mail.success) {
    throw new ApiError(500, "Failed to send verification email");
  }

  return res.status(201).json(new apiResponse(201, "User registered. Please verify your email."));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await userModel.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  });

  if (!user || !user.isEmailVerified) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new apiResponse(200, "User logged in successfully"));
});

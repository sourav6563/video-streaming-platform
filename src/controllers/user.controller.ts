import { Types } from "mongoose";
import { userModel } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { asyncHandler } from "../utils/asyncHandler";
import { apiResponse } from "../utils/apiResponse";
import { sendEmail } from "../mail/mailer";
import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../config/env";
import jwt from "jsonwebtoken";
import { unlink } from "fs/promises";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary";

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

export const isUsernameAvailable = asyncHandler(async (req: Request, res: Response) => {
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

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new apiResponse(200, "User details fetched successfully", req.user));
});

export const updateName = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  const user = await userModel
    .findByIdAndUpdate(req.user?._id, { $set: { name: name } }, { new: true })
    .select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "Name update failed User not found");
  }
  return res.status(200).json(new apiResponse(200, "Name updated successfully", user));
});

export const updateEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const existingUser = await userModel.findOne({
    email: email,
    _id: { $ne: req.user?._id },
  });

  if (existingUser) {
    throw new ApiError(409, "Email is already in use");
  }

  const user = await userModel
    .findByIdAndUpdate(req.user?._id, { $set: { email: email } }, { new: true })
    .select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "Email update failed User not found");
  }

  return res.status(200).json(new apiResponse(200, "Email updated successfully", user));
});

export const updateProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const profileImageLocalpath = req.file?.path;

  if (!profileImageLocalpath) {
    throw new ApiError(400, "profileImage file is required");
  }

  let profileImage = null;

  try {
    const allowedImageTypes = ["image/jpeg", "image/png"];

    if (!allowedImageTypes.includes(req.file!.mimetype)) {
      throw new ApiError(400, "Invalid profileImage file");
    }

    profileImage = await uploadOnCloudinary(profileImageLocalpath);

    if (!profileImage?.url) {
      throw new ApiError(500, "profileImage upload failed");
    }

    const user = await userModel
      .findByIdAndUpdate(req.user?._id, { $set: { profileImage: profileImage.url } }, { new: true })
      .select("-password -refreshToken");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new apiResponse(200, "User profileImage updated successfully", user));
  } catch (error) {
    if (profileImage?.public_id) {
      await deleteOnCloudinary(profileImage.public_id).catch(() => {});
    }
    throw error;
  } finally {
    await unlink(profileImageLocalpath).catch(() => {});
  }
});

export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
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

export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const myId = req.user?._id;

  if (!username?.trim()) {
    throw new ApiError(400, "username is required");
  }

  const profile = await userModel.aggregate([
    // 1. find the user
    {
      $match: {
        username: username.trim().toLowerCase(),
      },
    },

    // 2. who follows this user (followers)
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "following",
        as: "followers",
      },
    },

    // 3. whom this user follows (following)
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "follower",
        as: "following",
      },
    },

    // 4. add computed fields
    {
      $addFields: {
        followersCount: { $size: "$followers" },
        followingCount: { $size: "$following" },

        isFollowedByMe: {
          $cond: {
            if: { $in: [myId, "$followers.follower"] },
            then: true,
            else: false,
          },
        },
      },
    },

    // 5. remove heavy arrays if not needed
    {
      $project: {
        password: 0,
        refreshToken: 0,
        emailVerificationCode: 0,
        emailVerificationExpires: 0,
        passwordResetCode: 0,
        passwordResetExpires: 0,
        followers: 0,
        following: 0,
      },
    },
  ]);

  if (!profile.length) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new apiResponse(200, profile[0], "User profile fetched successfully"));
});

export const getWatchHistory = asyncHandler(async (req: Request, res: Response) => {
  const myId = req.user?._id;

  const userWithHistory = await userModel.aggregate([
    {
      $match: {
        _id: myId,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    profileimage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  // The aggregation pipeline returns an array, even if only one document is matched.
  // We check if the array is empty, which means the user was not found.
  if (!userWithHistory?.length) {
    throw new ApiError(404, "User not found or watch history is empty");
  }

  // Access the first (and only) element of the array to get the user document,
  // then extract the watchHistory from it.
  return res
    .status(200)
    .json(
      new apiResponse(200, "Watch history fetched successfully", userWithHistory[0].watchHistory),
    );
});

// console.log(__TS_CHECK_WORKING);

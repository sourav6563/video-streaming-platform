import { Video } from "../models/video.model";
import { ApiError } from "../utils/apiError";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { logger } from "../utils/logger";

export const getVideos = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const videos = await Video.find({ owner: userId })
      .sort({ createdAt: -1 }) // newest first
      .populate("owner", "username fullname profileImage");

    return res.status(200).json(new apiResponse(200, "User videos fetched successfully", videos));
  } catch (error) {
    logger.error("getUserVideos error:", error);
    throw new ApiError(500, "Failed to fetch user videos");
  }
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Video } from "../models/video.model";
import { ApiError } from "../utils/apiError";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary";
import { logger } from "../utils/logger";
import { Request, Response } from "express";
import { unlink } from "fs/promises";
import { VideoQuery } from "../validators/video.validator";

export const uploadVideo = asyncHandler(async (req: Request, res: Response) => {
  const owner = req.user?._id;
  const { title, description } = req.body;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const videoFile = files?.video?.[0];
  const thumbnailFile = files?.thumbnail?.[0];

  if (!videoFile?.path) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailFile?.path) {
    throw new ApiError(400, "Thumbnail file is required");
  }
  let videoUploadResult = null;
  let thumbnailUploadResult = null;

  try {
    const allowedVideoTypes = ["video/mp4", "video/mpeg"];
    const allowedImageTypes = ["image/jpeg", "image/png"];
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const maxThumbnailSize = 5 * 1024 * 1024; // 5MB

    if (!allowedVideoTypes.includes(videoFile.mimetype)) {
      throw new ApiError(400, "Invalid video file type. Only mp4 or mpeg allowed.");
    }

    if (!allowedImageTypes.includes(thumbnailFile.mimetype)) {
      throw new ApiError(400, "Invalid thumbnail type. Only jpeg or png allowed.");
    }

    if (videoFile.size > maxVideoSize) {
      throw new ApiError(400, "Video file exceeds 100MB size limit");
    }

    if (thumbnailFile.size > maxThumbnailSize) {
      throw new ApiError(400, "Thumbnail exceeds 5MB size limit");
    }

    [videoUploadResult, thumbnailUploadResult] = await Promise.all([
      uploadOnCloudinary(videoFile.path).catch((err) => {
        logger.error("Cloudinary video upload failed:", err);
        throw new ApiError(500, "Failed to upload video");
      }),

      uploadOnCloudinary(thumbnailFile.path).catch((err) => {
        logger.error("Cloudinary thumbnail upload failed:", err);
        throw new ApiError(500, "Failed to upload thumbnail");
      }),
    ]);

    if (!videoUploadResult?.url || !thumbnailUploadResult?.url) {
      throw new ApiError(500, "File upload failed");
    }
    logger.info(
      `User ${owner} uploaded files: video=${videoUploadResult.url}, thumbnail=${thumbnailUploadResult.url}`,
    );

    const newVideo = await Video.create({
      owner,
      videoFile: {
        url: videoUploadResult.url,
        public_id: videoUploadResult.public_id,
      },
      thumbnail: {
        url: thumbnailUploadResult.url,
        public_id: thumbnailUploadResult.public_id,
      },
      title,
      description,
      duration: videoUploadResult.duration, // Auto-from Cloudinary
      isPublished: false,
    });
    const createdVideo = await Video.findById(newVideo._id).populate(
      "owner",
      "username name profileImage",
    );

    if (!createdVideo) {
      throw new ApiError(500, "Video saved but failed to retrieve");
    }

    return res.status(201).json(new apiResponse(201, "Video uploaded successfully", createdVideo));
  } catch (error: any) {
    logger.error("uploadVideo error:", error.message);

    if (videoUploadResult?.public_id) {
      await deleteOnCloudinary(videoUploadResult.public_id).catch(() => {});
    }

    if (thumbnailUploadResult?.public_id) {
      await deleteOnCloudinary(thumbnailUploadResult.public_id).catch(() => {});
    }
    throw error;
  } finally {
    if (videoFile?.path) await unlink(videoFile.path).catch(() => {});
    if (thumbnailFile?.path) await unlink(thumbnailFile.path).catch(() => {});
  }
});

export const getAllVideos = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, query, sortBy, sortOrder } = req.query as unknown as VideoQuery;

  const filter: any = { isPublished: true };

  if (query) {
    filter.$text = { $search: query };
  }

  const sortOptions: any = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  if (query) {
    sortOptions.score = { $meta: "textScore" };
  }

  const aggregate = Video.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { username: 1, name: 1, profileImage: 1 } }],
      },
    },
    { $addFields: { owner: { $first: "$owner" } } },
    { $sort: sortOptions },
  ]);

  const results = await Video.aggregatePaginate(aggregate, {
    page,
    limit,
  });

  return res.status(200).json(new apiResponse(200, results, "Videos fetched"));
});

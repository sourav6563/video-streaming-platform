import { Request, Response } from "express";
import { Like } from "../models/like.model";
import { Video } from "../models/video.model"; // Importing Video model to verify existence
import { ApiError } from "../utils/apiError";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Comment } from "../models/comment.model";
import { CommunityPost } from "../models/communityPost.model";

export const toggleVideoLike = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;

  const userId = req.user?._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Single DB call: delete if exists, otherwise returns null
  const deletedLike = await Like.findOneAndDelete({
    video: videoId,
    likedBy: userId,
  });

  if (deletedLike) {
    return res
      .status(200)
      .json(new apiResponse(200, "Video unliked successfully", { isLiked: false }));
  }

  await Like.create({
    video: videoId,
    likedBy: userId,
  });

  return res.status(200).json(new apiResponse(200, "Video liked successfully", { isLiked: true }));
});

export const toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
  const { commentId } = req.params;

  const userId = req.user?._id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const deletedLike = await Like.findOneAndDelete({
    comment: commentId,
    likedBy: userId,
  });

  if (deletedLike) {
    return res
      .status(200)
      .json(new apiResponse(200, "Comment unliked successfully", { isLiked: false }));
  }

  await Like.create({
    comment: commentId,
    likedBy: userId,
  });

  return res
    .status(200)
    .json(new apiResponse(200, "Comment liked successfully", { isLiked: true }));
});

export const toggleCommunityPostLike = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?._id;

  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new ApiError(404, "Community post not found");
  }

  const deletedLike = await Like.findOneAndDelete({
    communityPost: postId,
    likedBy: userId,
  });

  if (deletedLike) {
    return res
      .status(200)
      .json(new apiResponse(200, "Post unliked successfully", { isLiked: false }));
  }

  await Like.create({
    communityPost: postId,
    likedBy: userId,
  });

  return res.status(200).json(new apiResponse(200, "Post liked successfully", { isLiked: true }));
});

export const getLikedVideos = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  const likedVideos = await Like.aggregate([
    // 1. Find all likes by this user
    {
      $match: {
        likedBy: userId,
      },
    },
    // 2. Lookup the video details
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $match: { isPublished: true }, // OPTIONAL: Filter out unpublished/deleted videos
          },
          // 3. Lookup the owner of the video (Nested Lookup)
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    name: 1,
                    profileImage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    // 4. Unwind the video array (removes likes on deleted videos that returned empty arrays)
    {
      $unwind: "$likedVideo",
    },
    // 5. Clean Projection (Matches getAllVideos format)
    {
      $project: {
        _id: "$likedVideo._id",
        owner: "$likedVideo.owner",
        title: "$likedVideo.title",
        description: "$likedVideo.description",
        views: "$likedVideo.views",
        duration: "$likedVideo.duration",
        createdAt: "$likedVideo.createdAt",
        isPublished: "$likedVideo.isPublished",
        // Flatten the Cloudinary objects to just URLs
        videoFile: "$likedVideo.videoFile.url",
        thumbnail: "$likedVideo.thumbnail.url",
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, "Liked videos fetched successfully", likedVideos));
});

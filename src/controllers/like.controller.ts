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
    throw new ApiError(404, " Invalid Id Video not found");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(new apiResponse(200, "Video unliked successfully", { isLiked: false }));
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(new apiResponse(200, "Video liked successfully", { isLiked: true }));
  }
});

export const toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
  const { commentId } = req.params;

  const userId = req.user?._id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Invalid Id Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(new apiResponse(200, "Comment unliked successfully", { isLiked: false }));
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });

    return res
      .status(200)
      .json(new apiResponse(200, "Comment liked successfully", { isLiked: true }));
  }
});

export const toggleCommunityPostLike = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?._id;

  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new ApiError(404, " Invalid Id Community post not found");
  }

  const existingLike = await Like.findOne({
    communityPost: postId,
    likedBy: userId,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(new apiResponse(200, "Post unliked successfully", { isLiked: false }));
  } else {
    await Like.create({
      communityPost: postId,
      likedBy: userId,
    });

    return res.status(200).json(new apiResponse(200, "Post liked successfully", { isLiked: true }));
  }
});

export const getLikedVideos = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
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
                    username: 1,
                    fullname: 1,
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
    {
      $unwind: "$video",
    },
    {
      $replaceRoot: { newRoot: "$video" },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, "Liked videos fetched successfully", likedVideos));
});

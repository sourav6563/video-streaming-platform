import { Request, Response } from "express";
import { Playlist } from "../models/playlist.model";
import { ApiError } from "../utils/apiError";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Video } from "../models/video.model";
import { userModel } from "../models/user.model";

export const createPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user?._id;

  const playlist = await Playlist.create({
    name,
    description: description || "",
    owner: userId,
    videos: [],
  });

  if (!playlist) {
    throw new ApiError(500, "Failed to create playlist");
  }

  return res.status(201).json(new apiResponse(201, "Playlist created successfully", playlist));
});

export const getMyPlaylists = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const aggregate = Playlist.aggregate([
    {
      $match: {
        owner: userId, // Only MY playlists
      },
    },
    {
      $sort: {
        createdAt: -1, // Newest first
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        totalVideos: { $size: "$videos" },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  };

  const playlists = await Playlist.aggregatePaginate(aggregate, options);

  return res.status(200).json(new apiResponse(200, "playlists fetched successfully", playlists));
});

export const updatePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?._id;

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.owner.equals(userId)) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  playlist.name = name;
  playlist.description = description || "";
  await playlist.save();

  return res.status(200).json(new apiResponse(200, "Playlist updated successfully", playlist));
});

export const deletePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId } = req.params;
  const userId = req.user?._id;
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.owner.equals(userId)) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await playlist.deleteOne();

  return res.status(200).json(new apiResponse(200, "Playlist deleted successfully"));
});

export const addVideoToPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.owner.equals(userId)) {
    throw new ApiError(403, "You are not authorized to add videos to this playlist");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // We use $addToSet. If video is already there, it does nothing.
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { videos: videoId },
    },
    { new: true },
  );

  return res
    .status(200)
    .json(new apiResponse(200, "Video added to playlist successfully", updatedPlaylist));
});

export const removeVideoFromPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.owner.equals(userId)) {
    throw new ApiError(403, "You are not authorized to remove videos from this playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { videos: videoId },
    },
    { new: true },
  );

  return res
    .status(200)
    .json(new apiResponse(200, "Video removed from playlist successfully", updatedPlaylist));
});

export const getPlaylistById = asyncHandler(async (req: Request, res: Response) => {
  const { playlistId } = req.params;

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const playlistDetails = await Playlist.aggregate([
    {
      $match: {
        _id: playlist._id,
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $match: { isPublished: true },
          },
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
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, "Playlist fetched successfully", playlistDetails[0]));
});

export const getUserPlaylists = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await userModel.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: user._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [{ $match: { isPublished: true } }, { $project: { thumbnail: 1 } }],
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        playlistThumbnail: { $first: "$videos.thumbnail" },
      },
    },
    {
      $project: {
        videos: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, "User playlists fetched successfully", playlists));
});

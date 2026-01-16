import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.middleware";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { PlaylistSchema } from "../validators/playlist.validator";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller";

const router = Router();
router.use(authenticate);

router
  .post("/", validate(PlaylistSchema, ValidationSource.BODY), createPlaylist)
  .get("/:playlistId", getPlaylistById)
  .patch("/:playlistId", validate(PlaylistSchema, ValidationSource.BODY), updatePlaylist)
  .delete("/:playlistId", deletePlaylist);

// Video management in playlist
router.post("/:playlistId/videos/:videoId", addVideoToPlaylist);
router.delete("/:playlistId/videos/:videoId", removeVideoFromPlaylist);

// User playlists
router.get("/user/:userId", getUserPlaylists);

export default router;

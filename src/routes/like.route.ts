import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.middleware";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleCommunityPostLike,
  toggleVideoLike,
} from "../controllers/like.controller";

const router = Router();

router.route("/toggle-video-like/:videoId").get(authenticate, toggleVideoLike);
router.route("/toggle-comment-like/:commentId").get(authenticate, toggleCommentLike);
router.route("/toggle-community-post-like/:postId").get(authenticate, toggleCommunityPostLike);
router.route("/liked-videos").get(authenticate, getLikedVideos);

export default router;

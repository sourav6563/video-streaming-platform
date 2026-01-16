import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.middleware";
import {
  addPostComment,
  addVideoComment,
  deleteComment,
  getPostComments,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { commentContentSchema } from "../validators/comment.validator";

const router = Router();

router
  .route("/video-comments/:videoId")
  .get(authenticate, getVideoComments)
  .post(authenticate, validate(commentContentSchema, ValidationSource.BODY), addVideoComment);

router
  .route("/post-comments/:postId")
  .get(authenticate, getPostComments)
  .post(authenticate, validate(commentContentSchema, ValidationSource.BODY), addPostComment);

router
  .route("/c/:commentId")
  .patch(authenticate, validate(commentContentSchema, ValidationSource.BODY), updateComment)
  .delete(authenticate, deleteComment);

export default router;

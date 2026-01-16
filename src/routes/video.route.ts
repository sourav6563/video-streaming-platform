import { Router } from "express";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import {
  uploadVideoSchema,
  videoQuerySchema,
  videoUpdateDetailsSchema,
} from "../validators/video.validator";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  togglePublishStatus,
  updateVideoDetails,
  uploadVideo,
} from "../controllers/video.controller";
import { upload } from "../middlewares/multer.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();
router.use(authenticate);
//get all videos
router.route("/").get(validate(videoQuerySchema, ValidationSource.QUERY), getAllVideos);
//upload video
router.route("/upload").post(
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  validate(uploadVideoSchema, ValidationSource.BODY),
  uploadVideo,
);
//fetch video/update/delete by Id
router
  .route("/:videoId")
  .get(getVideoById)
  .patch(validate(videoUpdateDetailsSchema, ValidationSource.BODY), updateVideoDetails)
  .delete(deleteVideo);

//toggle video status
router.route("/toggle-publish/:videoId").patch(togglePublishStatus);

export default router;

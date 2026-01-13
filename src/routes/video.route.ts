import { Router } from "express";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { uploadVideoSchema, videoQuerySchema } from "../validators/video.validator";
import { getAllVideos, uploadVideo } from "../controllers/video.controller";
import { upload } from "../middlewares/multer.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";

const router = Router();

router
  .route("/")
  .get(authenticate, validate(videoQuerySchema, ValidationSource.QUERY), getAllVideos);

router.route("/upload-video").post(
  authenticate,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  validate(uploadVideoSchema, ValidationSource.BODY),
  uploadVideo,
);

export default router;

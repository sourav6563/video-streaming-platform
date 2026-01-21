import { Router } from "express";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";
import { upload } from "../middlewares/multer.middleware";
import {
  getUserProfile,
  getWatchHistory,
  updateEmail,
  updateName,
  updateProfileImage,
} from "../controllers/user.controller";
import {
  updateEmailSchema,
  updateNameSchema,
  userProfileSchema,
} from "../validators/user.validator";

const router = Router();
router.use(authenticate);
router.route("/name").patch(validate(updateNameSchema, ValidationSource.BODY), updateName);

router.route("/email").patch(validate(updateEmailSchema, ValidationSource.BODY), updateEmail);

router.route("/profileimage").patch(upload.single("profileImage"), updateProfileImage);

router
  .route("/u/:username")
  .get(validate(userProfileSchema, ValidationSource.PARAM), getUserProfile);

router.route("/history").get(authenticate, getWatchHistory);

export default router;

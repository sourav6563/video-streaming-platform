import { Router } from "express";
import {
  forgotPassword,
  getCurrentUser,
  getUserProfile,
  getWatchHistory,
  isUsernameAvailable,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resetPassword,
  signUpUser,
  updateEmail,
  updateName,
  updatePassword,
  updateProfileImage,
  verifyAccount,
} from "../controllers/user.controller";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import {
  checkUsernameQuerySchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
  updateEmailSchema,
  updateNameSchema,
  updatePasswordSchema,
  userProfileSchema,
  verifyAccountSchema,
} from "../validators/user.validator";
import { verifyToken } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";
const router = Router();
router
  .route("/check-username")
  .get(validate(checkUsernameQuerySchema, ValidationSource.QUERY), isUsernameAvailable); // /username-availability?username="username").
router.route("/signup").post(validate(signUpSchema, ValidationSource.BODY), signUpUser);
router
  .route("/verify-account")
  .post(validate(verifyAccountSchema, ValidationSource.BODY), verifyAccount);

router.route("/login").post(validate(loginSchema, ValidationSource.BODY), loginUser);

router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").get(verifyToken, logoutUser);

router.route("/current-user").get(verifyToken, getCurrentUser);
router
  .route("/update-name")
  .patch(validate(updateNameSchema, ValidationSource.BODY), verifyToken, updateName);

router
  .route("/update-email")
  .patch(validate(updateEmailSchema, ValidationSource.BODY), verifyToken, updateEmail);

router
  .route("/update-profile-image")
  .patch(upload.single("profileImage"), verifyToken, updateProfileImage);

router
  .route("/update-password")
  .post(validate(updatePasswordSchema, ValidationSource.BODY), verifyToken, updatePassword);

router
  .route("/forgot-password")
  .post(validate(forgotPasswordSchema, ValidationSource.BODY),  forgotPassword);

router
  .route("/reset-password")
  .post(validate(resetPasswordSchema, ValidationSource.BODY),  resetPassword);

router
  .route("/user-profile/:username")
  .get(validate(userProfileSchema, ValidationSource.PARAM), verifyToken, getUserProfile);

router.route("/watch-history").get(verifyToken, getWatchHistory);

export default router;

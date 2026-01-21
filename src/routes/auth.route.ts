import { Router } from "express";
import {
  forgotPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resetPassword,
  signUpUser,
  verifyAccount,
  getUserInfo,
  changePassword,
  isUsernameAvailable,
} from "../controllers/auth.controller";
import {
  userNameAvailabilitySchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
  updatePasswordSchema,
  verifyAccountSchema,
} from "../validators/auth.validator";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";
import { isGuest } from "../middlewares/guest.middleware";

const router = Router();
//public route
router
  .route("/username-availability")
  .get(validate(userNameAvailabilitySchema, ValidationSource.QUERY), isUsernameAvailable);

router.route("/signup").post(isGuest, validate(signUpSchema, ValidationSource.BODY), signUpUser);

router
  .route("/verify-account")
  .post(isGuest, validate(verifyAccountSchema, ValidationSource.BODY), verifyAccount);

router.route("/login").post(isGuest, validate(loginSchema, ValidationSource.BODY), loginUser);

router.route("/refresh-token").post(refreshAccessToken);

router
  .route("/forgot-password")
  .post(validate(forgotPasswordSchema, ValidationSource.BODY), forgotPassword);

router
  .route("/reset-password")
  .post(validate(resetPasswordSchema, ValidationSource.BODY), resetPassword);

//private route
router.use(authenticate);
router.route("/info").get(getUserInfo);

router
  .route("/change-password")
  .post(validate(updatePasswordSchema, ValidationSource.BODY), changePassword);

router.route("/logout").post(logoutUser);

export default router;

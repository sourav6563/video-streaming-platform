import { Router } from "express";
import {
  forgotPassword,
  checkUsername,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resetPassword,
  signUpUser,
  verifyAccount,
  getUserInfo,
  changePassword,
} from "../controllers/auth.controller";
import {
  checkUsernameQuerySchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
  updatePasswordSchema,
  verifyAccountSchema,
} from "../validators/user.validator";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/authenticate.middleware";
import { isGuest } from "../middlewares/guest.middleware";

const router = Router();

router
  .route("/check-username")
  .get(validate(checkUsernameQuerySchema, ValidationSource.QUERY), checkUsername);

router.route("/signup").post(isGuest, validate(signUpSchema, ValidationSource.BODY), signUpUser);

router
  .route("/verify-account")
  .post(validate(verifyAccountSchema, ValidationSource.BODY), verifyAccount);

router.route("/login").post(isGuest, validate(loginSchema, ValidationSource.BODY), loginUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/logout").post(authenticate, logoutUser);

router.route("/userinfo").get(authenticate, getUserInfo);

router
  .route("/change-password")
  .post(validate(updatePasswordSchema, ValidationSource.BODY), authenticate, changePassword);

router
  .route("/forgot-password")
  .post(validate(forgotPasswordSchema, ValidationSource.BODY), forgotPassword);

router
  .route("/reset-password")
  .post(validate(resetPasswordSchema, ValidationSource.BODY), resetPassword);

export default router;

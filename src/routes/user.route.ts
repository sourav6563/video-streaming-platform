import { Router } from "express";
import { signUpUser } from "../controllers/user.controller";
import { validate, ValidationSource } from "../middlewares/validate.middleware";
import { signUpSchema } from "../schema/user.schema";
const router = Router();

router.route("/signup").post(validate(signUpSchema,ValidationSource.BODY),signUpUser);

export default router;

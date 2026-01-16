import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.middleware";
import {
  getUserFollowers,
  getUserFollowing,
  toggleFollow,
} from "../controllers/follower.controller";

const router = Router();
router.use(authenticate);

router.route("/toggle/:userId").post(toggleFollow);
router.route("/followers/:userId").get(getUserFollowers);
router.route("/following/:userId").get(getUserFollowing);

export default router;

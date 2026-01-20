import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.middleware";
import {
  getDashboardPlaylists,
  getDashboardStats,
  getDashboardVideos,
} from "../controllers/dashboard.controller";

const router = Router();
//get user videos
router.use(authenticate);
router.route("/stats").get(getDashboardStats);
router.route("/videos").get(getDashboardVideos);
router.route("/playlists").get(getDashboardPlaylists);

export default router;

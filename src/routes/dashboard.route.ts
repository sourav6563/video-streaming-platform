import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.middleware";
import { getVideos } from "../controllers/dashboard.controller";

const router = Router();
//get user videos
router.use(authenticate);
router.route("/videos").get(getVideos);

export default router;

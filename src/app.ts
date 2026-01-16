import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { logger } from "./utils/logger";
import { env } from "./env";
import "./database/db";
import healthCheckRouter from "./routes/healthcheck.route";
import { errorHandler } from "./middlewares/errorhandler.middware";
import userRouter from "./routes/user.route";
import authRouter from "./routes/auth.route";
import videoRouter from "./routes/video.route";
import likeRouter from "./routes/like.route";
import commentRouter from "./routes/comment.route";
import playlistRouter from "./routes/playlist.route";
import dashboardRouter from "./routes/dashboard.route";
const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  }),
);
//common middleware

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

app.use(errorHandler);
export { app };

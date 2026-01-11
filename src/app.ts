import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { logger } from "./utils/logger";
import { env } from "./config/env";
import "./config/db";
import healthCheckRouter from "./routes/healthcheck.route";
import { errorHandler } from "./middlewares/error.middware";
import userRouter from "./routes/user.route";
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
app.use("/api/v1/user", userRouter);
app.use(errorHandler);
export { app };

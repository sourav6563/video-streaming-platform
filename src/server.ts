import { logger } from "./utils/logger";

import { env } from "./config/env";
import { app } from "./app";
const server = app.listen(env.PORT, () => {
  logger.info(`server running on port : ${env.PORT}`);
});

server.on("error", (error) => {
  logger.error(error);
  process.exit(1);
});

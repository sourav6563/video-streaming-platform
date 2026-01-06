import { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError";
import { env } from "../env";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || "Something went wrong";

    error = new ApiError(statusCode, message, error?.errors ?? []);
    error.stack = err.stack;
  }

  const response = {
    success: false,
    message: error.message,
    ...(error.errors?.length && { errors: error.errors }),
    ...(env.NODE_ENV === "development" && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};

export { errorHandler };

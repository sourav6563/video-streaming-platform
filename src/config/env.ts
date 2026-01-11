import * as z from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().positive().max(65535),

  DB_MIN_POOL_SIZE: z.coerce.number().nonnegative(),
  DB_MAX_POOL_SIZE: z.coerce.number().positive(),

  MONGODB_URI: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRY: z.string().min(1),

  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_EXPIRY: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;

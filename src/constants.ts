import { env } from "./env";


export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
};

export const CookieNames = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
};

export enum EmailTypes {
  VERIFY="VERIFY",
  RESET="RESET",
};

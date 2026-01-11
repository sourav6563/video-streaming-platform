import * as z from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").toLowerCase(),

  email: z.email("Email is required"),

  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .toLowerCase(),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must contain uppercase, lowercase, and a number",
    ),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required").toLowerCase(),

  password: z.string().trim().min(1, "Password is required"),
});

export const verifyAccountSchema = z.object({
  email: z.string().min(1, "Email is required").trim().toLowerCase().email("Invalid email"),

  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export const updateNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").toLowerCase(),
});
export const updateEmailSchema = z.object({
  email: z.string().min(1, "Email is required").trim().toLowerCase().email("Invalid email"),
});
export const updatePasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must contain uppercase, lowercase, and a number",
    ),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must contain uppercase, lowercase, and a number",
    ),
});
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").trim().toLowerCase().email("Invalid email"),
});
export const resetPasswordSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
  email: z.string().min(1, "Email is required").trim().toLowerCase().email("Invalid email"),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must contain uppercase, lowercase, and a number",
    ),
});
export const userProfileSchema = z.object({
  username: z.string().trim().min(1, "Username is required").toLowerCase(),
});
export const checkUsernameQuerySchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .toLowerCase(),
});

export type SignUpDataType = z.infer<typeof signUpSchema>;
export type LoginDataType = z.infer<typeof loginSchema>;
export type VerifyForSignupDataType = z.infer<typeof verifyAccountSchema>;
export type UpdateNameDataType = z.infer<typeof updateNameSchema>;
export type UpdateEmailDataType = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordDataType = z.infer<typeof updatePasswordSchema>;
export type ForgotPasswordDataType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDataType = z.infer<typeof resetPasswordSchema>;
export type UserProfileDataType = z.infer<typeof userProfileSchema>;

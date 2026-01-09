import * as z from "zod";

export const signUpSchema = z.object({
  fullname: z
    .string({ message: "Full name is required" })
    .trim()
    .min(1, "Full name is required")
    .min(3, "Full name must be at least 3 characters")
    .max(50, "Full name must be at most 50 characters"),

  email: z.email({
    message: "Please enter a valid email address",
  }),

  username: z
    .string({ message: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),

  password: z
    .string({ message: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password must be at most 50 characters")
    .regex(
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number",
    ),
});

export type SignUpDataType = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),

  password: z.string().trim().min(1, "Password is required"),
});

export type LoginDataType = z.infer<typeof loginSchema>;

export const verifyAccountSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .transform((v) => v.trim().toLowerCase()),

  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export type VerifyForSignupDataType = z.infer<typeof verifyForSignupSchema>;
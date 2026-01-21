import * as z from "zod";

export const updateNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").toLowerCase(),
});
export const updateEmailSchema = z.object({
  email: z.string().min(1, "Email is required").trim().toLowerCase().email("Invalid email format"),
});

export const userProfileSchema = z.object({
  username: z.string().trim().min(1, "Username is required").toLowerCase(),
});

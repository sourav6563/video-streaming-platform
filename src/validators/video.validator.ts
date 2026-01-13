import z from "zod";

export const uploadVideoSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().min(1, "Description is required").trim(),
});

export const videoQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),

  query: z.string().trim().default(""),

  sortBy: z.enum(["createdAt", "views", "duration", "title"]).default("createdAt"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type   VideoQuery = z.infer<typeof videoQuerySchema>;

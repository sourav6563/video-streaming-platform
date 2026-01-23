import z from "zod";

export const PlaylistSchema = z.object({
  name: z.string().min(1, "playlist title is required").trim(),
  description: z.string().min(1, " playlist Description is required").trim(),
});

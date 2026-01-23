import z from "zod";

export const PlaylistSchema = z.object({
  name: z.string().min(1, "Playlist title is required").trim(),
  description: z.string().trim().optional(),
});

import { z } from "zod";

export const createDemoItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateDemoItemSchema = createDemoItemSchema;
export const idSchema = z.coerce.number().int().positive();
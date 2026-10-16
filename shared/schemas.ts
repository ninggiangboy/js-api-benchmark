import { z } from "zod";

export const idParam = z.coerce.number().int().positive();
export const listPostsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  authorId: z.coerce.number().int().positive().optional(),
});
export const createUserBody = z.object({ email: z.string().email(), name: z.string().min(1).max(100) });
export const patchUserBody = z.object({ name: z.string().min(1).max(100).optional() });
export const loginBody = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });
export const bulkBody = z.object({
  items: z.array(z.object({ id: z.number().int(), value: z.number(), label: z.string().max(500) })).max(5000),
});

/** Plain id parsing for frameworks that do not validate params through a schema. */
export function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

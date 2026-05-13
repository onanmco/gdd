import { z } from "zod";

export const isoUtcString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, "must be ISO-8601 UTC without milliseconds");

export const slugString = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");

export const sha256String = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/, "must be sha256:<64 lowercase hex chars>");

export const taskIdString = z
  .string()
  .regex(/^TASK-\d{3}$/, "must match TASK-000");

export const entryIdString = z
  .string()
  .regex(/^ENTRY-\d{6}$/, "must match ENTRY-000000");

export const relativePathString = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith("/") && !value.includes(".."), {
    message: "must be a safe relative path"
  });

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

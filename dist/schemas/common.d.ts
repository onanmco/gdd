import { z } from "zod";
export declare const isoUtcString: z.ZodString;
export declare const slugString: z.ZodString;
export declare const sha256String: z.ZodString;
export declare const taskIdString: z.ZodString;
export declare const entryIdString: z.ZodString;
export declare const relativePathString: z.ZodString;
export declare function formatZodError(error: z.ZodError): string;

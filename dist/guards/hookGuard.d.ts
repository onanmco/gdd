export interface GuardDecision {
    allow: boolean;
    reason?: string;
}
export declare function guardHarnessEvent(harness: "claude" | "opencode" | "codex" | "other", input: unknown, env?: NodeJS.ProcessEnv): Promise<GuardDecision>;
export declare function extractPaths(value: unknown): string[];
export declare function readJsonFromStdin(): unknown;
export declare function readYamlFromStdin(): unknown;

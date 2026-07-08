export class ConstrainedExecutor {
  static async execute(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    console.log(`[EXECUTOR-MOCK] Executing: ${command}`);
    return { stdout: "Mock output", stderr: "", exitCode: 0 };
  }
}

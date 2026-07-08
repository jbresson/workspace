import { spawn } from 'child_process';
import path from 'path';

interface GitParams {
  args: string[];
  path?: string;
}

/**
 * Git Proxy Extension
 * Provides a safe bridge to the git CLI.
 */
export async function execute(params: GitParams): Promise<{ stdout: string; stderr: string; code: number }> {
  const root = process.cwd();
  const targetPath = params.path ? path.resolve(root, params.path) : root;

  // Security: Ensure the git command stays within project boundaries
  if (!targetPath.startsWith(root)) {
    throw new Error(`Security violation: Path ${targetPath} is outside project root ${root}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('git', params.args, {
      cwd: targetPath,
      shell: false, // Critical: prevents shell injection
      env: { 
        ...process.env, 
        GIT_TERMINAL_PROMPT: '0', 
        GIT_PAGER: 'cat' 
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (err) => {
      reject(new Error(`Failed to start git process: ${err.message}`));
    });

    child.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? -1
      });
    });

    // Prevent hanging processes
    setTimeout(() => {
      child.kill();
      reject(new Error('Git process timed out after 30 seconds'));
    }, 30000);
  });
}

export default { execute };

/**
 * Research Cache Manager Extension
 * 
 * Responsibility:
 * Bridges the Agent and the validation/indexing logic.
 * Acts as the "Commit" mechanism for research findings.
 */

import { ResearchSynthesizer } from './research_synthesizer';
import { ObservationManifest } from './research_collector';
import { execFile } from 'child_process';
import path from 'path';

export interface CommitOptions {
  domain: 'bleeding-edge' | 'known';
  subDomain: string;
  reasoningMode?: 'deductive' | 'inductive' | 'comparative';
  dryRun?: boolean;
  forceOverride?: boolean;
}

export class ResearchCacheManager {
  constructor(
    private synthesizer: ResearchSynthesizer,
    private projectRoot: string,
    private validatorScriptPath: string, // e.g., path to validate-findings.js
    private indexerScriptPath: string   // e.g., path to rebuild-index.js
  ) {}

  /**
   * Orchestrates the full research pipeline: Synthesis -> Validation -> Indexing -> Commit.
   */
  async commitFinding(manifest: ObservationManifest, options: CommitOptions): Promise<void> {
    console.log(`🚀 Starting Research Pipeline for [${manifest.id}]...`);

    // 1. Synthesize
    const markdown = await this.synthesizer.synthesize(manifest, {
      domain: options.domain,
      subDomain: options.subDomain,
      reasoningMode: options.reasoningMode || 'deductive'
    });

    if (options.dryRun) {
      console.log('--- DRY RUN CONTENT ---');
      console.log(markdown);
      return;
    }

    // 2. Write temporary file for validation
    const tempFilePath = path.join(this.projectRoot, `temp_${manifest.id}.md`);
    require('fs').writeFileSync(tempFilePath, markdown);

    try {
      // 3. Validate (using the existing logic script)
      await this.runValidation(tempFilePath);

      // 4. Move to Permanent L3 Storage
      const finalPath = path.join(this.projectRoot, 'memory', 'knowledgebase', 'research', options.domain, options.subDomain, `FIND-${manifest.id}.md`);
      require('fs').mkdirSync(path.dirname(finalPath), { recursive: true });
      require('fs').renameSync(tempFilePath, finalPath);

      console.log(`✅ Finding committed to L3 memory: ${finalPath}`);

      // 5. Rebuild Index
      await this.runIndexing();

    } catch (error) {
      console.error(`❌ Pipeline failed: ${error.message}`);
      throw error;
    } finally {
      if (require('fs').existsSync(tempFilePath)) {
        require('fs').unlinkSync(tempFilePath);
      }
    }
  }

  private runValidation(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // We use the validate-findings.js script via execFile
      execFile('node', [this.validatorScriptPath], (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Validation failed: ${stderr || error.message}`));
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });
  }

  private runIndexing(): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('node', [this.indexerScriptPath], (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Indexing failed: ${stderr || error.message}`));
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });
  }
}

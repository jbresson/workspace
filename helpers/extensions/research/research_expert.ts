/**
 * Research Expert Skill
 * 
 * Responsibility:
 * High-level orchestration for an AI Agent. 
 * Provides a single entry point to perform the full research lifecycle:
 * [Observe] -> [Synthesize] -> [Commit]
 */

import { ResearchCollector, ObservationManifest } from '../research_collector';
import { ResearchSynthesizer } from '../research_synthesizer';
import { ResearchCacheManager } from '../research_cache_manager';
import path from 'path';
import { execSync } from 'child_process';

export interface ExpertResearchTask {
  domain: 'bleeding-edge' | 'known';
  subDomain: string;
  observations: Array<{
    type: 'url' | 'file' | 'manual';
    uri: string;
    content: string;
    metadata?: any;
  }>;
}

export class ResearchExpertSkill {
  private collector: ResearchCollector;
  private synthesizer: ResearchSynthesizer;
  private cacheManager: ResearchCacheManager;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.collector = new ResearchCollector();
    this.synthesizer = new ResearchSynthesizer(path.join(projectRoot, 'memory/mindbase/skills/research/RULES.md'));
    
    // Linking to the logic layer scripts implemented in Phase 0
    const validatorPath = path.resolve(projectRoot, 'helpers/scripts/research/validate-findings.js');
    const indexerPath = path.resolve(projectRoot, 'helpers/scripts/research/rebuild-index.js');

    this.cacheManager = new ResearchCacheManager(
      this.synthesizer,
      projectRoot,
      validatorPath,
      indexerPath
    );
  }

  /**
   * The primary execution method for an agent.
   * Takes raw observations and commits them to the knowledge base through the full pipeline.
   */
  async execute(task: ExpertResearchTask) {
    console.log(`🧠 [ExpertSkill] Starting research task in ${task.domain}/${task.subDomain}`);

    try {
      // 1. Transform inputs into Observations
      const observations = task.observations.map(obs => 
        this.collector.createObservation(obs.type, obs.uri, obs.content, obs.metadata)
      );

      // 2. Create Manifest
      const manifest = this.collector.createManifest(observations);
      console.log(`📦 [ExpertSkill] Created manifest: ${manifest.id}`);

      // 3. Run Orchestration via Cache Manager
      await this.cacheManager.commitFinding(manifest, {
        domain: task.domain,
        subDomain: task.subDomain,
        reasoningMode: 'deductive', // Default behavior
        dryRun: false
      });

      console.log(`✅ [ExpertSkill] Research cycle complete for ${task.subDomain}.`);
      return { success: true, manifestId: manifest.id };

    } catch (error) {
      console.error(`❌ [ExpertSkill] Task failed:`, error);
      throw error;
    }
  }
}

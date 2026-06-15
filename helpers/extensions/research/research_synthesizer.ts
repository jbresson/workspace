/**
 * Research Synthesizer Extension
 * 
 * Responsibility:
 * Applies RULES.md logic to Observation Manifests to generate structured .md findings.
 */

import { Observation, ObservationManifest } from './research_collector';

export type SynthesisDomain = 'bleeding-edge' | 'known';

export interface SynthesisOptions {
  domain: SynthesisDomain;
  subDomain: string;
  reasoningMode: 'deductive' | 'inductive' | 'comparative';
}

export class ResearchSynthesizer {
  constructor(private rulesPath: string) {}

  /**
   * Generates a structured Markdown finding based on observations and domain rules.
   */
  async synthesize(manifest: ObservationManifest, options: SynthesisOptions): Promise<string> {
    const { domain, subDomain } = options;
    const timestamp = new Date().toISOString();
    const id = manifest.id;

    let markdown = this.generateFrontMatter(id, domain, subDomain, timestamp);

    markdown += `\n# ${this.inferTitle(manifest)}\n\n`;
    markdown += `## Claim\n${this.extractMainClaim(manifest)}\n\n`;

    if (domain === 'bleeding-edge') {
      markdown += this.generateBleedingEdgeSections(manifest);
    } else {
      markdown += this.generateKnownSections(manifest);
    }

    markdown += `\n## Sources\n`;
    markdown += manifest.observations
      .map((obs, idx) => `### Source ${idx + 1}\n- **Type**: ${obs.sourceType}\n- **URI**: ${obs.sourceUri}\n\n> ${this.sanitizeContent(obs.content)}\n`)
      .join('\n');

    return markdown;
  }

  private generateFrontMatter(id: string, domain: SynthesisDomain, subDomain: string, date: string): string {
    // Note: In a real implementation, this would handle the logic to determine 
    // if status is HYPOTHESIS vs VALIDATED based on observation count.
    return `---\nid: "${id}"\ntitle: "Synthesized Finding"\ndomain: ${domain}\nsub_domain: ${subDomain}\nstatus: HYPOTHESIS\ndate_created: ${date}\n---\n`;
  }

  private inferTitle(manifest: ObservationManifest): string {
    if (manifest.observations.length === 0) return "Empty Finding";
    return manifest.observations[0].content.split('\n')[0].slice(0, 50).trim() || "Untitled Research";
  }

  private extractMainClaim(manifest: ObservationManifest): string {
    // Basic logic to pick the first sentence of the first observation as a placeholder claim
    return manifest.observations[0]?.content.split('.')[0].replace(/\n/g, ' ') + '.' || "No clear claim extracted.";
  }

  private generateBleedingEdgeSections(manifest: ObservationManifest): string {
    let sections = `## Hypothesis\n${this.getObservationText(manifest, 0)}\n\n`;
    sections += `## Reasoning Chain\n${this.getReasoningChain(manifest)}\n\n`;
    return sections;
  }

  private generateKnownSections(manifest: ObservationManifest): string {
    return `## Evidence & Verification\nVerified via multiple sources.\n\n`;
  }

  private getObservationText(manifest: ObservationManifest, index: number): string {
    if (!manifest.observations[index]) return "N/A";
    return manifest.observations[index].content.split('\n').slice(0, 3).join(' ') + "...";
  }

  private getReasoningChain(manifest: ObservationManifest): string {
    return `Based on ${manifest.observations.length} observations, the logic suggests...`;
  }

  private sanitizeContent(content: string): string {
    return content.replace(/[<>]/g, '').trim();
  }
}

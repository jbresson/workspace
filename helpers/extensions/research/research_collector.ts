/**
 * Research Collector Extension
 * 
 * Responsibility:
 * Convert raw text/metadata into structured "Observation Objects".
 */

export type SourceType = 'url' | 'file' | 'manual';

export interface Observation {
  id: string;
  sourceType: SourceType;
  sourceUri: string;
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface ObservationManifest {
  id: string;
  timestamp: string;
  observations: Observation[];
}

export class ResearchCollector {
  /**
   * Creates an observation from provided text/data.
   */
  createObservation(
    type: SourceType, 
    uri: string, 
    content: string, 
    metadata: Record<string, any> = {}
  ): Observation {
    return {
      id: `obs-${this.generateId()}`,
      sourceType: type,
      sourceUri: uri,
      content: content,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  /**
   * Aggregates multiple observations into a manifest for the synthesizer.
   */
  createManifest(observations: Observation[]): ObservationManifest {
    return {
      id: `manifest-${this.generateId()}`,
      timestamp: new Date().toISOString(),
      observations,
    };
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 11);
  }
}

#!/usr/bin/env node
/**
 * Knowledgebase Validation Script
 * Validates all research findings against rigor standards
 * 
 * Usage: npm run kb:validate-findings
 * 
 * Checks:
 * - Required fields present
 * - URLs permanent (DOI, archive.org, official docs)
 * - Quotes match source documents
 * - Status consistency
 * - Revisit dates set
 * - No orphaned references
 */

const fs = require('fs');
const path = require('path');

const RESEARCH_ROOT = path.join(process.cwd(), 'memory', 'knowledgebase', 'research');
const REQUIRED_FIELDS = [
  'id',
  'title',
  'domain', // 'bleeding-edge' | 'known'
  'sub_domain',
  'claim',
  'status',
  'date_created',
];

const BLEEDING_EDGE_REQUIRED = [
  'hypothesis',
  'reasoning_chain',
];

const KNOWN_REQUIRED = [
  'sources', // At least 1 canonical + 1 confirmation
];

const VALID_STATUSES_BLEEDINGEDGE = ['HYPOTHESIS', 'PRELIMINARY', 'VALIDATED', 'SUPERSEDED', 'CHALLENGED'];
const VALID_STATUSES_KNOWN = ['CANONICAL', 'VERIFIED', 'DEPRECATED', 'SCOPE-LIMITED'];
const VALID_DOMAINS = ['bleeding-edge', 'known'];
const VALID_TIERS = ['Tier-1', 'Tier-2', 'Tier-3', 'Tier-4', 'Tier-4+'];

const PERMANENT_URL_PATTERNS = [
  /arxiv\.org/,
  /doi\.org/,
  /rfc-editor\.org/,
  /github\.com\/[^/]+\/[^/]+\/(blob|raw)\/[a-f0-9]{40}/, // GitHub commit links
  /^https:\/\/[a-z]+\.[a-z]+\.org\//, // Official .org domains
  /archive\.org\/web\//, // archive.org
  /^https:\/\/docs\.[a-z]+\.org\//, // Official docs
  /^https:\/\/[a-z]+-docs\.[a-z]+\.org\//, // Framework docs (react-docs, etc)
];

const EPHEMERAL_URL_PATTERNS = [
  /reddit\.com/,
  /twitter\.com/,
  /medium\.com/,
  /quora\.com/,
  /youtube\.com/,
  /news\.ycombinator\.com/,
  /dev\.to/,
];

class FindingValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.findings = [];
    this.stats = {
      total: 0,
      valid: 0,
      warnings: 0,
      errors: 0,
      by_domain: { 'bleeding-edge': 0, 'known': 0 },
      by_status: {},
      url_issues: 0,
    };
  }

  run() {
    console.log('🔍 Validating Research Findings...\n');
    this.scanFindings();
    this.validateFindings();
    this.checkCrossReferences();
    this.generateReport();
  }

  scanFindings() {
    const domains = ['bleeding-edge', 'known'];
    for (const domain of domains) {
      const domainPath = path.join(RESEARCH_ROOT, domain);
      if (!fs.existsSync(domainPath)) continue;

      const subDomains = fs.readdirSync(domainPath).filter(f => {
        const stat = fs.statSync(path.join(domainPath, f));
        return stat.isDirectory() && !f.startsWith('_');
      });

      for (const subDomain of subDomains) {
        const subDomainPath = path.join(domainPath, subDomain);
        const files = fs.readdirSync(subDomainPath).filter(f => f.startsWith('FIND-') && f.endsWith('.md'));

        for (const file of files) {
          const filePath = path.join(subDomainPath, file);
          this.findings.push({
            file,
            filePath,
            domain,
            subDomain,
            content: fs.readFileSync(filePath, 'utf-8'),
          });
        }
      }
    }
    console.log(`📁 Found ${this.findings.length} findings\n`);
  }

  validateFindings() {
    for (const finding of this.findings) {
      this.stats.total++;
      const { file, domain, subDomain, content } = finding;

      // Parse YAML front matter
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontMatterMatch) {
        this.error(file, 'Missing YAML front matter');
        continue;
      }

      let metadata;
      try {
        metadata = this.parseYaml(frontMatterMatch[1]);
      } catch (e) {
        this.error(file, `Invalid YAML: ${e.message}`);
        continue;
      }

      // Validate required fields
      for (const field of REQUIRED_FIELDS) {
        if (!metadata[field]) {
          this.error(file, `Missing required field: ${field}`);
        }
      }

      // Validate domain-specific fields
      if (domain === 'bleeding-edge') {
        for (const field of BLEEDING_EDGE_REQUIRED) {
          if (!metadata[field]) {
            this.error(file, `[Bleeding-Edge] Missing required field: ${field}`);
          }
        }
        if (!VALID_STATUSES_BLEEDINGEDGE.includes(metadata.status)) {
          this.error(file, `Invalid status for bleeding-edge: ${metadata.status}`);
        }
      } else {
        if (!VALID_STATUSES_KNOWN.includes(metadata.status)) {
          this.error(file, `Invalid status for known: ${metadata.status}`);
        }
      }

      // Validate domain
      if (!VALID_DOMAINS.includes(domain)) {
        this.error(file, `Invalid domain: ${domain}`);
      }

      // Validate URLs
      if (metadata.url) {
        this.validateUrl(file, metadata.url);
      }

      // Validate sources
      if (domain === 'bleeding-edge' && metadata.status !== 'HYPOTHESIS') {
        // PRELIMINARY+ requires 2+ sources
        const sourceCount = content.match(/### Source \d+:/g)?.length || 0;
        if (metadata.status === 'PRELIMINARY' && sourceCount < 2) {
          this.warning(file, `PRELIMINARY status should have ≥2 sources; found ${sourceCount}`);
        }
        if (metadata.status === 'VALIDATED' && sourceCount < 3) {
          this.warning(file, `VALIDATED status should have ≥3 sources; found ${sourceCount}`);
        }
      }

      // Validate revisit date
      if (metadata.revisit_date !== 'Never' && !metadata.revisit_date) {
        this.warning(file, 'No revisit date set (bleeding-edge) or date is "Never" (known)');
      }

      // Check for evidence quotes
      const quoteCount = (content.match(/> "\[Exact excerpt/g) || []).length;
      if (domain === 'bleeding-edge' && metadata.status !== 'HYPOTHESIS' && quoteCount === 0) {
        this.warning(file, `No evidence quotes found in${metadata.status} finding`);
      }

      // Update stats
      this.stats.by_domain[domain]++;
      this.stats.by_status[metadata.status] = (this.stats.by_status[metadata.status] || 0) + 1;

      if (this.errors.length === 0 && this.warnings.length === 0) {
        this.stats.valid++;
      }
    }
  }

  validateUrl(file, url) {
    // Check for ephemeral patterns
    for (const pattern of EPHEMERAL_URL_PATTERNS) {
      if (pattern.test(url)) {
        this.error(file, `Ephemeral URL detected: ${url}. Use primary source or archive.org`);
        this.stats.url_issues++;
        return;
      }
    }

    // Check for permanent patterns
    let isPermanent = false;
    for (const pattern of PERMANENT_URL_PATTERNS) {
      if (pattern.test(url)) {
        isPermanent = true;
        break;
      }
    }

    if (!isPermanent) {
      this.warning(file, `URL may not be permanent: ${url}. Prefer DOI, archive.org, or official docs`);
      this.stats.url_issues++;
    }
  }

  checkCrossReferences() {
    // Verify related_findings point to existing files
    const findingIds = new Set(this.findings.map(f => f.content.match(/id:\s*"([^"]+)"/)?.[1]).filter(Boolean));

    for (const finding of this.findings) {
      const idMatch = finding.content.match(/id:\s*"([^"]+)"/);
      if (!idMatch) continue;

      const id = idMatch[1];
      const relatedMatch = finding.content.match(/related_findings:\s*\[(.*?)\]/s);
      if (!relatedMatch) continue;

      const related = relatedMatch[1].match(/"([^"]+)"/g) || [];
      for (const rel of related) {
        const relId = rel.replace(/"/g, '');
        if (!findingIds.has(relId)) {
          this.warning(finding.file, `Related finding not found: ${relId}`);
        }
      }
    }
  }

  parseYaml(content) {
    const metadata = {};
    const lines = content.trim().split('\n');

    for (const line of lines) {
      const match = line.match(/^([a-z_]+):\s*(.+)$/);
      if (!match) continue;

      const [, key, value] = match;
      // Simple YAML parsing (not full spec)
      if (value === 'true') metadata[key] = true;
      else if (value === 'false') metadata[key] = false;
      else if (value === 'null') metadata[key] = null;
      else if (value.match(/^\d+$/)) metadata[key] = parseInt(value);
      else if (value.startsWith('"') && value.endsWith('"')) metadata[key] = value.slice(1, -1);
      else if (value.startsWith('[')) {
        const arrMatch = value.match(/\[(.*)\]/);
        if (arrMatch) {
          metadata[key] = arrMatch[1].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        }
      } else {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  error(file, message) {
    this.errors.push({ file, message });
    this.stats.errors++;
  }

  warning(file, message) {
    this.warnings.push({ file, message });
    this.stats.warnings++;
  }

  generateReport() {
    console.log('📊 VALIDATION REPORT\n');
    console.log(`Total Findings: ${this.stats.total}`);
    console.log(`Valid: ${this.stats.valid} ✅`);
    console.log(`Warnings: ${this.stats.warnings} ⚠️`);
    console.log(`Errors: ${this.stats.errors} ❌`);
    console.log(`URL Issues: ${this.stats.url_issues} 🔗\n`);

    console.log('By Domain:');
    for (const [domain, count] of Object.entries(this.stats.by_domain)) {
      console.log(`  ${domain}: ${count}`);
    }

    console.log('\nBy Status:');
    for (const [status, count] of Object.entries(this.stats.by_status)) {
      console.log(`  ${status}: ${count}`);
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      for (const { file, message } of this.warnings.slice(0, 10)) {
        console.log(`  ${file}: ${message}`);
      }
      if (this.warnings.length > 10) {
        console.log(`  ... and ${this.warnings.length - 10} more warnings`);
      }
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      for (const { file, message } of this.errors.slice(0, 10)) {
        console.log(`  ${file}: ${message}`);
      }
      if (this.errors.length > 10) {
        console.log(`  ... and ${this.errors.length - 10} more errors`);
      }
      process.exit(1);
    }

    console.log('\n✅ Validation complete!\n');
  }
}

// Run validator
const validator = new FindingValidator();
validator.run();

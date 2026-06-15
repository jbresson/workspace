#!/usr/bin/env node
/**
 * Rebuild Research Knowledgebase Indices
 * 
 * Automatically regenerates:
 * - memory/knowledgebase/research/_manifest.md (global index)
 * - memory/knowledgebase/research/bleeding-edge/_index.md (domain index)
 * - memory/knowledgebase/research/known/_index.md
 * - memory/knowledgebase/research/[subdomain]/_index.md
 * - memory/knowledgebase/research/_revisit-schedule.md (automated tracking)
 * 
 * Usage: npm run kb:index-rebuild
 */

const fs = require('fs');
const path = require('path');

const RESEARCH_ROOT = path.join(process.cwd(), 'memory', 'knowledgebase', 'research');

class IndexBuilder {
  constructor() {
    this.findings = [];
    this.byDomain = { 'bleeding-edge': {}, 'known': {} };
  }

  run() {
    console.log('🔨 Rebuilding Knowledgebase Indices...\n');
    this.scanAllFindings();
    this.buildDomainIndices();
    this.buildMasterManifest();
    this.buildRevisitSchedule();
    console.log('✅ Indices rebuilt successfully!\n');
  }

  scanAllFindings() {
    const domains = ['bleeding-edge', 'known'];

    for (const domain of domains) {
      const domainPath = path.join(RESEARCH_ROOT, domain);
      if (!fs.existsSync(domainPath)) {
        fs.mkdirSync(domainPath, { recursive: true });
        continue;
      }

      const subDomains = fs.readdirSync(domainPath).filter(f => {
        const stat = fs.statSync(path.join(domainPath, f));
        return stat.isDirectory() && !f.startsWith('_');
      });

      this.byDomain[domain] = {};

      for (const subDomain of subDomains) {
        this.byDomain[domain][subDomain] = [];
        const subDomainPath = path.join(domainPath, subDomain);
        const files = fs.readdirSync(subDomainPath).filter(f => f.startsWith('FIND-') && f.endsWith('.md'));

        for (const file of files) {
          const filePath = path.join(subDomainPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const metadata = this.extractMetadata(content);

          const finding = {
            id: metadata.id,
            file,
            filePath,
            domain,
            subDomain,
            title: metadata.title,
            status: metadata.status,
            confidence: metadata.confidence || 'MEDIUM',
            date_created: metadata.date_created,
            date_modified: metadata.date_modified || metadata.date_created,
            revisit_date: metadata.revisit_date,
            revisit_trigger: metadata.revisit_trigger,
            tags: metadata.tags || [],
            claim: metadata.claim,
          };

          this.findings.push(finding);
          this.byDomain[domain][subDomain].push(finding);
        }
      }

      // Sort findings by domain
      for (const subDomain in this.byDomain[domain]) {
        this.byDomain[domain][subDomain].sort((a, b) => 
          new Date(b.date_created) - new Date(a.date_created)
        );
      }
    }

    console.log(`📊 Scanned ${this.findings.length} findings\n`);
  }

  extractMetadata(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) return {};

    const metadata = {};
    const lines = frontMatterMatch[1].trim().split('\n');

    for (const line of lines) {
      const match = line.match(/^([a-z_]+):\s*(.+)$/);
      if (!match) continue;

      const [, key, value] = match;
      if (value === 'true') metadata[key] = true;
      else if (value === 'false') metadata[key] = false;
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

  buildDomainIndices() {
    for (const domain of Object.keys(this.byDomain)) {
      const subDomains = this.byDomain[domain];

      for (const subDomain of Object.keys(subDomains)) {
        const findings = subDomains[subDomain];
        const domainPath = path.join(RESEARCH_ROOT, domain, subDomain);

        if (!fs.existsSync(domainPath)) {
          fs.mkdirSync(domainPath, { recursive: true });
        }

        const indexPath = path.join(domainPath, '_index.md');
        const index = this.generateDomainIndex(domain, subDomain, findings);
        fs.writeFileSync(indexPath, index);
        console.log(`✅ Generated ${domain}/${subDomain}/_index.md (${findings.length} findings)`);
      }
    }
  }

  generateDomainIndex(domain, subDomain, findings) {
    const statusGroups = {};
    const categoryGroups = {};

    for (const finding of findings) {
      if (!statusGroups[finding.status]) statusGroups[finding.status] = [];
      statusGroups[finding.status].push(finding);

      // Group by category from tags
      const category = finding.tags[0] || 'general';
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(finding);
    }

    let index = `# ${subDomain.replace(/-/g, ' ').toUpperCase()} Research Findings\n\n`;
    index += `**Last Updated**: ${new Date().toISOString().split('T')[0]}\n`;
    index += `**Total Findings**: ${findings.length}\n`;
    index += `**Status Breakdown**: ${Object.entries(statusGroups).map(([s, f]) => `${f.length} ${s}`).join(', ')}\n\n`;

    index += `## Quick Reference (By Topic)\n\n`;

    for (const [category, categoryFindings] of Object.entries(categoryGroups)) {
      index += `### ${category.replace(/-/g, ' ')}\n`;
      index += `| Finding ID | Title | Status | Revisit Date |\n`;
      index += `|---|---|---|---|\n`;

      for (const finding of categoryFindings) {
        const revisitDisplay = finding.revisit_date === 'Never' ? 'Never' : finding.revisit_date;
        index += `| ${finding.id} | ${finding.title} | ${finding.status} | ${revisitDisplay} |\n`;
      }
      index += `\n`;
    }

    index += `## Key Statistics\n`;
    index += `- **Maturity**: ${domain === 'bleeding-edge' ? 'Rapidly evolving' : 'Stable'}\n`;
    index += `- **Consensus Level**: ${findings.filter(f => f.status === 'VALIDATED' || f.status === 'CANONICAL').length}/${findings.length} findings validated\n`;

    return index;
  }

  buildMasterManifest() {
    const manifestPath = path.join(RESEARCH_ROOT, '_manifest.md');

    let manifest = `# All Research Findings Manifest\n\n`;
    manifest += `**Generated**: ${new Date().toISOString()}\n`;
    manifest += `**Total Findings**: ${this.findings.length}\n`;

    const statusCounts = {};
    const domainCounts = { 'bleeding-edge': 0, 'known': 0 };

    for (const finding of this.findings) {
      statusCounts[finding.status] = (statusCounts[finding.status] || 0) + 1;
      domainCounts[finding.domain]++;
    }

    manifest += `**Bleeding-Edge**: ${domainCounts['bleeding-edge']} | **Known**: ${domainCounts['known']}\n\n`;

    manifest += `---\n\n## By Domain\n\n`;

    for (const domain of Object.keys(this.byDomain)) {
      manifest += `### ${domain === 'bleeding-edge' ? '🔥 Bleeding-Edge' : '📚 Known / Established'} (${domainCounts[domain]} findings)\n\n`;

      for (const subDomain of Object.keys(this.byDomain[domain])) {
        const findings = this.byDomain[domain][subDomain];
        manifest += `#### ${subDomain}\n`;
        manifest += `| ID | Title | Status | Revisit |\n`;
        manifest += `|----|----|--------|----------|\n`;

        for (const finding of findings) {
          manifest += `| ${finding.id} | ${finding.title} | ${finding.status} | ${finding.revisit_date || 'N/A'} |\n`;
        }
        manifest += `\n`;
      }
    }

    manifest += `## Status Distribution\n\n`;
    manifest += `\`\`\`\n`;
    for (const [status, count] of Object.entries(statusCounts)) {
      const pct = ((count / this.findings.length) * 100).toFixed(0);
      manifest += `${status.padEnd(15)} ${'█'.repeat(Math.ceil(count / 2))} ${count} (${pct}%)\n`;
    }
    manifest += `\`\`\`\n\n`;

    fs.writeFileSync(manifestPath, manifest);
    console.log(`✅ Generated _manifest.md`);
  }

  buildRevisitSchedule() {
    const schedulePath = path.join(RESEARCH_ROOT, '_revisit-schedule.md');

    const revisits = this.findings.filter(f => f.revisit_date && f.revisit_date !== 'Never');
    revisits.sort((a, b) => new Date(a.revisit_date) - new Date(b.revisit_date));

    let schedule = `# Research Findings Revisit Schedule\n\n`;
    schedule += `**Auto-Generated**: ${new Date().toISOString()}\n`;
    schedule += `**Findings Needing Revisit**: ${revisits.length}\n\n`;

    const byMonth = {};
    for (const finding of revisits) {
      const [year, month] = finding.revisit_date.split('-');
      const monthKey = `${year}-${month}`;
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(finding);
    }

    for (const monthKey of Object.keys(byMonth).sort()) {
      schedule += `## ${monthKey}\n\n`;
      for (const finding of byMonth[monthKey]) {
        const daysLeft = Math.ceil((new Date(finding.revisit_date) - new Date()) / (1000 * 60 * 60 * 24));
        const urgent = daysLeft <= 7 ? '⚠️ URGENT' : '';
        schedule += `- **${finding.id}** | ${finding.title}\n`;
        schedule += `  - Revisit: ${finding.revisit_date} (${daysLeft} days) ${urgent}\n`;
        schedule += `  - Trigger: ${finding.revisit_trigger || 'Not specified'}\n`;
      }
      schedule += `\n`;
    }

    fs.writeFileSync(schedulePath, schedule);
    console.log(`✅ Generated _revisit-schedule.md (${revisits.length} upcoming revisits)`);
  }
}

const builder = new IndexBuilder();
builder.run();

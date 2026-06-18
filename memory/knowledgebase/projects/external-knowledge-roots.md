# External Knowledge Roots

Status: `[WIP-STAGED]`

## Purpose
Define default external knowledge locations and retrieval priority for Vivint + open-source work.

## Priority Policy
1. **Primary (always first):** `~/workspace/**/*.md`
2. **Secondary (external):** consult only after local workspace markdown pass, or when explicitly requested.

## External Sources
- `~/vivint_space/` — Vivint base repos + helpful information.
- `~/vivint_space/ai/` — high-value markdown documentation.
- `mrmeseeks` CLI code cache — reusable context/source history.
  - Cache root: `~/Library/Caches/mrmeseeks/code-cache/`
  - Useful when tracing Vivint code patterns, prior scripts, and platform repo snapshots.
  - Observed examples:
    - `~/Library/Caches/mrmeseeks/code-cache/torie.jenkins/code/scripts/functions/mrmeseeks.sh`
    - `~/Library/Caches/mrmeseeks/code-cache/vivint/horizontals/platform/showmewhatyougot/meseeks/mrmeseeks`
    - `~/Library/Caches/mrmeseeks/code-cache/vivint/horizontals/platform/k8sconfig/configmap/mrmeseeks`
- `~/opensource/` — open-source base repos + helpful information.
- `~/.config/opencode/` — high-value markdown documentation.

## Working Model
- Paths above are **external knowledge** only.
- WIP remains proposal space; source repos in these locations are potential push targets from WIP flows.

## Decision Record
- `[REVERSIBLE]` retrieval policy: local `~/workspace` markdown first, external roots second.

# EXT-008 — mrmeseeks curated tool integration

## Context
Need first-class access pattern for `mrmeseeks` during Vivint workflows.
Initial discovery came from temporary probing; target outcome is a curated non-generic tool pathway (no generic shell exposure to agents).

## Evidence
Commands run:
```bash
mrmeseeks -h
mrmeseeks help
```
Observed:
- CLI available locally.
- Core commands: `auth`, `completion`, `create`, `delete`, `deploy`, `hack`, `help`, `list`, `restart` (deprecated), `status`, `template`, `update`, `version`.
- Global flags include backend/context/namespace/config/clues and timeout controls.
- `mrmeseeks -h` returns help text but exits non-zero because auto update check hits Nexus forbidden:
  - `.../search/assets?...mrmeseeks_arm64_darwin: Forbidden`
  - Exit code: `1`
- `mrmeseeks help` returns help text successfully (captured output below).

### Captured output (`mrmeseeks help`)
```text
A quick helper for platform build information

Usage:
  mrmeseeks [command]

Available Commands:
  auth        Manage authentication for the Jarvis backend
  completion  Generate the autocompletion script for the specified shell
  create      Create paas namespace
  delete      Delete software
  deploy      Deploy software
  hack        Utilities for debugging and managing paas
  help        Help about any command
  list        List available deployments
  restart     Restart software (deprecated)
  status      Show software status
  template    Render helm templates
  update      update mrmeseeks
  version     Version mrmeseeks

Flags:
      --backend string                     Backend for status queries [jarvis, k8s] (default "jarvis")
      --backend-url string                 Jarvis backend URL (default "https://lookatme.platform.vivint.com")
      --clues-branch string                GitLab branch to fetch clues.yaml from (default: master)
      --clues-file string                  Path to a local clues.yaml file (overrides GitLab fetch)
      --color-scheme string                Choose a different color scheme default empty. [deuteranopia]
      --config string                      config file (default is $HOME/.mrmeseeks.yaml)
      --context string                     The name of the kubeconfig context to use
  -h, --help                               help for mrmeseeks
      --kube-config string                 kubernetes config file. Default is $HOME/.kube/config
  -n, --namespace string                   k8s namespace
  -q, --quiet                              silence unecessary output. useful for scripts
      --timeout duration                   Timeout for Jarvis deploy/delete operations (default 5m0s)
  -u, --update                             update mrmeseeks
      --update-check-timeout duration      update check timeout in seconds (default 5s)
      --update-download-timeout duration   update download timeout in seconds (default 5m0s)

Use "mrmeseeks [command] --help" for more information about a command.
```

## Problem
`mrmeseeks -h` should be safe discovery, but update-check side effect can fail command. This breaks naive automation and tool wrappers that assume help => exit 0.

## Proposal
1. Add dedicated `mrmeseeks` wrapper/tool command path.
2. Default wrapper behavior:
   - tolerate/normalize known update-check forbidden on help/info calls;
   - parse stdout even when exit code non-zero if signature matches known update-check failure.
3. Add smoke probes:
   - `mrmeseeks version`
   - `mrmeseeks status --help`
4. Add docs for required env/auth prereqs.

## Acceptance Criteria
- AC1: Tool can fetch and return command help metadata reliably.
- AC2: Known update-check forbidden does not hard-fail read-only discovery flows.
- AC3: Failure modes clearly surfaced for real operational commands (deploy/delete/etc).
- AC4: Usage docs reference auth/config paths and backend defaults.

## Risks
- False-positive masking of genuine failures if normalization too broad.
- Env-specific behavior across machines (proxy/Nexus/auth differences).

## Related issues
- pbgen/go tooling allowlist gaps: `~/workspace/issues/backlog/ISSUE-pbgen-skill-tooling-gaps.md`

## Notes
Potential related knowledge roots:
- `~/vivint_space/platform/showmewhatyougot/meseeks/mrmeseeks`
- `~/Library/Caches/mrmeseeks/code-cache/` (observed local cache root)
- Example observed entries:
  - `~/Library/Caches/mrmeseeks/code-cache/torie.jenkins/code/scripts/functions/mrmeseeks.sh`
  - `~/Library/Caches/mrmeseeks/code-cache/vivint/horizontals/platform/showmewhatyougot/meseeks/mrmeseeks`
  - `~/Library/Caches/mrmeseeks/code-cache/vivint/horizontals/platform/k8sconfig/configmap/mrmeseeks`
- `~/vivint_space/ai/markdown-docs/platform/skills/mrmeseeks/SKILL.md`

# Issue: Expand tool allowlist/support for pbgen migration skill and Go dev workflows

## Summary
While executing `migrate-protocsh-to-pbgen`, migration flow blocked by missing shell tool access for core commands (notably `pbgen`).

Need broader first-class support for Go developer workflows so skills can complete end-to-end without manual operator intervention.

## Problem
Current environment blocks critical dev commands via shell allowlist/tool exposure gaps.

Observed blocker:
- `pbgen` command blocked (`[BLOCKED — DO NOT RETRY] 'pbgen' is not in the shell allowlist`)

Impact:
- Cannot run `pbgen generate`
- Cannot run `pbgen validate`
- Cannot produce/verify `pb-gen.lock`
- Skill execution incomplete unless user manually changes allowlist

## Required additions (high priority)
### 1) pbgen skill support
- Ensure `pbgen` available in tool allowlist by default in protobuf repos
- Support subcommands:
  - `pbgen generate`
  - `pbgen validate`
  - `pbgen --version`

### 2) Go dev workflow tooling
Need explicit support for Go test + dev lifecycle commands:
- `go test ./...`
- `go test -run <pattern> ./...`
- `go test -count=1 ./...`
- `go build ./...`
- `go vet ./...`
- `go generate ./...`
- `go mod tidy`
- `go mod vendor`
- `go list ./...`

## Proposed additional common dev CLI to expose/allow
### Source control + review
- `git` (status, diff, add, commit, show, restore)

### Build/test ecosystem
- `make`
- `just`
- `task`
- `npm` / `pnpm` / `yarn` (multi-lang repos)
- `python` / `pip` / `uv`
- `cargo` / `rustc`

### Container/runtime
- `docker`
- `docker compose`
- `kubectl` (**explicit requirement**; needed for common go dev tasks like `kubectl port-forward`, `kubectl get pods`, `kubectl logs`, `kubectl describe`, and validating service dependencies during local/CI debugging)
- `helm`

### Code quality and generation
- `golangci-lint`
- `mockery`
- `buf`
- `protoc`
- `protoc.sh` (legacy compatibility during migration windows)

### Search/format utilities
- `rg`
- `jq`
- `yq`
- `shfmt`

## Acceptance criteria
- pbgen migration skill can execute end-to-end with no manual allowlist edits
- Go protobuf repo can run: generate, validate, build, and tests from tools only
- CI parity: same command set available locally + in automation

## Related issues
- mrmeseeks tooling issue: `~/workspace/issues/backlog/EXT-008-mrmeseeks-tool-integration.md`

## Notes
This issue surfaced during migration of `scheduled-jobs` from `protoc.sh` to `pbgen`.

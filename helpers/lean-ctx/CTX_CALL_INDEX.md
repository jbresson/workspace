# LeanCTX Tool Index (`ctx_*`)

This index tracks core and intelligence tools available via `ctx_call`.

## Web & Research Tools

### `ctx_url_read`
Pulls web pages, PDFs, and YouTube videos into context as compressed, citation-backed text.

**Description**: 
Fetches a public URL (HTML, PDF, RSS/Atom, YouTube, or GitHub raw) and returns distilled content without boilerplate/ads/navigation. Optimized for research, docs, and transcripts within an agent loop.

**Arguments**:
| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | — | **Required**. The http(s) URL of a page, PDF or YouTube video. |
| `mode` | string | `auto` | Distillation mode (see modes below). |
| `query` | string | — | Optional focus query; boosts relevance in `facts`/`quotes`. |
| `max_tokens` | integer | 6000 | Token budget for the returned content. |
| `max_items` | integer | 12 | Max claims for `facts`/`quotes`. |
| `timeout_secs` | integer | 20 | Request timeout (max 60). |

**Distillation Modes**:
- `auto`: Markdown for pages, transcript for videos.
- `markdown`: Clean Markdown of the extracted article.
- `text`: Plain text, no formatting.
- `links`: Outbound links on the page (for crawling).
- `facts`: Key claims + confidence scores + source URLs.
- `quotes`: Verbatim quotes relevant to `query` + source.
- `transcript`: Flattened video transcript.

**Safety/Guardrails**:
- SSRF-guarded: Only `http`/`https` allowed. Blocks private/loopback/link-local addresses.
- GitHub URLs (`github.com/.../blob/...`) auto-resolve to raw content.

---

### `ctx_git_read`
Reads a remote git repository (GitHub, GitLab, Bitbucket) via cached shallow clone.

**Description**: 
Performs a `--depth 1` clone to allow browsing the file tree, reading files, or grepping across the repo without scraping HTML chrome. Returns real source within a token budget.

**Arguments**:
- `url`: The repository URL.
- `path`: (Optional) Specific file path within the repo.
- `mode`: (Optional) Use `"grep"` to search the repo.
- `query`: (Optional) Search pattern for `grep` mode.

**Safety/Guardrails**:
- SSRF-guarded: Only public `https` repositories.
- Performance: Uses cached clones to minimize overhead.

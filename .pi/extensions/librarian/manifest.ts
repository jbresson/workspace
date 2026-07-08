import { Type } from "@sinclair/typebox";

export const tools = {
  index: {
    name: "librarian.index",
    description: "Map project structure and discover key files.",
    parameters: Type.Object({
      path: Type.Optional(Type.String()),
      depth: Type.Optional(Type.Number()),
    }),
    async execute(_id, params, pi) {
      const target = params.path || ".";
      // Map to ctx_ls or similar internal tool
      return pi.callTool("ctx_ls", { path: target, limit: 100 });
    },
  },
  fetch: {
    name: "librarian.fetch",
    description: "Direct read of specific file content.",
    parameters: Type.Object({
      path: Type.String(),
      mode: Type.Optional(Type.Union([Type.Literal("full"), Type.Literal("map"), Type.Literal("signatures")])),
    }),
    async execute(_id, params, pi) {
      return pi.callTool("ctx_read", { path: params.path, mode: params.mode });
    },
  },
  search: {
    name: "librarian.search",
    description: "Pattern scan across codebase.",
    parameters: Type.Object({
      pattern: Type.String(),
      path: Type.Optional(Type.String()),
    }),
    async execute(_id, params, pi) {
      return pi.callTool("ctx_grep", { pattern: params.pattern, path: params.path || "." });
    },
  },
  draft: {
    name: "librarian.draft",
    description: "Create a new file in the WIP mirror (create-only).",
    parameters: Type.Object({
      issueId: Type.String(),
      path: Type.String(),
      content: Type.String(),
    }),
    async execute(_id, params, pi) {
      // Mandatory WIP redirection based on issueId
      const wipPath = `wip/${params.issueId}/${params.path}`;
      return pi.callTool("write", { path: wipPath, content: params.content });
    },
  },
  amend: {
    name: "librarian.amend",
    description: "Surgical update of a file in the WIP mirror.",
    parameters: Type.Object({
      issueId: Type.String(),
      path: Type.String(),
      oldText: Type.String(),
      newText: Type.String(),
    }),
    async execute(_id, params, pi) {
      // Mandatory WIP redirection based on issueId
      const wipPath = `wip/${params.issueId}/${params.path}`;
      return pi.callTool("edit", { 
        path: wipPath, 
        edits: [{ oldText: params.oldText, newText: params.newText }] 
      });
    },
  },
};

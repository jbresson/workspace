"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpectationService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ExpectationService {
    constructor() {
        this.expectationPath = path.join(process.cwd(), '.pi/extensions/omnitool/guardrails/expectations.jsonl');
    }
    async issueExpectation(sessionId, exp) {
        const expectation = {
            ...exp,
            sessionId,
            state: 'PENDING',
            timestamp: Date.now(),
        };
        await this.appendEntry(expectation);
        return expectation;
    }
    async appendEntry(entry) {
        await fs.promises.appendFile(this.expectationPath, JSON.stringify(entry) + '\n', 'utf8');
    }
    async updateState(sessionId, id, state, proof = null) {
        const entries = await this.getAllEntries();
        let found = false;
        const updatedEntries = entries.map(entry => {
            if (entry.id === id && entry.sessionId === sessionId) {
                found = true;
                return { ...entry, state, proof: proof ?? entry.proof };
            }
            return entry;
        });
        if (found) {
            await fs.promises.writeFile(this.expectationPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
        }
        return found;
    }
    async findActive(sessionId, toolName, toolParams) {
        const entries = await this.getAllEntries();
        // Bypass logic: If the tool is intended to resolve a guardrail block, do not let expectations block it.
        const resolutionTools = ['resolve_guardrail', 'negotiate_guardrail'];
        if (resolutionTools.includes(toolName)) {
            return [];
        }
        return entries.filter(e => e.state === 'PENDING' &&
            (e.scope === 'GLOBAL' || e.sessionId === sessionId) &&
            this.isTriggerMatch(toolName, toolParams, e.trigger));
    }
    isTriggerMatch(toolName, toolParams, ruleTrigger) {
        if (ruleTrigger === toolName)
            return true;
        const p = toolParams?.path || toolParams?.filePath || '';
        if (p && p.includes(ruleTrigger))
            return true;
        return false;
    }
    async clearRegistry(sessionId) {
        const all = await this.getAllEntries();
        if (!sessionId) {
            await fs.promises.writeFile(this.expectationPath, '', 'utf8');
            return { cleared: all.length };
        }
        const filtered = all.filter(e => e.scope === 'GLOBAL' || e.sessionId !== sessionId);
        await fs.promises.writeFile(this.expectationPath, filtered.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
        return { cleared: all.length };
    }
    async updateMetadata(sessionId, id, metadata) {
        const entries = await this.getAllEntries();
        let found = false;
        const updatedEntries = entries.map(entry => {
            if (entry.id === id && entry.sessionId === sessionId) {
                found = true;
                return { ...entry, metadata: { ...entry.metadata, ...metadata } };
            }
            return entry;
        });
        if (found) {
            await fs.promises.writeFile(this.expectationPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
        }
        return found;
    }
    async getAllEntries() {
        try {
            const content = await fs.promises.readFile(this.expectationPath, 'utf8');
            return content
                .trim()
                .split('\n')
                .filter(line => line)
                .map(line => JSON.parse(line));
        }
        catch (e) {
            return [];
        }
    }
    async getExpectation(sessionId, id) {
        const entries = await this.getAllEntries();
        return entries.find(e => e.id === id && e.sessionId === sessionId) || null;
    }
}
exports.ExpectationService = ExpectationService;

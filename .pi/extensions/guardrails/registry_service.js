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
exports.RegistryService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class RegistryService {
    constructor() {
        this.registryPath = path.join(process.cwd(), '.pi/registry/expectations.jsonl');
    }
    async issueExpectation(exp) {
        const expectation = {
            ...exp,
            state: 'PENDING',
            timestamp: Date.now(),
        };
        await this.appendEntry(expectation);
        return expectation;
    }
    async appendEntry(entry) {
        await fs.promises.appendFile(this.registryPath, JSON.stringify(entry) + '\n', 'utf8');
    }
    async updateState(id, state, proof = null) {
        const entries = await this.getAllEntries();
        let found = false;
        const updatedEntries = entries.map(entry => {
            if (entry.id === id) {
                found = true;
                return { ...entry, state, proof: proof ?? entry.proof };
            }
            return entry;
        });
        if (found) {
            await fs.promises.writeFile(this.registryPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
        }
        return found;
    }
    async findActive(trigger, sessionId) {
        const entries = await this.getAllEntries();
        return entries.filter(e => e.state === 'PENDING' &&
            e.trigger === trigger &&
            (e.scope === 'GLOBAL' || e.sessionId === sessionId));
    }
    async getAllEntries() {
        try {
            const content = await fs.promises.readFile(this.registryPath, 'utf8');
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
}
exports.RegistryService = RegistryService;

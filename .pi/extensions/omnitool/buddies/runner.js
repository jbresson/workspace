"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBuddy = void 0;
const runBuddy = async (buddyId, task) => {
    console.log(`[BUDDY-MOCK] Buddy ${buddyId} executing ${task}`);
    return { success: true, output: "Mock buddy result" };
};
exports.runBuddy = runBuddy;

export const runBuddy = async (buddyId: string, task: string) => {
  console.log(`[BUDDY-MOCK] Buddy ${buddyId} executing ${task}`);
  return { success: true, output: "Mock buddy result" };
};

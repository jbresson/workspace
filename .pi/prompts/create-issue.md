 ---
   description: Converts an observation into a structured issue file in .ai/issues/
   argument-hint: "<type> <severity>"
   ---

   Create a new structured issue file based on my observations.

   **Issue Details:**
   - **Type**: $1 (e.g., Bug, Refactor, Feature, Debt)
   - **Severity**: $2 (e.g., Critical, High, Medium, Low)
   - **Context/Observations**: $@

   ---

   # INSTRUCTIONS FOR THE AGENT:
   1. **File Path**: Determine the correct directory based on type.
      - If "Bug" or "Feature" $\rightarrow$ `issues/active/`
      - If "Debt" or "Refactor" $\rightarrow$ `issues/backlog/`
   2. **Filename Convention**: Use `[TYPE]-[YYYYMMDD]-[Short-Slug].md`. (e.g., `BUG-20260614-auth-null-pointer.md`).
   3. **Content Structure**: Populate the following template:

   ## 📋 ISSUE SPECIFICATION
   ### 🆔 Metadata
   - **ID**: [Generate ID]
   - **Status**: Active
   - **Severity**: $2
   - **Type**: $1
   - **Traceability**: Use `ctx_read` to find exact file/line coordinates.

   ### 🔍 Problem Statement (The "What")
   > *Summary of the deviation.*

   **Observed Behavior:** [Based on $@]
   **Expected Behavior:** [Inferred from logic/intent]

   ### 🧪 Root Cause Hypothesis (The "Why")
   *Formulate a hypothesis based on the provided context and code analysis.*
   - **Hypothesis**: [X happens because Y]
   - **Supporting Evidence**: [File:Line or Code Snippet]

   ### 🛠️ Proposed Resolution (The "How")
   **Recommended Action:**
   1. [Step 1]
   2. [Step 2]

   **Risk Assessment:**
   - [ ] Impact on related components/logic.

   4. **Finalize**: After writing the file, verify it with `ctx_ls` and notify me that the issue is logged
.

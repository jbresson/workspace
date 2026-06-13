# LM Studio Inference Profiles

## Disabling Thinking Mode (e.g., Qwen 3.5)
1. **Path**: `My Models` $\rightarrow$ Select Model $\rightarrow$ `Inference` (Right Sidebar) $\rightarrow$ `Prompt Template`.
2. **Action**: Add following to the first line of the Jinja template:
   ```jinja
   {%- set enable_thinking = false %}
   ```
3. **Reload**: Reload model to apply.

## Active Profile: no-think-reasoning

Current production config for instruct-based reasoning without extended thinking.

```json
{
  "identifier": "@local:no-think-reasoning",
  "name": "no-think reasoning",
  "operation": {
    "fields": [
      { "key": "llm.prediction.llama.cpuThreads", "value": 14 },
      { "key": "llm.prediction.topKSampling", "value": 20 },
      { "key": "llm.prediction.temperature", "value": 1 },
      { "key": "llm.prediction.minPSampling", "value": { "checked": true, "value": 0 } },
      { "key": "llm.prediction.topPSampling", "value": { "checked": true, "value": 0.95 } },
      { "key": "llm.prediction.llama.presencePenalty", "value": { "checked": true, "value": 1.5 } },
      { "key": "llm.prediction.repeatPenalty", "value": { "checked": true, "value": 1 } }
    ]
  }
}
```

**Key Settings:**
- **CPU Threads**: 14 (tune for your machine)
- **Temperature**: 1.0 (balanced, no thinking mode)
- **Top-P**: 0.95 (nucleus sampling)
- **Top-K**: 20 (diversity control)
- **Presence Penalty**: 1.5 (discourage repetition of topics)
- **Repeat Penalty**: 1.0 (baseline token repetition)

## Recommended Parameter Profiles

### Instruct Mode (Non-Thinking)
| Task | Temperature | Top P | Top K | Min P | Presence Penalty | Repetition Penalty |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **General** | 0.7 | 0.8 | 20 | 0.0 | 1.5 | 1.0 |
| **Reasoning** | 1.0 | 0.95 | 20 | 0.0 | 1.5 | 1.0 |

### Thinking Mode
| Task | Temperature | Top P | Top K | Min P | Presence Penalty | Repetition Penalty |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **General** | 1.0 | 0.95 | 20 | 0.0 | 1.5 | 1.0 |
| **Precise Coding** | 0.6 | 0.95 | 20 | 0.0 | 0.0 | 1.0 |

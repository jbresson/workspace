# Decisions: hf-download.py

## Overview
`hf-download.py` is a script used within this workspace to download models from HuggingFace and convert them to GGUF format using `llama.cpp`.

## Key Decisions

### 1. Skipping Conversion
- **Decision**: If the `.gguf` file already exists in the target directory, the conversion step is skipped.
- **Reasoning**: Avoids redundant, heavy, and time-consuming conversion processes if the output is already present.

### 2. Model Naming and Pathing
- **Decision**: `local_dir` defaults to `args.model_id` if not provided. The output filename is derived from the last part of the `model_id`.
- **Assumption**: HuggingFace `model_id`s are expected to follow the `user/model` format.
- **Note**: `snapshot_download` is relied upon to create necessary directory structures.

### 3. Revision Handling
- **Decision**: Added an optional `--revision` parameter (defaulting to `"main"`) to allow downloading specific branches or tags from HuggingFace.
- **Reasoning**: Provides flexibility for models not residing on the default branch.

### 4. Subprocess Implementation
- **Decision**: Use `subprocess.run` with `check=True` and `text=True`.
- **Reasoning**: 
    - `check=True` ensures the script exits with an error if conversion fails.
    - `text=True` allows the script to handle and potentially log output from `convert_hf_to_gguf.py` more cleanly (though output is still piped to the parent terminal).

### 5. Error Handling
- **Decision**: Use a broad `try-except` block around the main operations.
- **Reasoning**: Ensures that any failure in downloading or converting is caught and reported via `stderr`, and the script exits with a non-zero status.

### 6. Persistence of Downloads
- **Decision**: Intentionally allow the script to leave downloaded files (even if conversion fails).
- **Reasoning**: If conversion fails, the large model files are already present in `local_dir`, allowing for subsequent manual or automated attempts to convert without re-downloading.

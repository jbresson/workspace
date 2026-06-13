# HuggingFace Download Decisions

- **Retain Files**: Retain downloaded model files even if conversion fails to prevent re-downloading.
- **Local Directory**: Default `local_dir` to `model_id` and derive output filename from the last part of `model_id`.
- **Error Handling**: Use broad try-except around main operations to report errors via stderr and exit with non-zero status.
- **Revision Parameter**: Use an optional `--revision` parameter (default "main") for HF downloads.
- **Subprocess Implementation**: Implement subprocess calls using `subprocess.run(check=True, text=True)`.

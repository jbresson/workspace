import argparse
import os
import subprocess
import sys
from huggingface_hub import snapshot_download

def main():
    parser = argparse.ArgumentParser(description="Download model from HuggingFace and convert to GGUF")
    parser.add_argument("model_id", help="HuggingFace model ID")
    parser.add_argument("local_dir", nargs="?", default=None, help="Local directory to save the model")
    parser.add_argument("--outtype", default="auto", help="GGUF outtype (e.g., q4_k_m, f16, auto)")
    parser.add_argument("--revision", default="main", help="HuggingFace revision (default: main)")
    
    args = parser.parse_args()
    local_dir = args.local_dir if args.local_dir else args.model_id
    model_name = args.model_id.split('/')[-1]
    out_file = os.path.join(local_dir, f"{model_name}-{args.outtype}.gguf")

    try:
        print(f"Downloading {args.model_id} to {local_dir}...")
        snapshot_download(
            repo_id=args.model_id,
            local_dir=local_dir,
            local_dir_use_symlinks=False,
            revision=args.revision
        )
        print("Download complete.")

        if os.path.exists(out_file):
            print(f"GGUF already exists at {out_file}. Skipping conversion.")
            return

        print(f"Converting to GGUF: {out_file} (outtype={args.outtype})...")
        subprocess.run([
            "python3", "llama.cpp/convert_hf_to_gguf.py",
            local_dir,
            "--token", "true",
            "--outtype", args.outtype,
            "--outfile", out_file
        ], check=True, text=True)
        print("Conversion complete.")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

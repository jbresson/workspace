import os
import sys
import json
import csv
import argparse
import logging
from pathlib import Path
from collections import Counter

# Try to import dateutil for flexible time parsing
try:
    from dateutil import parser as date_parser
    import pytz
    HAS_DATE_UTIL = True
except ImportError:
    HAS_DATE_UTIL = False

import re

def extract_shape(obj, path=""):
    """
    Recursively extracts the 'shape' of a JSON-like object.
    Ignores values, only tracks keys/structure.
    """
    paths = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_path = f"{path}.{k}" if path else k
            paths.add(new_path)
            paths.update(extract_shape(v, new_path))
    elif isinstance(obj, list):
        for item in obj:
            paths.update(extract_shape(item, path))
    return paths

def extract_updates_object(text):
    """
    Extracts the 'updates' object from a string shaped like:
    collection.command(arg1, arg2, arg3, { "updates": ... })
    The 4th argument is typically the updates object.
    """
    if not isinstance(text, str):
        return text

    # Look for the pattern collection.name(...) or similar
    # We want to find the content inside the outermost parentheses
    start_paren = text.find('(')
    end_paren = text.rfind(')')
    
    if start_paren == -1 or end_paren == -1:
        try:
            return json.loads(text)
        except:
            return None

    args_str = text[start_paren + 1:end_paren]
    
    # Split arguments by comma, but respecting nested brackets/braces
    args = []
    current_arg = []
    bracket_level = 0
    brace_level = 0
    quote = None
    
    for char in args_str:
        if quote:
            if char == quote:
                quote = None
            current_arg.append(char)
        elif char == '"' or char == "'":
            quote = char
            current_arg.append(char)
        elif char == '[':
            bracket_level += 1
            current_arg.append(char)
        elif char == ']':
            bracket_level -= 1
            current_arg.append(char)
        elif char == '{':
            brace_level += 1
            current_arg.append(char)
        elif char == '}':
            brace_level -= 1
            current_arg.append(char)
        elif char == ',' and bracket_level == 0 and brace_level == 0:
            args.append("".join(current_arg).strip())
            current_arg = []
        else:
            current_arg.append(char)
    
    args.append("".join(current_arg).strip())

    # The user stated the updates object is the 4th argument (index 3)
    if len(args) >= 4:
        updates_candidate = args[3]
        try:
            # Try to parse it as JSON. If it's not quite valid JSON (e.g. uses single quotes), 
            # we can attempt a simple replacement or use ast.literal_eval
            import ast
            return ast.literal_eval(updates_candidate)
        except Exception:
            try:
                return json.loads(updates_candidate)
            except Exception:
                logging.debug(f"Failed to parse 4th arg as JSON/Literal: {updates_candidate[:100]}...")
                return None
    
    # Fallback: if it's not exactly 4 args, try to find any arg that looks like it contains "updates"
    for arg in args:
        if '"updates"' in arg or "'updates'" in arg:
            try:
                import ast
                return ast.literal_eval(arg)
            except:
                try: return json.loads(arg)
                except: continue

    return None

def parse_threshold_time(time_str):
    """
    Parses a time string (e.g., '2:30pm mountain') into a datetime object.
    """
    logging.debug(f"Parsing threshold time: {time_str}")
    if not HAS_DATE_UTIL:
        logging.error("python-dateutil and pytz are required.")
        sys.exit(1)

    tz_map = {
        'mountain': 'America/Denver',
        'pst': 'America/Los_Angeles',
        'pdt': 'America/Los_Angeles',
        'est': 'America/New_York',
        'edt': 'America/New_York',
        'cst': 'America/Chicago',
        'cdt': 'America/Chicago',
        'pacific': 'America/Los_Angeles',
        'central': 'America/Chicago',
        'eastern': 'America/New_York'
    }

    parts = time_str.lower().split()
    tz_name = None
    search_str = time_str

    if len(parts) > 1:
        possible_tz = parts[-1]
        if possible_tz in tz_map:
            tz_name = tz_map[possible_tz]
            search_str = " ".join(parts[:-1])
        elif possible_tz in pytz.all_timezones:
            tz_name = possible_tz
            search_str = " ".join(parts[:-1])

    try:
        dt = date_parser.parse(search_str)
        if tz_name:
            tz = pytz.timezone(tz_name)
            if dt.tzinfo is None:
                dt = tz.localize(dt)
            else:
                dt = dt.astimezone(tz)
        logging.info(f"Threshold time parsed as: {dt}")
        return dt
    except Exception as e:
        logging.error(f"Error parsing time '{time_str}': {e}")
        sys.exit(1)

def process_csv(file_path, threshold_dt):
    """
    Processes CSV with flexible column detection.
    """
    logging.info(f"Processing CSV file: {file_path}")
    before_shapes, after_shapes = Counter(), Counter()
    before_count, after_count = 0, 0

    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Find columns flexibly
            ts_col = next((c for c in reader.fieldnames if c.lower() in ['timestamp', 'ts', 'time']), None)
            text_col = next((c for c in reader.fieldnames if c.lower() in ['sample text', 'text', 'query', 'sample_text']), None)

            if not ts_col or not text_col:
                logging.error(f"Could not find timestamp/text columns in CSV. Found: {reader.fieldnames}")
                sys.exit(1)

            logging.info(f"Using columns - Timestamp: {ts_col}, Text: {text_col}")

            for i, row in enumerate(reader):
                try:
                    row_dt = date_parser.parse(row[ts_col])
                    if threshold_dt.tzinfo is not None and row_dt.tzinfo is None:
                        row_dt = row_dt.replace(tzinfo=None).astimezone(threshold_dt.tzinfo)
                    
                    sample_text = row[text_col]
                    data = extract_updates_object(sample_text)
                    shapes = extract_shape(data) if data is not None else set()

                    if row_dt < threshold_dt:
                        for s in shapes: before_shapes[s] += 1
                        before_count += 1
                    else:
                        for s in shapes: after_shapes[s] += 1
                        after_count += 1
                except Exception as e:
                    logging.debug(f"Skipping row {i} due to error: {e}")
                    continue

        logging.info(f"CSV processing complete. Before: {before_count}, After: {after_count}")
        return before_shapes, before_count, after_shapes, after_count
    except Exception as e:
        logging.error(f"Error processing CSV {file_path}: {e}")
        sys.exit(1)

def process_json(file_path, threshold_dt):
    """
    Processes the specific nested JSON structure provided.
    """
    logging.info(f"Processing JSON file: {file_path}")
    before_shapes, after_shapes = Counter(), Counter()
    before_count, after_count = 0, 0

    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            content = json.load(f)
            # Navigate: data -> databaseQuerySamples -> samples
            samples = content.get('data', {}).get('databaseQuerySamples', {}).get('samples', [])
            
            if not samples:
                logging.warning("No samples found at data.databaseQuerySamples.samples, trying fallback 'samples' root key.")
                # Fallback if structure is slightly different
                samples = content.get('samples', []) 

            if not samples:
                logging.error(f"Could not find any samples in JSON file {file_path}")
                sys.exit(1)
            
            logging.info(f"Found {len(samples)} samples in JSON")

            for i, sample in enumerate(samples):
                try:
                    ts_str = sample.get('timestamp')
                    text_raw = sample.get('text')
                    if not ts_str or not text_raw:
                        logging.debug(f"Sample {i} missing timestamp ({ts_str}) or text ({text_raw}). Skipping.")
                        continue

                    row_dt = date_parser.parse(ts_str)
                    if threshold_dt.tzinfo is not None and row_dt.tzinfo is None:
                        row_dt = row_dt.replace(tzinfo=None).astimezone(threshold_dt.tzinfo)

                    data = extract_updates_object(text_raw)
                    shapes = extract_shape(data) if data is not None else set()

                    if row_dt < threshold_dt:
                        for s in shapes: before_shapes[s] += 1
                        before_count += 1
                    else:
                        for s in shapes: after_shapes[s] += 1
                        after_count += 1
                except Exception as e:
                    logging.error(f"Error parsing sample {i}: {e}")
                    continue

        logging.info(f"JSON processing complete. Before: {before_count}, After: {after_count}")
        return before_shapes, before_count, after_shapes, after_count
    except Exception as e:
        logging.error(f"Unexpected error while processing JSON {file_path}: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("time_str", help="Reference time (e.g. '2:30pm mountain')")
    parser.add_argument("input_file", help="Path to .json or .csv")
    args = parser.parse_args()

    # Configure logging to sys.stderr so it doesn't interfere with stdout redirection
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s',
        stream=sys.stderr
    )

    path = Path(args.input_file)
    if not path.exists():
        logging.error(f"File not found: {args.input_file}")
        sys.exit(1)

    threshold_dt = parse_threshold_time(args.time_str)
    print(f"Threshold: {threshold_dt}")

    ext = path.suffix.lower()
    if ext == '.json':
        before_shapes, b_tot, after_shapes, a_tot = process_json(args.input_file, threshold_dt)
    elif ext == '.csv':
        before_shapes, b_tot, after_shapes, a_tot = process_csv(args.input_file, threshold_dt)
    else:
        logging.error(f"Unsupported extension: {ext}")
        sys.exit(1)

    if b_tot == 0 or a_tot == 0:
        logging.warning(f"Insufficient data to compare rates. (Before: {b_tot}, After: {a_tot})")
        return

    all_shapes = set(before_shapes.keys()) | set(after_shapes.keys())
    results = []
    for s in all_shapes:
        r_b = before_shapes[s] / b_tot
        r_a = after_shapes[s] / a_tot
        diff = r_a - r_b
        if abs(diff) > 0.0001:
            results.append({'shape': s, 'rb': r_b, 'ra': r_a, 'diff': diff})

    results.sort(key=lambda x: abs(x['diff']), reverse=True)

    print(f"\n{'Query Shape':<60} | {'Before':<10} | {'After':<10} | {'Change'}")
    print("-" * 100)
    for r in results:
        dir_char = "+" if r['diff'] > 0 else "-"
        print(f"{r['shape']:<60} | {r['rb']:<10.2%} | {r['ra']:<10.2%} | {dir_char}{abs(r['diff']):.2%}")

if __name__ == "__main__":
    main()

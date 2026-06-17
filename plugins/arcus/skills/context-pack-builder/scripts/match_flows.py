import os
import json
import sys
import re

def extract_summary(file_path):
    """Extracts a summary or the first heading from a markdown file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read(1000) # Read first 1000 chars
            # Try to find a "Purpose" or "Summary" section
            match = re.search(r'#+\s*(?:Purpose|Summary)\s*\n+(.*)', content, re.IGNORECASE)
            if match:
                return match.group(1).strip().split('\n')[0]

            # Fallback: Find the first H1 or H2
            match = re.search(r'#+\s*(.*)', content)
            if match:
                return match.group(1).strip()
    except Exception:
        pass
    return "No summary available"

def list_flows(repo_root):
    flows_dir = os.path.join(repo_root, '.context', 'flows')
    if not os.path.exists(flows_dir):
        return {"error": f"Flows directory not found at {flows_dir}"}

    flows = {}
    for filename in os.listdir(flows_dir):
        if filename.endswith('.md'):
            file_path = os.path.join(flows_dir, filename)
            flows[filename] = extract_summary(file_path)

    return flows

if __name__ == "__main__":
    # Expects repo_root as argument
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    print(json.dumps(list_flows(root), indent=2))


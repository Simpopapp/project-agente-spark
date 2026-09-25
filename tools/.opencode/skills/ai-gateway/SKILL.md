---
name: ai-gateway
description: Use this skill when the user wants to call an AI model from a script run via code--exec. This includes data processing with AI, report generation, content creation, image generation, image editing, batch AI operations, entity extraction, classification, summarization, translation, or any one-off AI task in a script. If the user asks to use AI to analyze, classify, summarize, transform data, generate images, or edit images in a script, use this skill. NOT for building persistent AI features in the app (use edge functions instead).
---

# AI Gateway for Scripts

> **Scripts cannot be run directly from `knowledge://` paths.** Copy the script from the read-only mirror `/tmp/knowledge/skill/` to `/tmp/` with `code--exec` `cp`, then run with `code--exec`. Use `code--view` for reading files — not bash tools like `cat` or `ls`.

## Overview

This skill calls AI models (text completion, JSON output, structured extraction, batch, image generation, image editing) from the sandbox. The script handles the API key, rate limits, and error handling automatically. Output goes to stdout or a file.

## Steps

1. **Copy the script** from `knowledge://skill/ai-gateway/scripts/lovable_ai.py` to `/tmp/lovable_ai.py` using `code--exec` `cp` from the `/tmp/knowledge/skill/` mirror.
2. **Run with `code--exec`**:

```bash
code--exec python /tmp/lovable_ai.py "Summarize this text: ..."
```

### CLI Options

```bash
code--exec python /tmp/lovable_ai.py PROMPT [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `PROMPT` | — | Prompt text (`@file` reads from file, `-` for stdin) |
| `--system` | — | System message |
| `--model` | — | Model identifier — discover supported models using the `ai-gateway-models` knowledge file |
| `--output` | stdout | Write output to file |
| `--json` | — | Request JSON output (response_format: json_object) |
| `--schema` | — | JSON schema file for structured output via tool calling |
| `--batch` | — | File with one prompt per line; process all |
| `--delay` | `1.0` | Delay between batch requests in seconds |
| `--image` | — | Generate an image from the prompt (requires `--output`) |
| `--edit-image` | — | Edit an existing image (path to input image, requires `--output`) |

Mutual exclusions: `--json` vs `--schema`, `--batch` vs positional `PROMPT`, `--image`/`--edit-image` vs `--json`/`--schema`/`--batch`.

### Examples

Simple completion:
```bash
code--exec python /tmp/lovable_ai.py "Summarize this text: ..."
```

With system prompt and output file:
```bash
code--exec python /tmp/lovable_ai.py "Translate to French: Hello" --system "You are a translator" --output /mnt/documents/translation.txt
```

JSON output:
```bash
code--exec python /tmp/lovable_ai.py "List 5 capitals with populations" --json --output /mnt/documents/capitals.json
```

Structured output with schema file:
```bash
code--exec python /tmp/lovable_ai.py "Extract entities from: ..." --schema /tmp/schema.json --output /mnt/documents/entities.json
```

Long prompt from file:
```bash
code--exec python /tmp/lovable_ai.py @/tmp/long_prompt.txt --output /mnt/documents/result.txt
```

Batch processing:
```bash
code--exec python /tmp/lovable_ai.py --batch /tmp/prompts.txt --output /mnt/documents/results.json
```

Image generation:
```bash
code--exec python /tmp/lovable_ai.py "A sunset over mountains" --image --output /mnt/documents/sunset.png
```

Higher quality image (slower, more expensive):
```bash
code--exec python /tmp/lovable_ai.py "A sunset over mountains" --image --model google/gemini-3-pro-image --output /mnt/documents/sunset.png
```

Edit an existing image:
```bash
code--exec python /tmp/lovable_ai.py "Make the sky more purple" --edit-image /tmp/photo.png --output /mnt/documents/edited.png
```

### Schema File Format

For `--schema`, provide a JSON file with tool-calling metadata:

```json
{
  "name": "extract_entities",
  "description": "Extract named entities from text",
  "parameters": {
    "type": "object",
    "properties": {
      "entities": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "type": {"type": "string", "enum": ["person", "org", "location"]}
          },
          "required": ["name", "type"]
        }
      }
    },
    "required": ["entities"]
  }
}
```

## Environment

- **API key**: `LOVABLE_API_KEY` is pre-set in the sandbox — the script reads it automatically
- **Model**: pass `--model` with a supported model id discovered using the `ai-gateway-models` knowledge file
- **Output**: Save standalone deliverables to `/mnt/documents/` (Files), files the app displays or serves only to project paths, and temporary files to `/tmp/`. Add a Files copy only if the user asks for one. Follow an explicit destination.

**CRITICAL**: Always use `requests` for Python HTTP calls — never `urllib`. The sandbox has SSL issues that cause `urllib` to fail silently. The script already uses `requests`.

## Error Handling

The script exits with non-zero status on errors:
- **429**: Rate limited — increase `--delay` in batch calls or wait before retrying
- **402**: Credits exhausted — tell the user to add credits to the workspace from their workspace billing settings

## Advanced: Library Import

For complex cases requiring custom code, the script is also importable:

```python
import sys
sys.path.insert(0, "/tmp")
from lovable_ai import call_ai, call_ai_json, call_ai_structured, batch_call_ai, generate_image, edit_image
```

## When to Use Scripts vs Edge Functions

| Use Case | Approach |
|---|---|
| One-off data analysis with AI | Script via code--exec (this skill) |
| Generate a report or document using AI | Script via code--exec (this skill) |
| Batch process data with AI | Script via code--exec (this skill) |
| Content generation (emails, translations) | Script via code--exec (this skill) |
| Image generation or editing with AI | Script via code--exec (this skill) |
| Persistent AI chat feature in the app | Edge function |
| Streaming AI responses to end users | Edge function |

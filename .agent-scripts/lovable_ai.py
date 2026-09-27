"""Lovable AI Gateway — CLI tool and library for AI completions and image generation.

CLI usage:
    python lovable_ai.py "Summarize this text: ..."
    python lovable_ai.py @/tmp/prompt.txt --output /mnt/documents/result.txt
    python lovable_ai.py "List 5 capitals" --json --output /mnt/documents/data.json
    python lovable_ai.py "Extract entities" --schema /tmp/schema.json
    python lovable_ai.py --batch /tmp/prompts.txt --output /mnt/documents/results.json
    python lovable_ai.py "A sunset over mountains" --image --output /mnt/documents/sunset.png
    python lovable_ai.py "Make the sky purple" --edit-image /tmp/photo.png --output /mnt/documents/edited.png

Library usage:
    from lovable_ai import call_ai, call_ai_json, call_ai_structured, batch_call_ai, generate_image, edit_image
"""

import argparse
import base64
import json
import mimetypes
import os
import sys
import time

import requests

API_KEY = os.environ["LOVABLE_API_KEY"]
URL = "https://ai.gateway.lovable.dev/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-3-flash-preview"
DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image"

_HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


def call_ai(prompt, model=DEFAULT_MODEL, system=None):
    """Call the AI gateway and return the text response.

    Args:
        prompt: The user message to send.
        model: Model identifier (default: google/gemini-3-flash-preview).
        system: Optional system message.

    Returns:
        The assistant's text response.

    Raises:
        requests.HTTPError: On API errors (429=rate limited, 402=credits exhausted).
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = requests.post(
        URL,
        headers=_HEADERS,
        json={"model": model, "messages": messages},
    )
    _check_response(resp)
    return resp.json()["choices"][0]["message"]["content"]


def call_ai_json(prompt, model=DEFAULT_MODEL, system=None):
    """Call the AI gateway and return parsed JSON.

    Adds response_format: {"type": "json_object"} to request the model
    to return valid JSON. Returns parsed dict.

    Args:
        prompt: The user message to send.
        model: Model identifier (default: google/gemini-3-flash-preview).
        system: Optional system message.

    Returns:
        Parsed dict from the JSON response.

    Raises:
        requests.HTTPError: On API errors.
        json.JSONDecodeError: If the response is not valid JSON.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = requests.post(
        URL,
        headers=_HEADERS,
        json={
            "model": model,
            "messages": messages,
            "response_format": {"type": "json_object"},
        },
    )
    _check_response(resp)
    return json.loads(resp.json()["choices"][0]["message"]["content"])


def call_ai_structured(prompt, tool_name, tool_description, parameters, model=DEFAULT_MODEL, system=None):
    """Call the AI gateway with tool calling to get structured JSON output.

    Args:
        prompt: The user message to send.
        tool_name: Name of the tool/function to call.
        tool_description: Description of what the tool does.
        parameters: JSON Schema object describing the tool's parameters.
        model: Model identifier.
        system: Optional system message.

    Returns:
        Parsed dict from the tool call arguments.

    Raises:
        requests.HTTPError: On API errors.
        ValueError: If the response doesn't contain a tool call.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = requests.post(
        URL,
        headers=_HEADERS,
        json={
            "model": model,
            "messages": messages,
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": tool_name,
                        "description": tool_description,
                        "parameters": parameters,
                    },
                }
            ],
            "tool_choice": {"type": "function", "function": {"name": tool_name}},
        },
    )
    _check_response(resp)

    message = resp.json()["choices"][0]["message"]
    tool_calls = message.get("tool_calls")
    if not tool_calls:
        raise ValueError("No tool call in response. Got text: " + (message.get("content") or ""))
    return json.loads(tool_calls[0]["function"]["arguments"])


def batch_call_ai(prompts, model=DEFAULT_MODEL, system=None, delay=1.0):
    """Process multiple prompts with automatic delay between requests.

    Args:
        prompts: List of prompt strings.
        model: Model identifier.
        system: Optional system message.
        delay: Seconds to wait between requests (default: 1.0).

    Returns:
        List of text responses (same order as prompts).
    """
    results = []
    for i, prompt in enumerate(prompts):
        results.append(call_ai(prompt, model=model, system=system))
        if i < len(prompts) - 1:
            time.sleep(delay)
    return results


def generate_image(prompt, model=DEFAULT_IMAGE_MODEL, system=None):
    """Generate an image from a text prompt.

    Args:
        prompt: Text description of the image to generate.
        model: Image model identifier (default: google/gemini-2.5-flash-image).
        system: Optional system message.

    Returns:
        Tuple of (image_bytes, text_response). image_bytes is raw PNG data.
        text_response is the optional text content from the model (may be None).

    Raises:
        requests.HTTPError: On API errors.
        ValueError: If the response contains no image.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = requests.post(
        URL,
        headers=_HEADERS,
        json={"model": model, "messages": messages, "modalities": ["image", "text"]},
    )
    _check_response(resp)
    return _parse_image_response(resp.json())


def edit_image(prompt, image_path, model=DEFAULT_IMAGE_MODEL, system=None):
    """Edit an existing image using a text instruction.

    Args:
        prompt: Text instruction for how to edit the image.
        image_path: Path to the input image file (PNG, JPG, etc.).
        model: Image model identifier (default: google/gemini-2.5-flash-image).
        system: Optional system message.

    Returns:
        Tuple of (image_bytes, text_response). image_bytes is raw PNG data.
        text_response is the optional text content from the model (may be None).

    Raises:
        requests.HTTPError: On API errors.
        ValueError: If the response contains no image.
        FileNotFoundError: If image_path does not exist.
    """
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("ascii")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{mimetypes.guess_type(image_path)[0] or 'image/png'};base64,{image_data}"}},
        ],
    })

    resp = requests.post(
        URL,
        headers=_HEADERS,
        json={"model": model, "messages": messages, "modalities": ["image", "text"]},
    )
    _check_response(resp)
    return _parse_image_response(resp.json())


def _parse_image_response(data):
    """Extract image bytes and text from an image generation response.

    Returns:
        Tuple of (image_bytes, text_response).
    """
    message = data["choices"][0]["message"]
    images = message.get("images")
    if not images:
        raise ValueError("No image in response. Got text: " + (message.get("content") or ""))

    image_url = images[0]["image_url"]["url"]
    # Strip data URI prefix (handles any MIME type)
    if image_url.startswith("data:") and ";base64," in image_url:
        image_url = image_url.split(";base64,", 1)[1]
    image_bytes = base64.b64decode(image_url)

    text_response = message.get("content")
    return image_bytes, text_response


def _check_response(resp):
    """Check response and raise descriptive errors."""
    if resp.status_code == 429:
        raise requests.HTTPError(
            "Rate limited — wait before retrying or increase delay between requests",
            response=resp,
        )
    if resp.status_code == 402:
        raise requests.HTTPError(
            "Credits exhausted — add funds at Settings > Workspace > Usage",
            response=resp,
        )
    resp.raise_for_status()


def _read_prompt(value):
    """Read prompt from literal string, file (@path), or stdin (-).

    Args:
        value: Prompt string. "@path/to/file" reads from file, "-" reads stdin.

    Returns:
        The prompt text.
    """
    if value == "-":
        return sys.stdin.read()
    if value.startswith("@"):
        path = value[1:]
        with open(path) as f:
            return f.read()
    return value


def _write_output(text, output_path):
    """Write text to file or stdout."""
    if output_path:
        with open(output_path, "w") as f:
            f.write(text)
        print(f"Output written to {output_path}", file=sys.stderr)
    else:
        print(text)


def main():
    parser = argparse.ArgumentParser(
        description="Lovable AI Gateway — call AI models from the command line",
    )
    parser.add_argument(
        "prompt", nargs="?", default=None,
        help="Prompt text (@file reads from file, - for stdin)",
    )
    parser.add_argument("--system", default=None, help="System message")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model identifier (default: {DEFAULT_MODEL})")
    parser.add_argument("--output", default=None, help="Write output to file instead of stdout")
    parser.add_argument("--json", dest="json_mode", action="store_true",
                        help="Request JSON output (response_format: json_object)")
    parser.add_argument("--schema", default=None,
                        help="JSON schema file for structured output via tool calling")
    parser.add_argument("--batch", default=None,
                        help="File with one prompt per line; process all")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="Delay between batch requests in seconds (default: 1.0)")
    parser.add_argument("--image", dest="image_mode", action="store_true",
                        help="Generate an image from the prompt")
    parser.add_argument("--edit-image", default=None, metavar="FILE",
                        help="Edit an existing image (path to input image)")
    args = parser.parse_args()

    # Validate mutual exclusions
    if args.json_mode and args.schema:
        parser.error("--json and --schema are mutually exclusive")
    if args.batch and args.prompt:
        parser.error("--batch and positional PROMPT are mutually exclusive")
    if not args.batch and not args.prompt:
        parser.error("PROMPT is required (or use --batch)")
    image_mode = args.image_mode or args.edit_image
    if image_mode and (args.json_mode or args.schema or args.batch):
        parser.error("--image/--edit-image cannot be combined with --json, --schema, or --batch")
    if image_mode and not args.output:
        parser.error("--output is required for image generation")

    # Batch mode
    if args.batch:
        with open(args.batch) as f:
            prompts = [line.strip() for line in f if line.strip()]
        results = batch_call_ai(prompts, model=args.model, system=args.system, delay=args.delay)
        output = json.dumps(results, indent=2, ensure_ascii=False)
        _write_output(output, args.output)
        return

    # Single prompt
    prompt = _read_prompt(args.prompt)

    # Image generation/editing
    if args.image_mode or args.edit_image:
        model = args.model if args.model != DEFAULT_MODEL else DEFAULT_IMAGE_MODEL
        if args.edit_image:
            image_bytes, text_response = edit_image(prompt, args.edit_image, model=model, system=args.system)
        else:
            image_bytes, text_response = generate_image(prompt, model=model, system=args.system)
        with open(args.output, "wb") as f:
            f.write(image_bytes)
        print(f"Image written to {args.output}", file=sys.stderr)
        if text_response:
            print(text_response, file=sys.stderr)
        return

    if args.schema:
        with open(args.schema) as f:
            schema = json.load(f)
        tool_name = schema.get("name", "extract")
        tool_desc = schema.get("description", "Extract structured data")
        params = schema.get("parameters") or schema
        # If schema has top-level "type": "object" with "properties", use it directly as parameters
        if "properties" in params and params.get("type") == "object":
            tool_params = params
        else:
            tool_params = {"type": "object", "properties": params, "required": list(params.keys())}
        result = call_ai_structured(
            prompt, tool_name, tool_desc, tool_params,
            model=args.model, system=args.system,
        )
        output = json.dumps(result, indent=2, ensure_ascii=False)
    elif args.json_mode:
        result = call_ai_json(prompt, model=args.model, system=args.system)
        output = json.dumps(result, indent=2, ensure_ascii=False)
    else:
        output = call_ai(prompt, model=args.model, system=args.system)

    _write_output(output, args.output)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Inspect an external project export without extracting it or running its code."""

import argparse
import json
import os
import pathlib
import re
import stat
import sys
import zipfile
import zlib
from contextlib import contextmanager
from dataclasses import dataclass

MAX_ARCHIVE_BYTES = 512 * 1024 * 1024
MAX_EXPANDED_BYTES = 2 * 1024 * 1024 * 1024
MAX_FILES = 50_000
MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_TEXT_BYTES = 25 * 1024 * 1024
SKIP_PARTS = {".git", "node_modules", ".next", "dist", "build", "coverage", ".cache", ".turbo"}
TEXT_SUFFIXES = {
    ".cjs", ".css", ".go", ".graphql", ".html", ".js", ".jsx", ".json", ".jsonc", ".md",
    ".mjs", ".prisma", ".py", ".rb", ".rs", ".scss", ".sh", ".sql", ".toml",
    ".ts", ".tsx", ".vue", ".yaml", ".yml",
}
SECRET_NAMES = {
    ".env", ".env.local", ".npmrc", ".netrc", "credentials.json", "id_ed25519",
    "id_rsa", "kubeconfig", "service-account.json",
}
SECRET_SUFFIXES = {".cer", ".crt", ".der", ".key", ".p12", ".pem", ".pfx"}
ENTITY_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$")
ROUTE_FILES = {"page.js", "page.jsx", "page.ts", "page.tsx", "page.mdx", "route.js", "route.ts"}
PAGE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx", ".mdx"}
TEST_NAME = re.compile(r"(?:^|[._-])(test|spec)(?:[._-]|$)")
SOURCE_DIRS = {"app", "base44", "client", "lib", "pages", "server", "src"}


@dataclass(frozen=True)
class ProjectFile:
    path: str
    size: int
    source: object


def fail(message):
    raise ValueError(message)


def normalized_path(raw):
    value = raw.replace("\\", "/")
    path = pathlib.PurePosixPath(value)
    if not value or value.startswith("/") or re.match(r"^[A-Za-z]:", value):
        fail(f"unsafe absolute path: {raw}")
    if any(part in {"", ".", ".."} for part in path.parts):
        fail(f"unsafe path traversal: {raw}")
    return str(path)


def skipped(path):
    pure = pathlib.PurePosixPath(path)
    return bool(set(pure.parts) & (SKIP_PARTS | {"__MACOSX"})) or pure.name == ".DS_Store"


def sensitive(path):
    pure = pathlib.PurePosixPath(path)
    name = pure.name.lower()
    return (
        name in SECRET_NAMES
        or (name.startswith(".env.") and not name.endswith((".example", ".sample", ".template")))
        or pure.suffix.lower() in SECRET_SUFFIXES
        or bool({part.lower() for part in pure.parts} & {".aws", ".gnupg", ".ssh"})
        or bool(re.search(r"(?:service[-_]?account|credentials).*\.json$", name))
    )


def directory_files(root):
    files = []
    file_count = 0
    for current, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = [name for name in dirs if name not in SKIP_PARTS]
        for name in dirs:
            directory = pathlib.Path(current, name)
            if directory.is_symlink():
                fail(f"symbolic links are not accepted: {directory.relative_to(root)}")
        for name in names:
            file_count += 1
            if file_count > MAX_FILES:
                fail(f"project contains more than {MAX_FILES} files")
            file = pathlib.Path(current, name)
            path = normalized_path(file.relative_to(root).as_posix())
            if skipped(path):
                continue
            if file.is_symlink():
                fail(f"symbolic links are not accepted: {file.relative_to(root)}")
            files.append(ProjectFile(path, file.stat().st_size, file))
    return files


def archive_files(archive, package):
    if archive.stat().st_size > MAX_ARCHIVE_BYTES:
        fail(f"archive exceeds {MAX_ARCHIVE_BYTES} bytes")
    items = package.infolist()
    if len(items) > MAX_FILES:
        fail(f"archive contains more than {MAX_FILES} entries")
    files = []
    seen = set()
    expanded = 0
    for item in items:
        if item.is_dir():
            continue
        path = normalized_path(item.filename)
        expanded += item.file_size
        if expanded > MAX_EXPANDED_BYTES:
            fail(f"expanded archive exceeds {MAX_EXPANDED_BYTES} bytes")
        if skipped(path):
            continue
        folded = path.casefold()
        if folded in seen:
            fail(f"duplicate normalized path: {path}")
        seen.add(folded)
        if stat.S_ISLNK(item.external_attr >> 16):
            fail(f"symbolic links are not accepted: {path}")
        files.append(ProjectFile(path, item.file_size, item))
    return files


# Declared entry sizes are attacker-controlled; a bounded read that must match
# them keeps a forged tiny size from decompressing gigabytes into memory.
def read_archive_entry(package, item):
    try:
        with package.open(item) as stream:
            data = stream.read(MAX_TEXT_FILE_BYTES + 1)
    except (RuntimeError, zlib.error) as error:
        fail(f"unreadable archive entry {item.filename}: {error}")
    if len(data) != item.file_size:
        fail(f"file content does not match its declared size: {item.filename}")
    return data


@contextmanager
def open_project(project):
    if project.is_file():
        with zipfile.ZipFile(project) as package:
            yield archive_files(project, package), lambda file: read_archive_entry(package, file.source)
    else:
        yield directory_files(project), lambda file: file.source.read_bytes()


def add_unique(target, value):
    if value and value not in target:
        target.append(value)


# GitHub "Download ZIP" and Finder archives wrap the project in one folder.
def common_root(files):
    parts = [pathlib.PurePosixPath(file.path).parts for file in files]
    firsts = {path[0] for path in parts}
    if not parts or len(firsts) != 1 or any(len(path) < 2 for path in parts):
        return None
    root = firsts.pop()
    return None if root.lower() in SOURCE_DIRS else root


def strip_root(files, root):
    return [ProjectFile(file.path[len(root) + 1:], file.size, file.source) for file in files]


def non_runtime_path(path):
    pure = pathlib.PurePosixPath(path)
    parts = {part.lower() for part in pure.parts}
    return (
        pure.suffix.lower() == ".md"
        or bool(parts & {"__tests__", "docs", "fixtures", "test", "tests"})
        or bool(TEST_NAME.search(pure.name.lower()))
    )


def parse_json(text):
    try:
        return json.loads(text)
    except (json.JSONDecodeError, RecursionError):
        return None


def package_details(manifest, path, text):
    package = parse_json(text)
    if not isinstance(package, dict):
        add_unique(manifest["warnings"], f"Could not parse {path}")
        return
    dependencies = package.get("dependencies")
    dev_dependencies = package.get("devDependencies")
    scripts = package.get("scripts")
    manifest["packages"].append({
        "path": path,
        "dependencies": sorted(dependencies) if isinstance(dependencies, dict) else [],
        "dev_dependencies": sorted(dev_dependencies) if isinstance(dev_dependencies, dict) else [],
        "scripts": sorted(name for name in scripts if name in {"build", "dev", "start"}) if isinstance(scripts, dict) else [],
        "package_manager": package.get("packageManager"),
    })


def record_manifest(manifest, path, text):
    pure = pathlib.PurePosixPath(path)
    if pure.name != "manifest.json" or "database-records" not in pure.parts:
        return
    document = parse_json(text)
    if not isinstance(document, dict):
        add_unique(manifest["warnings"], f"Could not parse {path}")
        return
    exported = document.get("tables", {})
    if not isinstance(exported, dict):
        return
    manifest["record_export"]["manifest"] = path
    records_dir = str(pure.parent)
    for name, details in exported.items():
        if not isinstance(name, str) or not ENTITY_NAME.fullmatch(name):
            add_unique(manifest["warnings"], "Ignored record table: invalid name")
            continue
        if not isinstance(details, dict):
            continue
        file = details.get("file")
        if file is not None:
            # Normalizing the raw value rejects absolute and traversal paths;
            # rebasing onto the manifest's own directory then pins it inside.
            try:
                file = records_dir + "/" + normalized_path(file)
                if sensitive(file):
                    raise ValueError(file)
            except (AttributeError, TypeError, ValueError):
                add_unique(manifest["warnings"], f"Ignored record table {name}: unsafe file path")
                continue
        manifest["record_export"]["tables"].append({
            "name": name,
            "count": details.get("count"),
            "file": file,
        })


def base44_entity_path(pure):
    lowered = [part.lower() for part in pure.parts]
    return len(lowered) >= 3 and lowered[-3:-1] == ["base44", "entities"] and pure.suffix.lower() in {".json", ".jsonc"}


def record_base44_entity(manifest, path, pure, text):
    entity = parse_json(text)
    if entity is None:
        add_unique(manifest["warnings"], f"Could not parse {path}")
    declared = entity.get("name") if isinstance(entity, dict) else None
    entity_name = declared if isinstance(declared, str) and ENTITY_NAME.fullmatch(declared) else pure.stem
    if not ENTITY_NAME.fullmatch(entity_name):
        add_unique(manifest["warnings"], f"Ignored Base44 entity {path}: invalid name")
    elif not any(table["name"] == entity_name for table in manifest["schema_tables"]):
        manifest["schema_tables"].append({"name": entity_name, "path": path})
    add_unique(manifest["source_artifacts"], path)


def scan_text(manifest, path, text):
    pure = pathlib.PurePosixPath(path)
    if base44_entity_path(pure):
        if non_runtime_path(str(pure.parent)):
            return
        record_base44_entity(manifest, path, pure, text)
        return
    if non_runtime_path(path):
        return
    if pure.name == "package.json":
        package_details(manifest, path, text)
    record_manifest(manifest, path, text)

    for pattern in (
        r"process\.env\.([A-Z][A-Z0-9_]*)",
        r"import\.meta\.env\.([A-Z][A-Z0-9_]*)",
        r"(?:Deno\.)?env\.get\([\"']([A-Z][A-Z0-9_]*)[\"']\)",
        r"os\.(?:environ\[[\"']|getenv\([\"'])([A-Z][A-Z0-9_]*)",
    ):
        for match in re.finditer(pattern, text):
            add_unique(manifest["environment_variables"], match.group(1))

    for pattern in (
        r"<Route[^>]+path=[\"']([^\"']+)",
        r"\b(?:app|router)\.(?:get|post|put|patch|delete|use)\([\"']([^\"']+)",
    ):
        for match in re.finditer(pattern, text):
            if match.group(1).startswith("/"):
                add_unique(manifest["routes"], match.group(1))

    parts = {part.lower() for part in pure.parts}
    name = pure.name.lower()
    in_migrations = "migrations" in parts
    schema_named = name.startswith("schema.")
    sql_suffix = pure.suffix.lower() == ".sql"
    active_schema = not in_migrations and (
        schema_named or (sql_suffix and not re.match(r"^\d", name))
    )
    migration_schema = not active_schema and (sql_suffix or (schema_named and in_migrations))
    if active_schema or migration_schema:
        target = manifest["schema_tables"] if active_schema else manifest["migration_schema_tables"]
        for pattern in (
            r"\b(?:mysql|pg|sqlite)Table\(\s*[\"'`]([^\"'`]+)",
            r"\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[`\"']?[A-Za-z_][A-Za-z0-9_]*[`\"']?\.)?[`\"']?([A-Za-z_][A-Za-z0-9_]*)",
            r"^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{",
        ):
            for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
                name = match.group(1)
                if not any(table["name"] == name for table in target):
                    target.append({"name": name, "path": path})


def router_segments(parts, root):
    if parts[:1] == (root,):
        return parts[1:-1]
    if parts[:2] == ("src", root):
        return parts[2:-1]
    return None


def route_path(segments):
    kept = []
    for segment in segments:
        if segment.startswith("_"):
            return None
        if segment.startswith("(...)"):
            kept.clear()
            segment = segment[5:]
        while segment.startswith("(..)"):
            if not kept:
                return None
            kept.pop()
            segment = segment[4:]
        if segment.startswith("(.)"):
            segment = segment[3:]
        if not segment.startswith(("(", "@")):
            kept.append(segment)
    return "/" + "/".join(kept)


def filesystem_signals(manifest, path):
    pure = pathlib.PurePosixPath(path)
    name = pure.name
    if not non_runtime_path(path) and (name in {"drizzle.config.ts", "schema.prisma"} or "/migrations/" in f"/{path}"):
        add_unique(manifest["source_artifacts"], path)
    segments = router_segments(pure.parts, "app")
    if segments is not None:
        if name in ROUTE_FILES:
            add_unique(manifest["routes"], route_path(segments))
        return
    segments = router_segments(pure.parts, "pages")
    if segments is not None and pure.suffix.lower() in PAGE_SUFFIXES:
        stem = pure.stem
        if not segments and stem in {"_app", "_document", "_error", "404", "500"}:
            return
        add_unique(manifest["pages_router_routes"], "/" + "/".join(segments + (() if stem == "index" else (stem,))))


def normalize_source(value):
    return re.sub(r"\s+", "-", (value or "").strip().lower()) or "unknown"


def inspect(project, source="unknown"):
    manifest = {
        "schema_version": 1,
        "source": normalize_source(source),
        "artifact": {"name": project.name},
        "safety": {"executed_source_code": False, "sensitive_files_excluded": []},
        "packages": [], "routes": [], "pages_router_routes": [], "environment_variables": [], "schema_tables": [],
        "migration_schema_tables": [],
        "record_export": {"manifest": None, "coverage": "absent", "tables": []},
        "source_artifacts": [], "warnings": [],
    }
    with open_project(project) as (files, read):
        root = common_root(files)
        if root:
            if sensitive(root):
                fail(f"sensitive project root: {root}")
            files = strip_root(files, root)
            manifest["artifact"]["root"] = root
        total_bytes = sum(file.size for file in files)
        if total_bytes > MAX_EXPANDED_BYTES:
            fail(f"project exceeds {MAX_EXPANDED_BYTES} expanded bytes")
        manifest["artifact"].update({"file_count": len(files), "expanded_bytes": total_bytes})
        text_bytes = 0
        for file in files:
            filesystem_signals(manifest, file.path)
            if sensitive(file.path):
                add_unique(manifest["safety"]["sensitive_files_excluded"], file.path)
                continue
            if pathlib.PurePosixPath(file.path).suffix.lower() not in TEXT_SUFFIXES or file.size > MAX_TEXT_FILE_BYTES:
                continue
            if text_bytes + file.size > MAX_TOTAL_TEXT_BYTES:
                add_unique(manifest["warnings"], "Text analysis skipped files over the aggregate byte limit")
                continue
            data = read(file)
            text_bytes += len(data)
            if b"\0" not in data[:8192]:
                scan_text(manifest, file.path, data.decode("utf-8", errors="replace"))

    uses_next = any("next" in package["dependencies"] or "next" in package["dev_dependencies"] for package in manifest["packages"])
    for route in manifest["pages_router_routes"] if uses_next else ():
        add_unique(manifest["routes"], route)
    del manifest["pages_router_routes"]

    schema_source = "active"
    if not manifest["schema_tables"] and manifest["migration_schema_tables"]:
        manifest["schema_tables"] = manifest["migration_schema_tables"]
        schema_source = "migration"
        add_unique(manifest["warnings"], "Schema tables were inferred from migration files and may be historical")
    del manifest["migration_schema_tables"]

    schema = {table["name"] for table in manifest["schema_tables"]}
    records = {table["name"] for table in manifest["record_export"]["tables"]}
    manifest["schema_source"] = schema_source if schema else "absent"
    if records:
        manifest["record_export"]["coverage"] = (
            "complete" if schema_source == "active" and schema and schema <= records
            else "partial" if schema_source == "active" and schema
            else "unknown"
        )
    if manifest["schema_source"] == "active" and records and schema - records:
        add_unique(manifest["warnings"], "Bundled records are missing schema tables: " + ", ".join(sorted(schema - records)))
    if not manifest["packages"]:
        add_unique(manifest["warnings"], "No package.json was detected")
    if manifest["safety"]["sensitive_files_excluded"]:
        add_unique(manifest["warnings"], "Sensitive-looking files were excluded from content inspection")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=pathlib.Path)
    parser.add_argument("--source", default="unknown", help="source named in the import request: replit, manus, bolt, base44, v0, github, code-archive, site, or other")
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()
    try:
        if not args.project.exists():
            fail(f"project not found: {args.project}")
        if args.project.is_file() and not zipfile.is_zipfile(args.project):
            fail("only ZIP archives or directories are supported")
        result = inspect(args.project, args.source)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        return 2
    output = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())

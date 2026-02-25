#!/usr/bin/env python3
"""Extract GPT auth endpoints into a standalone OpenAPI file.

Default input:
  backend/storage/api-docs/api-docs.json

Default output:
  backend/storage/api-docs/gpt-auth-openapi.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


GPT_PATHS = [
    "/api/gpt-auth/confirm",
    "/api/gpt-auth/exchange",
    "/api/gpt-auth/register",
    "/api/gpt-auth/revoke",
]

COMPONENT_GROUPS = [
    "schemas",
    "responses",
    "parameters",
    "requestBodies",
    "securitySchemes",
    "headers",
    "examples",
    "links",
    "callbacks",
]


def collect_component_refs(node: Any, used: dict[str, set[str]]) -> None:
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/"):
            parts = ref.split("/")
            if len(parts) >= 4:
                group = parts[2]
                name = "/".join(parts[3:])
                if group in used:
                    used[group].add(name)

        for value in node.values():
            collect_component_refs(value, used)
        return

    if isinstance(node, list):
        for value in node:
            collect_component_refs(value, used)


def extract_gpt_spec(source: Path, output: Path) -> None:
    data = json.loads(source.read_text())

    source_paths = data.get("paths", {})
    selected_paths = {path: source_paths[path] for path in GPT_PATHS if path in source_paths}

    spec: dict[str, Any] = {
        "openapi": data.get("openapi", "3.0.0"),
        "info": data.get("info", {}),
        "servers": data.get("servers", []),
        "paths": selected_paths,
    }

    components: dict[str, dict[str, Any]] = data.get("components", {})
    used: dict[str, set[str]] = {group: set() for group in COMPONENT_GROUPS}
    collect_component_refs(spec["paths"], used)

    # Some operations reference security schemes by name via `security`,
    # without a `$ref`, so collect those names explicitly.
    for path_item in selected_paths.values():
        if not isinstance(path_item, dict):
            continue
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            for requirement in operation.get("security", []) or []:
                if isinstance(requirement, dict):
                    for scheme_name in requirement.keys():
                        used["securitySchemes"].add(scheme_name)

    changed = True
    while changed:
        before = {group: len(names) for group, names in used.items()}
        for group, names in used.items():
            source_group = components.get(group, {})
            for name in list(names):
                component = source_group.get(name)
                if component is not None:
                    collect_component_refs(component, used)
        after = {group: len(names) for group, names in used.items()}
        changed = before != after

    trimmed_components: dict[str, dict[str, Any]] = {}
    for group, names in used.items():
        if not names:
            continue
        source_group = components.get(group, {})
        selected = {name: source_group[name] for name in sorted(names) if name in source_group}
        if selected:
            trimmed_components[group] = selected

    if trimmed_components:
        spec["components"] = trimmed_components

    tag_names: list[str] = []
    for path_item in selected_paths.values():
        if not isinstance(path_item, dict):
            continue
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            for tag in operation.get("tags", []) or []:
                if tag not in tag_names:
                    tag_names.append(tag)

    source_tags = data.get("tags", [])
    if source_tags and tag_names:
        tags_by_name = {
            tag.get("name"): tag
            for tag in source_tags
            if isinstance(tag, dict) and isinstance(tag.get("name"), str)
        }
        selected_tags = [tags_by_name[name] for name in tag_names if name in tags_by_name]
        if selected_tags:
            spec["tags"] = selected_tags

    output.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract GPT auth OpenAPI schema.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("backend/storage/api-docs/api-docs.json"),
        help="Path to the full OpenAPI file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("backend/storage/api-docs/gpt-auth-openapi.json"),
        help="Path to write the GPT-only OpenAPI file.",
    )
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"Source spec not found: {args.source}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    extract_gpt_spec(args.source, args.output)
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

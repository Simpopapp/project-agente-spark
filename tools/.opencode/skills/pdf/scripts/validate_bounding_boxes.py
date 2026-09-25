from dataclasses import dataclass
import json
import sys




@dataclass
class BoundedRegion:
    rect: list[float]
    rect_type: str
    field: dict


def validate_all_regions(fields_json_stream) -> list[str]:
    diagnostics = []
    fields = json.load(fields_json_stream)
    diagnostics.append(f"Read {len(fields['form_fields'])} fields")

    def regions_overlap(r1, r2):
        disjoint_horizontal = r1[0] >= r2[2] or r1[2] <= r2[0]
        disjoint_vertical = r1[1] >= r2[3] or r1[3] <= r2[1]
        return not (disjoint_horizontal or disjoint_vertical)

    bounded_regions = []
    for f in fields["form_fields"]:
        bounded_regions.append(BoundedRegion(f["label_bounding_box"], "label", f))
        bounded_regions.append(BoundedRegion(f["entry_bounding_box"], "entry", f))

    found_violations = False
    for i, ri in enumerate(bounded_regions):
        for j in range(i + 1, len(bounded_regions)):
            rj = bounded_regions[j]
            if ri.field["page_number"] == rj.field["page_number"] and regions_overlap(ri.rect, rj.rect):
                found_violations = True
                if ri.field is rj.field:
                    diagnostics.append(f"FAILURE: intersection between label and entry bounding boxes for `{ri.field['description']}` ({ri.rect}, {rj.rect})")
                else:
                    diagnostics.append(f"FAILURE: intersection between {ri.rect_type} bounding box for `{ri.field['description']}` ({ri.rect}) and {rj.rect_type} bounding box for `{rj.field['description']}` ({rj.rect})")
                if len(diagnostics) >= 20:
                    diagnostics.append("Aborting further checks; fix bounding boxes and try again")
                    return diagnostics
        if ri.rect_type == "entry":
            if "entry_text" in ri.field:
                font_size = ri.field["entry_text"].get("font_size", 14)
                entry_height = ri.rect[3] - ri.rect[1]
                if entry_height < font_size:
                    found_violations = True
                    diagnostics.append(f"FAILURE: entry bounding box height ({entry_height}) for `{ri.field['description']}` is too short for the text content (font size: {font_size}). Increase the box height or decrease the font size.")
                    if len(diagnostics) >= 20:
                        diagnostics.append("Aborting further checks; fix bounding boxes and try again")
                        return diagnostics

    if not found_violations:
        diagnostics.append("SUCCESS: All bounding boxes are valid")
    return diagnostics

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: validate_bounding_boxes.py [fields.json]")
        sys.exit(1)
    with open(sys.argv[1]) as f:
        diagnostics = validate_all_regions(f)
    for msg in diagnostics:
        print(msg)

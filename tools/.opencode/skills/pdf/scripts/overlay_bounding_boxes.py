import json
import sys

from PIL import Image, ImageDraw




def draw_bounding_overlays(page_number, fields_json_path, input_path, output_path):
    with open(fields_json_path, 'r') as f:
        data = json.load(f)

        canvas = Image.open(input_path)
        renderer = ImageDraw.Draw(canvas)
        overlay_count = 0

        for field in data["form_fields"]:
            if field["page_number"] == page_number:
                entry_bounds = field['entry_bounding_box']
                label_bounds = field['label_bounding_box']
                renderer.rectangle(entry_bounds, outline='red', width=2)
                renderer.rectangle(label_bounds, outline='blue', width=2)
                overlay_count += 2

        canvas.save(output_path)
        print(f"Created validation image at {output_path} with {overlay_count} bounding boxes")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: overlay_bounding_boxes.py [page number] [fields.json file] [input image path] [output image path]")
        sys.exit(1)
    page_number = int(sys.argv[1])
    fields_json_path = sys.argv[2]
    input_image_path = sys.argv[3]
    output_image_path = sys.argv[4]
    draw_bounding_overlays(page_number, fields_json_path, input_image_path, output_image_path)

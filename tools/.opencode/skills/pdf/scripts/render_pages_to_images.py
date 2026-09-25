import os
import sys

from pdf2image import convert_from_path




def render_pages(pdf_path, output_dir, max_dim=1000):
    rendered_pages = convert_from_path(pdf_path, dpi=200)

    for i, image in enumerate(rendered_pages):
        width, height = image.size
        if width > max_dim or height > max_dim:
            resize_ratio = min(max_dim / width, max_dim / height)
            new_width = int(width * resize_ratio)
            new_height = int(height * resize_ratio)
            image = image.resize((new_width, new_height))

        output_path = os.path.join(output_dir, f"page_{i+1}.png")
        image.save(output_path)
        print(f"Saved page {i+1} as {output_path} (size: {image.size})")

    print(f"Converted {len(rendered_pages)} pages to PNG images")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: render_pages_to_images.py [input pdf] [output directory]")
        sys.exit(1)
    pdf_path = sys.argv[1]
    output_directory = sys.argv[2]
    render_pages(pdf_path, output_directory)

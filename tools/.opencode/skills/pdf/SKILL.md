---
name: pdf
description: Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.
---

# PDF Processing Guide

> **Skill scripts must be copied to a local path before execution.** Copy each script from the read-only mirror `/tmp/knowledge/skill/` to `/tmp/` with `code--exec` `cp`, then run with `code--exec`. Use `code--view` for reading files — not bash tools like `cat` or `ls`.

## Overview

This guide covers essential PDF processing operations using Python libraries and command-line tools. For advanced features, JavaScript libraries, and detailed examples, see knowledge://skill/pdf/advanced_reference.md. If you need to fill out a PDF form, read knowledge://skill/pdf/form_filling_guide.md and follow its instructions.

## Getting Started

```python
from pypdf import PdfReader, PdfWriter

# Read a PDF
reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

# Extract text
text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Python Toolkit

### pypdf - Basic Operations

#### Merge PDFs
```python
from pypdf import PdfWriter, PdfReader

pdf_writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    pdf_reader = PdfReader(pdf_file)
    for page in pdf_reader.pages:
        pdf_writer.add_page(page)

with open("merged.pdf", "wb") as merged_file:
    pdf_writer.write(merged_file)
```

#### Split PDF
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    page_writer = PdfWriter()
    page_writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as page_file:
        page_writer.write(page_file)
```

#### Extract Metadata
```python
doc_reader = PdfReader("document.pdf")
doc_meta = doc_reader.metadata
print(f"Title: {doc_meta.title}")
print(f"Author: {doc_meta.author}")
print(f"Subject: {doc_meta.subject}")
print(f"Creator: {doc_meta.creator}")
```

#### Rotate Pages
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()

page = reader.pages[0]
page.rotate(90)  # Rotate 90 degrees clockwise
writer.add_page(page)

with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

### pdfplumber - Text and Table Extraction

#### Extract Text with Layout
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

#### Extract Tables
```python
with pdfplumber.open("document.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for j, table in enumerate(tables):
            print(f"Table {j+1} on page {i+1}:")
            for row in table:
                print(row)
```

#### Advanced Table Extraction
```python
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    collected_tables = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table:  # Check if table is not empty
                df = pd.DataFrame(table[1:], columns=table[0])
                collected_tables.append(df)

# Combine all tables
if collected_tables:
    merged_dataframe = pd.concat(collected_tables, ignore_index=True)
    merged_dataframe.to_excel("extracted_tables.xlsx", index=False)
```

### reportlab - Create PDFs

#### Basic PDF Creation
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

pdf_canvas = canvas.Canvas("hello.pdf", pagesize=letter)
page_width, page_height = letter

# Add text
pdf_canvas.drawString(100, page_height - 100, "Hello World!")
pdf_canvas.drawString(100, page_height - 120, "This is a PDF created with reportlab")

# Add a line
pdf_canvas.line(100, page_height - 140, 400, page_height - 140)

# Save
pdf_canvas.save()
```

#### Create PDF with Multiple Pages
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

report_doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
content_flow = []

# Add content
title_para = Paragraph("Report Title", styles['Title'])
content_flow.append(title_para)
content_flow.append(Spacer(1, 12))

body_para = Paragraph("This is the body of the report. " * 20, styles['Normal'])
content_flow.append(body_para)
content_flow.append(PageBreak())

# Page 2
content_flow.append(Paragraph("Page 2", styles['Heading1']))
content_flow.append(Paragraph("Content for page 2", styles['Normal']))

# Build PDF
report_doc.build(content_flow)
```

#### Subscripts and Superscripts

**IMPORTANT**: Never use Unicode subscript/superscript characters (₀₁₂₃₄₅₆₇₈₉, ⁰¹²³⁴⁵⁶⁷⁸⁹) in ReportLab PDFs. The built-in fonts do not include these glyphs, causing them to render as solid black boxes.

Instead, use ReportLab's XML markup tags in Paragraph objects:
```python
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()

# Subscripts: use <sub> tag
chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])

# Superscripts: use <super> tag
squared = Paragraph("x<super>2</super> + y<super>2</super>", styles['Normal'])
```

For canvas-drawn text (not Paragraph objects), manually adjust font the size and position rather than using Unicode subscripts/superscripts.

#### Accented and Non-ASCII Text (Portuguese, French, etc.)

**IMPORTANT**: ReportLab's built-in fonts (`Helvetica`, `Times-Roman`, `Courier`) mangle or drop accented characters (`á ã ç é õ`, etc.), so text in Portuguese, French, Spanish, and most non-English languages renders wrong. These fonts ignore fontconfig, so installing a TTF alone does not help — you must register and use a Unicode TTF explicitly.

Register DejaVu Sans (ships in the sandbox, covers Latin-1 and more) and use it as the font:

```python
import subprocess
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Resolve the installed DejaVu Sans TTF path via fontconfig
font_path = subprocess.check_output(
    ["fc-match", "-f", "%{file}", "DejaVu Sans"], text=True
).strip()
pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))

# canvas: pass the registered font name to setFont
pdf_canvas.setFont("DejaVuSans", 12)
pdf_canvas.drawString(100, 700, "Ação, coração, informação — açúcar")

# Platypus: set fontName on the paragraph style
from reportlab.lib.styles import getSampleStyleSheet
styles = getSampleStyleSheet()
styles["Normal"].fontName = "DejaVuSans"
```

For bold/italic, register the matching TTF variants (`fc-match "DejaVu Sans:bold"`, etc.) and set `fontName` accordingly. Always use the registered Unicode font whenever the document contains any non-ASCII character.

## CLI Utilities

### pdftotext (poppler-utils)
```bash
# Extract text
pdftotext input.pdf output.txt

# Extract text preserving layout
pdftotext -layout input.pdf output.txt

# Extract specific pages
pdftotext -f 1 -l 5 input.pdf output.txt  # Pages 1-5
```

### qpdf
```bash
# Merge PDFs
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# Split pages
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
qpdf input.pdf --pages . 6-10 -- pages6-10.pdf

# Rotate pages
qpdf input.pdf output.pdf --rotate=+90:1  # Rotate page 1 by 90 degrees

# Remove password
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

### pdftk (if available)
```bash
# Merge
pdftk file1.pdf file2.pdf cat output merged.pdf

# Split
pdftk input.pdf burst

# Rotate
pdftk input.pdf rotate 1east output rotated.pdf
```

## Typical Workflows

### Extract Text from Scanned PDFs
```python
# Requires: pip install pytesseract pdf2image
import pytesseract
from pdf2image import convert_from_path

# Convert PDF to images
page_images = convert_from_path('scanned.pdf')

# OCR each page
extracted_text = ""
for i, image in enumerate(page_images):
    extracted_text += f"Page {i+1}:\n"
    extracted_text += pytesseract.image_to_string(image)
    extracted_text += "\n\n"

print(extracted_text)
```

### Add Watermark
```python
from pypdf import PdfReader, PdfWriter

# Create watermark (or load existing)
watermark = PdfReader("watermark.pdf").pages[0]

# Apply to all pages
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as output:
    writer.write(output)
```

### Extract Images
```bash
# Using pdfimages (poppler-utils)
pdfimages -j input.pdf output_prefix

# This extracts all images as output_prefix-000.jpg, output_prefix-001.jpg, etc.
```

### Password Protection
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

# Add password
writer.encrypt("userpassword", "ownerpassword")

with open("encrypted.pdf", "wb") as output:
    writer.write(output)
```

## Quality Assurance (Mandatory)

**Treat every generated PDF as broken until you've visually proven otherwise.**

Your first render is almost never correct. Approach QA as a bug hunt, not a confirmation step. If you found zero issues on first inspection, you weren't looking hard enough.

### Visual Inspection

After generating a PDF, convert to images and inspect:

```bash
pdftoppm -jpeg -r 150 output.pdf page
```

Then view each `page-*.jpg` focusing on:

- Overlapping text or elements (text through shapes, stacked elements)
- Text cut off at page edges or box boundaries
- Insufficient margins from page edges
- Uneven spacing (large empty area in one place, cramped in another)
- Low-contrast text against the background
- Tables with misaligned columns or clipped cell content
- Font rendering issues (black boxes from unsupported glyphs — see subscript note above)

### Iterative Review Cycle

1. Generate PDF → Convert to images → Inspect using read tool.
2. **List issues found** (if none found, look again more critically)
3. Fix issues
4. **Re-verify affected pages** — one fix often creates another problem
5. Repeat until a full pass reveals no new issues

IMPORTANT! Do not use browser tools for artifact QA.

**MAKE SURE** you summarise your QA process by listing any issues you found and how you fixed them. If you found no issues, state that explicitly.

**NEVER skip this. Delivering without visual QA is a failure regardless of how the code looks.**

---

## Capability Matrix

| Task | Best Tool | Command/Code |
|------|-----------|--------------|
| Merge PDFs | pypdf | `writer.add_page(page)` |
| Split PDFs | pypdf | One page per file |
| Extract text | pdfplumber | `page.extract_text()` |
| Extract tables | pdfplumber | `page.extract_tables()` |
| Create PDFs | reportlab | Canvas or Platypus |
| Command line merge | qpdf | `qpdf --empty --pages ...` |
| OCR scanned PDFs | pytesseract | Convert to image first |
| Fill PDF forms | pdf-lib or pypdf (see knowledge://skill/pdf/form_filling_guide.md) | See knowledge://skill/pdf/form_filling_guide.md |

## Further Reading

- For advanced pypdfium2 usage, see knowledge://skill/pdf/advanced_reference.md
- For JavaScript libraries (pdf-lib), see knowledge://skill/pdf/advanced_reference.md
- If you need to fill out a PDF form, follow the instructions in knowledge://skill/pdf/form_filling_guide.md
- For troubleshooting guides, see knowledge://skill/pdf/advanced_reference.md

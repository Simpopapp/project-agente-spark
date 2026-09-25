import sys
from pypdf import PdfReader




pdf_reader = PdfReader(sys.argv[1])
if (pdf_reader.get_fields()):
    print("This PDF has fillable form fields")
else:
    print("This PDF does not have fillable form fields; you will need to visually determine where to enter data")

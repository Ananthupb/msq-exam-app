import os
import re
import uuid
from typing import Tuple
from fastapi import UploadFile, HTTPException

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


class DocumentService:
    def __init__(self, upload_dir: str = UPLOAD_DIR):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def validate_and_save(self, file: UploadFile) -> Tuple[str, str, int]:
        """
        Validates file extension and size, saves it with a sanitized unique name.
        Returns: (saved_file_path, original_filename, file_size)
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided.")

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: '{ext}'. Please upload a PDF, DOCX, or DOC file."
            )

        # Sanitize filename
        safe_base = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", os.path.splitext(file.filename)[0])
        unique_filename = f"{safe_base}_{uuid.uuid4().hex[:8]}{ext}"
        saved_path = os.path.join(self.upload_dir, unique_filename)

        content = file.file.read()
        file_size = len(content)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB."
            )

        if file_size == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        with open(saved_path, "wb") as f:
            f.write(content)

        return saved_path, file.filename, file_size

    def extract_text(self, file_path: str) -> str:
        """
        Extracts raw text from PDF, DOCX, or DOC files.
        """
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            return self._extract_pdf(file_path)
        elif ext == ".docx":
            return self._extract_docx(file_path)
        elif ext == ".doc":
            return self._extract_doc(file_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file extension: {ext}")

    def _extract_pdf(self, file_path: str) -> str:
        try:
            import pymupdf as fitz
        except ImportError:
            raise HTTPException(status_code=500, detail="PyMuPDF library is not installed.")

        try:
            doc = fitz.open(file_path)
            if doc.is_encrypted:
                raise HTTPException(status_code=400, detail="Encrypted PDF files are not supported.")

            text_chunks = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                text_chunks.append(page.get_text())

            doc.close()
            full_text = "\n\n".join(text_chunks)
            if not full_text.strip():
                raise HTTPException(
                    status_code=400,
                    detail="No readable text found in PDF. It might contain only scanned images."
                )
            return full_text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

    def _extract_docx(self, file_path: str) -> str:
        try:
            import docx
        except ImportError:
            raise HTTPException(status_code=500, detail="python-docx library is not installed.")

        try:
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

            # Also extract text from any tables in the document
            table_texts = []
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                    if row_text:
                        table_texts.append(row_text)

            all_lines = paragraphs + table_texts
            full_text = "\n\n".join(all_lines)
            if not full_text.strip():
                raise HTTPException(status_code=400, detail="No readable text found in DOCX file.")
            return full_text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read DOCX: {str(e)}")

    def _extract_doc(self, file_path: str) -> str:
        """
        Fallback extraction for legacy binary .doc files.
        Attempts text stream extraction or provides a friendly instruction.
        """
        try:
            # Simple text extraction from binary stream (stripping non-printable characters)
            with open(file_path, "rb") as f:
                content = f.read()

            # Attempt to decode utf-8 or latin-1 strings
            text_tokens = re.findall(rb"[\x20-\x7E\r\n]{4,}", content)
            decoded = "\n".join([t.decode("latin-1", errors="ignore") for t in text_tokens])

            if len(decoded.strip()) > 50:
                return decoded

            raise HTTPException(
                status_code=400,
                detail="Legacy .doc format could not be parsed. Please convert or save the file as modern .docx or .pdf."
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not read legacy .doc file ({str(e)}). Please save as .docx or .pdf."
            )

import io
import os
import zipfile
from typing import List, Tuple
from PIL import Image

try:
    import py7zr
except ImportError:
    py7zr = None

try:
    import rarfile
except ImportError:
    rarfile = None

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def is_image_extension(filename: str) -> bool:
    ext = os.path.splitext(filename.lower())[1]
    return ext in SUPPORTED_IMAGE_EXTS


def extract_images_from_archive(archive_bytes: bytes, filename: str) -> List[Tuple[str, bytes]]:
    images: List[Tuple[str, bytes]] = []
    lower_name = filename.lower()

    if lower_name.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as z:
            for entry in z.infolist():
                if entry.is_dir() or entry.filename.startswith("__MACOSX"):
                    continue
                if is_image_extension(entry.filename):
                    data = z.read(entry.filename)
                    images.append((os.path.basename(entry.filename), data))

    elif lower_name.endswith(".7z"):
        if py7zr is None:
            raise RuntimeError("py7zr is not installed to extract 7z archives.")
        with py7zr.SevenZipFile(io.BytesIO(archive_bytes), mode="r") as archive:
            all_files = archive.readall()
            for fname, bio in all_files.items():
                if is_image_extension(fname):
                    images.append((os.path.basename(fname), bio.read()))

    elif lower_name.endswith(".rar"):
        if rarfile is None:
            raise RuntimeError("rarfile is not installed to extract RAR archives.")
        with rarfile.RarFile(io.BytesIO(archive_bytes)) as rf:
            for entry in rf.infolist():
                if entry.isdir():
                    continue
                if is_image_extension(entry.filename):
                    data = rf.read(entry.filename)
                    images.append((os.path.basename(entry.filename), data))
    else:
        raise ValueError(f"Unsupported archive format: {filename}")

    return images


def validate_image_bytes(image_data: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            img.verify()
        return True
    except Exception:
        return False

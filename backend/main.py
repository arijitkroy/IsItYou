import io
import os
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from backend.models.biometric_engine import BiometricEngine
from backend.utils.archive_extractor import extract_images_from_archive, is_image_extension
from backend.utils.firebase_auth import get_current_verified_user

app = FastAPI(
    title="IsItYou? Biometric Face Identification API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = BiometricEngine()


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "IsItYou? Biometric Core",
        "device": str(engine.device),
        "profiles_enrolled": len(engine.profiles)
    }


@app.get("/api/profiles")
def get_profiles():
    profile_list = []
    for p in engine.profiles.values():
        profile_list.append({
            "id": p["id"],
            "name": p["name"],
            "sample_count": p["sample_count"],
            "threshold": p.get("threshold", 0.62),
            "avg_similarity": p.get("avg_similarity", 0.0),
            "variance": p.get("variance", 0.0),
            "thumbnails": p.get("thumbnails", []),
            "centroid": p.get("centroid", []),
            "created_at": p.get("created_at", "")
        })
    return {"profiles": profile_list}


@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: str):
    success = engine.delete_profile(profile_id)
    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"status": "deleted", "profile_id": profile_id}


@app.post("/api/enroll")
async def enroll_friend(
    name: str = Form(...),
    files: List[UploadFile] = File(...),
    auth_user: Optional[dict] = Depends(get_current_verified_user)
):
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Friend name is required.")

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    extracted_images = []

    for uploaded_file in files:
        filename = uploaded_file.filename or "unknown"
        lower_name = filename.lower()
        file_bytes = await uploaded_file.read()

        if lower_name.endswith((".zip", ".7z", ".rar")):
            try:
                archive_imgs = extract_images_from_archive(file_bytes, filename)
                extracted_images.extend(archive_imgs)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to extract archive '{filename}': {str(e)}"
                )
        elif is_image_extension(filename):
            extracted_images.append((filename, file_bytes))
        else:
            continue

    if len(extracted_images) < 10:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Minimum 10 images required for biometric enrollment. "
                f"Received only {len(extracted_images)} valid image(s)."
            )
        )

    try:
        result = engine.enroll_friend(name, extracted_images)
        return JSONResponse(status_code=200, content=result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Enrollment failure: {str(ex)}")


@app.post("/api/identify")
async def identify_face(
    file: UploadFile = File(...),
    profile_id: Optional[str] = Form(None),
    profile_data: Optional[str] = Form(None),
    auth_user: Optional[dict] = Depends(get_current_verified_user)
):
    filename = file.filename or ""
    if not is_image_extension(filename) and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, WEBP, BMP).")

    file_bytes = await file.read()
    try:
        query_pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Corrupted image file.")

    custom_profile = None
    if profile_data:
        try:
            import json as py_json
            custom_profile = py_json.loads(profile_data)
        except Exception:
            pass

    try:
        results = engine.identify(query_pil, target_profile_id=profile_id, custom_target_profile=custom_profile)
        return JSONResponse(status_code=200, content=results)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Identification error: {str(ex)}")


@app.post("/api/sample-demo")
def generate_sample_demo():
    sample_dir = os.path.join(os.path.dirname(__file__), "samples")
    os.makedirs(sample_dir, exist_ok=True)

    from backend.utils.sample_demo_loader import setup_demo_profiles
    demo_result = setup_demo_profiles(engine, sample_dir)
    return demo_result


@app.get("/api/sample-demo/archive")
def download_sample_archive():
    from fastapi.responses import FileResponse
    sample_dir = os.path.join(os.path.dirname(__file__), "samples")
    zip_path = os.path.join(sample_dir, "alex_carter_12_photos.zip")
    if not os.path.exists(zip_path):
        from backend.utils.sample_demo_loader import setup_demo_profiles
        setup_demo_profiles(engine, sample_dir)
    if os.path.exists(zip_path):
        return FileResponse(zip_path, media_type="application/zip", filename="alex_carter_12_photos.zip")
    raise HTTPException(status_code=404, detail="Archive not found.")


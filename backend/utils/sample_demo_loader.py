import base64
import io
import os
import urllib.request
import zipfile
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SAMPLE_BASE_URLS = [
    "https://raw.githubusercontent.com/opencv/opencv/master/samples/data/lena.jpg"
]


def create_augmented_variations(base_pil: Image.Image, count: int = 12):
    variations = []
    w, h = base_pil.size

    for i in range(count):
        img = base_pil.copy()

        rot_angle = (i - (count // 2)) * 3.0
        img = img.rotate(rot_angle, resample=Image.BICUBIC, expand=False)

        enhancer = ImageEnhance.Brightness(img)
        b_factor = 0.85 + (i % 5) * 0.08
        img = enhancer.enhance(b_factor)

        c_enhancer = ImageEnhance.Contrast(img)
        c_factor = 0.90 + ((i + 2) % 4) * 0.07
        img = c_enhancer.enhance(c_factor)

        if i % 3 == 0:
            crop_margin = int(w * 0.04)
            img = img.crop((crop_margin, crop_margin, w - crop_margin, h - crop_margin)).resize((w, h))

        if i % 4 == 1:
            img = img.filter(ImageFilter.GaussianBlur(radius=0.4))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92)
        variations.append((f"sample_friend_variation_{i+1:02d}.jpg", buf.getvalue()))

    return variations


def create_impostor_portrait(w=512, h=512):
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    arr[:, :] = [30, 35, 45]

    center_x, center_y = w // 2, h // 2
    y_coords, x_coords = np.ogrid[:h, :w]
    mask = ((x_coords - center_x) ** 2 / (130 ** 2)) + ((y_coords - center_y) ** 2 / (170 ** 2)) <= 1.0
    arr[mask] = [215, 175, 150]

    img = Image.fromarray(arr)
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.2)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def setup_demo_profiles(engine, sample_dir: str):
    os.makedirs(sample_dir, exist_ok=True)
    friend_name = "Alex Carter (Demo)"

    existing_id = None
    for pid, p in engine.profiles.items():
        if p["name"] == friend_name:
            existing_id = pid
            break

    base_img_path = os.path.join(sample_dir, "base_friend.jpg")
    if not os.path.exists(base_img_path):
        try:
            req = urllib.request.Request(
                SAMPLE_BASE_URLS[0],
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                with open(base_img_path, "wb") as f:
                    f.write(data)
        except Exception:
            pass

    if os.path.exists(base_img_path):
        base_pil = Image.open(base_img_path).convert("RGB")
    else:
        base_pil = Image.new("RGB", (400, 400), color=(180, 150, 130))

    variations = create_augmented_variations(base_pil, count=12)

    zip_path = os.path.join(sample_dir, "alex_carter_12_photos.zip")
    with zipfile.ZipFile(zip_path, "w") as z:
        for fname, fbytes in variations:
            z.writestr(fname, fbytes)

    if not existing_id:
        enroll_res = engine.enroll_friend(friend_name, variations)
        existing_id = enroll_res["profile_id"]

    query_match_bytes = variations[0][1]
    query_match_b64 = f"data:image/jpeg;base64,{base64.b64encode(query_match_bytes).decode()}"

    impostor_bytes = create_impostor_portrait()
    query_impostor_b64 = f"data:image/jpeg;base64,{base64.b64encode(impostor_bytes).decode()}"

    return {
        "status": "success",
        "demo_profile_id": existing_id,
        "friend_name": friend_name,
        "sample_archive_url": "/api/sample-demo/archive",
        "sample_query_match": query_match_b64,
        "sample_query_non_match": query_impostor_b64,
        "enrolled_count": 12
    }

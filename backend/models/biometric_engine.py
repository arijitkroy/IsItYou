import base64
import io
import math
import os
import json
import uuid
import numpy as np
import torch
from PIL import Image
from scipy.spatial import Delaunay
from facenet_pytorch import MTCNN, InceptionResnetV1

PROFILES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
PROFILES_FILE = os.path.join(PROFILES_DIR, "profiles.json")


def _build_facial_topology(box, kp, img_w, img_h):
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1

    lex, ley = kp[0]
    rex, rey = kp[1]
    nx, ny = kp[2]
    mlx, mly = kp[3]
    mrx, mry = kp[4]

    eye_dx = rex - lex
    eye_dy = rey - ley
    eye_dist = math.hypot(eye_dx, eye_dy)
    roll = math.degrees(math.atan2(eye_dy, eye_dx))

    d_l = math.hypot(nx - lex, ny - ley)
    d_r = math.hypot(rex - nx, rey - ny)
    yaw = round(((d_r - d_l) / max(1.0, d_r + d_l)) * 65.0, 1)

    eye_mid_y = (ley + rey) / 2.0
    mouth_mid_y = (mly + mry) / 2.0
    upper_h = max(1.0, ny - eye_mid_y)
    lower_h = max(1.0, mouth_mid_y - ny)
    pitch = round(((upper_h / lower_h) - 1.0) * 35.0, 1)

    landmarks = []

    def add_pt(px, py):
        idx = len(landmarks)
        landmarks.append({
            "x": round(float(px) / img_w, 4),
            "y": round(float(py) / img_h, 4),
            "z": 0.0
        })
        return idx

    jaw_pts = []
    for i in range(17):
        t = (i - 8) / 8.0
        angle = math.radians(t * 70.0)
        jx = (x1 + w * 0.5) + (w * 0.48) * math.sin(angle)
        jy = y1 + h * 0.45 + (h * 0.52) * math.cos(angle)
        jaw_pts.append(add_pt(jx, jy))

    leb_pts = []
    for i in range(5):
        bx = lex + (i - 2) * (eye_dist * 0.22)
        by = ley - eye_dist * 0.30 - (math.sin(i * 0.7) * eye_dist * 0.08)
        leb_pts.append(add_pt(bx, by))

    reb_pts = []
    for i in range(5):
        bx = rex + (i - 2) * (eye_dist * 0.22)
        by = rey - eye_dist * 0.30 - (math.sin(i * 0.7) * eye_dist * 0.08)
        reb_pts.append(add_pt(bx, by))

    nose_bridge = []
    for i in range(4):
        bx = nx + (i - 3) * (eye_dx * 0.05)
        by = eye_mid_y + (i + 1) * ((ny - eye_mid_y) / 4.0)
        nose_bridge.append(add_pt(bx, by))

    nose_base = []
    for i in range(5):
        bx = nx + (i - 2) * (eye_dist * 0.16)
        by = ny + math.cos((i - 2) * 0.6) * (eye_dist * 0.06)
        nose_base.append(add_pt(bx, by))

    leye_pts = []
    for i in range(8):
        a = (i / 8.0) * 2 * math.pi
        ex = lex + math.cos(a) * (eye_dist * 0.22)
        ey = ley + math.sin(a) * (eye_dist * 0.13)
        leye_pts.append(add_pt(ex, ey))

    reye_pts = []
    for i in range(8):
        a = (i / 8.0) * 2 * math.pi
        ex = rex + math.cos(a) * (eye_dist * 0.22)
        ey = rey + math.sin(a) * (eye_dist * 0.13)
        reye_pts.append(add_pt(ex, ey))

    lip_pts = []
    for i in range(12):
        a = (i / 12.0) * 2 * math.pi
        mw = math.hypot(mrx - mlx, mry - mly) * 0.55
        mh = eye_dist * 0.26
        lx = ((mlx + mrx) / 2.0) + math.cos(a) * mw
        ly = mouth_mid_y + math.sin(a) * mh
        lip_pts.append(add_pt(lx, ly))

    def make_chain(indices, closed=False):
        conns = []
        for i in range(len(indices) - 1):
            conns.append([indices[i], indices[i + 1]])
        if closed and len(indices) > 2:
            conns.append([indices[-1], indices[0]])
        return conns

    contours = {
        "face_oval": make_chain(jaw_pts, closed=False),
        "left_eyebrow": make_chain(leb_pts, closed=False),
        "right_eyebrow": make_chain(reb_pts, closed=False),
        "nose": make_chain(nose_bridge, closed=False) + make_chain(nose_base, closed=False),
        "left_eye": make_chain(leye_pts, closed=True),
        "right_eye": make_chain(reye_pts, closed=True),
        "lips": make_chain(lip_pts, closed=True),
    }

    mesh_conns = []
    try:
        pts_arr = np.array([[pt["x"] * img_w, pt["y"] * img_h] for pt in landmarks])
        tri = Delaunay(pts_arr)
        edges = set()
        for simplex in tri.simplices:
            for i in range(3):
                e = tuple(sorted((simplex[i], simplex[(i + 1) % 3])))
                edges.add(e)
        mesh_conns = [[int(e[0]), int(e[1])] for e in edges]
    except Exception:
        pass

    pose = {"pitch": pitch, "yaw": yaw, "roll": round(roll, 1)}
    return landmarks, contours, mesh_conns, pose


class BiometricEngine:
    def __init__(self):
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self.mtcnn = MTCNN(
            image_size=160,
            margin=20,
            keep_all=True,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            post_process=True,
            device=self.device
        )
        self.resnet = InceptionResnetV1(pretrained="vggface2").eval().to(self.device)

        os.makedirs(PROFILES_DIR, exist_ok=True)
        self.profiles = self._load_profiles()

    def _load_profiles(self):
        if os.path.exists(PROFILES_FILE):
            try:
                with open(PROFILES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_profiles(self):
        with open(PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump(self.profiles, f, indent=2)

    def extract_embedding_from_tensor(self, face_tensor):
        with torch.no_grad():
            if face_tensor.ndim == 3:
                face_tensor = face_tensor.unsqueeze(0)
            emb = self.resnet(face_tensor.to(self.device))
            emb = emb.cpu().numpy()[0]
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            return emb

    def _crop_face_to_base64(self, img_pil, box):
        try:
            w, h = img_pil.size
            x1 = max(0, int(box[0]))
            y1 = max(0, int(box[1]))
            x2 = min(w, int(box[2]))
            y2 = min(h, int(box[3]))
            if x2 > x1 and y2 > y1:
                crop = img_pil.crop((x1, y1, x2, y2)).resize((120, 120))
                buffered = io.BytesIO()
                crop.save(buffered, format="JPEG", quality=85)
                return f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"
        except Exception:
            pass
        return None

    def enroll_friend(self, friend_name: str, images: list):
        if len(images) < 10:
            raise ValueError(f"At least 10 images are required for enrollment. Received: {len(images)}")

        valid_embeddings = []
        thumbnails = []
        processed_count = 0
        failed_count = 0

        for idx, (filename, img_bytes) in enumerate(images):
            try:
                img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                boxes, probs, _ = self.mtcnn.detect(img_pil, landmarks=True)

                if boxes is not None and len(boxes) > 0:
                    best_idx = int(np.argmax(probs))
                    if probs[best_idx] >= 0.70:
                        face_tensor = self.mtcnn.extract(img_pil, [boxes[best_idx]], save_path=None)
                        if face_tensor is not None and len(face_tensor) > 0:
                            emb = self.extract_embedding_from_tensor(face_tensor[0])
                            valid_embeddings.append(emb)
                            thumb = self._crop_face_to_base64(img_pil, boxes[best_idx])
                            if thumb:
                                thumbnails.append(thumb)
                            processed_count += 1
                            continue
                failed_count += 1
            except Exception:
                failed_count += 1

        if len(valid_embeddings) < 10:
            raise ValueError(
                f"Enrollment requires at least 10 valid facial images. "
                f"Successfully detected faces in {len(valid_embeddings)} out of {len(images)} images provided."
            )

        emb_matrix = np.array(valid_embeddings)
        mean_centroid = np.mean(emb_matrix, axis=0)
        mean_centroid = mean_centroid / np.linalg.norm(mean_centroid)

        similarities = np.dot(emb_matrix, mean_centroid)
        avg_similarity = float(np.mean(similarities))
        variance = float(np.var(similarities))

        threshold = max(0.58, float(np.percentile(similarities, 10)) - 0.06)

        profile_id = str(uuid.uuid4())[:8]
        profile_data = {
            "id": profile_id,
            "name": friend_name.strip(),
            "sample_count": len(valid_embeddings),
            "centroid": mean_centroid.tolist(),
            "threshold": round(threshold, 3),
            "avg_similarity": round(avg_similarity, 3),
            "variance": round(variance, 4),
            "thumbnails": thumbnails[:15],
            "created_at": str(np.datetime64("now"))
        }

        self.profiles[profile_id] = profile_data
        self._save_profiles()

        return {
            "status": "success",
            "profile_id": profile_id,
            "name": friend_name.strip(),
            "sample_count": len(valid_embeddings),
            "avg_similarity": round(avg_similarity, 3),
            "threshold": round(threshold, 3),
            "thumbnails": thumbnails[:12]
        }

    def identify(self, query_img_pil: Image.Image, target_profile_id: str = None):
        img_w, img_h = query_img_pil.size

        boxes, probs, keypoints_list = self.mtcnn.detect(query_img_pil, landmarks=True)

        target_profile = None
        if target_profile_id:
            cleaned_id = str(target_profile_id).strip()
            if cleaned_id and cleaned_id.lower() not in ("null", "undefined", "none", ""):
                if cleaned_id in self.profiles:
                    target_profile = self.profiles[cleaned_id]
        elif len(self.profiles) == 1:
            target_profile = list(self.profiles.values())[0]

        detected_faces = []

        if boxes is not None and len(boxes) > 0:
            face_tensors = self.mtcnn.extract(query_img_pil, boxes, save_path=None)

            for i, box in enumerate(boxes):
                prob = float(probs[i])
                if prob < 0.60:
                    continue

                x1, y1, x2, y2 = [int(coord) for coord in box]
                x1 = max(0, min(img_w - 1, x1))
                y1 = max(0, min(img_h - 1, y1))
                x2 = max(x1 + 1, min(img_w, x2))
                y2 = max(y1 + 1, min(img_h, y2))
                box_w = x2 - x1
                box_h = y2 - y1

                kp_pts = []
                if keypoints_list is not None and i < len(keypoints_list):
                    kp_raw = keypoints_list[i]
                    kp_pts = [{"x": round(float(pt[0]), 1), "y": round(float(pt[1]), 1)} for pt in kp_raw]
                    landmarks, contours, mesh_conns, pose = _build_facial_topology(
                        (x1, y1, x2, y2), kp_raw, img_w, img_h
                    )
                else:
                    landmarks, contours, mesh_conns, pose = [], {}, [], {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}

                emb = None
                if face_tensors is not None and i < len(face_tensors) and face_tensors[i] is not None:
                    emb = self.extract_embedding_from_tensor(face_tensors[i])

                is_match = False
                cosine_sim = 0.0
                euclidean_dist = 0.0
                confidence_score = 0.0
                friend_name = "Unknown Person"
                threshold = 0.62
                best_other_match = None

                if emb is not None:
                    if target_profile is not None:
                        centroid = np.array(target_profile["centroid"])
                        threshold = float(target_profile.get("threshold", 0.62))
                        cosine_sim = float(np.dot(emb, centroid))
                        euclidean_dist = float(np.linalg.norm(emb - centroid))

                        base_thresh = 0.40
                        scaled = (cosine_sim - base_thresh) / (0.85 - base_thresh)
                        confidence_score = float(np.clip(scaled, 0.0, 1.0) * 100.0)

                        if cosine_sim >= threshold:
                            is_match = True
                            friend_name = target_profile["name"]

                    for pid, pdata in self.profiles.items():
                        if target_profile and pid == target_profile["id"]:
                            continue
                        other_centroid = np.array(pdata["centroid"])
                        other_sim = float(np.dot(emb, other_centroid))
                        other_thresh = float(pdata.get("threshold", 0.62))
                        if other_sim >= other_thresh:
                            if best_other_match is None or other_sim > best_other_match["similarity"]:
                                best_other_match = {
                                    "id": pid,
                                    "name": pdata["name"],
                                    "similarity": round(other_sim, 4),
                                    "threshold": round(other_thresh, 3)
                                }

                if is_match:
                    display_name = friend_name
                elif best_other_match:
                    display_name = f"Different Profile: {best_other_match['name']}"
                else:
                    display_name = "Unknown Person"

                face_data = {
                    "face_index": i,
                    "is_match": is_match,
                    "target_name": display_name,
                    "friend_name": target_profile["name"] if target_profile else None,
                    "other_matched_profile": best_other_match,
                    "confidence_score": round(confidence_score, 1),
                    "cosine_similarity": round(cosine_sim, 4),
                    "euclidean_distance": round(euclidean_dist, 4),
                    "threshold": round(threshold, 3),
                    "detection_prob": round(prob * 100.0, 1),
                    "pose": pose,
                    "hud_layers": {
                        "bounding_box": {
                            "x": x1,
                            "y": y1,
                            "width": box_w,
                            "height": box_h,
                            "normalized": {
                                "x": round(x1 / img_w, 4),
                                "y": round(y1 / img_h, 4),
                                "width": round(box_w / img_w, 4),
                                "height": round(box_h / img_h, 4),
                            },
                            "status": "VERIFIED" if is_match else "UNVERIFIED",
                            "color": "#00e599" if is_match else "#ff3366"
                        },
                        "keypoints": kp_pts,
                        "contours": contours,
                        "mesh_landmarks": landmarks,
                        "mesh_connections": mesh_conns
                    }
                }
                detected_faces.append(face_data)

        return {
            "image_dimensions": {"width": img_w, "height": img_h},
            "faces_count": len(detected_faces),
            "target_profile": {
                "id": target_profile["id"],
                "name": target_profile["name"],
                "threshold": target_profile.get("threshold", 0.62)
            } if target_profile else None,
            "detected_faces": detected_faces
        }

    def delete_profile(self, profile_id: str):
        if profile_id in self.profiles:
            del self.profiles[profile_id]
            self._save_profiles()
            return True
        return False

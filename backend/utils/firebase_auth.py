import os
import json
import time
import urllib.request
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException
import jwt
from cryptography.x509 import load_pem_x509_certificate

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

_cached_certs: Dict[str, str] = {}
_certs_expiry: float = 0.0


def load_project_id() -> Optional[str]:
    proj_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    if proj_id:
        return proj_id.strip()

    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", ".env.local"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
    ]

    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("NEXT_PUBLIC_FIREBASE_PROJECT_ID=") or line.startswith("FIREBASE_PROJECT_ID="):
                            parts = line.split("=", 1)
                            if len(parts) == 2 and parts[1].strip():
                                val = parts[1].strip().strip('"').strip("'")
                                if val and val != "your_project_id":
                                    return val
            except Exception:
                pass
    return None


FIREBASE_PROJECT_ID = load_project_id()


def get_google_public_certs() -> Dict[str, str]:
    global _cached_certs, _certs_expiry
    now = time.time()
    if _cached_certs and now < _certs_expiry:
        return _cached_certs

    try:
        req = urllib.request.Request(GOOGLE_CERTS_URL, headers={"User-Agent": "IsItYou-AuthValidator/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            cache_control = response.headers.get("Cache-Control", "")
            max_age = 3600
            if "max-age=" in cache_control:
                try:
                    for part in cache_control.split(","):
                        if "max-age=" in part:
                            max_age = int(part.split("max-age=")[1].split()[0])
                except Exception:
                    max_age = 3600

            data = json.loads(response.read().decode("utf-8"))
            _cached_certs = data
            _certs_expiry = now + max_age
            return _cached_certs
    except Exception as e:
        if _cached_certs:
            return _cached_certs
        raise HTTPException(status_code=503, detail=f"Authentication service unreachable: {str(e)}")


def decode_and_verify_token(token: str, expected_project_id: Optional[str] = None) -> Dict[str, Any]:
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed authentication token.")

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token header missing key identifier (kid).")

    certs = get_google_public_certs()
    if kid not in certs:
        raise HTTPException(status_code=401, detail="Invalid token signing key.")

    try:
        cert_pem = certs[kid].encode("utf-8")
        cert_obj = load_pem_x509_certificate(cert_pem)
        public_key = cert_obj.public_key()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load token certificate: {str(e)}")

    proj_id = expected_project_id or FIREBASE_PROJECT_ID
    issuer = f"https://securetoken.google.com/{proj_id}" if proj_id else None

    options = {
        "verify_signature": True,
        "verify_exp": True,
        "verify_iat": True,
        "verify_aud": bool(proj_id),
        "verify_iss": bool(issuer),
    }

    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=proj_id if proj_id else None,
            issuer=issuer,
            options=options
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication token has expired.")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer.")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience.")
    except Exception as ex:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(ex)}")

    if not claims.get("email_verified"):
        raise HTTPException(
            status_code=403,
            detail="Biometric access denied: Unverified email. Verification link was sent during registration."
        )

    return claims


async def get_current_verified_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    active_proj = FIREBASE_PROJECT_ID or load_project_id()

    if not authorization:
        if active_proj:
            raise HTTPException(
                status_code=401,
                detail="Authorization required. Please sign in with a verified account."
            )
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Must be Bearer <token>.")

    token = parts[1]
    claims = decode_and_verify_token(token, active_proj)
    return claims

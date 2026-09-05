# IsItYou?

Neural Biometric Facial Identification and Forensic HUD Analysis Platform.

## Overview

IsItYou? is a biometric facial recognition and topological analysis system engineered with a Next.js (Pages Router) frontend and a high-performance Python FastAPI backend. The application allows users to enroll a target subject by uploading a gallery of at least 10 reference facial photographs or compressed archives (.zip, .7z, .rar). The underlying machine learning pipeline constructs a calibrated 512-dimensional facial embedding gallery, calculates intra-class centroid vectors and variance metrics, and performs forensic verification against query images.

During identification, the system exposes an interactive, multi-layered Heads-Up Display (HUD) that maps real-time facial topography onto the query subject, including bounding boxes, anatomical feature contours, keypoint anchors, wireframe meshes, and spatial pose telemetry (yaw, pitch, roll).

## Architecture

The system follows a decoupled client-server architecture:

```
[Client: Next.js Pages Router (Port 3000)]
      |
      |-- Reverse Proxy (/api/* -> http://127.0.0.1:8000/api/*)
      v
[FastAPI Biometric Engine (Port 8000)]
      |
      +---> [Archive Extractor] (.zip, .7z, .rar decompression)
      |
      +---> [MTCNN Detection & Alignment] (PyTorch / CUDA)
      |
      +---> [FaceNet Inception-ResNet-v1] (512-D Embedding Extraction)
      |
      +---> [Gallery Centroid Profiler] (L2-normalized Mean Vectors)
      |
      +---> [Topological Mesh Generator] (Delaunay Triangulation & Contours)
      |
      v
[JSON Response Payload with Multi-Layer HUD Telemetry]
      |
      v
[HTML5 Canvas HUD Renderer & Vector Display]
```

## Technology Stack

### Backend
- Framework: FastAPI with Uvicorn ASGI server
- Core Neural Networks: FaceNet Inception-ResNet-v1 (pretrained on VGGFace2) via `facenet-pytorch`
- Face Detection and Alignment: MTCNN (Multi-task Cascaded Convolutional Networks)
- Topological Geometry: SciPy (Delaunay spatial triangulation) and NumPy
- Image Processing: Pillow (PIL) and OpenCV
- Archive Extraction: Python standard `zipfile`, `py7zr`, and `rarfile`
- Acceleration: PyTorch CUDA / DirectML / CPU fallback

### Frontend
- Framework: Next.js (Pages Router, React 18)
- Styling: Custom Cybernetic Dark Theme (Vanilla CSS, zero third-party utility abstractions)
- Icons: Lucide React
- Canvas Engine: Native HTML5 2D Canvas with device-pixel-ratio scaling and multi-layer compositing
- Network: Asynchronous Fetch API with Next.js reverse proxy rewrites

## Biometric Methodology

### 1. Enrollment Pipeline
1. Input Parsing: Receives multiple image files or compressed archives. Decompresses `.zip`, `.7z`, and `.rar` streams in memory or isolated temporary storage.
2. Validation: Rejects requests containing fewer than 10 detected facial representations with HTTP 400.
3. Face Detection & Quality Filtering: MTCNN scans each image, extracts bounding boxes, landmark anchors, and detection probabilities. Only faces with detection confidence exceeding 0.70 are retained.
4. 512-Dimensional Deep Embeddings: Normalized 160x160 aligned face crops are passed through Inception-ResNet-v1 to yield 512-dimensional continuous vector embeddings:
   $$\mathbf{e} = \frac{f(\mathbf{x})}{\|f(\mathbf{x})\|_2}$$
5. Gallery Centroid Calculation: Computes the unit-normalized centroid vector across all enrolled samples:
   $$\mathbf{c} = \frac{\sum_{i=1}^{N} \mathbf{e}_i}{\left\|\sum_{i=1}^{N} \mathbf{e}_i\right\|_2}$$
6. Adaptive Threshold Formulation: Measures pairwise cosine similarities between each sample embedding and the centroid to derive variance $\sigma^2$ and sample percentile distributions. The verification threshold $\tau$ dynamically adjusts to reflect gallery consistency, maintaining a safe default floor of 0.58.

### 2. Identification Pipeline
1. Multi-Face Detection: Scans query imagery for all visible faces using MTCNN.
2. Pose Telemetry Estimation:
   - Roll: Evaluated from inter-ocular angle between left and right eye centers.
   - Yaw: Evaluated through horizontal displacement symmetry of the nose apex relative to outer eye anchors.
   - Pitch: Derived from the vertical ratio of eye-to-nose vs nose-to-mouth intervals.
3. Topological Feature Synthesis: Constructs anatomical landmark chains (jawline perimeter, eyebrow arches, eye apertures, nasal bridge, and lip contours) and generates a wireframe network via Delaunay triangulation.
4. Metric Comparison: Measures cosine similarity between the query embedding $\mathbf{q}$ and the target profile centroid $\mathbf{c}$:
   $$S_C(\mathbf{q}, \mathbf{c}) = \mathbf{q} \cdot \mathbf{c} = \sum_{j=1}^{512} q_j c_j$$
5. Decision Logic: Classifies the detection as verified when $S_C \ge \tau$, outputting calibrated confidence percentiles and Euclidean metric distances.

## Heads-Up Display (HUD) Layers

The identification view features an interactive, toggleable canvas HUD with five independent visualization layers:

1. Bounding Box & Status Callout: Renders precision targeting brackets, classification status tags (VERIFIED / UNVERIFIED), identity labels, and confidence percentages.
2. Keypoint Anchors: Visualizes primary facial fiducials including eye pupils, nose apex, and mouth corner coordinates.
3. Anatomical Contours: Renders continuous vector splines tracing the jawline contour, left and right eyebrow curves, eye perimeters, and lip boundaries.
4. Topological Wireframe Mesh: Overlays a Delaunay triangular polygon mesh mapping facial topography and planar angles.
5. Telemetry & Spatial Diagnostics: Displays spatial orientation data (pitch, yaw, roll), central targeting crosshairs, and pixel measurement dimensions.

## Directory Structure

```
Is-It-You/
|-- backend/
|   |-- data/
|   |   `-- profiles.json           # Enrolled biometric profiles and gallery centroids
|   |-- models/
|   |   `-- biometric_engine.py     # MTCNN, FaceNet, topology builder, and metric engine
|   |-- samples/
|   |   |-- alex_carter_12_photos.zip
|   |   `-- base_friend.jpg
|   |-- utils/
|   |   |-- archive_extractor.py    # Unpackaging for ZIP, 7Z, and RAR archives
|   |   `-- sample_demo_loader.py   # Seed dataset generator for immediate evaluation
|   |-- main.py                     # FastAPI routes and middleware
|   `-- requirements.txt            # Python dependencies
|-- frontend/
|   |-- components/
|   |   |-- EnrollmentView.js       # File and archive drop zone, gallery preview, submit form
|   |   |-- HudCanvas.js            # HTML5 Canvas multi-layered rendering engine
|   |   |-- HudControls.js          # Interactive HUD layer toggle switches
|   |   |-- Navbar.js               # Header navigation, system status, active profile selector
|   |   `-- VerificationView.js     # Query upload, sample loader, and forensic telemetry sidebar
|   |-- pages/
|   |   |-- _app.js                 # Global styles and metadata wrapper
|   |   `-- index.js                # Root application container and view switcher
|   |-- styles/
|   |   `-- globals.css             # Cybernetic dark theme, typography, and UI tokens
|   |-- next.config.js              # Next.js reverse proxy configuration
|   `-- package.json                # Frontend dependencies and npm scripts
|-- run.py                          # Unified launcher for frontend and backend
|-- run_backend.py                  # Standalone backend server launcher
`-- README.md                       # Project documentation
```

## Installation and Setup

### Prerequisites
- Python 3.10, 3.11, or 3.12
- Node.js 18.x or higher, with npm
- CUDA-compatible GPU (optional, automatic CPU fallback supported)

### Quick Start (Single Command)

Once dependencies are installed, launch both the FastAPI backend and Next.js frontend simultaneously in a single console:

```bash
python run.py
```

- Frontend interface: `http://localhost:3000`
- Backend API service: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

Press `Ctrl+C` to cleanly terminate both services.

### Individual Service Setup

#### 1. Backend Installation

Navigate to the project root and create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r backend/requirements.txt
```

To run only the backend:

```bash
python run_backend.py
```

The API service will initialize at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Installation

Navigate to the `frontend` directory:

```bash
cd frontend
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your web browser.

### 3. Production Build

To verify and create an optimized production build for the frontend:

```bash
cd frontend
npm run build
npm start
```

## API Reference

### Health Status
- `GET /api/health`
- Response:
  ```json
  {
    "status": "online",
    "system": "IsItYou? Biometric Core",
    "device": "cuda:0",
    "profiles_enrolled": 1
  }
  ```

### Profile Management
- `GET /api/profiles`: Lists all enrolled friend profiles, including sample counts, thresholds, and thumbnail galleries.
- `DELETE /api/profiles/{profile_id}`: Removes an enrolled profile and associated centroid data.

### Enrollment
- `POST /api/enroll`
- Content-Type: `multipart/form-data`
- Fields:
  - `name` (string, required): Full name or identification label for the friend.
  - `files` (binary files, required): Minimum 10 image files, or `.zip`, `.7z`, `.rar` archives containing at least 10 valid facial photographs.
- Success Response (HTTP 200):
  ```json
  {
    "status": "success",
    "profile_id": "bfd993d8",
    "name": "Alex Carter",
    "sample_count": 12,
    "avg_similarity": 0.941,
    "threshold": 0.885,
    "thumbnails": ["data:image/jpeg;base64,..."]
  }
  ```
- Error Response (HTTP 400): If fewer than 10 valid facial images are provided.

### Identification
- `POST /api/identify`
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (binary image, required): Query photograph to evaluate.
  - `profile_id` (string, optional): Target profile identifier to verify against. Defaults to the most recently enrolled profile if omitted.
- Response (HTTP 200):
  ```json
  {
    "image_dimensions": { "width": 1024, "height": 1024 },
    "faces_count": 1,
    "target_profile": {
      "id": "bfd993d8",
      "name": "Alex Carter",
      "threshold": 0.885
    },
    "detected_faces": [
      {
        "face_index": 0,
        "is_match": true,
        "target_name": "Alex Carter",
        "confidence_score": 100.0,
        "cosine_similarity": 0.9746,
        "euclidean_distance": 0.2254,
        "threshold": 0.885,
        "detection_prob": 99.8,
        "pose": { "pitch": 32.1, "yaw": -7.1, "roll": 0.6 },
        "hud_layers": {
          "bounding_box": {
            "x": 280,
            "y": 190,
            "width": 460,
            "height": 580,
            "status": "VERIFIED",
            "color": "#00e599"
          },
          "keypoints": [...],
          "contours": { ... },
          "mesh_landmarks": [...],
          "mesh_connections": [...]
        }
      }
    ]
  }
  ```

### Demo Data Loader
- `POST /api/sample-demo`: Automatically generates and enrolls an example profile ("Alex Carter") with 12 reference samples.
- `GET /api/sample-demo/archive`: Downloads the sample `.zip` archive for local testing and inspection.

## User Workflows

### 1. Enrolling a Friend
1. Navigate to the `Enroll Friend` tab in the navigation bar.
2. Enter the subject's name in the `Target Subject Name` input.
3. Drag and drop at least 10 reference facial photographs (or a `.zip`, `.7z`, or `.rar` archive containing them) into the upload zone.
4. Review the real-time sample counter badge. The `Enroll Target Profile` action unlocks once the minimum threshold of 10 valid images is satisfied.
5. Click `Enroll Target Profile`. Upon completion, the profile is saved and automatically set as the active verification target.

### 2. Identifying a Face
1. Navigate to the `Identification` tab.
2. Ensure the desired target friend is selected in the `Active Target Profile` dropdown in the navigation header.
3. Drag and drop a query image into the input container or click `Load Sample Query Image` to test with bundled reference imagery.
4. The system executes detection, matches embeddings, and updates the status banner:
   - Green banner (`VERIFIED: TARGET MATCH`): Cosine similarity meets or exceeds the profile threshold.
   - Red banner (`UNVERIFIED: IDENTITY MISMATCH`): Cosine similarity does not satisfy the verification threshold.
5. Toggle HUD visualization layers using the controls beneath the image to view individual geometric components (Bounding Box, Keypoints, Wireframe Mesh, Anatomical Contours, or Telemetry).
6. Inspect the right-hand telemetry sidebar for calibrated metrics including cosine similarity, confidence score, Euclidean distance, detector probability, and head orientation angles.

## Security and Privacy Considerations

- Local Data Persistence: Biometric gallery profiles and embedding centroids are stored locally on disk (`backend/data/profiles.json`). No external biometric telemetry is transmitted to third-party endpoints.
- Reversible Data Storage: Enrolled facial representations are stored as irreversible 512-dimensional vector centroids and low-resolution thumbnails; raw source images are not retained in persistent storage after enrollment processing.
- Input Sanitation: File extension and MIME validation are enforced on all file ingestion routes to prevent unauthorized file processing.

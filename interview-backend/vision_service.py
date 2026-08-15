"""
Enhanced Vision Service - Powered by Behavioral Analysis Engine.
Uses the Postureanalysis-main engine for comprehensive behavioral analysis:
- Face presence + attention tracking
- Pose detection + posture quality scoring
- Iris-based gaze direction + eye contact quality
- Movement stability analysis
- Dynamic confidence scoring with history
- Context-aware feedback generation
"""

import cv2
import numpy as np
import time
import sys
import os
import base64
from typing import Dict, Optional
from collections import deque
import logging

logger = logging.getLogger(__name__)

# Add Postureanalysis-main to the Python path
POSTURE_ENGINE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "Postureanalysis-main"
)
POSTURE_ENGINE_DIR = os.path.abspath(POSTURE_ENGINE_DIR)
if os.path.isdir(POSTURE_ENGINE_DIR) and POSTURE_ENGINE_DIR not in sys.path:
    sys.path.insert(0, POSTURE_ENGINE_DIR)

# Try to import the behavioral analysis engine and its config.
# PROBLEM: 12 files inside Postureanalysis-main do `import config`, but
# the backend's own config.py is already in sys.modules.  We temporarily
# swap sys.modules["config"] to the posture engine's config while
# importing the engine, then restore the backend's config afterward.
import importlib.util as _ilu

ENGINE_AVAILABLE = False
ENGINE_CONFIG = None
try:
    # 1. Load the posture engine's config.py under a private name
    _cfg_path = os.path.join(POSTURE_ENGINE_DIR, "config.py")
    _spec = _ilu.spec_from_file_location("posture_config", _cfg_path)
    _posture_cfg = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_posture_cfg)

    # 2. Swap sys.modules["config"] so `import config` inside the engine
    #    resolves to the posture config, not the backend's config.
    _backend_config = sys.modules.get("config")
    sys.modules["config"] = _posture_cfg

    from engine import BehaviorAnalysisEngine

    # 3. Restore the backend's own config
    if _backend_config is not None:
        sys.modules["config"] = _backend_config
    else:
        del sys.modules["config"]

    ENGINE_AVAILABLE = True
    ENGINE_CONFIG = _posture_cfg
    logger.info("Postureanalysis-main engine loaded successfully")
except ImportError as e:
    # Restore backend config on failure too
    if "_backend_config" in dir() and _backend_config is not None:
        sys.modules["config"] = _backend_config
    logger.warning(f"Could not import BehaviorAnalysisEngine: {e}")
except Exception as e:
    if "_backend_config" in dir() and _backend_config is not None:
        sys.modules["config"] = _backend_config
    logger.warning(f"Error loading BehaviorAnalysisEngine: {e}")

# Fallback: try mediapipe directly for basic mode
MEDIAPIPE_AVAILABLE = False
if not ENGINE_AVAILABLE:
    try:
        import mediapipe as mp
        if hasattr(mp, 'solutions') and hasattr(mp.solutions, 'holistic'):
            MEDIAPIPE_AVAILABLE = True
            logger.info("Falling back to basic mediapipe holistic mode")
    except ImportError:
        logger.warning("mediapipe not installed - vision analysis disabled")


class VisionService:
    """Enhanced vision service powered by the Behavioral Analysis Engine."""

    def __init__(self):
        self.enabled = ENGINE_AVAILABLE or MEDIAPIPE_AVAILABLE
        self.last_face_time = time.time()

        # Load thresholds from posture engine config or use defaults
        if ENGINE_CONFIG:
            self.high_confidence = ENGINE_CONFIG.HIGH_CONFIDENCE_THRESHOLD  # 85
            self.moderate_confidence = ENGINE_CONFIG.MODERATE_CONFIDENCE_THRESHOLD  # 65
            self.face_absence_timeout = ENGINE_CONFIG.FACE_ABSENCE_TIMEOUT  # 2.0s
            self.posture_upright_threshold = ENGINE_CONFIG.POSTURE_UPRIGHT_THRESHOLD  # 10°
            self.face_detection_confidence = ENGINE_CONFIG.FACE_DETECTION_CONFIDENCE  # 0.5
            self.pose_detection_confidence = ENGINE_CONFIG.POSE_DETECTION_CONFIDENCE  # 0.5
            self.pose_tracking_confidence = ENGINE_CONFIG.POSE_TRACKING_CONFIDENCE  # 0.5
            self.weight_face = ENGINE_CONFIG.WEIGHT_FACE_PRESENCE  # 0.20
            self.weight_eye_contact = ENGINE_CONFIG.WEIGHT_EYE_CONTACT  # 0.25
            self.weight_posture = ENGINE_CONFIG.WEIGHT_POSTURE  # 0.30
            self.weight_movement = ENGINE_CONFIG.WEIGHT_MOVEMENT  # 0.25
        else:
            self.high_confidence = 85
            self.moderate_confidence = 65
            self.face_absence_timeout = 2.0
            self.posture_upright_threshold = 10
            self.face_detection_confidence = 0.5
            self.pose_detection_confidence = 0.5
            self.pose_tracking_confidence = 0.5
            self.weight_face = 0.20
            self.weight_eye_contact = 0.25
            self.weight_posture = 0.30
            self.weight_movement = 0.25

        # Temporal smoothing for when engine is not available
        self.confidence_history: deque = deque(maxlen=5)

        if ENGINE_AVAILABLE:
            logger.info("Initializing BehaviorAnalysisEngine (no camera)")
            self.engine = BehaviorAnalysisEngine(use_camera=False)
            self.engine.start_session()
            self.using_engine = True
        else:
            self.engine = None
            self.using_engine = False
            # Fallback to basic holistic if available
            if MEDIAPIPE_AVAILABLE:
                self._init_basic_holistic()
            logger.info(f"VisionService running in {'basic' if MEDIAPIPE_AVAILABLE else 'disabled'} mode")

    def _init_basic_holistic(self):
        """Initialize basic MediaPipe holistic as fallback."""
        import mediapipe as mp
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=self.face_detection_confidence,
            min_tracking_confidence=self.pose_tracking_confidence,
            refine_face_landmarks=True,
        )

    def process_base64_frame(self, base64_image: str) -> Dict:
        """Process base64 image and return behavioral metrics (for API)."""
        try:
            if "base64," in base64_image:
                base64_image = base64_image.split("base64,")[1]

            img_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                print(f"[VisionService] ERROR: Failed to decode image (b64 len={len(base64_image)})")
                return {"error": "Failed to decode image"}

            print(f"[VisionService] Frame decoded: {frame.shape}, using_engine={self.using_engine}")

            if self.using_engine:
                return self._analyze_with_engine(frame)
            elif MEDIAPIPE_AVAILABLE:
                return self._analyze_basic(frame)
            else:
                return self._disabled_response()

        except Exception as e:
            logger.error(f"Frame processing error: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}

    def _analyze_with_engine(self, frame: np.ndarray) -> Dict:
        """Analyze frame using the full BehaviorAnalysisEngine."""
        now = time.time()

        try:
            # Run the engine's analyze_frame
            result = self.engine.analyze_frame(frame)

            face_present = result.get('detections', {}).get('face', {}).get('face_present', False)
            face_conf = result.get('detections', {}).get('face', {}).get('confidence', 0)
            print(f"[VisionService] Engine result: face={face_present} (conf={face_conf:.2f}), frame #{result.get('frame_number', '?')}")
            scores = result.get("scores", {})
            analysis = result.get("analysis", {})
            detections = result.get("detections", {})
            fb = result.get("feedback", {})

            # Face presence
            face_data = detections.get("face", {})
            presence = face_data.get("face_present", False)
            if presence:
                self.last_face_time = now

            # When no face is detected, zero out all behaviour scores
            # instead of showing misleading defaults (e.g. 50 %).
            if not presence:
                return {
                    "presence": False,
                    "eye_contact": "away",
                    "confidence_score": 0,
                    "posture": {"slouch_angle": 0.0, "is_good": True},
                    "head_pose": {"yaw": 0.0, "pitch": 0.0},
                    "feedback": ["✗ Face not detected — please look at the camera"],
                    "overall": "😟 Look at the camera and sit straight",
                    "timestamp": now,
                    "attention_score": 0,
                    "attention_state": "away_from_screen",
                    "posture_quality": "unknown",
                    "posture_score": 0,
                    "eye_contact_score": 0,
                    "gaze_direction": "unknown",
                    "movement_score": 0,
                    "nervousness_level": "unknown",
                    "confidence_level": "low_confidence",
                }

            # Posture info
            posture_data = analysis.get("posture", {})
            posture_quality = posture_data.get("posture_quality")
            posture_quality_str = posture_quality.value if hasattr(posture_quality, 'value') else str(posture_quality)
            posture_score = posture_data.get("posture_score", 0.5)
            posture_issues = posture_data.get("issues", [])
            shoulder_angle = posture_data.get("shoulder_angle", 0.0)
            is_calibrated = posture_data.get("calibrated", False)

            # During posture calibration (first ~18s), the analyzer returns
            # a default 0.5.  Show a reasonable default instead.
            if not is_calibrated and posture_quality_str in ("unknown", "Unknown"):
                posture_score = 0.8
                posture_quality_str = "calibrating"

            # Eye contact / gaze info
            gaze_data = analysis.get("eye_contact", {})
            eye_contact_score = gaze_data.get("eye_contact_score", 0.5)
            is_looking = gaze_data.get("is_looking_at_camera", False)
            gaze_direction = gaze_data.get("gaze_direction")
            gaze_dir_str = gaze_direction.value if hasattr(gaze_direction, 'value') else str(gaze_direction)

            # Map eye contact to existing API format
            if eye_contact_score >= 0.7:
                eye_contact = "good"
            elif eye_contact_score >= 0.4:
                eye_contact = "moderate"
            else:
                eye_contact = "away"

            # Attention info
            attention_data = analysis.get("attention", {})
            attention_score = attention_data.get("attention_score", 0.5)
            attention_state = attention_data.get("state")
            attention_str = attention_state.value if hasattr(attention_state, 'value') else str(attention_state)

            # Movement info
            movement_data = analysis.get("movement", {})
            movement_score = movement_data.get("movement_score", 0.5)
            is_stable = movement_data.get("is_stable", True)
            nervousness = movement_data.get("nervousness_level")
            nervousness_str = nervousness.value if hasattr(nervousness, 'value') else str(nervousness)

            # During warm-up the movement deque is nearly empty, so the
            # smoothed score can be near 0 even though the user is calm.
            # Use the is_stable flag as ground truth.
            if is_stable and movement_score < 0.5:
                movement_score = max(movement_score, 0.8)

            # Confidence score from engine
            confidence_data = scores.get("confidence", {})
            confidence_score = confidence_data.get("score", 50)
            confidence_level = confidence_data.get("level")
            confidence_str = confidence_level.value if hasattr(confidence_level, 'value') else str(confidence_level)

            # Build feedback messages using engine feedback
            feedback_messages = []
            engine_msgs = fb.get("messages", [])
            primary_feedback = fb.get("primary", None)

            for msg in engine_msgs:
                # Add emoji prefixes for consistency with existing UI
                if "great" in msg.lower() or "excellent" in msg.lower() or "good" in msg.lower():
                    feedback_messages.append(f"✓ {msg}")
                elif "warning" in msg.lower() or "try" in msg.lower() or "maintain" in msg.lower():
                    feedback_messages.append(f"⚠ {msg}")
                else:
                    feedback_messages.append(msg)

            # Add specific feedback if engine didn't produce any
            if not feedback_messages:
                if presence:
                    feedback_messages.append("✓ Face detected")
                else:
                    feedback_messages.append("✗ Face not detected")
                if eye_contact == "good":
                    feedback_messages.append("✓ Good eye contact")
                elif eye_contact == "away":
                    feedback_messages.append("⚠ Maintain eye contact with camera")
                if posture_quality_str == "good":
                    feedback_messages.append("✓ Good posture")
                elif posture_quality_str == "poor":
                    feedback_messages.append(f"✗ Poor posture: {', '.join(posture_issues)}")

            # Overall feedback — use config thresholds
            if confidence_score >= self.high_confidence:
                overall = "😊 Excellent! Professional presence"
            elif confidence_score >= self.moderate_confidence:
                overall = "🙂 Good, minor improvements needed"
            elif confidence_score >= 40:
                overall = "😐 Needs attention - improve eye contact and posture"
            else:
                overall = "😟 Look at the camera and sit straight"

            # Compute a slouch angle equivalent for backward compat
            slouch_angle = abs(shoulder_angle) if shoulder_angle else 0.0

            return {
                "presence": presence,
                "eye_contact": eye_contact,
                "confidence_score": int(round(confidence_score)),
                "posture": {
                    "slouch_angle": round(slouch_angle, 1),
                    "is_good": posture_quality_str in ("good", "acceptable"),
                },
                "head_pose": {
                    "yaw": 0.0,  # Not directly available from pose detector
                    "pitch": 0.0,
                },
                "feedback": feedback_messages,
                "overall": overall,
                "timestamp": now,
                # New enhanced fields from posture engine
                "attention_score": round(attention_score * 100, 1),
                "attention_state": attention_str,
                "posture_quality": posture_quality_str,
                "posture_score": round(posture_score * 100, 1),
                "eye_contact_score": round(eye_contact_score * 100, 1),
                "gaze_direction": gaze_dir_str,
                "movement_score": round(movement_score * 100, 1),
                "nervousness_level": nervousness_str,
                "confidence_level": confidence_str,
            }

        except Exception as e:
            logger.error(f"Engine analysis error: {e}", exc_info=True)
            return self._disabled_response()

    def _analyze_basic(self, frame: np.ndarray) -> Dict:
        """Fallback basic analysis using Holistic (existing behavior)."""
        image_h, image_w = frame.shape[:2]
        now = time.time()

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.holistic.process(rgb)

        presence = False
        eye_contact = "unknown"
        slouch_angle = 0.0
        is_good_posture = True
        feedback_messages = []

        if results.face_landmarks:
            presence = True
            self.last_face_time = now
            eye_contact = "good"
            feedback_messages.append("✓ Face detected")
        else:
            if now - self.last_face_time > self.face_absence_timeout:
                feedback_messages.append("✗ Face not detected")

        if results.pose_landmarks:
            try:
                ls = results.pose_landmarks.landmark[self.mp_holistic.PoseLandmark.LEFT_SHOULDER]
                rs = results.pose_landmarks.landmark[self.mp_holistic.PoseLandmark.RIGHT_SHOULDER]
                lh = results.pose_landmarks.landmark[self.mp_holistic.PoseLandmark.LEFT_HIP]
                rh = results.pose_landmarks.landmark[self.mp_holistic.PoseLandmark.RIGHT_HIP]

                sm_x = (ls.x + rs.x) / 2
                sm_y = (ls.y + rs.y) / 2
                hm_x = (lh.x + rh.x) / 2
                hm_y = (lh.y + rh.y) / 2

                slouch_angle = abs(np.degrees(np.arctan2(sm_x - hm_x, sm_y - hm_y)))
                is_good_posture = slouch_angle <= self.posture_upright_threshold

                if is_good_posture:
                    feedback_messages.append("✓ Good posture")
                else:
                    feedback_messages.append(f"✗ Slouching detected ({slouch_angle:.0f}°)")
            except Exception:
                pass

        # Simple confidence calculation
        raw_score = 0
        if presence:
            raw_score += 30
        if eye_contact == "good":
            raw_score += 30
        if is_good_posture:
            raw_score += 20
        raw_score += 20  # Base points for showing up

        self.confidence_history.append(raw_score)
        confidence = int(sum(self.confidence_history) / len(self.confidence_history))

        if confidence >= self.high_confidence:
            overall = "😊 Excellent! Professional presence"
        elif confidence >= self.moderate_confidence:
            overall = "🙂 Good, minor improvements needed"
        elif confidence >= 40:
            overall = "😐 Needs attention"
        else:
            overall = "😟 Look at the camera and sit straight"

        return {
            "presence": presence,
            "eye_contact": eye_contact,
            "confidence_score": confidence,
            "posture": {
                "slouch_angle": round(slouch_angle, 1),
                "is_good": is_good_posture,
            },
            "head_pose": {"yaw": 0.0, "pitch": 0.0},
            "feedback": feedback_messages,
            "overall": overall,
            "timestamp": now,
        }

    def _disabled_response(self) -> Dict:
        """Return default response when analysis is disabled."""
        return {
            "presence": False,
            "eye_contact": "unknown",
            "confidence_score": 0,
            "posture": {"slouch_angle": 0.0, "is_good": True},
            "head_pose": {"yaw": 0.0, "pitch": 0.0},
            "feedback": ["⚠ Vision analysis unavailable (engine not configured)"],
            "overall": "Vision analysis disabled",
            "timestamp": time.time(),
        }

    def reset_session(self):
        """Reset session-specific tracking."""
        self.confidence_history.clear()
        if self.using_engine and self.engine:
            self.engine.reset()
            self.engine.start_session()

    def get_session_report(self) -> Optional[Dict]:
        """Get session report from the engine (new feature)."""
        if self.using_engine and self.engine:
            return self.engine.end_session()
        return None

    def close(self):
        """Cleanup resources."""
        if self.using_engine and self.engine:
            self.engine.close()

    # Legacy compatibility - analyze_frame_with_visualization
    def analyze_frame_with_visualization(self, frame):
        """Analyze frame and return (frame, metrics) for backward compat."""
        metrics = self.process_base64_frame(
            base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode()
        )
        return frame, metrics

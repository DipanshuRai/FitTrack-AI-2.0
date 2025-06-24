import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, Tuple, Optional, List

# Initialize MediaPipe Pose solution
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# ANGLE CONSTANTS FOR REP COUNTING
BICEP_CURL_ANGLE_UP = 65      # Elbow angle when arm is fully flexed (at the top)
BICEP_CURL_ANGLE_DOWN = 160     # Elbow angle when arm is fully extended (at the bottom)

# CONSTANTS FOR POSTURE VALIDATION
VISIBILITY_THRESHOLD = 0.75   # Minimum visibility for a landmark to be considered
SHOULDER_SWING_THRESHOLD = 45 # Maximum allowed angle for the shoulder to prevent swinging

class BicepCurlExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.8, min_tracking_confidence=0.8)
        self.reset_state()

    def reset_state(self):
        self.rep_count = 0
        self.last_position = 'down'  # Assume starting position is with arm extended

    def _calculate_angle(self, a: List[float], b: List[float], c: List[float]) -> float:
        a, b, c = np.array(a), np.array(b), np.array(c)
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        return 360 - angle if angle > 180.0 else angle

    def _get_visible_side_landmarks(self, landmarks: any) -> Optional[str]:
        left_shoulder_vis = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].visibility
        right_shoulder_vis = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].visibility
        
        # Check if any side is sufficiently visible
        if left_shoulder_vis > VISIBILITY_THRESHOLD or right_shoulder_vis > VISIBILITY_THRESHOLD:
            return "LEFT" if left_shoulder_vis >= right_shoulder_vis else "RIGHT"
        return None

    def _is_likely_bicep_curl(self, landmarks: any, side: str) -> bool:
        shoulder_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_SHOULDER").value]
        hip_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_HIP").value]
        elbow_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_ELBOW").value]

        # Condition 1: User must be in an upright posture (shoulders above hips).
        if shoulder_lm.y >= hip_lm.y:
            return False

        # Condition 2: The upper arm must be isolated (no shoulder swinging).
        # We check this by ensuring the hip-shoulder-elbow angle is small.
        shoulder_angle = self._calculate_angle(
            [hip_lm.x, hip_lm.y],
            [shoulder_lm.x, shoulder_lm.y],
            [elbow_lm.x, elbow_lm.y]
        )
        if shoulder_angle > SHOULDER_SWING_THRESHOLD:
            return False

        return True

    def process_frame(self, image: np.ndarray) -> Tuple[np.ndarray, Optional[any]]:
        results = self.pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        landmarks = None
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
        return image, landmarks

    def analyze_exercise(self, landmarks: any) -> Dict:
        if not landmarks:
            return {"repCount": self.rep_count, "position": self.last_position}

        visible_side = self._get_visible_side_landmarks(landmarks)
        if not visible_side:
            return {"repCount": self.rep_count, "position": "unknown"}

        # Validate that the posture is correct for a bicep curl ---
        if not self._is_likely_bicep_curl(landmarks, visible_side):
            return {"repCount": self.rep_count, "position": "unknown"}
        
        # If check passes, get landmarks for the visible side and proceed.
        shoulder_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{visible_side}_SHOULDER").value]
        elbow_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{visible_side}_ELBOW").value]
        wrist_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{visible_side}_WRIST").value]
        
        points = {
            "shoulder": [shoulder_lm.x, shoulder_lm.y],
            "elbow": [elbow_lm.x, elbow_lm.y],
            "wrist": [wrist_lm.x, wrist_lm.y]
        }
        
        elbow_angle = self._calculate_angle(points["shoulder"], points["elbow"], points["wrist"])
        
        if elbow_angle < BICEP_CURL_ANGLE_UP:
            self.last_position = 'up'
        elif elbow_angle > BICEP_CURL_ANGLE_DOWN and self.last_position == 'up':
            self.rep_count += 1
            self.last_position = 'down'

        return {
            "repCount": self.rep_count,
            "position": self.last_position
        }
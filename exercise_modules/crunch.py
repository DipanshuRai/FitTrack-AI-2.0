import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, Tuple, Optional, List

# Initialize MediaPipe Pose solution
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# ANGLE CONSTANTS FOR REP COUNTING (measures the torso-thigh angle)
CRUNCH_ANGLE_UP = 75     # Angle when torso is flexed (crunched up)
CRUNCH_ANGLE_DOWN = 100  # Angle when torso is extended (lying down)

# CONSTANTS FOR POSTURE VALIDATION
VISIBILITY_THRESHOLD = 0.7
# Heuristic to check if the user is lying down (torso is low in the frame)
LYING_DOWN_THRESHOLD = 0.6
# Max angle for the knee to be considered "bent" in a crunch position
KNEE_BENT_THRESHOLD = 130 

class CrunchExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.8, min_tracking_confidence=0.8)
        self.reset_state()

    def reset_state(self):
        self.rep_count = 0
        self.last_position = 'down'

    def _calculate_angle(self, a: List[float], b: List[float], c: List[float]) -> float:
        a, b, c = np.array(a), np.array(b), np.array(c)
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        return 360 - angle if angle > 180.0 else angle

    def _get_visible_side(self, landmarks: any) -> Optional[str]:
        key_landmarks_left = [mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.LEFT_KNEE]
        key_landmarks_right = [mp_pose.PoseLandmark.RIGHT_SHOULDER, mp_pose.PoseLandmark.RIGHT_HIP, mp_pose.PoseLandmark.RIGHT_KNEE]
        
        left_visible = all(landmarks[lm.value].visibility > VISIBILITY_THRESHOLD for lm in key_landmarks_left)
        right_visible = all(landmarks[lm.value].visibility > VISIBILITY_THRESHOLD for lm in key_landmarks_right)
        
        if left_visible or right_visible:
            return "LEFT" if left_visible >= right_visible else "RIGHT"
        return None

    def _is_likely_crunch(self, landmarks: any, side: str) -> bool:
        shoulder_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_SHOULDER").value]
        hip_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_HIP").value]
        knee_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_KNEE").value]
        ankle_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_ANKLE").value]

        # Condition 1: User must be lying down (hips and shoulders low in the frame).
        is_lying_down = shoulder_lm.y > LYING_DOWN_THRESHOLD and hip_lm.y > LYING_DOWN_THRESHOLD
        if not is_lying_down:
            return False

        # Condition 2: Knees must be bent.
        knee_angle = self._calculate_angle([hip_lm.x, hip_lm.y], [knee_lm.x, knee_lm.y], [ankle_lm.x, ankle_lm.y])
        knees_are_bent = knee_angle < KNEE_BENT_THRESHOLD
        
        return knees_are_bent

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
        
        visible_side = self._get_visible_side(landmarks)
        if not visible_side:
            return {"repCount": self.rep_count, "position": "unknown"}

        # Validate that the posture is correct for a crunch ---
        if not self._is_likely_crunch(landmarks, visible_side):
            return {"repCount": self.rep_count, "position": "unknown"}

        # If check passes, get landmarks and proceed with analysis
        shoulder_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_SHOULDER").value]
        hip_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_HIP").value]
        knee_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_KNEE").value]

        # The crunch angle is measured between the shoulder, hip, and knee
        back_angle = self._calculate_angle(
            [shoulder_lm.x, shoulder_lm.y],
            [hip_lm.x, hip_lm.y],
            [knee_lm.x, knee_lm.y]
        )
        
        if back_angle < CRUNCH_ANGLE_UP:
            self.last_position = 'up'
        elif back_angle > CRUNCH_ANGLE_DOWN and self.last_position == 'up':
            self.rep_count += 1
            self.last_position = 'down'

        return {
            "repCount": self.rep_count,
            "position": self.last_position
        }
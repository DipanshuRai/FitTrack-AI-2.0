import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, Tuple, Optional, List

# Initialize MediaPipe Pose solution
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# ANGLE CONSTANTS FOR REP COUNTING
SQUAT_KNEE_ANGLE_UP = 160     # Knee angle when standing straight
SQUAT_KNEE_ANGLE_DOWN = 80    # Knee angle at the bottom of a deep squat

# CONSTANTS FOR POSTURE VALIDATION
VISIBILITY_THRESHOLD = 0.7
# Heuristic to check if feet are on the ground (Y-coordinate > 80% of screen height)
FEET_ON_GROUND_THRESHOLD = 0.8 

class SquatExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.7, min_tracking_confidence=0.7)
        self.reset_state()

    def reset_state(self):
        self.rep_count = 0
        self.last_position = 'up'

    def _calculate_angle(self, a: List[float], b: List[float], c: List[float]) -> float:
        a, b, c = np.array(a), np.array(b), np.array(c)
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        return 360 - angle if angle > 180.0 else angle

    def _get_visible_leg_side(self, landmarks: any) -> Optional[str]:
        key_landmarks_left = [mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.LEFT_KNEE, mp_pose.PoseLandmark.LEFT_ANKLE]
        key_landmarks_right = [mp_pose.PoseLandmark.RIGHT_HIP, mp_pose.PoseLandmark.RIGHT_KNEE, mp_pose.PoseLandmark.RIGHT_ANKLE]
        
        left_visible = all(landmarks[lm.value].visibility > VISIBILITY_THRESHOLD for lm in key_landmarks_left)
        right_visible = all(landmarks[lm.value].visibility > VISIBILITY_THRESHOLD for lm in key_landmarks_right)
        
        if left_visible or right_visible:
            return "LEFT" if left_visible >= right_visible else "RIGHT"
        return None

    def _is_likely_squat(self, landmarks: any, side: str) -> bool:
        shoulder_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_SHOULDER").value]
        hip_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_HIP").value]
        ankle_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{side}_ANKLE").value]
        
        # Condition 1: User must be in an upright posture (shoulders above hips).
        shoulders_above_hips = shoulder_lm.y < hip_lm.y
        
        # Condition 2: Feet must be on the ground (low in the video frame).
        feet_on_ground = ankle_lm.y > FEET_ON_GROUND_THRESHOLD
        
        return shoulders_above_hips and feet_on_ground

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
            
        visible_side = self._get_visible_leg_side(landmarks)
        if not visible_side:
            return {"repCount": self.rep_count, "position": "unknown"}

        # Validate that the posture is correct for a squat ---
        if not self._is_likely_squat(landmarks, visible_side):
            return {"repCount": self.rep_count, "position": "unknown"}

        # If check passes, get landmarks and proceed with analysis
        hip_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{visible_side}_HIP").value]
        knee_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{visible_side}_KNEE").value]
        ankle_lm = landmarks[getattr(mp_pose.PoseLandmark, f"{visible_side}_ANKLE").value]

        knee_angle = self._calculate_angle(
            [hip_lm.x, hip_lm.y],
            [knee_lm.x, knee_lm.y],
            [ankle_lm.x, ankle_lm.y]
        )
        
        if knee_angle > SQUAT_KNEE_ANGLE_UP:
            if self.last_position == 'down':
                self.rep_count += 1
            self.last_position = 'up'
        elif knee_angle < SQUAT_KNEE_ANGLE_DOWN:
            self.last_position = 'down'

        return {
            "repCount": self.rep_count,
            "position": self.last_position
        }
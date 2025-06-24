import cv2
import numpy as np
import mediapipe as mp

# Initialize MediaPipe Pose solution
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils

# Angle of the elbow for counting reps
PUSHUP_ELBOW_ANGLE_UP = 160  # Elbow angle when arms are extended
PUSHUP_ELBOW_ANGLE_DOWN = 70   # Elbow angle when arms are bent

# Threshold for confirming horizontal posture
HORIZONTAL_POSE_THRESHOLD = 0.2


class PushUpExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(
            min_detection_confidence=0.8, 
            min_tracking_confidence=0.8
        )
        self.rep_count = 0
        self.last_position = None  # Can be 'up', 'down', or None

    def _calculate_angle(self, a, b, c):
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        return 360 - angle if angle > 180.0 else angle

    def _is_likely_pushup(self, landmarks):
        shoulder_y = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y
        hip_y = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y
        ankle_y = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y

        if abs(shoulder_y - hip_y) > HORIZONTAL_POSE_THRESHOLD or abs(hip_y - ankle_y) > HORIZONTAL_POSE_THRESHOLD:
            return False
            
        return True

    def process_frame(self, image):
        results = self.pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        landmarks = None
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            mp_draw.draw_landmarks(
                image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
            )
        return image, landmarks

    def analyze_exercise(self, landmarks):

        if not landmarks:
            return {"repCount": self.rep_count, "position": self.last_position}

        if not self._is_likely_pushup(landmarks):
            return {"repCount": self.rep_count, "position": "unknown"}

        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        elbow_angle = self._calculate_angle(shoulder, elbow, wrist)

        if elbow_angle > PUSHUP_ELBOW_ANGLE_UP:
            if self.last_position == "down":
                self.rep_count += 1
            self.last_position = "up"
        elif elbow_angle < PUSHUP_ELBOW_ANGLE_DOWN:
            self.last_position = "down"
            
        return {
            "repCount": self.rep_count,
            "position": self.last_position,
        }
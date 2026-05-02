import numpy as np
from scipy.spatial.transform import Rotation as R, Slerp


class MathEngine:

    # --- Vector Operations ---

    @staticmethod
    def add(a, b):
        return np.add(a, b)

    @staticmethod
    def sub(a, b):
        return np.subtract(a, b)

    @staticmethod
    def dot(a, b):
        return float(np.dot(a, b))

    @staticmethod
    def cross(a, b):
        return np.cross(a, b)

    @staticmethod
    def normalize(v):
        norm = np.linalg.norm(v)
        return v / norm if norm != 0 else v

    # --- Matrix Operations ---

    @staticmethod
    def identity():
        return np.eye(4, dtype=float)

    @staticmethod
    def translate(v):
        m = np.eye(4, dtype=float)
        m[:3, 3] = v
        return m

    @staticmethod
    def scale(v):
        m = np.eye(4, dtype=float)
        m[0, 0], m[1, 1], m[2, 2] = v
        return m

    @staticmethod
    def rotate(radians, axis):
        axis = np.array(axis, dtype=float)
        axis = axis / np.linalg.norm(axis)
        rot = R.from_rotvec(axis * radians)
        m = np.eye(4, dtype=float)
        m[:3, :3] = rot.as_matrix()
        return m

    # --- Quaternion Operations ---

    @staticmethod
    def from_euler(euler_radians):
        rot = R.from_euler('xyz', euler_radians)
        return rot.as_quat()  # [x, y, z, w]

    @staticmethod
    def to_euler(quat):
        rot = R.from_quat(quat)
        return rot.as_euler('xyz')

    @staticmethod
    def slerp(a, b, t):
        key_rots = R.from_quat([a, b])
        key_times = [0, 1]
        slerp_fn = Slerp(key_times, key_rots)
        return slerp_fn([t]).as_quat()[0]

    # --- Interpolation ---

    @staticmethod
    def lerp(a, b, t):
        return a + t * (b - a)

    @staticmethod
    def lerp_vec3(a, b, t):
        return a + t * (b - a)
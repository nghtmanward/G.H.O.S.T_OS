import { vec3, mat4, quat } from "gl-matrix";
import { lerp } from "mathjs";

export class MathEngine {

    // --- Vector Operations ---

    static add(a, b) {
        const out = vec3.create();
        vec3.add(out, a, b);
        return out;
    }

    static sub(a, b) {
        const out = vec3.create();
        vec3.sub(out, a, b);
        return out;
    }

    static dot(a, b) {
        return vec3.dot(a, b);
    }

    static cross(a, b) {
        const out = vec3.create();
        vec3.cross(out, a, b);
        return out;
    }

    static normalize(v) {
        const out = vec3.create();
        vec3.normalize(out, v);
        return out;
    }

    // --- Matrix Operations ---

    static identity() {
        return mat4.create();
    }

    static translate(v) {
        const out = mat4.create();
        mat4.translate(out, out, v);
        return out;
    }

    static scale(v) {
        const out = mat4.create();
        mat4.scale(out, out, v);
        return out;
    }

    static rotate(radians, axis) {
        const out = mat4.create();
        mat4.rotate(out, out, radians, axis);
        return out;
    }

    // --- Quaternion Operations ---

    static fromEuler(eulerRadians) {
        const q = quat.create();
        quat.fromEuler(q,
            eulerRadians[0] * (180 / Math.PI),
            eulerRadians[1] * (180 / Math.PI),
            eulerRadians[2] * (180 / Math.PI)
        );
        return q;
    }

    static toEuler(q) {
        const out = vec3.create();
        quat.getEuler(out, q);
        return out;
    }

    static slerp(a, b, t) {
        const out = quat.create();
        quat.slerp(out, a, b, t);
        return out;
    }

    // --- Interpolation ---

    static lerp(a, b, t) {
        return lerp(a, b, t);
    }

    static lerpVec3(a, b, t) {
        const out = vec3.create();
        vec3.lerp(out, a, b, t);
        return out;
    }
}

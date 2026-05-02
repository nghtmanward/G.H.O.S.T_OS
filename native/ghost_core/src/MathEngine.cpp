#include "MathEngine.h"

namespace ghost_core {

    // --- Vector Operations ---

    glm::vec3 MathEngine::Add(const glm::vec3& a, const glm::vec3& b) {
        return a + b;
    }

    glm::vec3 MathEngine::Sub(const glm::vec3& a, const glm::vec3& b) {
        return a - b;
    }

    float MathEngine::Dot(const glm::vec3& a, const glm::vec3& b) {
        return glm::dot(a, b);
    }

    glm::vec3 MathEngine::Cross(const glm::vec3& a, const glm::vec3& b) {
        return glm::cross(a, b);
    }

    glm::vec3 MathEngine::Normalize(const glm::vec3& v) {
        return glm::normalize(v);
    }

    // --- Matrix Operations ---

    glm::mat4 MathEngine::Identity() {
        return glm::mat4(1.0f);
    }

    glm::mat4 MathEngine::Translate(const glm::vec3& v) {
        return glm::translate(glm::mat4(1.0f), v);
    }

    glm::mat4 MathEngine::Scale(const glm::vec3& v) {
        return glm::scale(glm::mat4(1.0f), v);
    }

    glm::mat4 MathEngine::Rotate(float radians, const glm::vec3& axis) {
        return glm::rotate(glm::mat4(1.0f), radians, axis);
    }

    // --- Quaternion Operations ---

    glm::quat MathEngine::FromEuler(const glm::vec3& eulerRadians) {
        return glm::angleAxis(eulerRadians.z, glm::vec3(0.0f, 0.0f, 1.0f))
             * glm::angleAxis(eulerRadians.y, glm::vec3(0.0f, 1.0f, 0.0f))
             * glm::angleAxis(eulerRadians.x, glm::vec3(1.0f, 0.0f, 0.0f));
    }

    glm::vec3 MathEngine::ToEuler(const glm::quat& q) {
        return glm::eulerAngles(q);
    }

    glm::quat MathEngine::Slerp(const glm::quat& a, const glm::quat& b, float t) {
        return glm::slerp(a, b, t);
    }

    // --- Interpolation ---

    float MathEngine::Lerp(float a, float b, float t) {
        return a + t * (b - a);
    }

    glm::vec3 MathEngine::LerpVec3(const glm::vec3& a, const glm::vec3& b, float t) {
        return a + t * (b - a);
    }

} // namespace ghost_core
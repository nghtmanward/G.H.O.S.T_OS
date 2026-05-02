#pragma once

#include <glm/glm.hpp>
#include <glm/gtc/quaternion.hpp>
#include <glm/gtx/transform.hpp>
#include <glm/gtc/matrix_transform.hpp>

namespace ghost_core {

    class MathEngine {
    public:
        // --- Vector Operations ---
        static glm::vec3 Add(const glm::vec3& a, const glm::vec3& b);
        static glm::vec3 Sub(const glm::vec3& a, const glm::vec3& b);
        static float Dot(const glm::vec3& a, const glm::vec3& b);
        static glm::vec3 Cross(const glm::vec3& a, const glm::vec3& b);
        static glm::vec3 Normalize(const glm::vec3& v);

        // --- Matrix Operations ---
        static glm::mat4 Identity();
        static glm::mat4 Translate(const glm::vec3& v);
        static glm::mat4 Scale(const glm::vec3& v);
        static glm::mat4 Rotate(float radians, const glm::vec3& axis);

        // --- Quaternion Operations ---
        static glm::quat FromEuler(const glm::vec3& eulerRadians);
        static glm::vec3 ToEuler(const glm::quat& q);
        static glm::quat Slerp(const glm::quat& a, const glm::quat& b, float t);

        // --- Interpolation ---
        static float Lerp(float a, float b, float t);
        static glm::vec3 LerpVec3(const glm::vec3& a, const glm::vec3& b, float t);
    };

} // namespace ghost_core

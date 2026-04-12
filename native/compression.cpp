#include "compression.h"
#include <napi.h>
#include <cmath>
#include <stdexcept>

namespace ghost {

    double dot(const std::vector<double>& a, const std::vector<double>& b) {
        if (a.size() != b.size()) {
            throw std::runtime_error("dot: size mismatch");
        }
        double sum = 0.0;
        for (size_t i = 0; i < a.size(); ++i) {
            sum += a[i] * b[i];
        }
        return sum;
    }

    double magnitude(const std::vector<double>& v) {
        double sum = 0.0;
        for (double x : v) {
            sum += x * x;
        }
        return std::sqrt(sum);
    }

    std::vector<double> normalize(const std::vector<double>& v) {
        double mag = magnitude(v);
        if (mag == 0.0) {
            return v;
        }
        std::vector<double> out;
        out.reserve(v.size());
        for (double x : v) {
            out.push_back(x / mag);
        }
        return out;
    }

    double cosineSimilarity(const std::vector<double>& a, const std::vector<double>& b) {
        double magA = magnitude(a);
        double magB = magnitude(b);
        if (magA == 0.0 || magB == 0.0) {
            return 0.0;
        }
        return dot(a, b) / (magA * magB);
    }

    double anomalyScore(const std::vector<double>& v,
                        const std::vector<double>& baseline) {
        double cs = cosineSimilarity(v, baseline);
        // clamp to [-1,1] just in case
        if (cs > 1.0) cs = 1.0;
        if (cs < -1.0) cs = -1.0;
        // map to [0,2], then squash to [0,1]
        double score = 1.0 - cs; // 0 = identical, 2 = opposite
        if (score < 0.0) score = 0.0;
        if (score > 2.0) score = 2.0;
        return score / 2.0;
    }

} // namespace ghost

// ---------------------- N-API BRIDGE ----------------------

static std::vector<double> JsArrayToVector(const Napi::Env& env,
                                           const Napi::Value& value) {
    if (!value.IsArray()) {
        throw Napi::TypeError::New(env, "Expected an array");
    }
    Napi::Array arr = value.As<Napi::Array>();
    std::vector<double> out;
    out.reserve(arr.Length());
    for (uint32_t i = 0; i < arr.Length(); ++i) {
        Napi::Value v = arr.Get(i);
        if (!v.IsNumber()) {
            throw Napi::TypeError::New(env, "Array elements must be numbers");
        }
        out.push_back(v.As<Napi::Number>().DoubleValue());
    }
    return out;
}

static Napi::Array VectorToJsArray(const Napi::Env& env,
                                   const std::vector<double>& v) {
    Napi::Array arr = Napi::Array::New(env, v.size());
    for (size_t i = 0; i < v.size(); ++i) {
        arr[(uint32_t)i] = Napi::Number::New(env, v[i]);
    }
    return arr;
}

// normalize(vec: number[]): number[]
Napi::Value JsNormalize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() != 1) {
        throw Napi::TypeError::New(env, "normalize expects 1 argument");
    }
    auto v = JsArrayToVector(env, info[0]);
    auto n = ghost::normalize(v);
    return VectorToJsArray(env, n);
}

// dot(a: number[], b: number[]): number
Napi::Value JsDot(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() != 2) {
        throw Napi::TypeError::New(env, "dot expects 2 arguments");
    }
    auto a = JsArrayToVector(env, info[0]);
    auto b = JsArrayToVector(env, info[1]);
    double d = ghost::dot(a, b);
    return Napi::Number::New(env, d);
}

// magnitude(v: number[]): number
Napi::Value JsMagnitude(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() != 1) {
        throw Napi::TypeError::New(env, "magnitude expects 1 argument");
    }
    auto v = JsArrayToVector(env, info[0]);
    double m = ghost::magnitude(v);
    return Napi::Number::New(env, m);
}

// cosineSimilarity(a: number[], b: number[]): number
Napi::Value JsCosineSimilarity(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() != 2) {
        throw Napi::TypeError::New(env, "cosineSimilarity expects 2 arguments");
    }
    auto a = JsArrayToVector(env, info[0]);
    auto b = JsArrayToVector(env, info[1]);
    double cs = ghost::cosineSimilarity(a, b);
    return Napi::Number::New(env, cs);
}

// anomalyScore(v: number[], baseline: number[]): number
Napi::Value JsAnomalyScore(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() != 2) {
        throw Napi::TypeError::New(env, "anomalyScore expects 2 arguments");
    }
    auto v = JsArrayToVector(env, info[0]);
    auto baseline = JsArrayToVector(env, info[1]);
    double score = ghost::anomalyScore(v, baseline);
    return Napi::Number::New(env, score);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports.Set("normalize",        Napi::Function::New(env, JsNormalize));
    exports.Set("dot",              Napi::Function::New(env, JsDot));
    exports.Set("magnitude",        Napi::Function::New(env, JsMagnitude));
    exports.Set("cosineSimilarity", Napi::Function::New(env, JsCosineSimilarity));
    exports.Set("anomalyScore",     Napi::Function::New(env, JsAnomalyScore));
    return exports;
}

NODE_API_MODULE(compression, InitAll)
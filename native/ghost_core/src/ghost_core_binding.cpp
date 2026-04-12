#include <napi.h>
#include "MemorySystem.h"
#include "RetrievalEngine.h"
#include "SemanticCore.h"
#include "MemoryShard.h"
#include "EpisodicMemoryNative.h"

// Global native engines
static MemorySystem g_memorySystem;
static RetrievalEngine g_retrievalEngine;
static SemanticCore g_semanticCore;
static EpisodicMemoryNative g_episodicNative;

// -------------------------------
// Helpers
// -------------------------------
static std::vector<float> JsArrayToFloatVector(const Napi::Array& arr) {
    std::vector<float> out;
    out.reserve(arr.Length());
    for (uint32_t i = 0; i < arr.Length(); ++i) {
        out.push_back(arr.Get(i).As<Napi::Number>().FloatValue());
    }
    return out;
}

static Napi::Array FloatVectorToJsArray(Napi::Env env, const std::vector<float>& v) {
    Napi::Array arr = Napi::Array::New(env, v.size());
    for (uint32_t i = 0; i < v.size(); ++i) {
        arr.Set(i, Napi::Number::New(env, v[i]));
    }
    return arr;
}

static Napi::Object EpisodeToJs(Napi::Env env, const EpisodeItem& ep) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("id", ep.id);
    obj.Set("text", ep.text);
    obj.Set("embedding", FloatVectorToJsArray(env, ep.embedding));
    obj.Set("anomaly", ep.anomaly);
    obj.Set("latentMag", ep.latentMag);
    obj.Set("timestamp", Napi::Number::New(env, static_cast<double>(ep.timestamp)));
    obj.Set("mood", ep.mood);
    obj.Set("source", ep.source);
    return obj;
}

// -------------------------------
// Episodic Memory Native API
// -------------------------------

// addEpisodeNative({ text, embedding, anomaly, latentMag, timestamp, mood, source })
Napi::Value AddEpisodeNative(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!info[0].IsObject()) return env.Null();

    Napi::Object obj = info[0].As<Napi::Object>();

    EpisodeItem ep;
    ep.text = obj.Get("text").As<Napi::String>().Utf8Value();
    ep.embedding = JsArrayToFloatVector(obj.Get("embedding").As<Napi::Array>());
    ep.anomaly = obj.Get("anomaly").As<Napi::Number>().FloatValue();
    ep.latentMag = obj.Get("latentMag").As<Napi::Number>().FloatValue();
    ep.timestamp = static_cast<long long>(obj.Get("timestamp").As<Napi::Number>().Int64Value());
    ep.mood = obj.Get("mood").As<Napi::String>().Utf8Value();
    ep.source = obj.Get("source").As<Napi::String>().Utf8Value();

    g_episodicNative.addEpisode(ep);
    return env.Null();
}

// getEpisodesNative() → [{...}]
Napi::Value GetEpisodesNative(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    const auto& eps = g_episodicNative.getAll();

    Napi::Array arr = Napi::Array::New(env, eps.size());
    for (uint32_t i = 0; i < eps.size(); ++i) {
        arr.Set(i, EpisodeToJs(env, eps[i]));
    }
    return arr;
}

// clearEpisodesNative()
Napi::Value ClearEpisodesNative(const Napi::CallbackInfo& info) {
    g_episodicNative.clear();
    return info.Env().Null();
}

// retrieveEpisodesNative(queryEmbedding, topK)
Napi::Value RetrieveEpisodesNative(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!info[0].IsArray() || !info[1].IsNumber()) return env.Null();

    std::vector<float> query = JsArrayToFloatVector(info[0].As<Napi::Array>());
    int topK = info[1].As<Napi::Number>().Int32Value();

    std::vector<int> ids = g_episodicNative.retrieveTopK(query, topK);
    const auto& eps = g_episodicNative.getAll();

    Napi::Array out = Napi::Array::New(env, ids.size());
    for (uint32_t i = 0; i < ids.size(); ++i) {
        int id = ids[i];
        if (id >= 0 && id < (int)eps.size()) {
            out.Set(i, EpisodeToJs(env, eps[id]));
        }
    }
    return out;
}

// -------------------------------
// Existing shard + retrieval exports remain unchanged
// -------------------------------

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    // Episodic memory
    exports.Set("addEpisodeNative", Napi::Function::New(env, AddEpisodeNative));
    exports.Set("getEpisodesNative", Napi::Function::New(env, GetEpisodesNative));
    exports.Set("clearEpisodesNative", Napi::Function::New(env, ClearEpisodesNative));
    exports.Set("retrieveEpisodesNative", Napi::Function::New(env, RetrieveEpisodesNative));

    // Existing exports (shards, retrieval, semantic)
    exports.Set("addShard", Napi::Function::New(env, AddShard));
    exports.Set("getShards", Napi::Function::New(env, GetShards));
    exports.Set("clearShards", Napi::Function::New(env, ClearShards));
    exports.Set("retrieveTopK", Napi::Function::New(env, RetrieveTopK));
    exports.Set("retrieveFromShards", Napi::Function::New(env, RetrieveFromShards));
    exports.Set("findSimilar", Napi::Function::New(env, FindSimilar));

    return exports;
}

NODE_API_MODULE(ghost_core, InitAll)
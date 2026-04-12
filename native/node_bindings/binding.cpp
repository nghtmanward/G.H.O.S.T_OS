#include <napi.h>
#include "SemanticCore.h"
#include "RetrievalEngine.h"
#include "MemoryShard.h"

//
// Convert JS array → std::vector<float>
//
std::vector<float> jsArrayToFloatVector(const Napi::Array& arr) {
    std::vector<float> out;
    out.reserve(arr.Length());

    for (uint32_t i = 0; i < arr.Length(); ++i) {
        out.push_back(arr.Get(i).As<Napi::Number>().FloatValue());
    }
    return out;
}

//
// Convert JS array of objects → std::vector<EmbeddingItem>
//
std::vector<EmbeddingItem> jsArrayToEmbeddingItems(const Napi::Array& arr) {
    std::vector<EmbeddingItem> items;
    items.reserve(arr.Length());

    for (uint32_t i = 0; i < arr.Length(); ++i) {
        Napi::Object obj = arr.Get(i).As<Napi::Object>();

        EmbeddingItem item;
        item.id = obj.Get("id").As<Napi::Number>().Int32Value();

        Napi::Array emb = obj.Get("embedding").As<Napi::Array>();
        item.embedding = jsArrayToFloatVector(emb);

        items.push_back(item);
    }
    return items;
}

//
// Convert JS array of shard objects → std::vector<MemoryShard>
//
std::vector<MemoryShard> jsArrayToShards(const Napi::Array& arr) {
    std::vector<MemoryShard> shards;
    shards.reserve(arr.Length());

    for (uint32_t i = 0; i < arr.Length(); ++i) {
        Napi::Object obj = arr.Get(i).As<Napi::Object>();

        MemoryShard shard;
        shard.id = obj.Get("id").As<Napi::Number>().Int32Value();

        if (obj.Has("embedding")) {
            Napi::Array emb = obj.Get("embedding").As<Napi::Array>();
            shard.embedding = jsArrayToFloatVector(emb);
        }

        shards.push_back(shard);
    }
    return shards;
}

//
// findSimilar(queryEmbedding, items, topK)
//
Napi::Value FindSimilarWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto queryArr = info[0].As<Napi::Array>();
    auto itemsArr = info[1].As<Napi::Array>();
    int topK = info[2].As<Napi::Number>().Int32Value();

    std::vector<float> query = jsArrayToFloatVector(queryArr);
    std::vector<EmbeddingItem> items = jsArrayToEmbeddingItems(itemsArr);

    SemanticCore core;
    std::vector<int> result = core.findSimilar(query, items, topK);

    Napi::Array out = Napi::Array::New(env, result.size());
    for (uint32_t i = 0; i < result.size(); ++i) {
        out.Set(i, Napi::Number::New(env, result[i]));
    }

    return out;
}

//
// retrieveFromShards(queryEmbedding, shards, topK)
//
Napi::Value RetrieveFromShardsWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto queryArr = info[0].As<Napi::Array>();
    auto shardsArr = info[1].As<Napi::Array>();
    int topK = info[2].As<Napi::Number>().Int32Value();

    std::vector<float> query = jsArrayToFloatVector(queryArr);
    std::vector<MemoryShard> shards = jsArrayToShards(shardsArr);

    RetrievalEngine engine;
    std::vector<int> result = engine.retrieveFromShards(query, shards, topK);

    Napi::Array out = Napi::Array::New(env, result.size());
    for (uint32_t i = 0; i < result.size(); ++i) {
        out.Set(i, Napi::Number::New(env, result[i]));
    }

    return out;
}

//
// Module initialization
//
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("findSimilar", Napi::Function::New(env, FindSimilarWrapped));
    exports.Set("retrieveFromShards", Napi::Function::New(env, RetrieveFromShardsWrapped));
    return exports;
}

NODE_API_MODULE(ghost_core, Init)
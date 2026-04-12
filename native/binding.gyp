{
  "targets": [
    {
      "target_name": "compression",
      "sources": [
        "compression.cpp"
      ],
      "cflags_cc": [ "-std=c++17" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
    },
    {
      "target_name": "ghost_core",
      "sources": [
        "ghost_core/src/utils.cpp",
        "ghost_core/src/SemanticCore.cpp",
        "ghost_core/src/RetrievalEngine.cpp",
        "ghost_core/src/MemorySystem.cpp",
        "ghost_core/src/ghost_core_binding.cpp"
      ],
      "include_dirs": [
        "ghost_core/include",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "cflags_cc": [ "-std=c++17" ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
    }
  ]
}
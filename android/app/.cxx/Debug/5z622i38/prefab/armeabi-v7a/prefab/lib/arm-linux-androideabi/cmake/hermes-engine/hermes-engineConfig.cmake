if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/BaekjinSung/.gradle/caches/9.3.1/transforms/983bc9d37b3ca67aaa8c5e8bd30aac8f/workspace/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/libs/android.armeabi-v7a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/BaekjinSung/.gradle/caches/9.3.1/transforms/983bc9d37b3ca67aaa8c5e8bd30aac8f/workspace/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


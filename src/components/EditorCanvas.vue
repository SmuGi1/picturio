<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, markRaw } from 'vue'
import { useEditorStore } from '../stores/editor'
import { createToastAdapter } from '../editor/toastAdapter'
import type { ImageAdapter } from '../editor/adapter.types'

const props = defineProps<{ adapterFactory?: (el: HTMLElement) => ImageAdapter }>()
const host = ref<HTMLDivElement | null>(null)
const store = useEditorStore()

onMounted(() => {
  const factory = props.adapterFactory ?? createToastAdapter
  if (host.value) store.setAdapter(markRaw(factory(host.value)))
})

onBeforeUnmount(() => {
  store.adapter?.destroy()
  store.setAdapter(null)
})
</script>

<template>
  <div class="editor-canvas">
    <div ref="host" class="tui-host" />
    <div v-if="!store.hasImage" class="placeholder text-medium-emphasis">
      Upload an image to begin
    </div>
  </div>
</template>

<style scoped>
.editor-canvas { position: relative; min-height: 640px; width: 100%; }
.tui-host { width: 100%; height: 640px; }
.placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
</style>

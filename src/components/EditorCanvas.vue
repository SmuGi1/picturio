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
  </div>
</template>

<style scoped>
.editor-canvas { position: relative; display: flex; align-items: center; justify-content: center; }
.tui-host { width: 900px; max-width: 70vw; height: 560px; }
</style>

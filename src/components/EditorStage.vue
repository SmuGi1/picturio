<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import EditorCanvas from './EditorCanvas.vue'

const store = useEditorStore()
const zoom = ref(100)

function zoomIn() { zoom.value = Math.min(400, zoom.value + 25) }
function zoomOut() { zoom.value = Math.max(25, zoom.value - 25) }
function zoomFit() { zoom.value = 100 }

const dimensions = computed(() => {
  const s = store.originalImage?.source
  return s ? `${s.width} × ${s.height} px` : ''
})

defineExpose({ zoomIn, zoomOut, zoomFit, zoom })
</script>

<template>
  <div class="editor-stage">
    <div class="editor-stage__canvas">
      <div class="editor-stage__frame">
        <div class="editor-stage__card" :style="{ transform: `scale(${zoom / 100})` }">
          <EditorCanvas />
        </div>
        <div v-if="store.viewingOriginal" class="editor-stage__compare-tag">ORIGINAL</div>
      </div>
    </div>

    <div class="editor-stage__status">
      <div class="editor-stage__status-left">
        <span class="editor-stage__dims">{{ dimensions }}</span>
        <span v-if="store.hasEdits" class="editor-stage__edited">
          <span class="editor-stage__edited-dot" />
          Edited
        </span>
      </div>
      <div class="editor-stage__zoom">
        <button class="zoom-btn" type="button" title="Zoom out" @click="zoomOut">–</button>
        <span class="zoom-label">{{ zoom }}%</span>
        <button class="zoom-btn" type="button" title="Zoom in" @click="zoomIn">+</button>
        <button class="zoom-fit" type="button" @click="zoomFit">Fit</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-stage { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--pt-bg-canvas); }
.editor-stage__canvas { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; position: relative; min-height: 0; }
.editor-stage__frame { position: relative; display: flex; align-items: center; justify-content: center; max-width: 100%; max-height: 100%; }
.editor-stage__card { transition: transform 0.2s; box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35); border-radius: 4px; overflow: hidden; }
.editor-stage__compare-tag {
  position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.6); color: #fff;
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 5px;
}
.editor-stage__status {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 20px; border-top: 1px solid var(--pt-border); flex: none;
}
.editor-stage__status-left { display: flex; align-items: center; gap: 10px; }
.editor-stage__dims { font-size: 12px; color: var(--pt-text-faint); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.editor-stage__edited {
  display: flex; align-items: center; gap: 5px; font-size: 11.5px;
  color: var(--pt-accent); background: var(--pt-accent-soft); padding: 2px 8px; border-radius: 20px;
}
.editor-stage__edited-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--pt-accent); }
.editor-stage__zoom { display: flex; align-items: center; gap: 4px; }
.zoom-btn {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: var(--pt-text); border-radius: 6px; cursor: pointer; font-size: 15px;
}
.zoom-btn:hover { background: var(--pt-panel-alt); }
.zoom-label { font-size: 12px; color: var(--pt-text-dim); width: 38px; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.zoom-fit {
  padding: 4px 9px; border: 1px solid var(--pt-border); background: transparent; color: var(--pt-text-dim);
  border-radius: 6px; cursor: pointer; font-size: 11.5px; margin-left: 4px;
}
.zoom-fit:hover { background: var(--pt-panel-alt); }
</style>

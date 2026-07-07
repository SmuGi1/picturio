<script setup lang="ts">
import { watch } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import AppHeader from './components/AppHeader.vue'
import EditorStage from './components/EditorStage.vue'
import SidePanel from './components/SidePanel.vue'
import UploadScreen from './components/UploadScreen.vue'
import { useEditorStore } from './stores/editor'
import { useTheme } from './composables/useTheme'

const store = useEditorStore()
const { theme } = useTheme()
const vuetifyTheme = useVuetifyTheme()

watch(
  theme,
  (name) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-pt-theme', name)
    }
    vuetifyTheme.global.name.value = name
  },
  { immediate: true },
)
</script>

<template>
  <v-app>
    <div class="app-shell">
      <AppHeader />
      <div class="app-body" :inert="!store.hasImage">
        <EditorStage />
        <SidePanel />
      </div>
      <UploadScreen v-if="!store.hasImage" class="upload-overlay" />
    </div>
  </v-app>
</template>

<style scoped>
.app-shell {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pt-bg);
}
.app-body { flex: 1; display: flex; min-height: 0; }
.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--pt-bg);
}
</style>

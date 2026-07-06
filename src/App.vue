<script setup lang="ts">
import EditorCanvas from './components/EditorCanvas.vue'
import Toolbar from './components/Toolbar.vue'
</script>

<template>
  <v-app>
    <Toolbar />
    <v-main>
      <v-container>
        <EditorCanvas />
      </v-container>
    </v-main>
  </v-app>
</template>

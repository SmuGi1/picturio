<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { crop as makeCrop, flip as makeFlip, rotate as makeRotate } from '../../editor/operations'

const store = useEditorStore()
const cropping = ref(false)

function startCrop() {
  store.requireAdapter().startCrop()
  cropping.value = true
}

async function applyCrop() {
  const rect = store.requireAdapter().getCropRect()
  try {
    await store.addOperation(makeCrop(rect))
  } finally {
    // Always leave crop mode, even if applying the op fails, so the panel
    // never gets stuck with only Apply/Cancel showing.
    cropping.value = false
  }
}

function cancelCrop() {
  store.requireAdapter().cancelCrop()
  cropping.value = false
}

async function flip(axis: 'x' | 'y') {
  await store.addOperation(makeFlip(axis))
}

async function rotate(degrees: number) {
  await store.addOperation(makeRotate(degrees))
}

defineExpose({ startCrop, applyCrop, cancelCrop, flip, rotate })
</script>

<template>
  <v-card flat>
    <v-card-title class="text-subtitle-1">Transform</v-card-title>
    <v-card-text class="d-flex flex-wrap ga-2">
      <template v-if="!cropping">
        <v-btn size="small" prepend-icon="mdi-crop" :disabled="!store.hasImage" @click="startCrop">Crop</v-btn>
      </template>
      <template v-else>
        <v-btn size="small" color="primary" @click="applyCrop">Apply</v-btn>
        <v-btn size="small" variant="text" @click="cancelCrop">Cancel</v-btn>
      </template>
      <v-btn size="small" icon="mdi-flip-horizontal" :disabled="!store.hasImage" @click="flip('x')" />
      <v-btn size="small" icon="mdi-flip-vertical" :disabled="!store.hasImage" @click="flip('y')" />
      <v-btn size="small" icon="mdi-rotate-left" :disabled="!store.hasImage" @click="rotate(-90)" />
      <v-btn size="small" icon="mdi-rotate-right" :disabled="!store.hasImage" @click="rotate(90)" />
    </v-card-text>
  </v-card>
</template>

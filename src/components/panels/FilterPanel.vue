<script setup lang="ts">
import { useEditorStore } from '../../stores/editor'
import { FILTERS, type FilterDef } from '../../editor/filters'

const store = useEditorStore()

function isActive(name: string): boolean {
  return store.operations.some((o) => o.type === 'filter' && o.name === name)
}

async function toggle(def: FilterDef) {
  await store.toggleFilter(def.name, def.defaults)
}

defineExpose({ toggle })
</script>

<template>
  <v-card flat>
    <v-card-title class="text-subtitle-1">Filters</v-card-title>
    <v-card-text class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="f in FILTERS"
        :key="f.name"
        :color="isActive(f.name) ? 'primary' : undefined"
        :variant="isActive(f.name) ? 'flat' : 'outlined'"
        :disabled="!store.hasImage"
        filter
        :model-value="isActive(f.name)"
        @click="toggle(f)"
      >
        {{ f.label }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

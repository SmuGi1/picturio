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
    <v-card-text class="d-flex flex-wrap ga-2">
      <!--
        Do NOT bind :model-value on a standalone v-chip: a chip with
        model-value=false renders as a hidden comment node, which would make
        every inactive filter chip invisible and unclickable. Active state is
        shown via color/variant instead.
      -->
      <v-chip
        v-for="f in FILTERS"
        :key="f.name"
        :color="isActive(f.name) ? 'primary' : undefined"
        :variant="isActive(f.name) ? 'flat' : 'outlined'"
        :disabled="!store.hasImage"
        @click="toggle(f)"
      >
        {{ f.label }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

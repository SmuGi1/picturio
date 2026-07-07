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
  <div class="filter-grid">
    <button
      v-for="f in FILTERS"
      :key="f.name"
      class="filter-chip"
      :class="{ 'filter-chip--active': isActive(f.name) }"
      type="button"
      :disabled="!store.hasImage"
      @click="toggle(f)"
    >
      <span class="filter-dot" :class="{ 'filter-dot--active': isActive(f.name) }" />
      <span class="filter-label">{{ f.label }}</span>
      <svg
        v-if="isActive(f.name)"
        class="filter-check"
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="var(--pt-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg>
    </button>
  </div>
</template>

<style scoped>
.filter-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.filter-chip {
  display: flex; align-items: center; gap: 7px; padding: 9px 11px;
  border-radius: 9px; border: 1.5px solid var(--pt-border); background: var(--pt-panel-alt);
  color: var(--pt-text-dim); font-size: 12.5px; cursor: pointer; text-align: left;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.filter-chip:hover:not(:disabled):not(.filter-chip--active) {
  border-color: var(--pt-border-strong); color: var(--pt-text);
}
.filter-chip--active {
  border-color: var(--pt-accent); background: var(--pt-accent-soft); color: var(--pt-text);
}
.filter-chip:disabled { opacity: 0.5; cursor: default; }
.filter-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--pt-text-faint); }
.filter-dot--active { background: var(--pt-accent); }
.filter-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filter-check { margin-left: auto; flex: none; }
</style>

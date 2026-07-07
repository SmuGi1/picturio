<script setup lang="ts">
import PanelSection from './PanelSection.vue'
import TransformPanel from './panels/TransformPanel.vue'
import AdjustPanel from './panels/AdjustPanel.vue'
import FilterPanel from './panels/FilterPanel.vue'
import AnnotatePanel from './panels/AnnotatePanel.vue'
</script>

<template>
  <aside class="side-panel">
    <PanelSection title="Transform"><TransformPanel /></PanelSection>
    <PanelSection title="Adjust"><AdjustPanel /></PanelSection>
    <PanelSection title="Filters"><FilterPanel /></PanelSection>
    <PanelSection title="Annotate" last><AnnotatePanel /></PanelSection>
  </aside>
</template>

<style scoped>
.side-panel {
  width: 300px; flex: none; height: 100%; overflow-y: auto;
  background: var(--pt-panel); border-left: 1px solid var(--pt-border);
}
</style>

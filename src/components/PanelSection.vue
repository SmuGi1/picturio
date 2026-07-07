<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title: string; last?: boolean }>()
const open = ref(true)
</script>

<template>
  <section class="panel-section" :class="{ 'panel-section--last': last }">
    <button class="panel-section__header" type="button" @click="open = !open">
      <span class="panel-section__title">{{ title }}</span>
      <svg
        class="panel-section__chevron"
        :class="{ 'panel-section__chevron--closed': !open }"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--pt-text-dim)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
      ><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div v-show="open" class="panel-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel-section { padding: 20px 20px; border-bottom: 1px solid var(--pt-border); }
.panel-section--last { border-bottom: none; }
.panel-section__header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 0; border: none; background: transparent; cursor: pointer;
}
.panel-section__title { font-size: 13px; font-weight: 600; color: var(--pt-text); }
.panel-section__chevron { transition: transform 0.15s; }
.panel-section__chevron--closed { transform: rotate(-90deg); }
.panel-section__body { padding-top: 16px; }
</style>

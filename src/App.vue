<script setup lang="ts">
import Toolbar from './components/Toolbar.vue'
import EditorCanvas from './components/EditorCanvas.vue'
import TransformPanel from './components/panels/TransformPanel.vue'
import AdjustPanel from './components/panels/AdjustPanel.vue'
import FilterPanel from './components/panels/FilterPanel.vue'
import AnnotatePanel from './components/panels/AnnotatePanel.vue'
</script>

<template>
  <v-app>
    <v-app-bar color="surface" flat>
      <v-app-bar-title>Picturio</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <Toolbar />
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="8">
            <EditorCanvas />
          </v-col>
          <v-col cols="12" md="4">
            <v-expansion-panels multiple :model-value="[0, 1, 2, 3]">
              <v-expansion-panel>
                <v-expansion-panel-title>Transform</v-expansion-panel-title>
                <v-expansion-panel-text><TransformPanel /></v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Adjust</v-expansion-panel-title>
                <v-expansion-panel-text><AdjustPanel /></v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Filters</v-expansion-panel-title>
                <v-expansion-panel-text><FilterPanel /></v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Annotate</v-expansion-panel-title>
                <v-expansion-panel-text><AnnotatePanel /></v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

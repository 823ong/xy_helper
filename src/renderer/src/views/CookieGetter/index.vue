<template>
  <div class="flex flex-col w-full h-full">
    <div class=" h-20 flex flex-col border">
      <Panel v-if="logPanel" :log-panel="logPanel" />
    </div>
    <div class="border" style="height: calc(100% - 80px)">
      <LogPanel ref="logPanel" class="h-full" />
    </div>
  </div>
</template>
<script setup lang="ts">
import LogPanel from '@renderer/components/LogPanel.vue'
import Panel from './Panel.vue'
import { ref } from 'vue'

const logPanel = ref<InstanceType<typeof LogPanel>>()
</script>

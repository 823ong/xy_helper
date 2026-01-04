<template>
  <div class="p-6">
    <n-card title="Dashboard">
      <n-grid x-gap="12" :cols="4">
        <n-gi>
          <n-statistic label="Total Tasks" :value="12" />
        </n-gi>
        <n-gi>
          <n-statistic label="Running" :value="2">
            <template #suffix>
              <n-icon>
                <play-icon />
              </n-icon>
            </template>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="Success Rate" value="98.5">
            <template #suffix>%</template>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="Active Nodes" :value="4" />
        </n-gi>
      </n-grid>
    </n-card>
    <div class="mt-6">
      <n-alert title="System Status" type="info">Playwright engine is ready.</n-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { PlayCircleOutline as PlayIcon } from '@vicons/ionicons5'
  import { NAlert, NCard, NGi, NGrid, NIcon, NStatistic } from 'naive-ui'
</script>

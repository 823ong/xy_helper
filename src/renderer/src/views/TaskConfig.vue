<template>
  <div class="p-6">
    <n-card :title="`Task Configuration - ${id ? 'Task ' + id : 'New Task'}`">
      <n-form ref="formRef" :model="model" label-placement="left" label-width="auto">
        <n-form-item label="Task Name" path="taskName">
          <n-input v-model:value="model.taskName" placeholder="Enter task name" />
        </n-form-item>
        <n-form-item label="Target URL" path="url">
          <n-input v-model:value="model.url" placeholder="https://example.com" />
        </n-form-item>
        <n-form-item label="Browser" path="browser">
          <n-select
            v-model:value="model.browser"
            :options="[
              { label: 'Chromium', value: 'chromium' },
              { label: 'Firefox', value: 'firefox' },
              { label: 'WebKit', value: 'webkit' }
            ]"
          />
        </n-form-item>
        <n-form-item label="Headless Mode" path="headless">
          <n-switch v-model:value="model.headless" />
        </n-form-item>
        <div class="flex justify-end gap-2">
          <n-button type="primary" @click="handleRun">Run Task</n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
  import { NButton, NCard, NForm, NFormItem, NInput, NSelect, NSwitch, useMessage } from 'naive-ui'
  import { ref, watch } from 'vue'

  const props = defineProps<{
    id?: string
  }>()

  const message = useMessage()

  const model = ref({
    taskName: props.id ? `Demo Task ${props.id}` : 'Demo Task',
    url: '',
    browser: 'chromium',
    headless: false
  })

  watch(
    () => props.id,
    (newId) => {
      model.value.taskName = newId ? `Demo Task ${newId}` : 'Demo Task'
    }
  )

  const handleRun = async () => {
    message.success(`Starting task: ${model.value.taskName}`)
    console.log('Running task config:', model.value)

    if ((window as any).api && (window as any).api.puppeteer) {
      try {
        const res = await (window as any).api.puppeteer.executeScript('xyScan', {
          url: model.value.url,
          headless: model.value.headless,
          browser: model.value.browser
        })
        console.log('Execution result:', res)
        message.success('Task execution completed')
      } catch (e) {
        console.error(e)
        message.error('Task execution failed')
      }
    } else {
      message.warning('Electron API not available (Dev mode?)')
    }
  }
</script>

<template>
  <n-space vertical>
    <n-form label-placement="left" label-width="auto">
      <n-form-item label="成功后执行JS">
        <n-switch v-model:value="model.execJsAfterSuccess" />
      </n-form-item>
      <n-form-item label="执行的JS内容">
        <n-input
          v-model:value="model.execJsAfterContent"
          type="textarea"
          placeholder="请输入要执行的JavaScript代码"
          :rows="10"
        />
      </n-form-item>
      <n-form-item>
        <n-button @click="handleTestExec">测试执行</n-button>
      </n-form-item>
    </n-form>
  </n-space>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { NForm, NFormItem, NInput, NSpace, NSwitch } from 'naive-ui'
  import { useSystemSettingsStore } from '@renderer/stores/systemSettings'
  import { win } from '@renderer/win'

  const systemSettingsStore = useSystemSettingsStore()
  const model = ref({
    execJsAfterSuccess: false,
    execJsAfterContent: ''
  })

  const set = (data: { execJsAfterSuccess: boolean; execJsAfterContent: string }) => {
    model.value = JSON.parse(JSON.stringify(data))
  }

  const get = () => {
    return model.value
  }

  const handleTestExec = () => {
    win.api.xyScan.update({
      type: 'command',
      command: 'testExecAfter',
      payload: model.value.execJsAfterContent
    })
  }
  defineExpose({
    set,
    get
  })

  onMounted(() => {
    if (systemSettingsStore.settings.xyScan) {
      set(systemSettingsStore.settings.xyScan)
    }
    win.api.systemSettings.onChange(() => {
      if (systemSettingsStore.settings.xyScan) {
        set(systemSettingsStore.settings.xyScan)
      }
    })
  })
</script>

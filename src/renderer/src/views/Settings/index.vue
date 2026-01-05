<template>
  <div class="p-6">
    <n-card title="设置">
      <template #header-extra>
        <n-button @click="handleSaveConfig" :loading="loadingObj.saveLoading">保存</n-button>
      </template>
      <n-space class="mb-4" align="center">
        <span>配置同步：</span>
        <n-select
          v-model:value="selectedConfigId"
          :options="syncConfigs"
          label-field="configName"
          value-field="id"
          placeholder="选择已有配置"
          style="width: 200px"
          clearable
        />
        <n-button @click="handleLoadSyncConfig" :disabled="!selectedConfigId">加载配置</n-button>
        <n-button @click="showCreateModal = true">新建配置</n-button>
        <n-popconfirm @positive-click="handleDeleteSyncConfig" :disabled="!selectedConfigId">
          <template #trigger>
            <n-button type="error" :disabled="!selectedConfigId">删除配置</n-button>
          </template>
          确定要删除该配置吗？
        </n-popconfirm>
      </n-space>
      <n-tabs type="line">
        <n-tab-pane name="general" tab="通用设置">
          <n-form>
            <n-form-item label="主题">
              <n-radio-group name="theme" v-model:value="userSettings.theme">
                <n-radio-button value="light">亮色</n-radio-button>
                <n-radio-button value="dark">暗色</n-radio-button>
                <n-radio-button value="auto">自动</n-radio-button>
              </n-radio-group>
            </n-form-item>
          </n-form>
        </n-tab-pane>
        <n-tab-pane name="update" tab="关于与更新">
          <n-space vertical>
            <n-card title="当前版本">
              <n-text>v{{ currentVersion }}</n-text>
            </n-card>

            <n-card title="检查更新">
              <n-space vertical>
                <n-space align="center">
                  <n-button
                    @click="handleCheckUpdate"
                    :loading="loadingObj.checkingUpdate"
                    :disabled="hasUpdate"
                  >
                    检查更新
                  </n-button>
                  <n-text v-if="updateInfo" depth="3">发现新版本 v{{ updateInfo.version }}</n-text>
                </n-space>

                <!-- 更新信息 -->
                <n-alert v-if="updateInfo" type="success" title="发现新版本">
                  <template #header>
                    <n-space align="center">
                      <span>新版本 v{{ updateInfo.version }}</span>
                      <n-tag size="small" type="success">可用</n-tag>
                    </n-space>
                  </template>
                  <div v-if="updateInfo.releaseDate" class="mb-2">
                    <n-text depth="3">发布时间：{{ formatDate(updateInfo.releaseDate) }}</n-text>
                  </div>
                  <div v-if="updateInfo.updateContent" class="whitespace-pre-wrap">
                    {{ updateInfo.updateContent }}
                  </div>
                </n-alert>

                <!-- 下载进度 -->
                <n-progress
                  v-if="downloading"
                  type="line"
                  :percentage="downloadProgress"
                  :status="downloadStatus"
                >
                  <template #default="{ percentage }">
                    <n-text>下载中... {{ percentage }}%</n-text>
                  </template>
                </n-progress>

                <!-- 操作按钮 -->
                <n-space v-if="hasUpdate">
                  <n-button
                    v-if="!updateDownloaded"
                    type="primary"
                    @click="handleDownloadUpdate"
                    :loading="downloading"
                    :disabled="downloading"
                  >
                    下载更新
                  </n-button>
                  <n-button v-if="updateDownloaded" type="success" @click="handleInstallUpdate">
                    立即安装并重启
                  </n-button>
                </n-space>
                <n-button @click="handleInstallUpdate">xx</n-button>

                <!-- 无更新提示 -->
                <n-alert v-if="!hasUpdate && checked" type="info">已是最新版本</n-alert>
              </n-space>
            </n-card>
          </n-space>
        </n-tab-pane>
        <n-tab-pane name="database" tab="数据库">
          <n-form>
            <n-form-item label="mysql数据库地址:端口">
              <n-input v-model:value="userSettings.database.url" placeholder="" />
            </n-form-item>
            <n-form-item label="用户名">
              <n-input v-model:value="userSettings.database.username" placeholder="" />
            </n-form-item>
            <n-form-item label="密码">
              <n-input v-model:value="userSettings.database.password" placeholder="" />
            </n-form-item>
            <n-form-item label="数据库">
              <n-input v-model:value="userSettings.database.database" placeholder="" />
            </n-form-item>
            <n-form-item>
              <n-button :loading="loadingObj.testConnectionLoading" @click="handleTestConnection">
                测试连接
              </n-button>
            </n-form-item>
          </n-form>
        </n-tab-pane>
        <n-tab-pane name="sms" tab="接码平台">
          <sms-code-platform-setting ref="smsSettingForm" />
        </n-tab-pane>
      </n-tabs>
    </n-card>
    <n-modal v-model:show="showCreateModal" preset="dialog" title="新建配置">
      <n-input v-model:value="newConfigName" placeholder="请输入配置名称" />
      <template #action>
        <n-button @click="showCreateModal = false">取消</n-button>
        <n-button type="primary" @click="handleCreateSyncConfig">创建</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { win } from '@renderer/win'
  import { useSystemSettingsStore } from '@renderer/stores/systemSettings'
  import { SyncConfig, SystemSettings, UpdateInfo } from '../../../../preload/types/api'
  import { cloneDeep } from 'lodash'
  import SmsCodePlatformSetting from '@renderer/views/Settings/SmsCodePlatformSetting.vue'
  import dayjs from 'dayjs'

  const systemSettingsStore = useSystemSettingsStore()
  const smsSettingForm = ref<InstanceType<typeof SmsCodePlatformSetting>>()
  const syncConfigs = ref<SyncConfig[]>([])
  const selectedConfigId = ref<number | null>(null)
  const showCreateModal = ref(false)
  const newConfigName = ref('')

  const loadingObj = reactive({
    saveLoading: false,
    testConnectionLoading: false,
    checkingUpdate: false
  })

  // 更新相关状态
  const currentVersion = ref('')
  const hasUpdate = ref(false)
  const updateInfo = ref<UpdateInfo | null>(null)
  const checked = ref(false)
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const downloadStatus = ref<'default' | 'error' | 'success' | 'warning'>('default')
  const updateDownloaded = ref(false)
  const userSettings = reactive<SystemSettings>({
    theme: 'auto',
    database: {
      url: '',
      username: '',
      password: '',
      database: ''
    },
    smsPlatform: []
  })

  const handleSaveConfig = async () => {
    loadingObj.saveLoading = true
    try {
      if (smsSettingForm.value?.get()) {
        userSettings.smsPlatform = smsSettingForm.value.get()
      }
      const config = cloneDeep(userSettings)
      await win.api.systemSettings.set(config)
      loadingObj.saveLoading = false
      win.message.success('保存成功')
      loadConfig()
    } catch (e) {
      console.error(e)
      win.message.error(JSON.stringify(e))
      loadingObj.saveLoading = false
    }
  }

  const handleTestConnection = async () => {
    loadingObj.testConnectionLoading = true
    try {
      const config = cloneDeep(userSettings)
      const result = await win.api.database.testConnection(config)
      if (result.success) {
        win.message.success('连接成功')
      } else {
        win.message.error('连接失败: ' + result.error)
      }
    } catch (e: any) {
      console.error(e)
      win.message.error(e.message || JSON.stringify(e))
    } finally {
      loadingObj.testConnectionLoading = false
    }
  }
  const loadConfig = async () => {
    const config = await win.api.systemSettings.get()
    systemSettingsStore.setSystemSettings(config)
    Object.assign(userSettings, config)
  }
  const loadSyncConfigs = async () => {
    syncConfigs.value = await win.api.systemSettings.listSyncConfigs()
  }

  const handleLoadSyncConfig = async () => {
    if (!selectedConfigId.value) return
    const config = await win.api.systemSettings.getSyncConfig(selectedConfigId.value)
    if (config) {
      Object.assign(userSettings, config)
      systemSettingsStore.setSystemSettings(config)
      win.message.success('配置已加载，请点击保存以应用')
    } else {
      win.message.error('加载配置失败')
    }
  }

  const handleCreateSyncConfig = async () => {
    if (!newConfigName.value) {
      win.message.warning('请输入配置名称')
      return
    }
    const settings = cloneDeep(userSettings)
    const result = await win.api.systemSettings.createSyncConfig(newConfigName.value, settings)
    if (result.success) {
      win.message.success('创建成功')
      showCreateModal.value = false
      newConfigName.value = ''
      loadSyncConfigs()
    } else {
      win.message.error('创建失败: ' + result.error)
    }
  }

  const handleDeleteSyncConfig = async () => {
    if (!selectedConfigId.value) return
    const result = await win.api.systemSettings.deleteSyncConfig(selectedConfigId.value)
    if (result.success) {
      win.message.success('删除成功')
      selectedConfigId.value = null
      loadSyncConfigs()
    } else {
      win.message.error('删除失败: ' + result.error)
    }
  }

  // 更新相关函数
  const loadCurrentVersion = async () => {
    const result = await win.api.updater.getCurrentVersion()
    if (result.success) {
      currentVersion.value = result.version
    }
  }

  const handleCheckUpdate = async () => {
    loadingObj.checkingUpdate = true
    try {
      const result = await win.api.updater.checkForUpdates()
      checked.value = true

      if (result.success) {
        if (result.hasUpdate && result.updateInfo) {
          hasUpdate.value = true
          updateInfo.value = result.updateInfo
          win.message.success(`发现新版本 ${result.updateInfo.version}`)
        } else {
          hasUpdate.value = false
          updateInfo.value = null
        }
      } else {
        win.message.error(`检查更新失败: ${result.error}`)
      }
    } catch (e: any) {
      console.error(e)
      win.message.error(e.message || '检查更新失败')
    } finally {
      loadingObj.checkingUpdate = false
    }
  }

  const handleDownloadUpdate = async () => {
    downloading.value = true
    downloadProgress.value = 0
    try {
      const result = await win.api.updater.downloadUpdate()
      if (!result.success) {
        win.message.error(`下载更新失败: ${result.error}`)
        downloading.value = false
      }
    } catch (e: any) {
      console.error(e)
      win.message.error(e.message || '下载更新失败')
      downloading.value = false
    }
  }

  const handleInstallUpdate = async () => {
    win.dialog.warning({
      title: '安装更新',
      type: 'info',
      content: '更新下载完成，应用将重启并安装更新。确定继续吗?',
      onPositiveClick: async () => {
        const result = await win.api.updater.installUpdate()
        if (!result.success) {
          win.message.error(`安装更新失败: ${result.error}`)
        }
      },
      positiveText: '确定',
      negativeText: '取消'
    })
  }

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
  }

  // 监听下载进度
  win.api.updater.onDownloadProgress((progress) => {
    downloadProgress.value = progress.percent
  })

  // 监听下载完成
  win.api.updater.onUpdateDownloaded((info) => {
    downloading.value = false
    updateDownloaded.value = true
    downloadStatus.value = 'success'
    win.message.success(`版本 ${info.version} 下载完成`)
  })

  // 监听更新错误
  win.api.updater.onError((error) => {
    downloading.value = false
    downloadStatus.value = 'error'
    win.message.error(`更新出错: ${error.error}`)
  })

  onMounted(async () => {
    await loadConfig()
    await loadSyncConfigs()
    await loadCurrentVersion()
  })
</script>

import { defineStore } from "pinia";
import { reactive } from "vue";
import { SystemSettings } from "../../../preload/types/api";

export const useSystemSettingsStore = defineStore('systemSettings', () => {
  const settings = reactive<SystemSettings>({
    theme: 'light'
  })

  function setSystemSettings(newConfig: Record<string, any>) {
    Object.assign(settings, newConfig)
  }

  return { setSystemSettings, settings }
})

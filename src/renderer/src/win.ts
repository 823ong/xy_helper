import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider'

import type { WinAPI } from '../../preload/types/api'

interface FontEndApi extends WinAPI, Window {
  message: MessageApiInjection
}
export const win = window as any as FontEndApi

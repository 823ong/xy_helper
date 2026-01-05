import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider'

import type { WinAPI } from '../../preload/types/api'
import { DialogApiInjection } from 'naive-ui/es/dialog/src/DialogProvider'

interface FontEndApi extends WinAPI, Window {
  message: MessageApiInjection
  dialog: DialogApiInjection
}
export const win = window as any as FontEndApi

; 自定义 NSIS 安装程序脚本
; 用于增强卸载和重新安装的可靠性

!macro customInstall
  ; 在安装前检查并尝试关闭运行中的应用
  nsExec::ExecToLog "taskkill /F /IM xy_helper.exe"
  Pop $0  ; 忽略结果，进程可能不存在
  Sleep 1000
!macroend

!macro customUnInstall
  ; 卸载前确保应用已关闭
  nsExec::ExecToLog "taskkill /F /IM xy_helper.exe"
  Pop $0  ; 忽略结果
  Sleep 1000
!macroend

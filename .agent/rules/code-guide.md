---
trigger: always_on
---

- 不要执行eslint 命令去格式化代码
- 最后的总结和中间给我的文档使用中文
- 代码注释使用中文.日志打印使用英文
- 样式尽量不要使用vue的style代码块,直接使用tailwind来构造样式.如果很复杂 会导致样式class非常长 那就选择style代码块.
- UI往后台传输被监听对象比如reactive,ref等需要使用lodash的cloneDeep方法来复制,否则会出现错误'An object could not be cloned';
- 为了方便可读性,除非3行内能写完,否则ipcHandler被调用方法禁止使用匿名方法,需要定义一个单独函数处理

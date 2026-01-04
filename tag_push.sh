#!/bin/bash

# 获取当前时间，格式为 YYYYMMDDHHMMSS
timestamp=$(date +"%Y%m%d%H%M%S")
tagname="v${timestamp}"

echo "正在创建标签: $tagname"

# 创建附注标签
git tag -a "$tagname" -m "Auto-generated release tag: $tagname"

if [ $? -ne 0 ]; then
    echo "❌ 标签创建失败！"
    exit 1
fi

# 推送标签到 origin
git push origin "$tagname"

if [ $? -ne 0 ]; then
    echo "❌ 标签推送失败！"
    exit 1
fi

echo "✅ 成功创建并推送标签: $tagname"

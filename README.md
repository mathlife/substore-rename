# substore-rename

Sub-Store 节点重命名脚本：

- 按节点真实 IP 归属地重命名
- 可选追加出口归属地
- 支持只输出国家，不带原节点名
- 自动国旗
- 本地缓存减少 API 请求

## 脚本文件

- `ip-geo-outbound-rename.js`

## 推荐参数

### 只输出国家，不带原节点名

```text
#bare=true
```

### 国家 + 出口国

```text
#bare=true&out=true
```

### 带国旗、使用国家名

```text
#bare=true&countryCode=false
```

### 示例完整链接

```text
https://raw.githubusercontent.com/<owner>/substore-rename/main/ip-geo-outbound-rename.js#bare=true&out=true&nm=true
```

## Sub-Store 配置示例

```json
{
  "type": "Script Operator",
  "args": {
    "content": "https://raw.githubusercontent.com/<owner>/substore-rename/main/ip-geo-outbound-rename.js#bare=true&out=true&nm=true",
    "mode": "link",
    "arguments": {
      "bare": "true",
      "out": "true",
      "nm": "true"
    }
  },
  "customName": "IP Geo Rename",
  "disabled": false
}
```

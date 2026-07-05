# substore-rename

Sub-Store 节点重命名脚本，基于我们当前脚本合并了 `rename.js` 的常用参数能力。

## 功能

- 节点国家识别与重命名
- 出口国家/地区读取（可选）
- 可选去重编号
- 国旗显示
- 节点名前缀
- 保留关键词 / 乱名清理 / 倍率标记保留（可选）

## 脚本文件

- `ip-geo-outbound-rename.js`

## 参数说明

参数通过 URL fragment 传入，格式如下：

```text
https://raw.githubusercontent.com/mathlife/substore-rename/refs/heads/main/ip-geo-outbound-rename.js#参数1&参数2&参数3
```

### 基础参数

| 参数 | 默认 | 说明 |
|---|---:|---|
| `in=` | 自动 | 输入节点名识别方式：`zh/cn` 中文、`en/us` 英文缩写、`flag/gq` 国旗、`quan` 英文全称 |
| `out=` | `false` | 是否输出出口国家/地区 |
| `nm=` | `true` | 无法识别时是否保留原节点 |
| `bare=` | `true` | 只输出国家，不带原节点名 |
| `chinese=` | `true` | 国家名是否用中文 |
| `dedupe=` | `false` | 是否在最终名称后追加 `#N` 去重编号 |
| `debug=` | `false` | 打印调试日志 |

### 分隔符

| 参数 | 默认 | 说明 |
|---|---:|---|
| `sep=` | ` | ` | 节点名和国家之间的分隔符 |
| `sn=` | ` ` | 序号/后缀之间的分隔符 |
| `fgf=` | ` ` | 前缀分隔符 |

### 前缀 / 国旗

| 参数 | 默认 | 说明 |
|---|---:|---|
| `name=` | 空 | 给节点添加机场名前缀 |
| `nf` | 关闭 | 将 `name=` 放到最前面 |
| `flag` | 关闭 | 给节点名前面加国旗 |

### 保留 / 清理

| 参数 | 默认 | 说明 |
|---|---:|---|
| `blkey=` | 空 | 保留指定关键词，支持 `+` 连接多个关键字 |
| `blgd` | 关闭 | 保留家宽 / IPLC / ˣ² 等标记 |
| `bl` | 关闭 | 保留倍率类标记 |
| `nx` | 关闭 | 保留 1 倍率与不显示倍率的节点 |
| `blnx` | 关闭 | 只保留高倍率 |
| `clear` | 关闭 | 清理乱名 |
| `blpx` | 关闭 | 对保留标记后的名称分组排序 |
| `blockquic=` | 空 | `on/off` 控制 blockquic |

### 出口缓存

| 参数 | 默认 | 说明 |
|---|---:|---|
| `outboundCacheKey=` | `substore_rename_outbound_geo_v1` | 出口缓存键 |
| `outboundTtl=` | `21600` | 出口缓存 TTL 秒数 |

## 常用示例

### 只输出国家，不拼出口

```text
#bare=true&nm=true
```

### 输出国家 + 出口

```text
#bare=true&nm=true&out=true
```

### 开启去重编号

```text
#bare=true&nm=true&out=true&dedupe=true
```

### 带国旗 + 中文名

```text
#flag=true&chinese=true&bare=true&nm=true
```

### 前缀 + 保留关键词

```text
#name=机场A&nf=true&blkey=GPT+NF
```

## Sub-Store 配置示例

```json
{
  "type": "Script Operator",
  "args": {
    "content": "https://raw.githubusercontent.com/mathlife/substore-rename/refs/heads/main/ip-geo-outbound-rename.js#bare=true&nm=true&dedupe=false",
    "mode": "link",
    "arguments": {
      "bare": "true",
      "nm": "true",
      "dedupe": "false"
    }
  },
  "customName": "IP Geo Rename",
  "disabled": false
}
```

## 说明

- 默认不拼出口国家；需要时显式传 `out=true`
- 默认不去重编号；需要时显式传 `dedupe=true`
- 如果你只想保留基础重命名，可以只传 `bare=true&nm=true`

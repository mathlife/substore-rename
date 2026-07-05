# substore-rename

Sub-Store 节点重命名脚本（真实 IP Geo 版）。

当前版本特性：

- 按节点真实 IP / 域名解析后的真实 IP 归属地重命名
- 可选追加真实出口国家/地区
- 可选最终名称去重编号
- 支持只输出国家，不带原节点名
- 自动国旗
- 支持缓存减少重复 Geo 查询

## 文件

- `ip-geo-outbound-rename.js`
- `update-outbound-cache.py`

---

## 参数传递方式

Sub-Store Script Operator 支持两种传参方式：

### 1. URL fragment

```text
https://raw.githubusercontent.com/mathlife/substore-rename/refs/heads/main/ip-geo-outbound-rename.js#bare=true&chinese=true&nm=true
```

### 2. arguments 对象

```json
{
  "type": "Script Operator",
  "args": {
    "content": "https://raw.githubusercontent.com/mathlife/substore-rename/refs/heads/main/ip-geo-outbound-rename.js#bare=true&chinese=true&nm=true",
    "mode": "link",
    "arguments": {
      "bare": "true",
      "chinese": "true",
      "nm": "true"
    }
  }
}
```

> 推荐：URL fragment 和 `arguments` 保持一致，避免排查时混淆。

---

## 参数说明

### 基础行为

| 参数 | 默认 | 说明 |
|---|---:|---|
| `nm` | `false` | 无法识别国家时是否保留原节点 |
| `bare` | `false` | 只输出国家，不带原节点名 |
| `chinese` | `true` | 输出中文国家名；否则输出国家代码/英文风格 |
| `debug` | `false` | 输出调试日志 |

### 输出格式

| 参数 | 默认 | 说明 |
|---|---:|---|
| `sep` | ` | ` | 主名称分隔符 |
| `outSep` | 与 `sep` 相同 | 出口标签分隔符 |
| `countryCode` | `false` | 使用国家代码而不是国家名 |
| `city` | `false` | 尽量附加城市 |
| `dedupe` | `false` | 对最终重名节点追加 `#2/#3...` |

### 出口标签

| 参数 | 默认 | 说明 |
|---|---:|---|
| `out` | `false` | 是否追加真实出口国家/地区 |
| `outboundCacheKey` | `substore_rename_outbound_geo_v1` | 出口缓存键 |
| `outboundTtl` | `21600` | 出口缓存 TTL（秒） |

---

## 命名逻辑

### 1. 真实 IP Geo 重命名

脚本会：

1. 从节点里提取 `server/address/host/add/hostname/ip`
2. 域名先走 DoH 解析
3. 再按真实 IP 查询国家归属地
4. 生成最终名称

### 2. 输出形式示例

#### 只输出国家

```text
#bare=true&nm=true
```

结果示例：

```text
🇩🇪 德国
🇺🇸 美国
```

#### 保留原节点名 + 国家

```text
#bare=false&nm=true
```

结果示例：

```text
GO_42221408 | 🇺🇸 美国
premium_de_Germany_Nuremberg | 🇩🇪 德国
```

#### 国家 + 出口国家

```text
#bare=true&nm=true&out=true
```

结果示例：

```text
🇩🇪 德国 | ↗ 🇯🇵 日本
🇺🇸 美国 | ↗ 🇯🇵 日本
```

#### 启用最终重名编号

```text
#bare=true&nm=true&dedupe=true
```

结果示例：

```text
🇨🇴 哥伦比亚
🇨🇴 哥伦比亚 #2
🇨🇴 哥伦比亚 #3
```

#### 附加城市

```text
#bare=true&city=true&nm=true
```

结果示例：

```text
🇺🇸 美国 Los Angeles
🇯🇵 日本 Tokyo
```

---

## 推荐配置

### 最简纯国家重命名

```text
#bare=true&chinese=true&nm=true
```

### 真实 IP 国家 + 保留原节点名

```text
#bare=false&chinese=true&nm=true
```

### 真实 IP 国家 + 出口标签

```text
#bare=true&chinese=true&nm=true&out=true
```

### 真实 IP 国家 + 出口标签 + 去重

```text
#bare=true&chinese=true&nm=true&out=true&dedupe=true
```

---

## 出口缓存更新脚本

文件：`update-outbound-cache.py`

用途：

- 获取当前机器公网出口 IP
- 查询出口国家/地区
- 写入 `/home/ubuntu/substore/root.json`

运行方式：

```bash
python3 update-outbound-cache.py
```

如果 Sub-Store 运行用户不是当前用户，且 `root.json` 不可写，请用：

```bash
sudo python3 update-outbound-cache.py
```

---

## 常见问题

### 1. 为什么节点没有被改成国家名？

常见原因：

- 节点名本身不能识别，且脚本没有走真实 IP Geo 查询
- 域名解析失败
- Geo 查询接口失败
- `nm=true` 时保留了原节点名

### 2. 为什么 `GO_42221408` 没变成国家名？

如果脚本是“简化版”关键词重命名，它不会按真实 IP 查询。必须使用当前这个“真实 IP Geo 版”脚本。

### 3. 为什么 Mihomo 报 duplicate name？

如果多个节点最终名称一样，可以加：

```text
&dedupe=true
```

### 4. 为什么 Mihomo 报 `dns is not a slice`？

这是 WireGuard `dns` 字段格式问题，需要单独在 Sub-Store 配置里用 Response Transformer 归一化成数组。

---

## 当前建议

如果你的目标是：

- `GO_42221408` 这种节点按真实 IP 国家输出
- 默认不拼出口国家
- 默认不编号

推荐参数就是：

```text
#bare=true&chinese=true&nm=true
```

如果后面再需要出口标签或编号，再额外开启：

```text
&out=true
&dedupe=true
```

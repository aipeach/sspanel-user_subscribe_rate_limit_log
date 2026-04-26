# SSPanel 低流量用户订阅限速日志细分查询

基于 `Next.js + Tailwind CSS + shadcn/ui + MySQL + SQLite` 的日志细分查询面板。

当前架构：
- MySQL：日志数据源（读取 `user_subscribe_rate_limit_log`）
- SQLite：仅用于手动保存筛选条件和查询结果快照（查询归档）

## 功能

- 普通筛选（用户ID、订阅类型、节点分组、IP、UA关键词、是否命中限速）
- UA 统计（按 `request_ua_hash + request_ua` 聚合）
- 用户订阅次数统计（按 `user_id` 聚合）
- 高级筛选（单时间段）
- 多时间段筛选（多个时间段 OR）
- 多时间段交集用户ID（每个时间段都出现过）
- SQLite 查询归档（手动保存筛选条件 + 查询结果快照）
- 多页面后台（`/logs`、`/ua`、`/user-subscribe-counts`、`/user-distinct-detail`、`/intersection`、`/archives`）
- 侧边菜单栏（按功能页切换）
- 表格支持升序/降序按钮
- 归档支持删除
- 保存查询时弹窗填写备注
- 管理员登录（密码 SHA256 与 `.env` 中 `ADMIN_PASSWORD_SHA256` 比对）

## 启动

1. 安装依赖

```bash
pnpm install
```

2. 复制环境变量

```bash
cp .env.example .env.local
```

3. 配置 MySQL 连接，并确保 MySQL 中存在表 `user_subscribe_rate_limit_log`

可使用你提供的 `user_subscribe_rate_limit_log.sql` 建表。

4. 配置管理员密码哈希（SHA256）

```bash
echo -n '你的管理员密码' | shasum -a 256
```

把输出结果写入 `.env.local` 的 `ADMIN_PASSWORD_SHA256`。

5. 启动开发服务

```bash
pnpm dev
```

首次访问归档或首次手动保存时会自动创建 SQLite 归档库：
- `data/query-archive.sqlite`

## 生产环境部署（Linux + systemd + Nginx）

以下示例以部署目录 `/opt/sspanel-user_subscribe_rate_limit_log` 为例，应用端口以 `.env` 中 `PORT` 为准。

1. 准备环境

- Node.js 20+
- pnpm
- Nginx

2. 上传代码并安装依赖

```bash
cd /opt
git clone https://github.com/aipeach/sspanel-user_subscribe_rate_limit_log sspanel-user_subscribe_rate_limit_log
cd sspanel-user_subscribe_rate_limit_log
pnpm install --frozen-lockfile
```

3. 配置生产环境变量

```bash
cp .env.example .env
```

至少确认以下配置正确：
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `ADMIN_PASSWORD_SHA256`

建议额外增加（例如）：

```env
NODE_ENV=production
PORT=3001
```

4. 构建并本地验证

```bash
pnpm build
pnpm start
```

浏览器访问 `http://127.0.0.1:<PORT>`（例如 `http://127.0.0.1:3001`）验证服务可用后再停止进程。
说明：当前项目的 `pnpm start` 会读取项目根目录 `.env`，并使用其中的 `PORT` 启动。

5. 使用 systemd 守护进程

创建 `/etc/systemd/system/sspanel-log.service`：

```ini
[Unit]
Description=SSPanel Subscribe Rate Limit Log Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sspanel-user_subscribe_rate_limit_log
EnvironmentFile=/opt/sspanel-user_subscribe_rate_limit_log/.env
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

启动并设置开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sspanel-log.service
sudo systemctl status sspanel-log.service
```

6. 配置 Nginx 反向代理

创建 `/etc/nginx/conf.d/sspanel-log.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

重载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

说明：
- `proxy_pass` 端口请与 `.env` 中 `PORT` 保持一致。
- 如果修改了 `.env` 中的 `PORT`，请执行 `sudo systemctl restart sspanel-log.service` 使其生效。

7. SQLite 持久化与权限

- SQLite 归档文件路径：`data/query-archive.sqlite`
- 请确保运行用户（如 `www-data`）对项目目录下 `data/` 有读写权限，否则归档保存会失败。
- 建议将 `data/` 纳入备份。

常用运维命令：

```bash
sudo systemctl restart sspanel-log.service
sudo journalctl -u sspanel-log.service -f
```

如果服务器未安装 `pnpm`，可先执行：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## API

- `POST /api/auth/login`：管理员登录
- `POST /api/auth/logout`：管理员退出登录
- `POST /api/logs/query`：分页查询日志（MySQL）
- `POST /api/logs/ua-stats`：UA 聚合统计（MySQL）
- `POST /api/logs/user-subscribe-counts`：用户订阅次数统计（MySQL）
- `POST /api/logs/user-distinct-detail`：指定用户去重 IP / 去重 UA 明细（含每个IP/UA出现次数，MySQL）
- `POST /api/logs/intersection-users`：多时间段交集用户ID（MySQL）
- `GET /api/logs/history?limit=20`：查询归档（SQLite）
- `POST /api/logs/history`：手动保存归档（SQLite）
- `DELETE /api/logs/history?id=123`：删除归档（SQLite）

请求体示例（查询接口通用）：

```json
{
  "userId": 72815,
  "subscribeType": "Clash",
  "nodeGroup": 501,
  "requestIp": "183.242",
  "uaKeyword": "clash-verge",
  "isBlocked": 0,
  "startTime": "2026-04-22T10:00",
  "endTime": "2026-04-22T12:00",
  "ranges": [
    { "start": "2026-04-22T10:00", "end": "2026-04-22T10:59" },
    { "start": "2026-04-22T11:00", "end": "2026-04-22T11:59" }
  ],
  "page": 1,
  "pageSize": 20
}
```

说明：
- 当 `ranges` 有值时，日志查询按多个时间段 OR 匹配。
- 交集用户查询返回“在所有 ranges 中都出现过”的用户ID。
- 查询不会自动写入归档，必须点击对应的“手动保存”按钮才会写入 SQLite。
- 手动保存时会弹窗要求填写备注，备注会在归档列表中展示。
- 在归档列表中会展示保存时使用的时间段（含多时间段明细），便于回溯。

手动保存归档请求体示例（`POST /api/logs/history`）：

```json
{
  "actionType": "logs",
  "filters": { "userId": 72815 },
  "resultTotal": 12,
  "resultPayload": { "items": [] },
  "remark": "晚高峰日志排查"
}
```

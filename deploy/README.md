# 部署安全说明

本项目默认是纯前端静态应用，API Key 保存在当前浏览器 IndexedDB。个人部署时请至少做到：

- 使用 HTTPS。
- 给站点加访问控制，例如 Basic Auth、VPN、Cloudflare Access 或内网访问。
- 不要把平台级 API Key 写进前端源码、环境变量或静态文件。
- 在 Nginx 或网关层添加安全响应头，可参考 `nginx-security-headers.conf`。

如果需要更高安全性，建议增加后端代理或边缘函数，由服务端保存真实 API Key，前端只访问自己的受保护接口。

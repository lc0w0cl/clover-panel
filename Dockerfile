# 使用 Node.js 作为基础镜像来运行后端服务
FROM node:18-alpine

# 安装 Nginx 和 Supervisor
RUN apk add --no-cache nginx supervisor

# 设置工作目录
WORKDIR /app
# 设置 NODE_ENV 为 production
ENV NODE_ENV=production
# 复制构建的文件和服务器代码到工作目录
COPY  dist /usr/share/nginx/html
COPY  server ./server

WORKDIR /app/server
# 安装仅生产环境所需的依赖
RUN npm install

WORKDIR /app

# 复制 assets/logo 目录到 Nginx 的静态文件目录
COPY src/assets/logo /app/logo
# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 复制站点配置文件
COPY default.conf /etc/nginx/conf.d/default.conf

# 复制 Supervisor 配置文件
COPY supervisord.conf /etc/supervisord.conf

# 创建配置目录
RUN mkdir -p /app/config

# 暴露端口
EXPOSE 80 3000

# 启动 Supervisor
CMD ["supervisord", "-c", "/etc/supervisord.conf"]

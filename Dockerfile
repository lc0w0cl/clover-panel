# 使用 Node.js 官方镜像作为基础镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果有）到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目的所有文件到工作目录
COPY . .

# 构建前端项目
RUN npm run build

# 使用 Node.js 作为基础镜像来运行后端服务
FROM node:18-alpine

# 安装 Nginx 和 Supervisor
RUN apk add --no-cache nginx supervisor

# 设置工作目录
WORKDIR /app

# 复制构建的文件和服务器代码到工作目录
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# 复制 assets/logo 目录到 Nginx 的静态文件目录
COPY --from=builder /app/src/assets/logo /usr/share/nginx/html/logo

# 安装仅生产环境所需的依赖
RUN npm install --only=production

# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 复制站点配置文件
COPY default.conf /etc/nginx/conf.d/default.conf

# 复制 Supervisor 配置文件
COPY supervisord.conf /etc/supervisord.conf

# 暴露端口
EXPOSE 80 3000

# 启动 Supervisor
CMD ["supervisord", "-c", "/etc/supervisord.conf"]

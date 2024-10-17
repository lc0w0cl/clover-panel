# 使用官方Node.js镜像作为构建阶段的基础镜像
FROM node:16 AS build-stage

# 设置工作目录
WORKDIR /app

# 复制Vue.js项目的package.json和package-lock.json
COPY client/package*.json ./client/

# 安装Vue.js项目依赖
RUN cd client && npm install

# 复制Vue.js项目文件
COPY client ./client

# 构建Vue.js项目
RUN cd client && npm run build

# 设置Node.js服务器和Nginx
FROM node:16

WORKDIR /app

# 安装Nginx和supervisor
RUN apt-get update && apt-get install -y nginx supervisor

# 复制Node.js服务器的package.json和package-lock.json
COPY package*.json ./

# 安装Node.js服务器依赖
RUN npm install

# 复制Node.js服务器文件
COPY server.js .

# 复制构建后的Vue.js项目到Node.js服务器的静态文件目录
COPY --from=build-stage /app/client/dist ./public

# 复制Nginx配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# 复制supervisor配置文件
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 暴露应用程序的端口
EXPOSE 80

# 启动supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

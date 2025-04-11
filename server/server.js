import express from 'express';
import jwt from 'jsonwebtoken';
import * as fs from "fs";
import path from "node:path";
import multer from 'multer';
import axios from "axios";
import crypto from 'crypto';
import { initializeDatabase, db } from './database.js';
import * as Minio from 'minio';
import FormData from 'form-data';

const app = express();
const port = 3000;

// Minio客户端配置
let minioClient;
let BUCKET_NAME;

// 在文件开头添加变量声明
let JWT_SECRET = crypto.randomBytes(64).toString('hex');
let defaultUser;

// 修改默认配置对象
const defaultConfig = {
    username: "admin",
    password: "admin123",
    minio: {
        endPoint: "minio.xxx.cn",
        port: 443,
        useSSL: true,
        accessKey: "minioadmin",
        secretKey: "minioadmin",
        bucketName: "panel"
    },
    removebg: {
        apiKey: "YOUR_REMOVE_BG_API_KEY"
    }
};

// 环境设置
const isDev = process.env.NODE_ENV !== 'production';
const dbDir = isDev ? './' : '/app/db';
console.log('当前环境:', isDev ? '开发' : '生产')

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, {recursive: true});
    console.log('目录创建成功');
}

// 修改配置初始化函数
const initializeConfig = () => {
    const configPath = isDev ? './config/config.json' : '/app/config/config.json';

    try {
        if (!fs.existsSync(configPath)) {
            // 确保配置目录存在
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            // 写入新的配置文件，使用默认配置
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            console.log('配置文件已创建');
        }

        // 读取配置
        defaultUser = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // 初始化Minio客户端
        initializeMinioClient();
        
        console.log('配置加载成功');
    } catch (err) {
        console.error('配置初始化失败:', err);
        process.exit(1);
    }
};

// 添加Minio客户端初始化函数
const initializeMinioClient = () => {
    const minioConfig = defaultUser.minio || defaultConfig.minio;
    
    // Minio客户端配置
    minioClient = new Minio.Client({
        endPoint: minioConfig.endPoint,
        port: minioConfig.port,
        useSSL: minioConfig.useSSL,
        accessKey: minioConfig.accessKey,
        secretKey: minioConfig.secretKey
    });
    
    // 根据环境选择不同的桶名
    if (typeof minioConfig.bucketName === 'object') {
        // 如果bucketName是对象，根据环境选择
        BUCKET_NAME = isDev ? 
            minioConfig.bucketName.development : 
            minioConfig.bucketName.production;
    } else {
        // 向后兼容，如果bucketName是字符串直接使用
        BUCKET_NAME = minioConfig.bucketName;
    }
    
    console.log(`当前环境: ${isDev ? '开发环境' : '生产环境'}, 使用Minio桶: ${BUCKET_NAME}`);
    
    // 确保Minio桶存在
    (async () => {
        try {
            const exists = await minioClient.bucketExists(BUCKET_NAME);
            if (!exists) {
                await minioClient.makeBucket(BUCKET_NAME);
                console.log(`已创建桶 ${BUCKET_NAME}`);
            }
        } catch (err) {
            console.error('Minio初始化错误:', err);
        }
    })();
};

// 在数据库初始化之前调用配置初始化
initializeConfig();

// 初始化数据库
initializeDatabase(dbDir).then(() => {
    console.log('数据库初始化成功。');
}).catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
});

// 新增: 中间件函数用于验证 token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 设置 multer 存储配置
const storage = multer.memoryStorage(); // 使用内存存储，不再保存到本地文件系统
const upload = multer({storage: storage});

// 文件上传接口
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({error: 'No file uploaded'});
    }
    
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(req.file.originalname) || '.png';
        const objectName = `${uniqueSuffix}${extension}`;
        
        // 上传文件到Minio
        await minioClient.putObject(
            BUCKET_NAME, 
            objectName, 
            req.file.buffer
        );
        
        // 获取Minio配置
        const minioConfig = defaultUser.minio || defaultConfig.minio;
        
        // 构建文件URL
        const filepath = `https://${minioConfig.endPoint}/${BUCKET_NAME}/${objectName}`;
        
        res.send({message: '文件上传成功', filepath: filepath});
    } catch (error) {
        console.error('Minio上传错误:', error);
        res.status(500).send({error: '文件上传失败'});
    }
});

// 添加一个辅助函数，用于验证内容是否为图像
const isValidImageContent = (buffer, contentType) => {
    // 检查内容类型是否为图像
    if (contentType && contentType.startsWith('image/')) {
        return true;
    }
    
    // 检查文件的魔数（magic numbers）
    if (buffer && buffer.length > 4) {
        // 检查常见图像格式的魔数
        // JPEG: 以FF D8 FF开头
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return true;
        }
        // PNG: 以89 50 4E 47开头
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return true;
        }
        // GIF: 以47 49 46 38开头
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
            return true;
        }
        // ICO: 以00 00 01 00开头
        if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
            return true;
        }
    }
    
    return false;
};

app.get('/api/fetch-logo', authenticateToken, async (req, res) => {
    const {url} = req.query;
    try {
        // 确保只传递域名部分
        const domain = new URL(url).hostname;
        const fullUrl = url.startsWith('http') ? url : `https://${domain}`;
        
        let logoResponse = null;
        let bestIconUrl = null;
        
        // 首先尝试获取网站HTML并解析favicon链接
        try {
            console.log(`尝试获取网站HTML: ${fullUrl}`);
            const htmlResponse = await axios.get(fullUrl, {
                timeout: 8000, // 设置8秒超时
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (htmlResponse.data) {
                // 提取link标签中的favicon URL
                const html = htmlResponse.data.toString();
                const iconRegex = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
                const faviconRegex = /<link[^>]*rel=["'](?:apple-touch-icon|favicon)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
                
                let match;
                let iconUrls = [];
                
                // 寻找所有icon和favicon标签
                while ((match = iconRegex.exec(html)) !== null) {
                    iconUrls.push(match[1]);
                }
                
                while ((match = faviconRegex.exec(html)) !== null) {
                    iconUrls.push(match[1]);
                }
                
                console.log(`从HTML中找到${iconUrls.length}个潜在的图标链接`);
                
                // 处理相对路径，转换为绝对URL
                iconUrls = iconUrls.map(iconUrl => {
                    if (iconUrl.startsWith('http')) {
                        return iconUrl;
                    } else if (iconUrl.startsWith('//')) {
                        return `https:${iconUrl}`;
                    } else if (iconUrl.startsWith('/')) {
                        return `https://${domain}${iconUrl}`;
                    } else {
                        return `https://${domain}/${iconUrl}`;
                    }
                });
                
                // 尝试获取每个图标URL
                for (const iconUrl of iconUrls) {
                    try {
                        console.log(`尝试从HTML中提取的链接获取图标: ${iconUrl}`);
                        logoResponse = await axios.get(iconUrl, {
                            responseType: 'arraybuffer',
                            timeout: 5000,
                            validateStatus: status => status === 200
                        });
                        
                        // 验证获取的内容是否为图像
                        const contentType = logoResponse.headers['content-type'];
                        const isImage = isValidImageContent(logoResponse.data, contentType);
                        
                        if (!isImage) {
                            console.log(`获取到的内容不是图像: ${iconUrl}, 内容类型: ${contentType}`);
                            logoResponse = null;
                            continue;
                        }
                        
                        // 如果成功获取图标，跳出循环
                        if (logoResponse && logoResponse.data && logoResponse.data.length > 0) {
                            console.log(`成功获取HTML中的图标: ${iconUrl}`);
                            bestIconUrl = iconUrl;
                            break;
                        }
                    } catch (error) {
                        console.log(`获取HTML中的图标失败: ${iconUrl} - ${error.message}`);
                        logoResponse = null;
                    }
                }
            }
        } catch (htmlError) {
            console.log(`获取网站HTML失败: ${htmlError.message}`);
        }
        
        // 如果从HTML解析失败，尝试从网站根目录获取favicon的URL列表
        if (!logoResponse) {
            console.log(`从HTML未找到有效图标，尝试常见favicon路径`);
            const faviconUrls = [
                `https://${domain}/favicon.ico`,
                `https://${domain}/favicon.png`,
                `https://${domain}/apple-touch-icon.png`,
                `https://${domain}/apple-touch-icon-precomposed.png`,
                `https://www.${domain}/favicon.ico`,
                `https://www.${domain}/favicon.png`
            ];
            
            // 尝试依次获取favicon
            for (const faviconUrl of faviconUrls) {
                try {
                    console.log(`尝试获取favicon: ${faviconUrl}`);
                    logoResponse = await axios.get(faviconUrl, {
                        responseType: 'arraybuffer',
                        timeout: 5000, // 设置5秒超时
                        validateStatus: status => status === 200 // 只接受200状态码
                    });
                    
                    // 验证获取的内容是否为图像
                    const contentType = logoResponse.headers['content-type'];
                    const isImage = isValidImageContent(logoResponse.data, contentType);
                    
                    if (!isImage) {
                        console.log(`获取到的内容不是图像: ${faviconUrl}, 内容类型: ${contentType}`);
                        logoResponse = null;
                        continue;
                    }
                    
                    // 如果成功获取favicon，跳出循环
                    if (logoResponse && logoResponse.data && logoResponse.data.length > 0) {
                        console.log(`成功获取favicon: ${faviconUrl}`);
                        bestIconUrl = faviconUrl;
                        break;
                    }
                } catch (error) {
                    console.log(`获取favicon失败: ${faviconUrl} - ${error.message}`);
                    logoResponse = null;
                }
            }
        }
        
        // 如果所有favicon尝试都失败
        if (!logoResponse) {
            console.log(`所有图标获取尝试失败: ${domain}`);
            return res.status(200).json({
                error: '无法获取网站图标',
                domain: domain,
                message: `尝试获取 ${domain} 的图标失败，请确认网站是否提供了有效的图标文件`
            });
        }
        
        try {
            // 生成唯一文件名
            const objectName = `${domain}-${Date.now()}.png`;
            
            // 上传原始图片到Minio
            await minioClient.putObject(
                BUCKET_NAME,
                objectName,
                Buffer.from(logoResponse.data)
            );
            
            // 获取Minio配置
            const minioConfig = defaultUser.minio || defaultConfig.minio;
            
            // 构建访问URL
            const filepath = `https://${minioConfig.endPoint}/${BUCKET_NAME}/${objectName}`;
            
            // 记录获取成功日志
            console.log(`===== 获取favicon成功 =====`);
            console.log(`域名: ${domain}`);
            console.log(`时间: ${new Date().toISOString()}`);
            console.log(`大小: ${logoResponse.data.length} 字节`);
            console.log(`URL: ${bestIconUrl}`);
            console.log(`=======================`);
            
            res.json({message: '文件保存成功', path: filepath});
            
        } catch (error) {
            console.error('保存文件失败:', error);
            res.status(500).json({error: '保存文件失败'});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({error: '抓取logo失败'});
    }
});

app.delete('/api/delete-logo', authenticateToken, async (req, res) => {
    const {filename} = req.query;
    
    try {
        if (!filename) {
            return res.status(400).json({error: '未提供文件名'});
        }

        let objectName;
        // 处理完整URL路径(例如: https://minio.xxx.cn/bucket-name/object-name)
        if (filename.startsWith('http')) {
            try {
                const url = new URL(filename);
                // 移除第一个斜杠，然后按斜杠分割路径
                const pathParts = url.pathname.substring(1).split('/');
                
                // 如果路径至少有两部分(桶名和对象名)
                if (pathParts.length >= 2) {
                    // 最后一部分是对象名
                    objectName = pathParts[pathParts.length - 1];
                } else {
                    // 无法解析路径
                    return res.status(400).json({error: '无法从URL解析对象名称'});
                }
            } catch (error) {
                console.error('解析URL失败:', error);
                return res.status(400).json({error: '无效的URL格式'});
            }
        } else {
            // 处理简单文件名或相对路径
            objectName = filename.split('/').pop();
        }
        
        if (!objectName) {
            return res.status(400).json({error: '无效的文件路径'});
        }
        
        console.log(`尝试删除对象: ${objectName} 从桶: ${BUCKET_NAME}`);
        
        // 从Minio删除对象
        await minioClient.removeObject(BUCKET_NAME, objectName);
        
        res.json({message: '文件删除成功'});
    } catch (error) {
        console.error('删除文件失败:', error);
        res.status(500).json({error: '删除文件失败'});
    }
});

// 解析 JSON 请求体
app.use(express.json());

// 修改获取快捷方式的API
app.get('/api/shortcuts', authenticateToken, (req, res) => {
    const sql = `SELECT s.*, g.name as groupName
                 FROM shortcuts s
                          JOIN groups g ON s.groupId = g.id
                 ORDER BY g.sort, s.orderNum`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// 修改新增快捷方式的API
app.post('/api/shortcuts', authenticateToken, (req, res) => {
    const {groupId, orderNum, title, icon, internalNetwork, privateNetwork} = req.body;
    const sql = `INSERT INTO shortcuts (groupId, orderNum, title, icon, internalNetwork, privateNetwork)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [groupId, orderNum, title, icon, internalNetwork, privateNetwork];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": {id: this.lastID}
        });
    });
});

// 修改更新特定组内快捷方式的API
app.put('/api/shortcuts/group/:groupId', authenticateToken, (req, res) => {
    const {groupId} = req.params;
    const shortcuts = req.body.shortcuts;

    // 为每个快捷方式构建更新语句
    shortcuts.forEach((shortcut, index) => {
        const sql = `UPDATE shortcuts
                     SET orderNum = ?
                     WHERE id = ?
                       AND groupId = ?`;
        const params = [shortcut.orderNum, shortcut.id, groupId];

        db.run(sql, params, function (err) {
            if (err) {
                console.error(`更新失败: ${err.message}`);
                res.status(400).json({"error": err.message});
                return;
            }
        });
    });

    // 响应客户端
    res.json({
        "message": "快捷方式更新成功",
        "groupId": groupId
    });
});

// 删除快捷方式
app.delete('/api/shortcuts/:id', authenticateToken, (req, res) => {
    const {id} = req.params;
    const sql = `DELETE
                 FROM shortcuts
                 WHERE id = ?`;

    db.run(sql, id, function (err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        console.log(`Deleted shortcut with ID: ${id}`); // 打印删除的快捷方式 ID
        res.json({
            "message": "success",
            "changes": this.changes  // 返回被删除的行数
        });
    });
});

// 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 检查是否匹配配置文件中的用户
    if (username === defaultUser.username && password === defaultUser.password) {
        const token = jwt.sign(
            { userId: 'default', username: username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        return res.json({ 
            success: true,
            message: 'Login successful', 
            token 
        });
    }

    // 如果不匹配，返回错误
    res.status(401).json({ 
        success: false,
        message: '用户名或密码错误' 
    });
});


// 获取所有分组
app.get('/api/groups', authenticateToken, (req, res) => {
    const sql = `SELECT *
                 FROM groups
                 ORDER BY sort`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// 添加新分组
app.post('/api/groups', authenticateToken, (req, res) => {
    const {name, sort} = req.body;
    const sql = `INSERT INTO groups (name, sort)
                 VALUES (?, ?)`;
    db.run(sql, [name, sort], function (err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": {id: this.lastID}
        });
    });
});

// 更新分组排序
app.put('/api/groups/order', authenticateToken, (req, res) => {
    const groups = req.body.groups;

    const updatePromises = groups.map(group => {
        const sql = `UPDATE groups SET sort = ? WHERE id = ?`;
        return new Promise((resolve, reject) => {
            db.run(sql, [group.order, group.id], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    });

    Promise.all(updatePromises)
        .then(results => {
            const totalChanges = results.reduce((acc, changes) => acc + changes, 0);
            res.json({
                "message": "success",
                "changes": totalChanges
            });
        })
        .catch(err => {
            res.status(400).json({"error": err.message});
        });
});

// 更新分组
app.put('/api/groups/:id', authenticateToken, (req, res) => {
    const {name, sort} = req.body;
    const {id} = req.params;
    const sql = `UPDATE groups
                 SET name = ?,
                     sort = ?
                 WHERE id = ?`;
    db.run(sql, [name, sort, id], function (err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// 删除分组
app.delete('/api/groups/:id', authenticateToken, (req, res) => {
    const {id} = req.params;
    const sql = `DELETE
                 FROM groups
                 WHERE id = ?`;
    db.run(sql, id, function (err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// 更新快捷方式
app.put('/api/shortcuts/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { groupId, orderNum, title, icon, internalNetwork, privateNetwork } = req.body;
    const sql = `UPDATE shortcuts
                 SET groupId = ?,
                     orderNum = ?,
                     title = ?,
                     icon = ?,
                     internalNetwork = ?,
                     privateNetwork = ?
                 WHERE id = ?`;
    const params = [groupId, orderNum, title, icon, internalNetwork, privateNetwork, id];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId; // 假设 authenticateToken 中间件设置了 req.user

  // 从数据库获取用户
  db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '当前密码不正确' });
    }

    // 希新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 更新数据库中的密码
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: '更新密码失败' });
      }
      res.json({ success: true, message: '密码已成功更新' });
    });
  });
});

app.put('/api/shortcuts/batch-update', authenticateToken, (req, res) => {
  const shortcuts = req.body.shortcuts;

  const updatePromises = shortcuts.map(shortcut => {
    const sql = `UPDATE shortcuts 
                 SET groupId = ?, 
                     orderNum = ? 
                 WHERE id = ?`;
    return new Promise((resolve, reject) => {
      db.run(sql, [shortcut.groupId, shortcut.orderNum, shortcut.id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });

  Promise.all(updatePromises)
    .then(results => {
      const totalChanges = results.reduce((acc, changes) => acc + changes, 0);
      res.json({
        "message": "success",
        "changes": totalChanges
      });
    })
    .catch(err => {
      res.status(400).json({"error": err.message});
    });
});

// 获取所有待办事项
app.get('/api/todos', authenticateToken, (req, res) => {
    // 修改SQL查询，先按completed排序（未完成在前），再按创建时间倒序
    const sql = `SELECT * FROM todos 
                 ORDER BY completed ASC, 
                 createTime DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// 创建新的待办事项
app.post('/api/todos', authenticateToken, (req, res) => {
    const { content } = req.body;
    if (!content) {
        res.status(400).json({"error": "Content is required"});
        return;
    }

    const sql = `INSERT INTO todos (content) VALUES (?)`;
    db.run(sql, [content], function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});

// 更新待办事项状态
app.put('/api/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { completed, content } = req.body;
    
    let sql, params;
    
    // 根据请求参数决定更新内容或状态或两者都更新
    if (content !== undefined && completed !== undefined) {
        // 同时更新内容和状态
        sql = `UPDATE todos 
               SET content = ?,
                   completed = ?,
                   updateTime = CURRENT_TIMESTAMP 
               WHERE id = ?`;
        params = [content, completed ? 1 : 0, id];
    } else if (content !== undefined) {
        // 只更新内容
        sql = `UPDATE todos 
               SET content = ?,
                   updateTime = CURRENT_TIMESTAMP 
               WHERE id = ?`;
        params = [content, id];
    } else if (completed !== undefined) {
        // 只更新状态
        sql = `UPDATE todos 
               SET completed = ?,
                   updateTime = CURRENT_TIMESTAMP 
               WHERE id = ?`;
        params = [completed ? 1 : 0, id];
    } else {
        return res.status(400).json({"error": "No update parameters provided"});
    }
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// 删除待办事项
app.delete('/api/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM todos WHERE id = ?`;
    
    db.run(sql, id, function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

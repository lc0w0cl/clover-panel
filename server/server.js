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
    
    // Minio桶名
    BUCKET_NAME = minioConfig.bucketName;
    
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

app.get('/api/fetch-logo', authenticateToken, async (req, res) => {
    const {url} = req.query;
    try {
        // 确保只传递域名部分
        const domain = new URL(url).hostname;
        const logoUrl = `https://img.logo.dev/${domain}?token=pk_Y5mYokT0RwC_jSR_YqrSHQ`;

        // 获取原始logo
        const logoResponse = await axios.get(logoUrl, {responseType: 'arraybuffer'});
        
        // 获取removebg API密钥
        const removeBgConfig = defaultUser.removebg || { apiKey: 'YOUR_REMOVE_BG_API_KEY' };
        const removeBgApiKey = removeBgConfig.apiKey;
        
        try {
            // 根据官方文档调用remove.bg API
            const formData = new FormData();
            formData.append('size', 'auto');
            formData.append('image_file', Buffer.from(logoResponse.data), {
                filename: `${domain}.png`,
                contentType: 'image/png'
            });
            
            // 使用axios调用remove.bg API
            const removeBgResponse = await axios.post('https://api.remove.bg/v1.0/removebg', 
                formData, 
                {
                    headers: {
                        ...formData.getHeaders(),
                        'X-Api-Key': removeBgApiKey
                    },
                    responseType: 'arraybuffer'
                }
            );
            
            // 记录移除背景成功的日志
            console.log(`===== 移除背景成功 =====`);
            console.log(`域名: ${domain}`);
            console.log(`时间: ${new Date().toISOString()}`);
            console.log(`响应大小: ${removeBgResponse.data.length} 字节`);
            console.log(`响应状态: ${removeBgResponse.status}`);
            if (removeBgResponse.headers['x-credits-charged']) {
                console.log(`使用积分: ${removeBgResponse.headers['x-credits-charged']}`);
            }
            console.log(`=======================`);
            
            // 生成唯一文件名
            const objectName = `${domain}-${Date.now()}.png`;
            
            // 使用无背景图片上传到Minio
            await minioClient.putObject(
                BUCKET_NAME,
                objectName,
                Buffer.from(removeBgResponse.data)
            );
            
            // 获取Minio配置
            const minioConfig = defaultUser.minio || defaultConfig.minio;
            
            // 构建访问URL
            const filepath = `https://${minioConfig.endPoint}/${BUCKET_NAME}/${objectName}`;
            
            res.json({message: '文件保存成功', path: filepath});
            
        } catch (removeBgError) {
            console.error('移除背景失败:', removeBgError);
            
            // 出错时使用原始图片
            console.log('使用原始图片作为备选');
            
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
            
            res.json({message: '文件保存成功(原始图片)', path: filepath});
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

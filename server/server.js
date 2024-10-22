import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as fs from "fs";
import path from "node:path";
import multer from 'multer';
import axios from "axios";
import { initializeDatabase, db } from './database.js';

const app = express();
const port = 3000;

// JWT 密钥设置
const JWT_SECRET = 'your_jwt_secret';  // 在实际应用中，请使用更安全的密钥并妥善保管

// 环境设置
const isDev = process.env.NODE_ENV !== 'production';
const dbDir = isDev ? './' : '/app/db';
const uploadDir = isDev ? '../src/assets/logo' : '/app/logo'
console.log('当前环境:', isDev ? '开发' : '生产')

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, {recursive: true});
    console.log('目录创建成功');
}

// 初始化数据库
initializeDatabase(dbDir).then(() => {
    console.log('数据库初始化成功。');
}).catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
});

// 设置 multer 存储配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // 上传文件的目标目录
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension); // 使用随机文件名
    }
});

const upload = multer({storage: storage});

// 文件上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({error: 'No file uploaded'});
    }
    let filepath;
    if (isDev) {
        filepath = '/src/assets/logo/' + req.file.filename
    } else {
        filepath = '/logo/' + req.file.filename
    }
    res.send({message: '文件上传成功', filepath: filepath});
});


app.get('/api/fetch-logo', async (req, res) => {
    const {url} = req.query;
    try {
        // 确保只传递域名部分
        const domain = new URL(url).hostname;
        const logoUrl = `https://logo.clearbit.com/${domain}`;

        const logoResponse = await axios.get(logoUrl, {responseType: 'arraybuffer'});
        const logoPath = path.join(uploadDir, `${domain}.png`);

        fs.writeFileSync(logoPath, logoResponse.data);
        const filepath = isDev ? `/src/assets/logo/${domain}.png` : `/logo/${domain}.png`;
        res.json({message: '文件保存成功', path: filepath});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: '抓取logo失败'});
    }
});

app.delete('/api/delete-logo', (req, res) => {
    const {filename} = req.query;
    let fullPath;
    if (isDev) {
        fullPath = path.join('..', 'src', 'assets', 'logo', path.basename(filename));
    } else {
        fullPath = path.join('app', 'logo', path.basename(filename))
    }

    fs.unlink(fullPath, (err) => {
        if (err) {
            console.error('删除文件失败:', err);
            return res.status(500).json({error: '删除文件失败'});
        }
        res.json({message: '文件删除成功'});
    });
});

// 解析 JSON 请求体
app.use(express.json());

// 修改获取快捷方式的API
app.get('/api/shortcuts', (req, res) => {
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
app.post('/api/shortcuts', (req, res) => {
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
app.put('/api/shortcuts/group/:groupId', (req, res) => {
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


// 更新特定组内的快捷方式
app.put('/api/shortcuts/group/:groupId', (req, res) => {
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
app.delete('/api/shortcuts/:id', (req, res) => {
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

// 注册新用户
app.post('/api/register', async (req, res) => {
    const {username, password} = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.run(sql, [username, hashedPassword], function (err) {
            if (err) {
                return res.status(400).send({error: err.message});
            }
            res.send({message: 'User registered', id: this.lastID});
        });
    } catch (error) {
        res.status(500).send({error: error.message});
    }
})

// 用户登录
app.post('/api/login', (req, res) => {
    const {username, password} = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.get(sql, [username], async (err, user) => {
        if (err) {
            return res.status(400).send({error: err.message});
        }
        if (user) {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                // 创建 JWT
                const token = jwt.sign(
                    { userId: user.id, username: user.username },
                    JWT_SECRET,
                    { expiresIn: '24h' }  // Token 有效期为 24 小时
                );
                res.json({ message: 'Login successful', token });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// 获取所有分组
app.get('/api/groups', (req, res) => {
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
app.post('/api/groups', (req, res) => {
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

// 更新分组
app.put('/api/groups/:id', (req, res) => {
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
app.delete('/api/groups/:id', (req, res) => {
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
app.put('/api/shortcuts/:id', (req, res) => {
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

// 为需要身份验证的路由添加中间件
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
        console.log(`已删除ID为 ${id} 的快捷方式`); // 打印删除的快捷方式 ID
        res.json({
            "message": "成功",
            "changes": this.changes  // 返回被删除的行数
        });
    });
});

// 同样为 groups 相关的路由添加身份验证
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


import express from 'express';
import jwt from 'jsonwebtoken';
import * as fs from "fs";
import path from "node:path";
import multer from 'multer';
import axios from "axios";
import crypto from 'crypto';
import { initializeDatabase, db } from './database.js';

const app = express();
const port = 3000;

// 在文件开头添加变量声明
let JWT_SECRET = crypto.randomBytes(64).toString('hex');
let defaultUser;

// 修改默认配置对象
const defaultConfig = {
    username: "admin",
    password: "admin123"
};

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
        console.log('配置加载成功');
    } catch (err) {
        console.error('配置初始化失败:', err);
        process.exit(1);
    }
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
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
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

app.get('/api/fetch-logo', authenticateToken, async (req, res) => {
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

app.delete('/api/delete-logo', authenticateToken, (req, res) => {
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
// app.put('/api/shortcuts/:id', authenticateToken, (req, res) => {
//     const { id } = req.params;
//     const { groupId, orderNum, title, icon, internalNetwork, privateNetwork } = req.body;
//     const sql = `UPDATE shortcuts
//                  SET groupId = ?,
//                      orderNum = ?,
//                      title = ?,
//                      icon = ?,
//                      internalNetwork = ?,
//                      privateNetwork = ?
//                  WHERE id = ?`;
//     const params = [groupId, orderNum, title, icon, internalNetwork, privateNetwork, id];
//
//     db.run(sql, params, function(err) {
//         if (err) {
//             res.status(400).json({"error": err.message});
//             return;
//         }
//         res.json({
//             "message": "success",
//             "changes": this.changes
//         });
//     });
// });


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

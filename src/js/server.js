import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt'

const app = express();
const port = 3000;


// 打开数据库连接
let db = new sqlite3.Database('./shortcuts.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the shortcuts database.');
});

// 解析 JSON 请求体
app.use(express.json());

// 定义 API 路由
app.get('/api/shortcuts', (req, res) => {
  const sql = `SELECT * FROM shortcuts`;
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

// 新增快捷方式
app.post('/api/shortcuts', (req, res) => {
  const { groupName, orderNum, title, icon, internalNetwork, privateNetwork } = req.body;
  const sql = `INSERT INTO shortcuts (groupName, orderNum, title, icon, internalNetwork, privateNetwork) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [groupName, orderNum, title, icon, internalNetwork, privateNetwork];
  
  db.run(sql, params, function(err) {
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

// 更新快捷方式
app.put('/api/shortcuts/:id', (req, res) => {
  const { title, icon, internalNetwork, privateNetwork } = req.body;
  const { id } = req.params;
  console.log(`Updating shortcut with ID: ${id}`); // 打印 ID
  console.log(`Received data:`, req.body); // 打印接收到的数据

  const sql = `UPDATE shortcuts SET title = ?, icon = ?, internalNetwork = ?, privateNetwork = ? WHERE id = ?`;
  const params = [title, icon, internalNetwork, privateNetwork, id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({"error": err.message});
      return;
    }
    console.log(`Changes made: ${this.changes}`); // 打印更新的行数
    res.json({
      "message": "success",
      "changes": this.changes
    });
  });
});



// 注册新用户
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(sql, [username, hashedPassword], function(err) {
      if (err) {
        return res.status(400).send({ error: err.message });
      }
      res.send({ message: 'User registered', id: this.lastID });
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})


// 用户登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT password FROM users WHERE username = ?';

  db.get(sql, [username], async (err, row) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }
    if (row) {
      const match = await bcrypt.compare(password, row.password);
      if (match) {
        res.send({ message: 'Login successful' });
      } else {
        res.send({ message: 'Login failed' });
      }
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  });
});





// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

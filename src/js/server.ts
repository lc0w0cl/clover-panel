import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const app = express();
const port = 3000;

// 使用 CORS 中间件
app.use(cors());

// 打开数据库连接
let db = new sqlite3.Database('./shortcuts.db', (err: Error | null) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the shortcuts database.');
  }
});

// 解析 JSON 请求体
app.use(express.json());

// 定义 API 路由
app.get('/api/shortcuts', (req: Request, res: Response) => {
  const sql = `SELECT * FROM shortcuts`;
  db.all(sql, [], (err: Error | null, rows: any[]) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// 新增快捷方式
app.post('/api/shortcuts', (req: Request, res: Response) => {
  const { groupName, orderNum, title, icon, internalNetwork, privateNetwork } = req.body;
  const sql = `INSERT INTO shortcuts (groupName, orderNum, title, icon, internalNetwork, privateNetwork) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [groupName, orderNum, title, icon, internalNetwork, privateNetwork];
  
  db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: this.lastID }
    });
  });
});

// 更新快捷方式
app.put('/api/shortcuts/:id', (req: Request, res: Response) => {
  const { title, icon, internalNetwork, privateNetwork } = req.body;
  const { id } = req.params;
  const sql = `UPDATE shortcuts SET title = ?, icon = ?, internalNetwork = ?, privateNetwork = ? WHERE id = ?`;
  const params = [title, icon, internalNetwork, privateNetwork, id];
  
  db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      res.status(400).json({ "error": err.message });
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
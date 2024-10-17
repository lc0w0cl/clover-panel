import sqlite3 from 'sqlite3';

// 打开数据库连接
let db = new sqlite3.Database('./shortcuts.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the shortcuts database.');
});

// 创建表
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS shortcuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupName TEXT,
    orderNum INTEGER,
    title TEXT,
    icon TEXT,
    internalNetwork TEXT,
    privateNetwork TEXT
  )`, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("Table created successfully.");
    }
  });

  db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`)
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Close the database connection.');
});

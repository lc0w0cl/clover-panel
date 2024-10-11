import sqlite3 from 'sqlite3';

// 打开数据库连接
let db = new sqlite3.Database('./shortcuts.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the shortcuts database.');
});

// 数据
const shortcutsGroup = [
  {
    groupName: '私人应用',
    order: 1,
    shortcuts: [
      { title: 'Google', icon: '/vite.svg', internalNetwork: 'https://www.google.com', privateNetwork: '' },
      { title: 'YouTube', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.youtube.com', privateNetwork: '' },
      // 其他数据...
    ]
  },
  {
    groupName: '服务器',
    order: 2,
    shortcuts: [
      { title: 'Google', icon: '/vite.svg', internalNetwork: 'https://www.google.com', privateNetwork: '' },
      { title: 'YouTube', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.youtube.com', privateNetwork: '' },
      // 其他数据...
    ]
  }
];

// 插入数据
db.serialize(() => {
  const stmt = db.prepare(`INSERT INTO shortcuts (groupName, orderNum, title, icon, internalNetwork, privateNetwork) VALUES (?, ?, ?, ?, ?, ?)`);

  shortcutsGroup.forEach(group => {
    group.shortcuts.forEach(shortcut => {
      stmt.run(group.groupName, group.order, shortcut.title, shortcut.icon, shortcut.internalNetwork, shortcut.privateNetwork);
    });
  });

  stmt.finalize();
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Close the database connection.');
});

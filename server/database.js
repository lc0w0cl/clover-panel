import sqlite3 from 'sqlite3';
import path from 'node:path';

let db;

function initializeDatabase(dbDir) {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(path.join(dbDir, 'shortcuts.db'), (err) => {
            if (err) {
                console.error(err.message);
                reject(err);
            }
            console.log('已连接到快捷方式数据库。');
            
            createTables()
                .then(() => {
                    console.log('数据库初始化成功。');
                    resolve(db);
                })
                .catch(reject);
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 创建 shortcuts 表
            db.run(`CREATE TABLE IF NOT EXISTS shortcuts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                groupId INTEGER,
                orderNum INTEGER,
                title TEXT,
                icon TEXT,
                internalNetwork TEXT,
                privateNetwork TEXT,
                FOREIGN KEY (groupId) REFERENCES groups(id)
            )`, (err) => {
                if (err) {
                    console.error("创建快捷方式表时出错:", err.message);
                    reject(err);
                }
            });

            // 创建 groups 表
            db.run(`CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                sort INTEGER
            )`, (err) => {
                if (err) {
                    console.error("创建分组表时出错:", err.message);
                    reject(err);
                } else {
                    insertDefaultGroups()
                        .then(() => insertDefaultShortcuts())
                        .catch(reject);
                }
            });

            // 创建todos表
            db.run(`CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
                updateTime DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            resolve();
        });
    });
}

function insertDefaultGroups() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM groups", (err, row) => {
            if (err) {
                console.error("检查分组表时出错:", err.message);
                reject(err);
            } else if (row.count === 0) {
                const insert = `INSERT INTO groups (name, sort) VALUES (?, ?)`;
                db.run(insert, ['大模型', 0], (err) => {
                    if (err) {
                        console.error("插入默认分组'大模型'时出错:", err.message);
                        reject(err);
                    } else {
                        console.log("已插入默认分组'大模型'。");
                        db.run(insert, ['服务器', 1], (err) => {
                            if (err) {
                                console.error("插入默认分组'服务器'时出错:", err.message);
                                reject(err);
                            } else {
                                console.log("已插入默认分组'服务器'。");
                                resolve();
                            }
                        });
                    }
                });
            } else {
                console.log("分组表已有数据，跳过默认分组插入。");
                resolve();
            }
        });
    });
}

function insertDefaultShortcuts() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM shortcuts", (err, row) => {
            if (err) {
                console.error("检查快捷方式表时出错:", err.message);
                reject(err);
            } else if (row.count === 0) {
                const isDev = process.env.NODE_ENV !== 'production';
                const getIconPath = (filename) => isDev ? `/src/assets/logo/${filename}` : `/logo/${filename}`;

                const aiModels = [
                    { title: 'ChatGPT', url: 'https://chat.openai.com/', icon: getIconPath('chatgpt.svg') },
                    { title: 'Gemini', url: 'https://gemini.google.com/', icon: getIconPath('gemini.svg') },
                    { title: '文心一言', url: 'https://yiyan.baidu.com/', icon: getIconPath('文心一言.ico') },
                    { title: '通义千问', url: 'https://qianwen.aliyun.com/', icon: getIconPath('通义千问.svg') },
                    { title: '讯飞星火', url: 'https://xinghuo.xfyun.cn/', icon: getIconPath('讯飞星火.svg') }
                ];
                const servers = [
                    { title: '百度', url: 'https://www.baidu.com/', icon: getIconPath('百度.svg') },
                    { title: '谷歌', url: 'https://www.google.com/', icon: getIconPath('谷歌.svg') },
                    { title: '必应', url: 'https://www.bing.com/', icon: getIconPath('必应.svg') },
                    { title: '阿里云', url: 'https://www.aliyun.com/', icon: getIconPath('阿里云.ico') },
                    { title: '腾讯云', url: 'https://cloud.tencent.com/', icon: getIconPath('腾讯云.svg') }
                ];

                const insert = `INSERT INTO shortcuts (groupId, orderNum, title, icon, internalNetwork, privateNetwork) VALUES (?, ?, ?, ?, ?, ?)`;
                
                let promises = [];

                aiModels.forEach((model, index) => {
                    promises.push(new Promise((resolve, reject) => {
                        db.run(insert, [1, index, model.title, model.icon, model.url, model.url], (err) => {
                            if (err) {
                                console.error(`插入默认快捷方式'${model.title}'时出错:`, err.message);
                                reject(err);
                            } else {
                                console.log(`已插入默认快捷方式'${model.title}'。`);
                                resolve();
                            }
                        });
                    }));
                });

                servers.forEach((server, index) => {
                    promises.push(new Promise((resolve, reject) => {
                        db.run(insert, [2, index, server.title, server.icon, server.url, server.url], (err) => {
                            if (err) {
                                console.error(`插入默认快捷方式'${server.title}'时出错:`, err.message);
                                reject(err);
                            } else {
                                console.log(`已插入默认快捷方式'${server.title}'。`);
                                resolve();
                            }
                        });
                    }));
                });

                Promise.all(promises)
                    .then(() => {
                        console.log("所有默认快捷方式插入完成。");
                        resolve();
                    })
                    .catch(reject);
            } else {
                console.log("快捷方式表已有数据，跳过默认快捷方式插入。");
                resolve();
            }
        });
    });
}

// 导出数据库操作函数
export {
    initializeDatabase,
    db
};

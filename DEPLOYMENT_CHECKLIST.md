# 🚀 ZPU贷款系统 - 生产部署清单

## 📋 部署前检查清单

### ✅ 环境准备
- [ ] Node.js 18+ 已安装
- [ ] MongoDB 5.0+ 已安装并运行
- [ ] Redis 6.0+ 已安装并运行
- [ ] Git 已安装并配置
- [ ] SSL证书已准备（生产环境）

### ✅ 项目文件检查
```
Zpu/
├── 📄 PROJECT_COMPLETE_SUMMARY.md    ✅ 完整功能清单
├── 📄 QUICK_START_GUIDE.md           ✅ 快速启动指南  
├── 📄 README.md                      ✅ 项目总体说明
├── 📄 docker-compose.yml             ✅ Docker部署配置
├── backend/
│   ├── 📄 ADMIN_CRUD_README.md       ✅ 管理端CRUD文档
│   ├── 📄 README.md                  ✅ 后端说明文档
│   ├── 📄 package.json               ✅ 后端依赖配置
│   ├── 📄 .env.example               ✅ 环境变量模板
│   └── src/                          ✅ 完整后端源码
└── frontend/
    ├── 📄 package.json               ✅ 前端依赖配置
    └── src/                          ✅ 完整前端源码
```

## 🔧 快速部署步骤

### 步骤1: 克隆项目
```bash
git clone <your-repository-url>
cd Zpu
```

### 步骤2: 环境配置
```bash
# 复制环境变量文件
cp backend/.env.example backend/.env

# 编辑环境变量（必须配置）
nano backend/.env
```

### 步骤3: 安装依赖
```bash
# 后端依赖安装
cd backend
npm install

# 前端依赖安装  
cd ../frontend
npm install
```

### 步骤4: 启动服务
```bash
# 启动MongoDB
sudo systemctl start mongod

# 启动Redis
sudo systemctl start redis

# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd ../frontend
npm start
```

### 步骤5: 验证部署
- 🌐 **前端**: http://localhost:3000
- 🔧 **后端API**: http://localhost:3001/api
- 👨‍💼 **管理端**: http://localhost:3000/admin

## 🐳 Docker部署（推荐）

### 一键启动所有服务
```bash
# 使用Docker Compose启动完整系统
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### Docker服务说明
- **zpu-backend**: Node.js后端服务（端口3001）
- **zpu-frontend**: React前端服务（端口3000）  
- **mongodb**: MongoDB数据库（端口27017）
- **redis**: Redis缓存（端口6379）

## 🔒 生产环境配置

### SSL证书配置
```bash
# 使用Let's Encrypt获取免费SSL证书
sudo apt install certbot
sudo certbot --nginx -d yourdomain.com
```

### Nginx反向代理
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # 前端静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 后端API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Socket.IO WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 数据库安全配置
```javascript
// MongoDB安全设置
use admin
db.createUser({
  user: "zpu_admin",
  pwd: "secure_password_here",
  roles: ["readWrite", "dbAdmin"]
})

// 启用认证
// 在mongod.conf中添加:
security:
  authorization: enabled
```

### Redis安全配置
```bash
# redis.conf安全设置
requirepass your_redis_password_here
bind 127.0.0.1
protected-mode yes
```

## 📊 监控与日志

### PM2进程管理器
```bash
# 安装PM2
npm install -g pm2

# 启动后端服务
pm2 start backend/dist/server.js --name "zpu-backend"

# 启动前端服务  
pm2 serve frontend/build 3000 --spa --name "zpu-frontend"

# 查看服务状态
pm2 status

# 查看日志
pm2 logs
```

### 系统监控
```bash
# 安装监控工具
npm install -g pm2-logrotate

# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🔧 故障排查

### 常见问题解决

#### 1. 数据库连接失败
```bash
# 检查MongoDB状态
sudo systemctl status mongod

# 检查端口占用
netstat -tlnp | grep 27017

# 重启MongoDB
sudo systemctl restart mongod
```

#### 2. Redis连接失败
```bash
# 检查Redis状态
sudo systemctl status redis

# 测试Redis连接
redis-cli ping

# 重启Redis
sudo systemctl restart redis
```

#### 3. 端口冲突
```bash
# 查看端口占用
sudo lsof -i :3000
sudo lsof -i :3001

# 终止进程
sudo kill -9 <PID>
```

#### 4. Socket.IO连接问题
```bash
# 检查防火墙设置
sudo ufw status
sudo ufw allow 3001

# 检查CORS配置
# 确保frontend域名在backend CORS白名单中
```

## 📈 性能优化

### 后端优化
```javascript
// 生产环境配置
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // 启用压缩中间件
  app.use(compression());
  
  // 启用静态文件缓存
  app.use(express.static('public', {
    maxAge: '1d',
    etag: true
  }));
  
  // 数据库连接池优化
  mongoose.connect(mongoUri, {
    maxPoolSize: 100,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000
  });
}
```

### 前端优化
```javascript
// 生产构建优化
npm run build

// 启用服务端渲染（可选）
npm install -g serve
serve -s build -l 3000
```

## 🛡️ 安全加固

### 环境变量安全
```bash
# 生产环境必须设置的敏感变量
JWT_SECRET=<64位随机字符串>
JWT_REFRESH_SECRET=<64位随机字符串>
MONGODB_URI=<带认证的完整连接字符串>
REDIS_URL=<带密码的Redis连接字符串>
ENCRYPTION_KEY=<32位AES加密密钥>
```

### API限流配置
```javascript
// 生产环境限流设置
const isProduction = process.env.NODE_ENV === 'production';

const rateLimitConfig = {
  windowMs: isProduction ? 15 * 60 * 1000 : 60 * 1000, // 生产15分钟，开发1分钟
  max: isProduction ? 100 : 1000, // 生产环境更严格
  message: 'Too many requests, please try again later.'
};
```

### HTTPS强制重定向
```javascript
// Express HTTPS重定向中间件
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

## 📚 部署后验证清单

### ✅ 功能验证
- [ ] 用户注册登录功能正常
- [ ] 6步骤贷款申请流程完整
- [ ] 管理员后台CRUD操作正常
- [ ] Socket.IO实时审批功能正常
- [ ] Excel/PDF报表导出功能正常
- [ ] 合规日志记录功能正常

### ✅ 性能验证
- [ ] 首页加载时间 < 3秒
- [ ] API响应时间 < 500ms
- [ ] Socket连接建立 < 1秒
- [ ] 大量数据导出 < 30秒

### ✅ 安全验证
- [ ] HTTPS证书有效
- [ ] JWT Token正常工作
- [ ] 敏感数据加密存储
- [ ] SQL注入防护有效
- [ ] XSS攻击防护有效

### ✅ 合规验证
- [ ] FCRA合规日志记录
- [ ] TCPA通信授权记录
- [ ] TILA贷款披露完整
- [ ] ECOA平等信贷合规

## 🎯 上线后运营

### 数据备份策略
```bash
# 每日数据库备份
mongodump --db zpu_loan_system --out /backup/daily/$(date +%Y%m%d)

# 每周完整备份
tar -czf /backup/weekly/zpu_backup_$(date +%Y%m%d).tar.gz /app/zpu
```

### 监控告警设置
```javascript
// 业务指标监控
const businessMetrics = {
  dailyApplications: 'SELECT COUNT(*) FROM applications WHERE DATE(created_at) = CURDATE()',
  approvalRate: 'SELECT (approved/total)*100 FROM loan_stats WHERE date = CURDATE()',
  systemErrors: 'SELECT COUNT(*) FROM error_logs WHERE DATE(created_at) = CURDATE()'
};
```

### 定期维护任务
```bash
# 每月清理过期日志
node scripts/cleanup-logs.js

# 每季度性能优化
node scripts/optimize-database.js

# 每年合规审计
node scripts/compliance-audit.js
```

## 🏆 部署成功！

**恭喜！您的ZPU美国合规贷款系统已成功部署！** 🎉

现在您拥有了一个：
- ✅ **完整功能**的贷款管理平台
- ✅ **生产就绪**的企业级系统
- ✅ **严格合规**的美国金融应用
- ✅ **高性能**的实时处理能力
- ✅ **专业级**的管理和报表功能

**开始享受您的专业贷款管理系统吧！** 🚀🇺🇸

---

### 📞 技术支持
如需技术支持，请查看：
- 📖 [完整功能说明](PROJECT_COMPLETE_SUMMARY.md)
- 🚀 [快速启动指南](QUICK_START_GUIDE.md)
- 🔧 [管理端CRUD文档](backend/ADMIN_CRUD_README.md)
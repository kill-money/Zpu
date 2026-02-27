# 🚀 US Market Compliant Loan Application - Backend

## 📋 项目概述 (Project Overview)

这是一个符合美国金融合规要求的贷款申请系统后端，专门为美国市场的个人贷款业务设计。系统实现了FCRA、TCPA、TILA、ECOA等美国金融法规的完整合规性。

This is a US market-compliant loan application backend system specifically designed for personal lending business in the US market. The system implements full compliance with US financial regulations including FCRA, TCPA, TILA, and ECOA.

## 🛡️ 合规特性 (Compliance Features)

### FCRA (Fair Credit Reporting Act) - 公平信用报告法
- ✅ Pre-adverse action notices 预不利行动通知
- ✅ Adverse action notices 不利行动通知  
- ✅ Consumer authorization tracking 消费者授权追踪
- ✅ Credit report access logging 信用报告访问记录

### TCPA (Telephone Consumer Protection Act) - 电话消费者保护法
- ✅ SMS/Call consent management 短信/电话同意管理
- ✅ Opt-out handling 退出处理
- ✅ Communication preference tracking 通信偏好追踪

### TILA (Truth in Lending Act) - 诚实借贷法
- ✅ APR disclosure requirements APR披露要求
- ✅ Payment schedule transparency 还款计划透明度
- ✅ Total cost disclosure 总成本披露

### ECOA (Equal Credit Opportunity Act) - 平等信贷机会法
- ✅ Anti-discrimination compliance 反歧视合规
- ✅ Adverse action reason codes 不利行动原因代码
- ✅ Credit decision logging 信贷决定记录

## 🏗️ 系统架构 (System Architecture)

```
Backend Architecture:
┣━ 📂 src/
┃  ┣━ 📂 models/           # Mongoose数据模型 (6个核心模型)
┃  ┃  ┣━ User.ts          # 用户模型 (SSN加密, 银行信息)
┃  ┃  ┣━ Loan.ts          # 贷款模型 (TILA合规)
┃  ┃  ┣━ Application.ts   # 申请模型 (多步骤表单)
┃  ┃  ┣━ Rate.ts          # 利率模型 (风险定价)
┃  ┃  ┣━ ComplianceLog.ts # 合规日志 (审计追踪)
┃  ┃  ┗━ Payment.ts       # 支付模型 (ACH/NSF处理)
┃  ┣━ 📂 middleware/       # 中间件系统
┃  ┃  ┣━ auth.ts         # JWT认证 + refresh token
┃  ┃  ┣━ rateLimiter.ts  # Redis多层限流
┃  ┃  ┣━ compliance.ts   # 美国合规中间件
┃  ┃  ┗━ errorHandler.ts # 错误处理
┃  ┣━ 📂 routes/          # API路由
┃  ┃  ┣━ auth.ts         # 认证路由
┃  ┃  ┣━ user.ts         # 用户路由
┃  ┃  ┗━ admin.ts        # 管理员路由
┃  ┣━ 📂 sockets/         # Socket.io实时通信
┃  ┃  ┗━ socketHandlers.ts # 实时贷款审批
┃  ┗━ server.ts           # Express服务器
```

## 💾 数据模型 (Data Models)

### User Model - 用户模型
```typescript
- 个人信息 (PII加密存储)
- SSN加密 (AES-256)
- 银行账户信息 (加密)
- 合规同意书 (FCRA/TCPA/Privacy)
- 信用信息追踪
- 登录/安全日志
```

### Loan Model - 贷款模型  
```typescript
- 贷款金额 ($1,000 - $50,000)
- TILA合规字段 (APR, 总成本)
- 决策记录 (批准/拒绝原因)
- 还款计划生成
- 不利行动追踪
```

### Application Model - 申请模型
```typescript
- 多步骤申请流程
- 收入/支出验证
- 信用检查授权
- IP/设备追踪
- 申请状态管理
```

### ComplianceLog Model - 合规日志
```typescript
- 全面审计追踪
- 监管要求跟踪
- 数据访问日志  
- 25年ECOA保留
- 敏感度分级
```

## 🔐 安全特性 (Security Features)

### 认证系统 (Authentication)
- JWT + Refresh Token 双令牌
- HttpOnly Cookie 存储
- 15分钟访问令牌有效期
- 7天刷新令牌有效期
- Redis令牌黑名单

### 数据保护 (Data Protection)
- AES-256 SSN/银行信息加密
- PII数据自动脱敏
- 分级数据分类 (public/internal/confidential/restricted)
- 实时合规日志记录

### 限流系统 (Rate Limiting)
```typescript
- 认证: 5次/15分钟
- 密码重置: 3次/小时  
- 申请: 3次/天
- 信用检查: 1次/天
- 文件上传: 10次/小时
- 管理员: 500次/15分钟
- 可疑活动: 1次/天
```

## 🔄 实时功能 (Real-time Features)

### Socket.IO 事件
```typescript
- loan:statusUpdate      # 贷款状态更新
- loan:approved         # 贷款批准通知
- loan:rejected         # 贷款拒绝通知
- admin:loanQueue       # 管理员队列更新
- notification:*        # 实时通知系统
- compliance:audit      # 合规审计事件
```

## 🚦 API 端点 (API Endpoints)

### 认证路由 `/api/auth`
```
POST /register          # 用户注册 (合规同意)
POST /login            # 用户登录
POST /refresh          # 刷新令牌
POST /logout           # 登出
POST /forgot-password  # 忘记密码
POST /reset-password   # 重置密码
PUT  /change-password  # 更改密码
GET  /verify-email/:token # 邮箱验证
GET  /me              # 获取当前用户
```

### 用户路由 `/api/user` 
```
GET  /profile          # 获取用户资料
PUT  /profile          # 更新用户资料
PUT  /bank-account     # 更新银行账户
GET  /applications     # 获取申请列表
POST /applications     # 创建贷款申请
GET  /applications/:id # 获取特定申请
GET  /loans           # 获取贷款列表
GET  /loans/:id       # 获取特定贷款
POST /loans/:id/accept # 接受贷款条款
POST /credit-check    # 信用检查 (FCRA)
PUT  /notifications   # 更新通知偏好
DELETE /account       # 注销账户
```

### 管理员路由 `/api/admin`
```
GET  /dashboard       # 管理员仪表板
GET  /users          # 用户列表 (分页)
GET  /users/:id      # 用户详情
PUT  /users/:id/status # 更新用户状态
GET  /applications   # 申请审核队列
POST /loans/:id/approve # 批准贷款
POST /loans/:id/reject  # 拒绝贷款
GET  /loans         # 贷款管理
GET  /compliance    # 合规日志
GET  /payments      # 支付报告
GET  /export/loans  # 导出贷款数据 (CSV)
```

## 🔧 环境配置 (Environment Setup)

### 必需环境变量 (Required Environment Variables)
```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/zpu-loan
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置  
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# 服务器配置
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# 加密配置
ENCRYPTION_KEY=your_32_char_encryption_key_here!!

# 邮件配置 (可选)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🚀 启动指南 (Getting Started)

### 1. 安装依赖 (Install Dependencies)
```bash
cd backend
npm install
```

### 2. 环境配置 (Environment Setup) 
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库等信息
```

### 3. 启动服务 (Start Services)
```bash
# 启动MongoDB和Redis (Docker)
docker-compose up -d mongodb redis

# 开发模式启动
npm run dev

# 生产模式启动  
npm run build
npm start
```

### 4. 验证服务 (Verify Services)
```bash
# 健康检查
curl http://localhost:5000/health

# 预期响应
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 🧪 API测试 (API Testing)

### 用户注册示例
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "phone": "5551234567",
    "dateOfBirth": "1990-01-01",
    "ssn": "123456789",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY", 
      "zipCode": "10001"
    },
    "consents": {
      "fcraAuthorization": true,
      "tcpaConsent": true,
      "privacyPolicy": true
    }
  }'
```

### 贷款申请示例
```bash
curl -X POST http://localhost:5000/api/user/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 15000,
    "purpose": "debt_consolidation",
    "employment": {
      "status": "employed",
      "employer": "Tech Company Inc",
      "income": 75000,
      "yearsEmployed": 3
    },
    "preferredTerm": 36
  }'
```

## 🔍 监控和日志 (Monitoring & Logging)

### 合规审计追踪 (Compliance Audit Trail)
- 所有API访问自动记录
- PII数据访问日志
- 信贷决策审计
- 25年数据保留 (ECOA要求)
- 实时异常检测

### 性能监控
- Redis连接池监控
- MongoDB性能追踪
- API响应时间统计
- 限流触发报告
- Socket.io连接统计

## 📊 数据库结构 (Database Schema)

### 索引策略 (Indexing Strategy)
```javascript
// User模型索引
{email: 1}              // 登录查询
{ssn: 1}               // 重复检查 
{phone: 1}             // 通信查询

// Loan模型索引  
{user: 1, status: 1}   // 用户贷款查询
{status: 1, createdAt: -1} // 管理员队列
{applicationDate: -1}   // 时间排序

// ComplianceLog索引
{user: 1, createdAt: -1}     // 用户日志
{complianceType: 1, createdAt: -1} // 类型查询
{createdAt: -1}              // 时间查询
```

## 🔒 合规检查清单 (Compliance Checklist)

### FCRA合规 ✅
- [x] 消费者授权获取
- [x] Pre-adverse action 通知
- [x] Adverse action 通知 
- [x] 信用报告访问记录
- [x] 合规同意书管理

### TCPA合规 ✅  
- [x] SMS/电话同意获取
- [x] 退出机制实现
- [x] 通信偏好尊重
- [x] 同意书数字化存储

### TILA合规 ✅
- [x] APR准确计算
- [x] 总成本透明披露
- [x] 还款计划清晰 
- [x] 费用明细列示

### ECOA合规 ✅
- [x] 反歧视政策
- [x] 不利行动原因代码
- [x] 25年数据保留
- [x] 平等审核流程

## 📈 性能优化 (Performance Optimization)

### 缓存策略 (Caching Strategy)
- Redis会话存储
- 利率计算缓存
- 用户权限缓存
- 限流计数器缓存

### 数据库优化
- 连接池配置 (maxPoolSize: 10)
- 查询索引优化
- 分页查询实现
- 聚合查询优化

## 🛠️ 开发工具 (Development Tools)

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 测试运行
npm run test

# 构建项目  
npm run build

# 数据库迁移
npm run migrate

# 种子数据
npm run seed
```

## 📋 部署准备 (Production Deployment)

### Docker部署
```bash
# 构建镜像
docker build -t zpu-backend .

# 运行容器
docker run -d \
  --name zpu-backend \
  -p 5000:5000 \
  --env-file .env.production \
  zpu-backend
```

### 环境检查
- [ ] 生产环境变量设置
- [ ] SSL证书配置
- [ ] 数据库连接优化
- [ ] Redis集群配置
- [ ] 日志收集设置
- [ ] 监控告警配置

## 🤝 贡献指南 (Contributing)

1. Fork项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`) 
5. 打开Pull Request

## 📄 许可证 (License)

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🆘 技术支持 (Technical Support)

如有问题，请通过以下方式联系：

- 📧 Email: support@zpuloan.com
- 💬 Slack: #zpu-backend-support
- 📋 Issues: GitHub Issues页面

**祝您使用愉快！🎉**
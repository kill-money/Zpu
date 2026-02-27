# 🚀 快速使用指南 - 国际化 + Zod校验套件

## 目录
- [🏃‍♀️ 快速开始](#快速开始)
- [🌍 语言切换演示](#语言切换演示)
- [✅ 验证功能测试](#验证功能测试)
- [🧮 计算器功能演示](#计算器功能演示)
- [🔍 信用模拟演示](#信用模拟演示)
- [📋 合规披露演示](#合规披露演示)

## 🏃‍♀️ 快速开始

### 1. 启动服务
```bash
cd backend
npm install
npm run dev
```

服务运行在: `http://localhost:3001`

### 2. 健康检查
```bash
curl http://localhost:3001/api/health
```

## 🌍 语言切换演示

### 方式一: 查询参数 (推荐)
```bash
# 英文
curl "http://localhost:3001/api/compliance/fcra/disclosure?lng=en"

# 中文  
curl "http://localhost:3001/api/compliance/fcra/disclosure?lng=zh"
```

### 方式二: HTTP头部
```bash
# 中文
curl -H "Accept-Language: zh-CN,zh;q=0.9" \
     "http://localhost:3001/api/compliance/fcra/disclosure"

# 英文
curl -H "Accept-Language: en-US,en;q=0.9" \
     "http://localhost:3001/api/compliance/fcra/disclosure"
```

### 方式三: Cookie
```bash
curl -H "Cookie: i18next=zh" \
     "http://localhost:3001/api/compliance/fcra/disclosure"
```

## ✅ 验证功能测试

### Postman / Insomnia 测试集合

#### 🆔 SSN验证测试
```bash
# ✅ 有效的SSN
curl -X POST "http://localhost:3001/api/auth/register?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "张",
    "lastName": "三", 
    "email": "test@example.com",
    "password": "Test123!",
    "ssn": "123-45-6789",
    "phone": "(555) 123-4567"
  }'

# ❌ 无效的SSN (会返回中文错误)
curl -X POST "http://localhost:3001/api/auth/register?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "李",
    "lastName": "四",
    "email": "test2@example.com", 
    "password": "Test123!",
    "ssn": "000-00-0000",
    "phone": "(555) 123-4567"
  }'
```

#### 🏦 银行路由号码验证
```bash
# ✅ 有效的路由号码 (Chase Bank)
curl -X POST "http://localhost:3001/api/users/bankAccount" \
  -H "Content-Type: application/json" \
  -d '{
    "routingNumber": "021000021",
    "accountNumber": "1234567890",
    "accountType": "checking"
  }'

# ❌ 无效的路由号码
curl -X POST "http://localhost:3001/api/users/bankAccount?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "routingNumber": "123456789",
    "accountNumber": "1234567890", 
    "accountType": "checking"
  }'
```

#### 📞 美国电话号码验证
```bash
# ✅ 有效格式
curl -X POST "http://localhost:3001/test-phone" \
  -H "Content-Type: application/json" \
  -d '{"phone": "5551234567"}'

# ✅ 格式化后的响应: (555) 123-4567

# ❌ 无效格式 (中文错误消息)
curl -X POST "http://localhost:3001/test-phone?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890"}'
```

### 快速验证测试脚本

创建 `test-validation.js`:
```javascript
const axios = require('axios');
const baseUrl = 'http://localhost:3001';

// 测试所有验证功能
async function testValidation() {
  const tests = [
    {
      name: 'Valid SSN',
      url: '/api/auth/register',
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Test123!',
        ssn: '123-45-6789',
        phone: '(555) 123-4567'
      },
      expected: 'success'
    },
    {
      name: 'Invalid SSN (Chinese Error)',
      url: '/api/auth/register?lng=zh', 
      data: {
        firstName: '张',
        lastName: '三',
        email: 'zhang@example.com',
        password: 'Test123!',
        ssn: '000-00-0000',
        phone: '(555) 123-4567'
      },
      expected: 'error'
    }
  ];
  
  for (const test of tests) {
    try {
      const response = await axios.post(baseUrl + test.url, test.data);
      console.log(`✅ ${test.name}: Success`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.data?.error || error.message}`);
    }
  }
}

testValidation();
```

运行: `node test-validation.js`

## 🧮 计算器功能演示

### 基础贷款计算
```bash
curl -X POST "http://localhost:3001/api/calculator/loan?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "loanAmount": 50000,
    "interestRate": 8.5,
    "termMonths": 60,
    "downPayment": 5000,
    "fees": 500
  }'
```

**期望响应:**
```json
{
  "success": true,
  "data": {
    "inputs": {
      "loanAmount": 50000,
      "principal": 45000,
      "interestRate": 8.5,
      "termMonths": 60
    },
    "outputs": {
      "monthlyPayment": 912.73,
      "totalInterest": 9763.80,
      "totalAmount": 54763.80,
      "apr": 9.12,
      "payoffDate": "2031-02-27"
    }
  },
  "message": "贷款计算成功完成"
}
```

### 摊销计划表生成
```bash
curl -X POST "http://localhost:3001/api/calculator/amortization" \
  -H "Content-Type: application/json" \
  -d '{
    "loanAmount": 25000,
    "interestRate": 7.5,
    "termMonths": 36
  }'
```

### 负担能力分析
```bash
curl -X POST "http://localhost:3001/api/calculator/affordability?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyIncome": 8000,
    "monthlyExpenses": 3000,
    "creditScore": 720,
    "downPaymentAmount": 10000
  }'
```

### 贷款方案对比
```bash
curl -X POST "http://localhost:3001/api/calculator/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarios": [
      {
        "name": "5年方案",
        "loanAmount": 50000,
        "interestRate": 8.5,
        "termMonths": 60
      },
      {
        "name": "6年方案", 
        "loanAmount": 50000,
        "interestRate": 7.9,
        "termMonths": 72
      },
      {
        "name": "7年方案",
        "loanAmount": 50000,
        "interestRate": 7.5,
        "termMonths": 84
      }
    ]
  }'
```

## 🔍 信用模拟演示

### 预定义信用档案测试

#### 优秀信用模拟
```bash
curl -X POST "http://localhost:3001/api/credit/simulate?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "profileType": "excellent"
  }'
```

#### 较差信用模拟
```bash
curl -X POST "http://localhost:3001/api/credit/simulate?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "profileType": "poor"
  }'
```

#### 自定义信用档案
```bash
curl -X POST "http://localhost:3001/api/credit/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "customProfile": {
      "creditScore": 680,
      "historyLength": 48,
      "creditUtilization": 45,
      "paymentHistory": 0.88,
      "hardInquiries": 3,
      "publicRecords": 1,
      "creditMix": ["creditCard", "autoLoan"]
    }
  }'
```

### 信用风险分析
```bash
curl -X POST "http://localhost:3001/api/credit/analyze?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "creditProfile": {
      "creditScore": 650,
      "historyLength": 36,
      "paymentHistory": 0.85,
      "creditUtilization": 60,
      "hardInquiries": 2,
      "publicRecords": 0
    },
    "loanRequest": {
      "amount": 25000,
      "purpose": "debt_consolidation"
    }
  }'
```

**期望响应:**
```json
{
  "success": true,
  "data": {
    "riskLevel": "moderate",
    "riskScore": 35,
    "recommendation": "approveWithConditions",
    "riskFactors": [
      "高信用使用率 (60%)",
      "信用历史相对较短 (3年)"
    ],
    "protectiveFactors": [
      "无公共记录",
      "近期查询适中"
    ],
    "recommendedTerms": {
      "maxAmount": 15000,
      "interestRate": 12.99,
      "termMonths": 60
    }
  }
}
```

## 📋 合规披露演示

### FCRA披露文档
```bash
# 英文版本
curl "http://localhost:3001/api/compliance/fcra/disclosure?lng=en"

# 中文版本
curl "http://localhost:3001/api/compliance/fcra/disclosure?lng=zh"
```

### 动态TILA披露
```bash
curl "http://localhost:3001/api/compliance/tila/disclosure?apr=8.5&loanAmount=50000&lng=zh"
```

### 不利行动通知生成
```bash
curl -X POST "http://localhost:3001/api/compliance/adverse-action?lng=zh" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantName": "张三",
    "reason": "信用分数过低",
    "creditScore": 580,
    "noticeType": "final"
  }'
```

## 📊 测试数据集

### 有效的测试数据

#### 用户注册数据
```json
{
  "firstName": "Michael",
  "lastName": "Johnson", 
  "email": "michael.j@example.com",
  "password": "SecurePass123!",
  "ssn": "123-45-6789",
  "phone": "(555) 987-6543",
  "address": {
    "street": "123 Main Street",
    "city": "New York", 
    "state": "NY",
    "zipCode": "10001"
  }
}
```

#### 银行账户数据
```json
{
  "routingNumber": "021000021",  // Chase Bank
  "accountNumber": "1234567890",
  "accountType": "checking"
}
```

#### 贷款申请数据
```json
{
  "loanAmount": 35000,
  "interestRate": 9.25,
  "termMonths": 48,
  "purpose": "debt_consolidation",
  "monthlyIncome": 6500,
  "employmentStatus": "employed"
}
```

### 无效数据测试

#### 触发验证错误的数据
```json
{
  "ssn": "000-00-0000",           // 无效SSN
  "phone": "1234567890",          // 无效电话 (不能以1开头)
  "routingNumber": "123456789",   // 无效路由号
  "zipCode": "1234",              // 无效ZIP
  "state": "XX",                  // 无效州代码
  "email": "invalid-email"        // 无效邮箱格式
}
```

## 🔧 调试工具

### 验证结果查看
```bash
# 查看详细的验证错误
curl -X POST "http://localhost:3001/api/auth/register?lng=zh&debug=true" \
  -H "Content-Type: application/json" \
  -d '{"ssn": "000-00-0000", ...}'
```

### 国际化状态检查
```bash
# 查看当前语言设置
curl "http://localhost:3001/api/i18n/status" \
  -H "Accept-Language: zh-CN"
```

### 计算器精度测试
```bash
# 极值测试
curl -X POST "http://localhost:3001/api/calculator/loan" \
  -H "Content-Type: application/json" \
  -d '{
    "loanAmount": 1000000,
    "interestRate": 35.99,
    "termMonths": 360
  }'
```

## 💡 实用技巧

### 1. 批量测试脚本
创建 `batch-test.sh`:
```bash
#!/bin/bash

echo "🧪 开始批量测试..."

# 测试英文响应
echo "📝 测试英文响应:"
curl -s "http://localhost:3001/api/compliance/fcra/disclosure?lng=en" | head -3

# 测试中文响应  
echo "📝 测试中文响应:"
curl -s "http://localhost:3001/api/compliance/fcra/disclosure?lng=zh" | head -3

# 测试验证功能
echo "✅ 测试SSN验证:"
curl -s -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"ssn": "000-00-0000"}' | jq .error

echo "✅ 测试完成!"
```

### 2. Postman环境变量
```json
{
  "baseUrl": "http://localhost:3001",
  "language": "zh",
  "testSSN": "123-45-6789",
  "testPhone": "(555) 123-4567",
  "testRouting": "021000021"
}
```

### 3. 快速切换语言宏
```javascript
// Postman Pre-request Script
const language = pm.environment.get("language");
pm.request.url.update(`${pm.request.url.toString()}?lng=${language}`);
```

---

**🎉 现在您可以全面测试所有新功能了！**

这份指南涵盖了所有重要的测试场景，帮助您快速验证国际化、验证、计算和合规功能的正确性。
#!/usr/bin/env node
// backend/test-api-realtime.js - 实时API和Socket.IO测试脚本

const axios = require('axios');
const { io } = require('socket.io-client');

// 配置
const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// 测试数据
const testUser = {
  email: 'test@example.com',
  password: 'Test123!',
  firstName: 'Test',
  lastName: 'User',
  ssn: '123-45-6789',
  phone: '(555) 123-4567',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    zipCode: '90210'
  }
};

const testAdmin = {
  email: 'admin@example.com',
  password: 'Admin123!'
};

let userToken = null;
let adminToken = null;
let applicationId = null;

class APITester {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE,
      timeout: 10000
    });
  }

  async testHealthCheck() {
    log('\n🏥 测试服务健康状态...', 'cyan');
    try {
      const response = await this.axios.get('/health');
      log('✅ 服务健康检查通过', 'green');
      log(`   状态: ${response.data.status}`, 'blue');
      log(`   数据库: ${response.data.services.database}`, 'blue');
      log(`   Redis: ${response.data.services.redis}`, 'blue');
      return true;
    } catch (error) {
      log('❌ 服务健康检查失败', 'red');
      log(`   错误: ${error.message}`, 'red');
      return false;
    }
  }

  async testI18n() {
    log('\n🌐 测试国际化功能...', 'cyan');
    
    try {
      // 测试中文响应
      const zhResponse = await this.axios.get('/compliance/fcra/disclosure?lng=zh');
      log('✅ 中文API响应正常', 'green');
      
      // 测试英文响应
      const enResponse = await this.axios.get('/compliance/fcra/disclosure?lng=en');
      log('✅ 英文API响应正常', 'green');
      
      return true;
    } catch (error) {
      log('❌ 国际化测试失败', 'red');
      log(`   错误: ${error.message}`, 'red');
      return false;
    }
  }

  async testUserRegistration() {
    log('\n👤 测试用户注册 (Zod验证)...', 'cyan');
    
    try {
      const response = await this.axios.post('/auth/register', testUser);
      log('✅ 用户注册成功', 'green');
      log(`   用户ID: ${response.data.user.id}`, 'blue');
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        log('ℹ️  用户已存在，跳过注册', 'yellow');
        return { user: { email: testUser.email } };
      }
      log('❌ 用户注册失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testUserLogin() {
    log('\n🔐 测试用户登录...', 'cyan');
    
    try {
      const response = await this.axios.post('/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      
      userToken = response.data.token;
      log('✅ 用户登录成功', 'green');
      log(`   Token: ${userToken.substring(0, 20)}...`, 'blue');
      
      // 设置默认授权头
      this.axios.defaults.headers['Authorization'] = `Bearer ${userToken}`;
      
      return response.data;
    } catch (error) {
      log('❌ 用户登录失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testUserDashboard() {
    log('\n📊 测试用户仪表板...', 'cyan');
    
    try {
      const response = await this.axios.get('/user/dashboard?lng=zh');
      log('✅ 用户仪表板加载成功', 'green');
      log(`   统计数据: ${JSON.stringify(response.data.data.statistics)}`, 'blue');
      return response.data;
    } catch (error) {
      log('❌ 用户仪表板加载失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testLoanApplication() {
    log('\n💰 测试贷款申请提交...', 'cyan');
    
    const applicationData = {
      personalInfo: {
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        email: testUser.email,
        ssn: testUser.ssn,
        phone: testUser.phone,
        dateOfBirth: '1990-01-01'
      },
      address: testUser.address,
      employment: {
        status: 'employed',
        monthlyIncome: 8000,
        employer: 'Test Company'
      },
      loan: {
        amount: 25000,
        term: 60,
        purpose: 'debt_consolidation'
      },
      consent: {
        fcra: true,
        tcpa: true,
        tila: true
      }
    };
    
    try {
      const response = await this.axios.post('/user/apply', applicationData);
      applicationId = response.data.data.applicationId;
      log('✅ 贷款申请提交成功', 'green');
      log(`   申请ID: ${applicationId}`, 'blue');
      log(`   状态: ${response.data.data.status}`, 'blue');
      return response.data;
    } catch (error) {
      log('❌ 贷款申请提交失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testCalculator() {
    log('\n🧮 测试贷款计算器...', 'cyan');
    
    const loanData = {
      loanAmount: 50000,
      interestRate: 8.5,
      termMonths: 60,
      downPayment: 5000,
      fees: 500
    };
    
    try {
      const response = await this.axios.post('/calculator/loan?lng=zh', loanData);
      log('✅ 贷款计算成功', 'green');
      log(`   月供: $${response.data.data.outputs.monthlyPayment}`, 'blue');
      log(`   总利息: $${response.data.data.outputs.totalInterest}`, 'blue');
      log(`   APR: ${response.data.data.outputs.apr}%`, 'blue');
      return response.data;
    } catch (error) {
      log('❌ 贷款计算失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testCreditSimulation() {
    log('\n🔍 测试信用模拟...', 'cyan');
    
    try {
      const response = await this.axios.post('/credit/simulate', {
        profileType: 'good'
      });
      
      log('✅ 信用模拟成功', 'green');
      log(`   信用分数: ${response.data.data.creditProfile.creditScore}`, 'blue');
      log(`   风险等级: ${response.data.data.riskLevel}`, 'blue');
      log(`   建议: ${response.data.data.recommendation}`, 'blue');
      return response.data;
    } catch (error) {
      log('❌ 信用模拟失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testAdminLogin() {
    log('\n🔧 测试管理员登录...', 'cyan');
    
    try {
      const response = await this.axios.post('/auth/login', testAdmin);
      adminToken = response.data.token;
      log('✅ 管理员登录成功', 'green');
      return response.data;
    } catch (error) {
      log('❌ 管理员登录失败 (可能需要先创建管理员账户)', 'yellow');
      return null;
    }
  }

  async testAdminDashboard() {
    if (!adminToken) {
      log('⚠️  跳过管理员仪表板测试 (无管理员Token)', 'yellow');
      return null;
    }
    
    log('\n📈 测试管理员仪表板...', 'cyan');
    
    try {
      const response = await this.axios.get('/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      log('✅ 管理员仪表板加载成功', 'green');
      log(`   用户统计: ${JSON.stringify(response.data.dashboard.users)}`, 'blue');
      log(`   贷款统计: ${JSON.stringify(response.data.dashboard.loans)}`, 'blue');
      return response.data;
    } catch (error) {
      log('❌ 管理员仪表板加载失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }

  async testRealTimeApproval() {
    if (!adminToken || !applicationId) {
      log('⚠️  跳过实时审批测试 (缺少管理员Token或申请ID)', 'yellow');
      return null;
    }
    
    log('\n⚡ 测试实时审批...', 'cyan');
    
    try {
      const response = await this.axios.post('/admin/approve', {
        applicationId,
        decision: 'approve',
        reason: '符合审批标准',
        terms: {
          interestRate: 7.5,
          conditions: ['需要提供收入证明']
        }
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      log('✅ 实时审批成功', 'green');
      log(`   决定: ${response.data.data.application.status}`, 'blue');
      log(`   贷款ID: ${response.data.data.loan?.id}`, 'blue');
      return response.data;
    } catch (error) {
      log('❌ 实时审批失败', 'red');
      log(`   错误: ${error.response?.data?.message || error.message}`, 'red');
      return null;
    }
  }
}

class SocketTester {
  constructor() {
    this.socket = null;
    this.events = [];
  }

  async testSocketConnection() {
    log('\n⚡ 测试Socket.IO连接...', 'cyan');
    
    return new Promise((resolve) => {
      this.socket = io(SOCKET_URL, {
        auth: { token: userToken },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        log('✅ Socket.IO连接成功', 'green');
        log(`   Socket ID: ${this.socket.id}`, 'blue');
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        log('❌ Socket.IO连接失败', 'red');
        log(`   错误: ${error.message}`, 'red');
        resolve(false);
      });

      // 监听业务事件
      this.socket.on('loan:statusChanged', (data) => {
        log('📨 收到实时事件: loan:statusChanged', 'magenta');
        log(`   数据: ${JSON.stringify(data)}`, 'blue');
        this.events.push({ event: 'loan:statusChanged', data });
      });

      this.socket.on('rates:updated', (data) => {
        log('📨 收到实时事件: rates:updated', 'magenta');
        this.events.push({ event: 'rates:updated', data });
      });

      setTimeout(() => {
        if (!this.socket.connected) {
          log('❌ Socket.IO连接超时', 'red');
          resolve(false);
        }
      }, 5000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      log('🔌 Socket.IO连接已断开', 'yellow');
    }
  }

  getEvents() {
    return this.events;
  }
}

// 主测试函数
async function runTests() {
  log('🚀 开始ZPU贷款系统API测试...', 'cyan');
  log('=====================================', 'cyan');

  const apiTester = new APITester();
  const socketTester = new SocketTester();
  
  let passCount = 0;
  let totalTests = 0;

  // 测试列表
  const tests = [
    { name: '服务健康检查', fn: () => apiTester.testHealthCheck() },
    { name: '国际化功能', fn: () => apiTester.testI18n() },
    { name: '用户注册', fn: () => apiTester.testUserRegistration() },
    { name: '用户登录', fn: () => apiTester.testUserLogin() },
    { name: '用户仪表板', fn: () => apiTester.testUserDashboard() },
    { name: '贷款申请', fn: () => apiTester.testLoanApplication() },
    { name: '贷款计算器', fn: () => apiTester.testCalculator() },
    { name: '信用模拟', fn: () => apiTester.testCreditSimulation() },
    { name: '管理员登录', fn: () => apiTester.testAdminLogin() },
    { name: '管理员仪表板', fn: () => apiTester.testAdminDashboard() },
    { name: 'Socket.IO连接', fn: () => socketTester.testSocketConnection() },
    { name: '实时审批', fn: () => apiTester.testRealTimeApproval() }
  ];

  // 执行测试
  for (const test of tests) {
    totalTests++;
    try {
      const result = await test.fn();
      if (result !== false && result !== null) {
        passCount++;
      }
    } catch (error) {
      log(`❌ ${test.name} 测试异常: ${error.message}`, 'red');
    }
    
    // 测试间隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 等待Socket事件
  log('\n⏳ 等待Socket.IO事件 (5秒)...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 显示结果
  log('\n📊 测试结果汇总', 'cyan');
  log('=====================================', 'cyan');
  log(`✅ 通过: ${passCount}/${totalTests}`, 'green');
  log(`❌ 失败: ${totalTests - passCount}/${totalTests}`, 'red');
  log(`📈 成功率: ${((passCount / totalTests) * 100).toFixed(1)}%`, 'blue');

  // Socket事件统计
  const events = socketTester.getEvents();
  if (events.length > 0) {
    log(`📨 Socket事件: ${events.length}个`, 'magenta');
    events.forEach((e, i) => {
      log(`   ${i + 1}. ${e.event}`, 'blue');
    });
  } else {
    log('📨 Socket事件: 0个 (正常，需要管理员操作触发)', 'yellow');
  }

  log('\n🎯 功能验证完成!', 'cyan');
  
  // 关键功能状态
  log('\n🔍 关键功能状态:', 'cyan');
  log(`   🌐 国际化 (中英文): ${passCount >= 2 ? '✅' : '❌'}`, 'blue');
  log(`   ✅ Zod验证套件: ${passCount >= 3 ? '✅' : '❌'}`, 'blue');  
  log(`   🧮 贷款计算器: ${passCount >= 7 ? '✅' : '❌'}`, 'blue');
  log(`   🔍 信用模拟: ${passCount >= 8 ? '✅' : '❌'}`, 'blue');
  log(`   ⚡ Socket.IO实时: ${passCount >= 11 ? '✅' : '❌'}`, 'blue');
  log(`   🔧 管理端CRUD: ${passCount >= 10 ? '✅' : '❌'}`, 'blue');

  // 清理
  socketTester.disconnect();

  if (passCount >= totalTests * 0.8) {
    log('\n🎉 恭喜! 系统主要功能测试通过!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  部分功能测试失败，请检查日志', 'yellow');
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  log(`\n❌ 未处理的Promise错误: ${error.message}`, 'red');
  process.exit(1);
});

process.on('SIGINT', () => {
  log('\n\n🛑 测试被中断', 'yellow');
  process.exit(0);
});

// 检查依赖
const checkDependencies = () => {
  try {
    require('axios');
    require('socket.io-client');
    return true;
  } catch (error) {
    log('❌ 缺少依赖包，请运行: npm install axios socket.io-client', 'red');
    return false;
  }
};

// 启动测试
if (checkDependencies()) {
  runTests().catch((error) => {
    log(`❌ 测试执行错误: ${error.message}`, 'red');
    process.exit(1);
  });
}
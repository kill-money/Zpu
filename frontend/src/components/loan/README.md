# 多步骤贷款申请表单系统

## 概述

这是一个完整的美国市场合规贷款申请H5应用的前端表单系统，实现了多步骤贷款申请流程，包含完整的美国金融格式验证和合规要求。

## 功能特性

### 🔒 美国合规要求
- **FCRA合规**: Fair Credit Reporting Act 信用报告授权
- **TCPA合规**: Telephone Consumer Protection Act 通信授权  
- **TILA合规**: Truth in Lending Act 真实借贷法披露
- **ECOA合规**: Equal Credit Opportunity Act 平等信贷机会法

### 📝 多步骤表单流程
1. **个人信息** - 姓名、邮箱、电话、生日、婚姻状况
2. **地址信息** - 居住地址、居住类型、居住年限
3. **银行信息** - 银行账户、路由号码、账户验证
4. **SSN与就业** - 社会安全号、就业状况、收入信息  
5. **贷款条款** - 贷款类型、金额、期限、合规同意
6. **审查提交** - 信息确认、最终提交

### 🛡️ 安全验证功能
- **SSN验证**: 9位数字格式，区域码验证，无效模式检查
- **银行路由号**: ABA校验和算法验证
- **电话格式**: 美国电话号码格式 (XXX) XXX-XXXX
- **ZIP+4验证**: 美国邮编格式 XXXXX-XXXX
- **防注入攻击**: SQL注入和XSS防护
- **PII加密**: 敏感信息加密存储

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5.x + Ant Design Mobile 5.x
- **表单验证**: Zod (完整的美国格式验证)
- **状态管理**: React Hooks (useState, useCallback, useEffect)
- **实时通信**: Socket.IO (实时审批状态)
- **路由**: React Router v6
- **样式**: CSS3 + 响应式设计

## 文件结构

```
frontend/src/components/loan/
├── MultiStepLoanForm.tsx          # 主表单控制器
├── LoanApplicationPage.tsx        # 完整申请页面
├── LoanApplication.css            # 样式文件
├── index.ts                       # 组件导出
├── steps/                         # 步骤组件
│   ├── PersonalInfoStep.tsx       # 个人信息步骤
│   ├── AddressInfoStep.tsx        # 地址信息步骤
│   ├── BankInfoStep.tsx          # 银行信息步骤
│   ├── EmploymentInfoStep.tsx     # 就业信息步骤
│   ├── LoanTermsStep.tsx         # 贷款条款步骤
│   ├── ReviewSubmitStep.tsx      # 审查提交步骤
│   └── index.ts                  # 步骤组件导出
└── schemas/
    └── loanApplicationSchema.ts   # Zod验证模式
```

## 使用方法

### 基本使用

```tsx
import React from 'react';
import { LoanApplicationPage } from './components/loan';

function App() {
  return <LoanApplicationPage />;
}

export default App;
```

### 单独使用多步骤表单

```tsx
import React from 'react';
import { MultiStepLoanForm } from './components/loan';

function CustomLoanPage() {
  return (
    <div>
      <h1>我的贷款申请</h1>
      <MultiStepLoanForm />
    </div>
  );
}
```

## 核心特性说明

### 1. 表单验证 (Zod Schema)

所有表单数据使用Zod进行严格验证：

```typescript
// 示例：SSN验证
ssn: z.string()
  .min(9, 'SSN必须是9位数字')
  .max(9, 'SSN必须是9位数字')
  .regex(/^\d{9}$/, 'SSN只能包含数字')
  .refine(validateSSNAlgorithm, '无效的SSN格式')
```

### 2. 美国银行路由号验证

实现了完整的ABA路由号校验和算法：

```typescript
const validateRoutingNumber = (routing: string) => {
  const digits = routing.split('').map(Number);
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;
  return checksum === 0;
};
```

### 3. 实时状态更新

使用Socket.IO实现实时申请状态更新：

```typescript
socketInstance.on('application_status_update', (data) => {
  setApplicationStatus(data.status);
  message.success(`申请状态更新: ${getStatusText(data.status)}`);
});
```

### 4. 响应式设计

支持移动端和桌面端：

```css
@media (max-width: 768px) {
  .multi-step-loan-container {
    padding: 16px;
  }
  
  .step-actions {
    flex-direction: column;
  }
}
```

## 数据格式

### 完整申请数据结构

```typescript
interface CompleteLoanApplication {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: Date;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    dependents: number;
  };
  addressInfo: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    housingType: 'own' | 'rent' | 'mortgage' | 'living_with_family';
    yearsAtAddress: number;
  };
  bankInfo: {
    bankName: string;
    accountType: 'checking' | 'savings';
    routingNumber: string;
    accountNumber: string;
    confirmAccountNumber: string;
  };
  employmentInfo: {
    ssn: string;
    confirmSSN: string;
    employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
    employerName?: string;
    jobTitle?: string;
    yearsEmployed?: number;
    annualIncome: number;
    monthlyExpenses: number;
    otherMonthlyIncome?: number;
  };
  loanTerms: {
    loanType: 'personal' | 'auto' | 'home';
    loanAmount: number;
    loanTerm: number;
    fcraConsent: boolean;
    tcpaConsent: boolean;
    tilaAcknowledgment: boolean;
    ecoaAcknowledgment: boolean;
    privacyConsent: boolean;
  };
}
```

## 安全考虑

1. **数据加密**: 敏感信息（如SSN、银行账户）使用客户端掩码显示
2. **输入验证**: 所有用户输入都经过严格的Zod验证
3. **SQL注入防护**: 所有文本输入都进行SQL注入检查
4. **XSS防护**: HTML标签和脚本内容过滤
5. **HTTPS传输**: 生产环境强制使用HTTPS

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- 移动端浏览器支持

## 部署说明

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 生产环境

```bash
# 构建生产版本
npm run build

# 部署到服务器
# 确保配置正确的API_URL和Socket.IO地址
```

### 环境变量

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_SOCKET_URL=https://socket.yourdomain.com
```

## 后端集成

此前端系统设计与之前创建的Node.js + Express + MongoDB后端完全匹配：

- JWT认证集成
- Socket.IO实时通信
- 完整的API端点调用
- 合规日志记录
- 错误处理和重试机制

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请联系开发团队。
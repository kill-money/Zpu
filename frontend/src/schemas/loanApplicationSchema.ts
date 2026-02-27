import { z } from 'zod';

// 美国SSN验证正则
const SSN_REGEX = /^\d{3}-?\d{2}-?\d{4}$/;

// 美国银行路由号验证 (ABA routing number)
const ROUTING_NUMBER_REGEX = /^\d{9}$/;

// 美国银行账号验证 (通常8-17位数字)
const ACCOUNT_NUMBER_REGEX = /^\d{8,17}$/;

// 美国ZIP+4邮编验证
const ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/;

// 美国电话号码验证
const PHONE_REGEX = /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;

// SQL注入防护正则
const SQL_INJECTION_REGEX = /('|(\')|;|--|\/\*|\*\/|xp_|sp_|exec|execute|drop|create|alter|insert|update|delete|union|select|script)/i;

// XSS攻击防护正则
const XSS_REGEX = /<script|javascript:|onload=|onerror=|onclick=/i;

// 通用字符串验证 - 防注入
const createSafeStringSchema = (fieldName: string, minLength = 1, maxLength = 100) =>
  z.string()
    .min(minLength, `${fieldName}至少需要${minLength}个字符`)
    .max(maxLength, `${fieldName}不能超过${maxLength}个字符`)
    .refine(val => !SQL_INJECTION_REGEX.test(val), {
      message: `${fieldName}包含不安全字符`
    })
    .refine(val => !XSS_REGEX.test(val), {
      message: `${fieldName}包含不安全脚本`
    })
    .transform(val => val.trim());

// SSN验证函数
const validateSSN = (ssn: string): boolean => {
  const cleanSSN = ssn.replace(/[-\s]/g, '');
  
  // 基本格式检查
  if (!SSN_REGEX.test(ssn) || cleanSSN.length !== 9) return false;
  
  // 无效SSN模式检查
  const invalidPatterns = [
    '000000000', '111111111', '222222222', '333333333',
    '444444444', '555555555', '666666666', '777777777',
    '888888888', '999999999', '123456789'
  ];
  
  if (invalidPatterns.includes(cleanSSN)) return false;
  
  // 区域码检查 (前3位不能为000, 666, 900-999)
  const areaNumber = parseInt(cleanSSN.substring(0, 3));
  if (areaNumber === 0 || areaNumber === 666 || areaNumber >= 900) return false;
  
  // 组号检查 (中间2位不能为00)
  const groupNumber = parseInt(cleanSSN.substring(3, 5));
  if (groupNumber === 0) return false;
  
  // 序列号检查 (后4位不能为0000)
  const serialNumber = parseInt(cleanSSN.substring(5, 9));
  if (serialNumber === 0) return false;
  
  return true;
};

// 银行路由号验证函数 (含校验和算法)
const validateRoutingNumber = (routingNumber: string): boolean => {
  if (!ROUTING_NUMBER_REGEX.test(routingNumber)) return false;
  
  // ABA路由号校验和算法
  const digits = routingNumber.split('').map(Number);
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;
  
  return checksum === 0;
};

// 美国州代码验证
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'AS', 'GU', 'MP', 'PR', 'VI'
];

// 步骤1: 个人信息验证模式
export const personalInfoSchema = z.object({
  firstName: createSafeStringSchema('名字', 2, 50)
    .refine(val => /^[A-Za-z\s'-]+$/.test(val), {
      message: '名字只能包含字母、空格、撇号和连字符'
    }),
  
  lastName: createSafeStringSchema('姓氏', 2, 50)
    .refine(val => /^[A-Za-z\s'-]+$/.test(val), {
      message: '姓氏只能包含字母、空格、撇号和连字符'
    }),
  
  email: z.string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符')
    .refine(val => !SQL_INJECTION_REGEX.test(val), {
      message: '邮箱包含不安全字符'
    })
    .transform(val => val.toLowerCase().trim()),
  
  phone: z.string()
    .refine(val => PHONE_REGEX.test(val.replace(/[\s\-\(\)\+\.]/g, '')), {
      message: '请输入有效的美国电话号码 (如: 555-123-4567)'
    })
    .transform(val => val.replace(/[\s\-\(\)\+\.]/g, '')),
  
  dateOfBirth: z.string()
    .refine(val => {
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 18 && age <= 120;
    }, {
      message: '您必须年满18岁且小于120岁'
    })
    .refine(val => {
      const date = new Date(val);
      return date < new Date();
    }, {
      message: '出生日期不能是未来日期'
    })
});

// 步骤2: 地址信息验证模式
export const addressInfoSchema = z.object({
  street: createSafeStringSchema('街道地址', 5, 100)
    .refine(val => /^[A-Za-z0-9\s\.\-\#]+$/.test(val), {
      message: '街道地址只能包含字母、数字、空格、点号、连字符和井号'
    }),
  
  apartment: createSafeStringSchema('公寓号', 0, 20)
    .optional()
    .refine(val => !val || /^[A-Za-z0-9\s\-\#]+$/.test(val), {
      message: '公寓号只能包含字母、数字、空格、连字符和井号'
    }),
  
  city: createSafeStringSchema('城市', 2, 50)
    .refine(val => /^[A-Za-z\s\.\-']+$/.test(val), {
      message: '城市名只能包含字母、空格、点号、连字符和撇号'
    }),
  
  state: z.string()
    .length(2, '请选择有效的州')
    .refine(val => US_STATES.includes(val.toUpperCase()), {
      message: '请选择有效的美国州'
    })
    .transform(val => val.toUpperCase()),
  
  zipCode: z.string()
    .refine(val => ZIP_CODE_REGEX.test(val), {
      message: '请输入有效的ZIP邮编 (如: 12345 或 12345-6789)'
    }),
  
  // 居住时长验证
  residenceYears: z.number()
    .min(0, '居住年数不能为负数')
    .max(100, '居住年数不能超过100年'),
  
  residenceMonths: z.number()
    .min(0, '居住月数不能为负数')
    .max(11, '居住月数不能超过11个月'),
  
  // 住房类型
  housingType: z.enum(['own', 'rent', 'mortgage', 'live_with_family'], {
    errorMap: () => ({ message: '请选择居住类型' })
  }),
  
  // 月租金/房贷 (租房或房贷时必填)
  monthlyHousing: z.number()
    .min(0, '月housing费用不能为负数')
    .max(50000, '月housing费用不能超过$50,000')
    .optional()
}).refine(data => {
  // 如果是租房或房贷，monthlyHousing必须填写且大于0
  if ((data.housingType === 'rent' || data.housingType === 'mortgage') && 
      (!data.monthlyHousing || data.monthlyHousing <= 0)) {
    return false;
  }
  return true;
}, {
  message: '租房或房贷时必须填写月度住房费用',
  path: ['monthlyHousing']
});

// 步骤3: 银行信息验证模式
export const bankInfoSchema = z.object({
  bankName: createSafeStringSchema('银行名称', 2, 100)
    .refine(val => /^[A-Za-z0-9\s\.\-&']+$/.test(val), {
      message: '银行名称只能包含字母、数字、空格、点号、连字符、&符号和撇号'
    }),
  
  accountType: z.enum(['checking', 'savings'], {
    errorMap: () => ({ message: '请选择账户类型' })
  }),
  
  routingNumber: z.string()
    .refine(val => validateRoutingNumber(val), {
      message: '请输入有效的9位银行路由号 (ABA routing number)'
    }),
  
  accountNumber: z.string()
    .refine(val => ACCOUNT_NUMBER_REGEX.test(val), {
      message: '银行账号必须是8-17位数字'
    })
    .refine(val => !SQL_INJECTION_REGEX.test(val), {
      message: '银行账号包含不安全字符'
    }),
  
  // 确认账号
  confirmAccountNumber: z.string()
    .refine(val => ACCOUNT_NUMBER_REGEX.test(val), {
      message: '确认账号必须是8-17位数字'
    })
}).refine(data => data.accountNumber === data.confirmAccountNumber, {
  message: '银行账号与确认账号不匹配',
  path: ['confirmAccountNumber']
});

// 步骤4: SSN + 就业信息验证模式
export const employmentInfoSchema = z.object({
  // SSN验证
  ssn: z.string()
    .refine(val => validateSSN(val), {
      message: '请输入有效的9位社会安全号码 (如: 123-45-6789)'
    })
    .transform(val => val.replace(/[-\s]/g, '')),
  
  // 确认SSN
  confirmSSN: z.string()
    .refine(val => validateSSN(val), {
      message: '请确认有效的社会安全号码'
    })
    .transform(val => val.replace(/[-\s]/g, '')),
  
  // 就业状态
  employmentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'student'], {
    errorMap: () => ({ message: '请选择就业状态' })
  }),
  
  // 雇主名称 (就业时必填)
  employerName: createSafeStringSchema('雇主名称', 2, 100)
    .optional()
    .refine(val => !val || /^[A-Za-z0-9\s\.\-&',]+$/.test(val), {
      message: '雇主名称只能包含字母、数字、空格和常用标点符号'
    }),
  
  // 职位名称 (就业时必填)
  jobTitle: createSafeStringSchema('职位名称', 2, 100)
    .optional()
    .refine(val => !val || /^[A-Za-z0-9\s\.\-&',/]+$/.test(val), {
      message: '职位名称只能包含字母、数字、空格和常用标点符号'
    }),
  
  // 年收入
  annualIncome: z.number()
    .min(1000, '年收入不能少于$1,000')
    .max(10000000, '年收入不能超过$10,000,000'),
  
  // 工作年限 (就业时必填)
  yearsEmployed: z.number()
    .min(0, '工作年限不能为负数')
    .max(70, '工作年限不能超过70年')
    .optional(),
  
  // 月支出
  monthlyExpenses: z.number()
    .min(0, '月支出不能为负数')
    .max(100000, '月支出不能超过$100,000'),
  
  // 其他月收入 (可选)
  otherMonthlyIncome: z.number()
    .min(0, '其他月收入不能为负数')
    .max(100000, '其他月收入不能超过$100,000')
    .optional()
    .default(0)
}).refine(data => {
  // 如果是就业状态，必须填写雇主和职位信息
  if (data.employmentStatus === 'employed' || data.employmentStatus === 'self_employed') {
    if (!data.employerName || !data.jobTitle || data.yearsEmployed === undefined) {
      return false;
    }
  }
  return true;
}, {
  message: '就业或自雇时必须填写雇主名称、职位和工作年限',
  path: ['employerName']
});

// 步骤5: 贷款需求和条款验证模式
export const loanTermsSchema = z.object({
  // 贷款金额
  loanAmount: z.number()
    .min(1000, '贷款金额不能少于$1,000')
    .max(50000, '贷款金额不能超过$50,000'),
  
  // 贷款用途
  loanPurpose: z.enum([
    'debt_consolidation',
    'home_improvement', 
    'major_purchase',
    'medical_expenses',
    'vacation',
    'wedding',
    'moving_expenses',
    'other'
  ], {
    errorMap: () => ({ message: '请选择贷款用途' })
  }),
  
  // 首选贷款期限 (月)
  preferredTerm: z.enum([12, 24, 36, 48, 60], {
    errorMap: () => ({ message: '请选择贷款期限' })
  }),
  
  // 合规同意书 (必须全部同意)
  fcraAuthorization: z.boolean()
    .refine(val => val === true, {
      message: '必须同意FCRA信用报告授权'
    }),
  
  tcpaConsent: z.boolean()
    .refine(val => val === true, {
      message: '必须同意TCPA通信授权'
    }),
  
  privacyPolicy: z.boolean()
    .refine(val => val === true, {
      message: '必须同意隐私政策'
    }),
  
  termsAndConditions: z.boolean()
    .refine(val => val === true, {
      message: '必须同意贷款条款和条件'
    }),
  
  electronicSignature: z.boolean()
    .refine(val => val === true, {
      message: '必须同意电子签名授权'
    })
});

// 完整表单验证模式 (用于最终提交)
export const completeLoanApplicationSchema = z.object({
  personalInfo: personalInfoSchema,
  addressInfo: addressInfoSchema, 
  bankInfo: bankInfoSchema,
  employmentInfo: employmentInfoSchema.refine(data => data.ssn === data.confirmSSN, {
    message: 'SSN与确认SSN不匹配',
    path: ['confirmSSN']
  }),
  loanTerms: loanTermsSchema
});

// 类型导出
export type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
export type AddressInfoForm = z.infer<typeof addressInfoSchema>;
export type BankInfoForm = z.infer<typeof bankInfoSchema>;
export type EmploymentInfoForm = z.infer<typeof employmentInfoSchema>;
export type LoanTermsForm = z.infer<typeof loanTermsSchema>;
export type CompleteLoanApplication = z.infer<typeof completeLoanApplicationSchema>;

// 表单步骤枚举
export enum FormStep {
  PERSONAL_INFO = 0,
  ADDRESS_INFO = 1, 
  BANK_INFO = 2,
  EMPLOYMENT_INFO = 3,
  LOAN_TERMS = 4,
  REVIEW_SUBMIT = 5
}

// 步骤配置
export const FORM_STEPS = [
  {
    id: FormStep.PERSONAL_INFO,
    title: '个人信息',
    description: '请填写您的基本个人信息',
    schema: personalInfoSchema
  },
  {
    id: FormStep.ADDRESS_INFO,
    title: '地址信息', 
    description: '请填写您的居住地址信息',
    schema: addressInfoSchema
  },
  {
    id: FormStep.BANK_INFO,
    title: '银行信息',
    description: '请填写您的银行账户信息',
    schema: bankInfoSchema
  },
  {
    id: FormStep.EMPLOYMENT_INFO,
    title: 'SSN与就业信息',
    description: '请填写您的SSN和就业信息',
    schema: employmentInfoSchema
  },
  {
    id: FormStep.LOAN_TERMS,
    title: '贷款条款',
    description: '请选择贷款详情并同意相关条款',
    schema: loanTermsSchema
  },
  {
    id: FormStep.REVIEW_SUBMIT,
    title: '审查提交',
    description: '请审查您的申请信息并提交',
    schema: completeLoanApplicationSchema
  }
];

// 格式化工具函数
export const formatters = {
  // 格式化SSN为 XXX-XX-XXXX
  formatSSN: (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,4})$/);
    
    if (match) {
      let formatted = match[1];
      if (match[2]) formatted += `-${match[2]}`;
      if (match[3]) formatted += `-${match[3]}`;
      return formatted;
    }
    
    return value;
  },
  
  // 格式化电话号码为 (XXX) XXX-XXXX
  formatPhone: (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    
    if (match) {
      let formatted = match[1];
      if (match[2]) formatted += match[1] ? ` (${match[1]}) ${match[2]}` : match[2];
      if (match[3]) formatted += `-${match[3]}`;
      return formatted.replace(/^\s*\(\s*\)\s*/, '');
    }
    
    return value;
  },
  
  // 格式化ZIP码
  formatZipCode: (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,5})(\d{0,4})$/);
    
    if (match) {
      let formatted = match[1];
      if (match[2]) formatted += `-${match[2]}`;
      return formatted;
    }
    
    return value;
  },
  
  // 格式化货币
  formatCurrency: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
};
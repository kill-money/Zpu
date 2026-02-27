import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Row, Col, Select, InputNumber, Space, Typography, Alert, Tooltip, Card } from 'antd';
import { IdcardOutlined, BankOutlined, WorkOutlined, DollarOutlined, EyeInvisibleOutlined, EyeTwoTone, InfoCircleOutlined } from '@ant-design/icons';

// 类型和验证
import {
  EmploymentInfoForm,
  employmentInfoSchema,
  formatters
} from '../../../schemas/loanApplicationSchema';

interface EmploymentInfoStepProps {
  data?: EmploymentInfoForm;
  onDataChange: (data: EmploymentInfoForm) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  loading: boolean;
}

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const EmploymentInfoStep: React.FC<EmploymentInfoStepProps> = ({
  data,
  onDataChange,
  onNext,
  onPrev,
  canGoPrev,
  loading
}) => {
  const [form] = Form.useForm();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [ssnValue, setSsnValue] = useState('');
  const [confirmSsnValue, setConfirmSsnValue] = useState('');
  const [showSSN, setShowSSN] = useState(false);
  const [showConfirmSSN, setShowConfirmSSN] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState<string>('');

  // 初始化表单数据
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ...data,
        ssn: data.ssn ? formatters.formatSSN(data.ssn) : '',
        confirmSSN: data.confirmSSN ? formatters.formatSSN(data.confirmSSN) : ''
      });
      setSsnValue(data.ssn ? formatters.formatSSN(data.ssn) : '');
      setConfirmSsnValue(data.confirmSSN ? formatters.formatSSN(data.confirmSSN) : '');
      setEmploymentStatus(data.employmentStatus || '');
    }
  }, [data, form]);

  // 表单验证和提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 格式化SSN数据（移除连字符）
      const formattedData = {
        ...values,
        ssn: ssnValue.replace(/[-\s]/g, ''),
        confirmSSN: confirmSsnValue.replace(/[-\s]/g, '')
      };

      // 使用Zod验证
      const validatedData = employmentInfoSchema.parse(formattedData);
      
      // 更新父组件数据
      onDataChange(validatedData);
      
      // 清除验证错误
      setValidationErrors([]);
      
      // 进入下一步
      onNext();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const errors = error.errors.map((err: any) => err.message);
        setValidationErrors(errors);
      }
    }
  };

  // SSN格式化处理
  const handleSsnChange = (e: React.ChangeEvent<HTMLInputElement>, isConfirm = false) => {
    const value = e.target.value;
    const formatted = formatters.formatSSN(value);
    
    if (isConfirm) {
      setConfirmSsnValue(formatted);
      form.setFieldValue('confirmSSN', formatted);
    } else {
      setSsnValue(formatted);
      form.setFieldValue('ssn', formatted);
    }
  };

  // 就业状态变化处理
  const handleEmploymentStatusChange = (value: string) => {
    setEmploymentStatus(value);
    
    // 如果不是就业或自雇，清空相关字段
    if (value !== 'employed' && value !== 'self_employed') {
      form.setFieldsValue({
        employerName: undefined,
        jobTitle: undefined,
        yearsEmployed: undefined
      });
    }
  };

  // 验证SSN格式
  const validateSSN = (rule: any, value: string) => {
    if (!value) return Promise.resolve();
    
    const cleanSSN = value.replace(/[-\s]/g, '');
    
    // 检查长度
    if (cleanSSN.length !== 9) {
      return Promise.reject(new Error('SSN必须是9位数字'));
    }
    
    // 检查是否都是数字
    if (!/^\d{9}$/.test(cleanSSN)) {
      return Promise.reject(new Error('SSN只能包含数字'));
    }
    
    // 无效SSN模式检查
    const invalidPatterns = [
      '000000000', '111111111', '222222222', '333333333',
      '444444444', '555555555', '666666666', '777777777',
      '888888888', '999999999', '123456789'
    ];
    
    if (invalidPatterns.includes(cleanSSN)) {
      return Promise.reject(new Error('无效的SSN格式'));
    }
    
    // 区域码检查
    const areaNumber = parseInt(cleanSSN.substring(0, 3));
    if (areaNumber === 0 || areaNumber === 666 || areaNumber >= 900) {
      return Promise.reject(new Error('无效的SSN区域码'));
    }
    
    // 组号检查
    const groupNumber = parseInt(cleanSSN.substring(3, 5));
    if (groupNumber === 0) {
      return Promise.reject(new Error('无效的SSN组号'));
    }
    
    // 序列号检查
    const serialNumber = parseInt(cleanSSN.substring(5, 9));
    if (serialNumber === 0) {
      return Promise.reject(new Error('无效的SSN序列号'));
    }
    
    return Promise.resolve();
  };

  return (
    <div className="employment-info-step">
      <div className="step-header">
        <Title level={3}>
          <IdcardOutlined /> SSN与就业信息
        </Title>
        <Paragraph type="secondary">
          请提供您的社会安全号和就业信息，这些信息用于身份验证和收入评估。
        </Paragraph>
      </div>

      {/* 安全提示 */}
      <Alert
        type="warning"
        message="重要信息保护"
        description="SSN是高度敏感信息，我们采用军用级加密技术保护您的信息安全，且仅用于法律规定的身份验证和信用检查。"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 验证错误提示 */}
      {validationErrors.length > 0 && (
        <Alert
          type="error"
          message="请修正以下错误："
          description={
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        size="large"
        requiredMark={false}
        className="employment-info-form"
      >
        {/* SSN信息卡片 */}
        <Card title={<><IdcardOutlined /> 社会安全号 (SSN)</>} className="info-card" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="ssn"
                label={(
                  <span>
                    SSN (XXX-XX-XXXX)
                    <Tooltip title="美国社会安全号，9位数字，格式: XXX-XX-XXXX">
                      <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                    </Tooltip>
                  </span>
                )}
                rules={[
                  { required: true, message: '请输入您的SSN' },
                  { validator: validateSSN }
                ]}
              >
                <Input.Password
                  placeholder="123-45-6789"
                  value={ssnValue}
                  onChange={(e) => handleSsnChange(e, false)}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  visibilityToggle={{ visible: showSSN, onVisibleChange: setShowSSN }}
                  maxLength={11}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="confirmSSN"
                label="确认SSN (Confirm SSN)"
                dependencies={['ssn']}
                rules={[
                  { required: true, message: '请确认您的SSN' },
                  { validator: validateSSN },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const originalSSN = ssnValue.replace(/[-\s]/g, '');
                      const confirmSSN = (value || '').replace(/[-\s]/g, '');
                      
                      if (!value || originalSSN === confirmSSN) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的SSN不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="再次输入SSN"
                  value={confirmSsnValue}
                  onChange={(e) => handleSsnChange(e, true)}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  visibilityToggle={{ visible: showConfirmSSN, onVisibleChange: setShowConfirmSSN }}
                  maxLength={11}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 就业信息卡片 */}
        <Card title={<><WorkOutlined /> 就业信息</>} className="info-card" style={{ marginBottom: 24 }}>
          {/* 就业状态 */}
          <Form.Item
            name="employmentStatus"
            label="就业状态 (Employment Status)"
            rules={[
              { required: true, message: '请选择您的就业状态' }
            ]}
          >
            <Select
              placeholder="选择就业状态"
              onChange={handleEmploymentStatusChange}
            >
              <Option value="employed">在职员工 (Employed)</Option>
              <Option value="self_employed">自雇人士 (Self-Employed)</Option>
              <Option value="unemployed">未就业 (Unemployed)</Option>
              <Option value="retired">退休 (Retired)</Option>
              <Option value="student">学生 (Student)</Option>
            </Select>
          </Form.Item>

          {/* 就业的详细信息 */}
          {(employmentStatus === 'employed' || employmentStatus === 'self_employed') && (
            <>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="employerName"
                    label={employmentStatus === 'employed' ? '雇主名称 (Employer Name)' : '公司/业务名称 (Company/Business Name)'}
                    rules={[
                      { required: true, message: '请输入雇主或公司名称' },
                      { min: 2, message: '名称至少2个字符' },
                      { max: 100, message: '名称不能超过100个字符' }
                    ]}
                  >
                    <Input
                      placeholder={
                        employmentStatus === 'employed' 
                          ? '如: Microsoft Corporation' 
                          : '如: ABC Consulting LLC'
                      }
                      maxLength={100}
                      showCount
                    />
                  </Form.Item>
                </Col>
                
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="jobTitle"
                    label="职位名称 (Job Title)"
                    rules={[
                      { required: true, message: '请输入您的职位名称' },
                      { min: 2, message: '职位名称至少2个字符' },
                      { max: 100, message: '职位名称不能超过100个字符' }
                    ]}
                  >
                    <Input
                      placeholder="如: Software Engineer"
                      maxLength={100}
                      showCount
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="yearsEmployed"
                label="工作年限 (Years Employed)"
                rules={[
                  { required: true, message: '请输入工作年限' },
                  { type: 'number', min: 0, message: '工作年限不能为负数' },
                  { type: 'number', max: 70, message: '工作年限不能超过70年' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="如: 3.5"
                  min={0}
                  max={70}
                  precision={1}
                  step={0.5}
                  addonAfter="年"
                />
              </Form.Item>
            </>
          )}
        </Card>

        {/* 收入支出信息卡片 */}
        <Card title={<><DollarOutlined /> 收入与支出</>} className="info-card">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="annualIncome"
                label="年收入 (Annual Income)"
                rules={[
                  { required: true, message: '请输入您的年收入' },
                  { type: 'number', min: 1000, message: '年收入不能少于$1,000' },
                  { type: 'number', max: 10000000, message: '年收入不能超过$10,000,000' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="如: 75000"
                  prefix="$"
                  min={1000}
                  max={10000000}
                  precision={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="monthlyExpenses"
                label="月支出 (Monthly Expenses)"
                rules={[
                  { required: true, message: '请输入您的月支出' },
                  { type: 'number', min: 0, message: '月支出不能为负数' },
                  { type: 'number', max: 100000, message: '月支出不能超过$100,000' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="如: 3500"
                  prefix="$"
                  min={0}
                  max={100000}
                  precision={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="otherMonthlyIncome"
            label={(
              <span>
                其他月收入 (Other Monthly Income)
                <Tooltip title="包括奖金、兼职收入、投资收益、赡养费等">
                  <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                </Tooltip>
              </span>
            )}
            rules={[
              { type: 'number', min: 0, message: '其他月收入不能为负数' },
              { type: 'number', max: 100000, message: '其他月收入不能超过$100,000' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="如: 500 (可选)"
              prefix="$"
              min={0}
              max={100000}
              precision={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Card>

        {/* 导航按钮 */}
        <div className="step-actions">
          <Space size="large">
            <Button
              size="large"
              onClick={onPrev}
              disabled={!canGoPrev || loading}
            >
              上一步
            </Button>
            
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={loading}
            >
              下一步：贷款条款
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default EmploymentInfoStep;
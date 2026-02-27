import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Row, Col, DatePicker, Space, Typography, Alert } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// 类型和验证
import {
  PersonalInfoForm,
  personalInfoSchema,
  formatters
} from '../../../schemas/loanApplicationSchema';

// 组件Props接口
interface PersonalInfoStepProps {
  data?: PersonalInfoForm;
  onDataChange: (data: PersonalInfoForm) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  loading: boolean;
}

const { Title, Paragraph } = Typography;

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  data,
  onDataChange,
  onNext,
  canGoNext,
  loading
}) => {
  const [form] = Form.useForm();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [phoneValue, setPhoneValue] = useState('');

  // 初始化表单数据
  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ...data,
        dateOfBirth: data.dateOfBirth ? dayjs(data.dateOfBirth) : null
      });
      setPhoneValue(data.phone || '');
    }
  }, [data, form]);

  // 表单验证和提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 格式化数据
      const formattedData = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : '',
        phone: phoneValue.replace(/\D/g, '') // 只保存数字
      };

      // 使用Zod验证
      const validatedData = personalInfoSchema.parse(formattedData);
      
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

  // 电话号码格式化处理
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatters.formatPhone(value);
    setPhoneValue(formatted);
    
    // 同步更新表单字段
    form.setFieldValue('phone', formatted);
  };

  return (
    <div className="personal-info-step">
      <div className="step-header">
        <Title level={3}>
          <UserOutlined /> 个人基本信息
        </Title>
        <Paragraph type="secondary">
          请如实填写您的个人信息，这些信息将用于身份验证和信用评估。
        </Paragraph>
      </div>

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
        className="personal-info-form"
      >
        {/* 姓名信息 */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="firstName"
              label="名字 (First Name)"
              rules={[
                { required: true, message: '请输入您的名字' },
                { pattern: /^[A-Za-z\s'-]+$/, message: '名字只能包含字母、空格、撇号和连字符' },
                { min: 2, message: '名字至少2个字符' },
                { max: 50, message: '名字不能超过50个字符' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="如: John"
                maxLength={50}
                showCount
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="lastName"
              label="姓氏 (Last Name)"
              rules={[
                { required: true, message: '请输入您的姓氏' },
                { pattern: /^[A-Za-z\s'-]+$/, message: '姓氏只能包含字母、空格、撇号和连字符' },
                { min: 2, message: '姓氏至少2个字符' },
                { max: 50, message: '姓氏不能超过50个字符' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="如: Smith"
                maxLength={50}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 联系信息 */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="电子邮箱 (Email)"
              rules={[
                { required: true, message: '请输入您的邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' },
                { max: 100, message: '邮箱地址不能超过100个字符' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="your.email@example.com"
                maxLength={100}
                type="email"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="手机号码 (US Phone Number)"
              rules={[
                { required: true, message: '请输入您的手机号码' }
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="(555) 123-4567"
                value={phoneValue}
                onChange={handlePhoneChange}
                maxLength={14}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 出生日期 */}
        <Row>
          <Col xs={24} sm={12}>
            <Form.Item
              name="dateOfBirth"
              label="出生日期 (Date of Birth)"
              rules={[
                { required: true, message: '请选择您的出生日期' }
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="选择出生日期"
                suffixIcon={<CalendarOutlined />}
                disabledDate={(current) => {
                  // 禁用未来日期和120岁以前的日期
                  const today = dayjs();
                  const minDate = today.subtract(120, 'year');
                  const maxDate = today.subtract(18, 'year');
                  
                  return current && (current < minDate || current > maxDate);
                }}
                showToday={false}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 提示信息 */}
        <Alert
          type="info"
          message="信息安全提醒"
          description="我们使用银行级加密技术保护您的个人信息，所有数据传输均通过SSL加密。"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 导航按钮 */}
        <div className="step-actions">
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={loading}
              disabled={!form.isFieldsTouched() || form.getFieldsError().some(({ errors }) => errors.length)}
            >
              下一步：地址信息
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default PersonalInfoStep;
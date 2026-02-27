import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Row, Col, Select, Space, Typography, Alert, Tooltip } from 'antd';
import { BankOutlined, SafetyOutlined, EyeInvisibleOutlined, EyeTwoTone, InfoCircleOutlined } from '@ant-design/icons';

// 类型和验证
import {
  BankInfoForm,
  bankInfoSchema
} from '../../../schemas/loanApplicationSchema';

interface BankInfoStepProps {
  data?: BankInfoForm;
  onDataChange: (data: BankInfoForm) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  loading: boolean;
}

const { Title, Paragraph } = Typography;
const { Option } = Select;

// 常见银行列表 (部分美国主要银行)
const COMMON_BANKS = [
  'JPMorgan Chase Bank',
  'Bank of America',
  'Wells Fargo Bank',
  'Citibank',
  'U.S. Bank',
  'PNC Bank',
  'Capital One Bank',
  'TD Bank',
  'Bank of New York Mellon',
  'State Street Bank',
  'HSBC Bank USA',
  'KeyBank',
  'Regions Bank',
  'M&T Bank',
  'Huntington Bank',
  'Discover Bank',
  'American Express Bank',
  'Charles Schwab Bank',
  'Goldman Sachs Bank',
  'Morgan Stanley Bank'
];

const BankInfoStep: React.FC<BankInfoStepProps> = ({
  data,
  onDataChange,
  onNext,
  onPrev,
  canGoPrev,
  loading
}) => {
  const [form] = Form.useForm();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showConfirmAccount, setShowConfirmAccount] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
    }
  }, [data, form]);

  // 表单验证和提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 使用Zod验证
      const validatedData = bankInfoSchema.parse(values);
      
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

  // 验证银行路由号 (ABA routing number)
  const validateRoutingNumber = (rule: any, value: string) => {
    if (!value) return Promise.resolve();
    
    // 检查长度
    if (value.length !== 9) {
      return Promise.reject(new Error('路由号必须是9位数字'));
    }
    
    // 检查是否都是数字
    if (!/^\d{9}$/.test(value)) {
      return Promise.reject(new Error('路由号只能包含数字'));
    }
    
    // ABA路由号校验和算法
    const digits = value.split('').map(Number);
    const checksum = (
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      1 * (digits[2] + digits[5] + digits[8])
    ) % 10;
    
    if (checksum !== 0) {
      return Promise.reject(new Error('无效的ABA银行路由号'));
    }
    
    return Promise.resolve();
  };

  return (
    <div className="bank-info-step">
      <div className="step-header">
        <Title level={3}>
          <BankOutlined /> 银行账户信息
        </Title>
        <Paragraph type="secondary">
          请填写您的银行账户信息，用于贷款资金放款和还款扫除
        </Paragraph>
      </div>

      {/* 安全提示 */}
      <Alert
        type="success"
        message="安全保障"
        description="您的银行信息将使用256位AES加密算法存储，并遵循PCI DSS数据安全标准。"
        icon={<SafetyOutlined />}
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
        className="bank-info-form"
      >
        {/* 银行名称 */}
        <Form.Item
          name="bankName"
          label="银行名称 (Bank Name)"
          rules={[
            { required: true, message: '请输入或选择银行名称' },
            { min: 2, message: '银行名称至少2个字符' },
            { max: 100, message: '银行名称不能超过100个字符' },
            { pattern: /^[A-Za-z0-9\s\.\-&']+$/, message: '银行名称只能包含字母、数字、空格和常用标点符号' }
          ]}
        >
          <Select
            showSearch
            placeholder="选择或输入银行名称"
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
            mode="combobox"
            defaultActiveFirstOption={false}
            showArrow={false}
            notFoundContent={null}
          >
            {COMMON_BANKS.map(bank => (
              <Option key={bank} value={bank}>{bank}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* 账户类型 */}
        <Form.Item
          name="accountType"
          label="账户类型 (Account Type)"
          rules={[
            { required: true, message: '请选择账户类型' }
          ]}
        >
          <Select placeholder="选择账户类型">
            <Option value="checking">
              <div>
                <strong>支票账户 (Checking Account)</strong>
                <br />
                <small style={{ color: '#666' }}>推荐 - 日常交易和转账</small>
              </div>
            </Option>
            <Option value="savings">
              <div>
                <strong>储蓄账户 (Savings Account)</strong>
                <br />
                <small style={{ color: '#666' }}>可用 - 存款账户</small>
              </div>
            </Option>
          </Select>
        </Form.Item>

        {/* 银行路由号 */}
        <Form.Item
          name="routingNumber"
          label={(
            <span>
              银行路由号 (Routing Number) 
              <Tooltip title="9位数字，通常在支票左下角，用于识别您的银行">
                <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
              </Tooltip>
            </span>
          )}
          rules={[
            { required: true, message: '请输入银行路由号' },
            { validator: validateRoutingNumber }
          ]}
        >
          <Input
            placeholder="123456789 (9位数字)"
            maxLength={9}
            showCount
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        {/* 账户号码 */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="accountNumber"
              label={(
                <span>
                  账户号码 (Account Number)
                  <Tooltip title="8-17位数字，通常在支票上或银行对账单上">
                    <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                  </Tooltip>
                </span>
              )}
              rules={[
                { required: true, message: '请输入账户号码' },
                { pattern: /^\d{8,17}$/, message: '账户号必须是8-17位数字' }
              ]}
            >
              <Input.Password
                placeholder="输入账户号码"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                visibilityToggle={{ visible: showAccountNumber, onVisibleChange: setShowAccountNumber }}
                maxLength={17}
                showCount
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="confirmAccountNumber"
              label="确认账户号 (Confirm Account Number)"
              dependencies={['accountNumber']}
              rules={[
                { required: true, message: '请确认账户号码' },
                { pattern: /^\d{8,17}$/, message: '账户号必须是8-17位数字' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('accountNumber') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的账户号不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="再次输入账户号码"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                visibilityToggle={{ visible: showConfirmAccount, onVisibleChange: setShowConfirmAccount }}
                maxLength={17}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 重要声明 */}
        <Alert
          type="warning"
          message="重要声明"
          description={
            <div>
              <p>• 您授权我们使用此账户进行贷款放款和还款扫除</p>
              <p>• 账户必须是您本人名下的有效美国银行账户</p>
              <p>• 我们将进行小额验证存款来确认账户有效性</p>
            </div>
          }
          showIcon
          style={{ marginBottom: 24 }}
        />

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
              下一步：SSN与就业信息
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default BankInfoStep;
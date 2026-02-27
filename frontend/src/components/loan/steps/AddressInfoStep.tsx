import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Row, Col, Select, InputNumber, Space, Typography, Alert, Tooltip } from 'antd';
import { HomeOutlined, EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';

// 类型和验证
import {
  AddressInfoForm,
  addressInfoSchema,
  formatters
} from '../../../schemas/loanApplicationSchema';

// 美国州列表
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
];

interface AddressInfoStepProps {
  data?: AddressInfoForm;
  onDataChange: (data: AddressInfoForm) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  loading: boolean;
}

const { Title, Paragraph } = Typography;
const { Option } = Select;

const AddressInfoStep: React.FC<AddressInfoStepProps> = ({
  data,
  onDataChange,
  onNext,
  onPrev,
  canGoPrev,
  loading
}) => {
  const [form] = Form.useForm();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [zipValue, setZipValue] = useState('');
  const [housingType, setHousingType] = useState<string>('');

  // 初始化表单数据
  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
      setZipValue(data.zipCode || '');
      setHousingType(data.housingType || '');
    }
  }, [data, form]);

  // 表单验证和提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 使用Zod验证
      const validatedData = addressInfoSchema.parse({
        ...values,
        zipCode: zipValue
      });
      
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

  // ZIP码格式化处理
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatters.formatZipCode(value);
    setZipValue(formatted);
    
    // 同步更新表单字段
    form.setFieldValue('zipCode', formatted);
  };

  // 住房类型变化处理
  const handleHousingTypeChange = (value: string) => {
    setHousingType(value);
    
    // 如果不是租房或房贷，清空月度住房费用
    if (value !== 'rent' && value !== 'mortgage') {
      form.setFieldValue('monthlyHousing', undefined);
    }
  };

  return (
    <div className="address-info-step">
      <div className="step-header">
        <Title level={3}>
          <HomeOutlined /> 居住地址信息
        </Title>
        <Paragraph type="secondary">
          请填写您当前的居住地址信息，我们需要验证您的居住状况以评估贷款申请。
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
        className="address-info-form"
      >
        {/* 街道地址 */}
        <Form.Item
          name="street"
          label="街道地址 (Street Address)"
          rules={[
            { required: true, message: '请输入街道地址' },
            { min: 5, message: '街道地址至少5个字符' },
            { max: 100, message: '街道地址不能超过100个字符' },
            { pattern: /^[A-Za-z0-9\s\.\-\#]+$/, message: '地址只能包含字母、数字、空格、点号、连字符和井号' }
          ]}
        >
          <Input
            prefix={<EnvironmentOutlined />}
            placeholder="如: 123 Main Street"
            maxLength={100}
            showCount
          />
        </Form.Item>

        {/* 公寓号/单元号 */}
        <Form.Item
          name="apartment"
          label={(
            <span>
              公寓/单元号 (Apartment/Unit) 
              <Tooltip title="如果您住在公寓、联排别墅或有单元号的住所，请填写">
                <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
              </Tooltip>
            </span>
          )}
        >
          <Input
            placeholder="如: Apt 2B, Unit 101 (可选)"
            maxLength={20}
            showCount
          />
        </Form.Item>

        {/* 城市、州、邮编 */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="city"
              label="城市 (City)"
              rules={[
                { required: true, message: '请输入城市名' },
                { min: 2, message: '城市名至少2个字符' },
                { max: 50, message: '城市名不能超过50个字符' },
                { pattern: /^[A-Za-z\s\.\-']+$/, message: '城市名只能包含字母、空格、点号、连字符和撇号' }
              ]}
            >
              <Input
                placeholder="如: New York"
                maxLength={50}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="state"
              label="州 (State)"
              rules={[
                { required: true, message: '请选择州' }
              ]}
            >
              <Select
                placeholder="选择州"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={US_STATES}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="zipCode"
              label="邮编 (ZIP Code)"
              rules={[
                { required: true, message: '请输入邮编' }
              ]}
            >
              <Input
                placeholder="12345 或 12345-6789"
                value={zipValue}
                onChange={handleZipChange}
                maxLength={10}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 居住情况 */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="housingType"
              label="住房类型 (Housing Type)"
              rules={[
                { required: true, message: '请选择住房类型' }
              ]}
            >
              <Select
                placeholder="选择住房类型"
                onChange={handleHousingTypeChange}
              >
                <Option value="own">自有房产 (Own)</Option>
                <Option value="rent">租房 (Rent)</Option>
                <Option value="mortgage">房贷 (Mortgage)</Option>
                <Option value="live_with_family">与家人同住 (Live with Family)</Option>
              </Select>
            </Form.Item>
          </Col>
          
          {/* 月度住房费用 (租房或房贷时显示) */}
          {(housingType === 'rent' || housingType === 'mortgage') && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="monthlyHousing"
                label={housingType === 'rent' ? '月租金 (Monthly Rent)' : '月房贷 (Monthly Mortgage)'}
                rules={[
                  { required: true, message: `请输入月度${housingType === 'rent' ? '租金' : '房贷'}` },
                  { type: 'number', min: 1, message: '金额必须大于0' },
                  { type: 'number', max: 50000, message: '金额不能超过$50,000' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="如: 1500"
                  prefix="$"
                  min={0}
                  max={50000}
                  precision={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* 居住时长 */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="residenceYears"
              label="在此地址居住年数 (Years at Address)"
              rules={[
                { required: true, message: '请输入居住年数' },
                { type: 'number', min: 0, message: '年数不能为负数' },
                { type: 'number', max: 100, message: '年数不能超过100年' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="如: 2"
                min={0}
                max={100}
                precision={0}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="residenceMonths"
              label="额外月数 (Additional Months)"
              rules={[
                { type: 'number', min: 0, message: '月数不能为负数' },
                { type: 'number', max: 11, message: '月数不能超过11个月' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="如: 6"
                min={0}
                max={11}
                precision={0}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 提示信息 */}
        <Alert
          type="info"
          message="地址验证"
          description="我们可能会通过邮件验证您的地址信息，请确保填写的地址准确无误。"
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
              下一步：银行信息
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default AddressInfoStep;
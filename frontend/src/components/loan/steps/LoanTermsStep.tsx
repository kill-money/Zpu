import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Select, InputNumber, Space, Typography, Alert, Checkbox, Card, Divider, Tag } from 'antd';
import { FileTextOutlined, DollarOutlined, CalendarOutlined, SafetyCertificateOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

// 类型和验证
import {
  LoanTermsForm,
  loanTermsSchema,
  formatters
} from '../../../schemas/loanApplicationSchema';

interface LoanTermsStepProps {
  data?: LoanTermsForm;
  onDataChange: (data: LoanTermsForm) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  loading: boolean;
}

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// 贷款利率和费用（示例数据）
const LOAN_RATES = {
  personal: {
    name: '个人贷款 (Personal Loan)',
    rates: {
      12: { rate: 8.99, monthlyRate: 0.0749 },
      24: { rate: 10.49, monthlyRate: 0.0874 },
      36: { rate: 11.99, monthlyRate: 0.0999 },
      48: { rate: 13.49, monthlyRate: 0.1124 },
      60: { rate: 14.99, monthlyRate: 0.1249 }
    }
  },
  auto: {
    name: '汽车贷款 (Auto Loan)',
    rates: {
      24: { rate: 4.99, monthlyRate: 0.0416 },
      36: { rate: 5.49, monthlyRate: 0.0458 },
      48: { rate: 5.99, monthlyRate: 0.0499 },
      60: { rate: 6.49, monthlyRate: 0.0541 },
      72: { rate: 6.99, monthlyRate: 0.0583 }
    }
  },
  home: {
    name: '房屋净值贷款 (Home Equity Loan)',
    rates: {
      60: { rate: 7.25, monthlyRate: 0.0604 },
      84: { rate: 7.75, monthlyRate: 0.0646 },
      120: { rate: 8.25, monthlyRate: 0.0688 },
      180: { rate: 8.75, monthlyRate: 0.0729 },
      240: { rate: 9.25, monthlyRate: 0.0771 }
    }
  }
};

const LoanTermsStep: React.FC<LoanTermsStepProps> = ({
  data,
  onDataChange,
  onNext,
  onPrev,
  canGoPrev,
  loading
}) => {
  const [form] = Form.useForm();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loanType, setLoanType] = useState<string>('');
  const [loanTerm, setLoanTerm] = useState<number>(0);
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [apr, setApr] = useState<number>(0);

  // 初始化表单数据
  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
      setLoanType(data.loanType || '');
      setLoanTerm(data.loanTerm || 0);
      setLoanAmount(data.loanAmount || 0);
    }
  }, [data, form]);

  // 计算月供和利息
  useEffect(() => {
    if (loanType && loanTerm && loanAmount && loanAmount > 0) {
      const rateInfo = (LOAN_RATES as any)[loanType]?.rates[loanTerm];
      if (rateInfo) {
        const monthlyRate = rateInfo.rate / 100 / 12;
        const numPayments = loanTerm;
        
        // 计算月供（等额本息）
        const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                      (Math.pow(1 + monthlyRate, numPayments) - 1);
        
        const totalPayment = payment * numPayments;
        const interest = totalPayment - loanAmount;
        
        setMonthlyPayment(Math.round(payment * 100) / 100);
        setTotalInterest(Math.round(interest * 100) / 100);
        setApr(rateInfo.rate);
      }
    }
  }, [loanType, loanTerm, loanAmount]);

  // 表单验证和提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 使用Zod验证
      const validatedData = loanTermsSchema.parse(values);
      
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

  // 贷款类型变化处理
  const handleLoanTypeChange = (value: string) => {
    setLoanType(value);
    // 清空贷款期限，让用户重新选择
    form.setFieldValue('loanTerm', undefined);
    setLoanTerm(0);
  };

  // 贷款期限变化处理
  const handleLoanTermChange = (value: number) => {
    setLoanTerm(value);
  };

  // 贷款金额变化处理
  const handleLoanAmountChange = (value: number | null) => {
    setLoanAmount(value || 0);
  };

  // 获取可用的贷款期限选项
  const getAvailableTerms = () => {
    if (!loanType || !(LOAN_RATES as any)[loanType]) return [];
    return Object.keys((LOAN_RATES as any)[loanType].rates).map(Number);
  };

  return (
    <div className="loan-terms-step">
      <div className="step-header">
        <Title level={3}>
          <FileTextOutlined /> 贷款条款与合规同意
        </Title>
        <Paragraph type="secondary">
          请选择您的贷款产品和条款，并仔细阅读相关的法律披露和合规条款。
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
        className="loan-terms-form"
      >
        {/* 贷款产品选择 */}
        <Card title={<><DollarOutlined /> 贷款产品选择</>} className="info-card" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="loanType"
                label="贷款类型 (Loan Type)"
                rules={[
                  { required: true, message: '请选择贷款类型' }
                ]}
              >
                <Select
                  placeholder="选择贷款类型"
                  onChange={handleLoanTypeChange}
                >
                  <Option value="personal">
                    <div>
                      <strong>个人贷款 (Personal Loan)</strong>
                      <br />
                      <small style={{ color: '#666' }}>无抵押，灵活用途</small>
                    </div>
                  </Option>
                  <Option value="auto">
                    <div>
                      <strong>汽车贷款 (Auto Loan)</strong>
                      <br />
                      <small style={{ color: '#666' }}>购买新车或二手车</small>
                    </div>
                  </Option>
                  <Option value="home">
                    <div>
                      <strong>房屋净值贷款 (Home Equity Loan)</strong>
                      <br />
                      <small style={{ color: '#666' }}>以房产为抵押</small>
                    </div>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={12}>
              <Form.Item
                name="loanTerm"
                label="贷款期限 (Loan Term)"
                rules={[
                  { required: true, message: '请选择贷款期限' }
                ]}
              >
                <Select
                  placeholder="选择贷款期限"
                  disabled={!loanType}
                  onChange={handleLoanTermChange}
                >
                  {getAvailableTerms().map(term => {
                    const rate = (LOAN_RATES as any)[loanType]?.rates[term]?.rate;
                    return (
                      <Option key={term} value={term}>
                        <div>
                          <strong>{term} 个月</strong>
                          {rate && <Tag color="blue" style={{ marginLeft: 8 }}>APR {rate}%</Tag>}
                        </div>
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="loanAmount"
            label="贷款金额 (Loan Amount)"
            rules={[
              { required: true, message: '请输入贷款金额' },
              { type: 'number', min: 1000, message: '贷款金额不能少于$1,000' },
              { type: 'number', max: 500000, message: '贷款金额不能超过$500,000' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="如: 50000"
              prefix="$"
              min={1000}
              max={500000}
              precision={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
              onChange={handleLoanAmountChange}
            />
          </Form.Item>
        </Card>

        {/* 贷款详情预览 */}
        {loanType && loanTerm && loanAmount > 0 && (
          <Card title={<><CalendarOutlined /> 贷款详情预览</>} className="info-card" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div className="loan-detail-item">
                  <Text type="secondary">月供</Text>
                  <div className="detail-value">
                    <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                      ${formatters.formatCurrency(monthlyPayment)}
                    </Text>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} sm={8}>
                <div className="loan-detail-item">
                  <Text type="secondary">年化利率 (APR)</Text>
                  <div className="detail-value">
                    <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                      {apr}%
                    </Text>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} sm={8}>
                <div className="loan-detail-item">
                  <Text type="secondary">总利息</Text>
                  <div className="detail-value">
                    <Text strong style={{ fontSize: '20px', color: '#fa8c16' }}>
                      ${formatters.formatCurrency(totalInterest)}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
            
            <Divider />
            
            <Row>
              <Col span={24}>
                <Text type="secondary">总还款额：</Text>
                <Text strong style={{ fontSize: '18px', marginLeft: 8 }}>
                  ${formatters.formatCurrency(loanAmount + totalInterest)}
                </Text>
              </Col>
            </Row>
            
            <Alert
              type="info"
              message="预览信息"
              description="以上为预估信息，最终贷款条款以批准后的正式合同为准。实际利率可能因信用状况而有所差异。"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>
        )}

        {/* 合规同意条款 */}
        <Card 
          title={<><SafetyCertificateOutlined /> 法律披露与合规同意</>} 
          className="info-card"
          style={{ marginBottom: 24 }}
        >
          <Alert
            type="warning"
            message="重要法律声明"
            description="根据美国联邦法律要求，您必须阅读并同意以下条款才能继续申请贷款。"
            icon={<ExclamationCircleOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* FCRA 同意 */}
          <Form.Item
            name="fcraConsent"
            valuePropName="checked"
            rules={[
              { required: true, message: '您必须同意FCRA信用报告授权才能继续' }
            ]}
          >
            <Checkbox>
              <div>
                <strong>FCRA 信用报告授权 (Fair Credit Reporting Act)</strong>
                <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '14px' }}>
                  我授权贷款机构从信用报告机构获取我的信用报告和信用评分，用于评估我的贷款申请。
                  我理解此授权在申请处理期间及贷款期间持续有效。我有权在贷款被拒绝时获得免费的信用报告副本。
                </Paragraph>
              </div>
            </Checkbox>
          </Form.Item>

          {/* TCPA 同意 */}
          <Form.Item
            name="tcpaConsent"
            valuePropName="checked"
            rules={[
              { required: true, message: '您必须同意TCPA通信授权才能继续' }
            ]}
          >
            <Checkbox>
              <div>
                <strong>TCPA 通信授权 (Telephone Consumer Protection Act)</strong>
                <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '14px' }}>
                  我同意贷款机构及其代理人可通过电话、短信或电子邮件就我的贷款申请和账户管理与我联系，
                  包括使用自动拨号系统。我理解收取标准短信费用，我可以随时撤销此同意。
                </Paragraph>
              </div>
            </Checkbox>
          </Form.Item>

          {/* TILA 披露 */}
          <Form.Item
            name="tilaAcknowledgment"
            valuePropName="checked"
            rules={[
              { required: true, message: '您必须确认已阅读TILA披露才能继续' }
            ]}
          >
            <Checkbox>
              <div>
                <strong>TILA 真实借贷法披露 (Truth in Lending Act)</strong>
                <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '14px' }}>
                  我确认已收到并理解贷款的年化利率(APR)、财务费用、付款计划和总还款额。
                  我理解有权在签署贷款协议后的特定期间内撤销某些类型的贷款。
                </Paragraph>
              </div>
            </Checkbox>
          </Form.Item>

          {/* ECOA 通知 */}
          <Form.Item
            name="ecoaAcknowledgment"
            valuePropName="checked"
            rules={[
              { required: true, message: '您必须确认已阅读ECOA通知才能继续' }
            ]}
          >
            <Checkbox>
              <div>
                <strong>ECOA 平等信贷机会法通知 (Equal Credit Opportunity Act)</strong>
                <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '14px' }}>
                  我了解联邦法律禁止债权人因种族、肤色、宗教、国籍、性别、婚姻状况、
                  年龄或依赖公共援助而歧视信贷申请人。如被拒绝，我有权收到拒绝的具体原因。
                </Paragraph>
              </div>
            </Checkbox>
          </Form.Item>

          {/* 隐私政策同意 */}
          <Form.Item
            name="privacyConsent"
            valuePropName="checked"
            rules={[
              { required: true, message: '您必须同意隐私政策才能继续' }
            ]}
          >
            <Checkbox>
              <div>
                <strong>隐私政策同意</strong>
                <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '14px' }}>
                  我已阅读并同意隐私政策，理解我的个人和财务信息如何被收集、使用和保护。
                  我同意与贷款申请和服务相关的必要信息共享。
                </Paragraph>
              </div>
            </Checkbox>
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
              下一步：审查提交
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default LoanTermsStep;
import React, { useState, useEffect } from 'react';
import { Button, Row, Col, Space, Typography, Alert, Card, Descriptions, Tag, Modal, Spin, message } from 'antd';
import { CheckCircleOutlined, EditOutlined, ExclamationCircleOutlined, SendOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';

// 类型定义
import {
  PersonalInfoForm,
  AddressInfoForm,
  BankInfoForm,
  EmploymentInfoForm,
  LoanTermsForm,
  formatters
} from '../../../schemas/loanApplicationSchema';

interface ReviewSubmitStepProps {
  personalInfo?: PersonalInfoForm;
  addressInfo?: AddressInfoForm;
  bankInfo?: BankInfoForm;
  employmentInfo?: EmploymentInfoForm;
  loanTerms?: LoanTermsForm;
  onEdit: (step: number) => void;
  onSubmit: () => void;
  onPrev: () => void;
  canGoPrev: boolean;
  loading: boolean;
}

const { Title, Paragraph, Text } = Typography;

const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({
  personalInfo,
  addressInfo,
  bankInfo,
  employmentInfo,
  loanTerms,
  onEdit,
  onSubmit,
  onPrev,
  canGoPrev,
  loading
}) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string>('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // 初始化 Socket.IO 连接
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        auth: {
          token: token
        }
      });

      // 监听申请状态更新
      socketInstance.on('application_status_update', (data) => {
        setApplicationStatus(data.status);
        message.success(`申请状态更新: ${getStatusText(data.status)}`);
      });

      // 监听实时审批结果
      socketInstance.on('application_decision', (data) => {
        setApplicationStatus(data.status);
        setSubmitLoading(false);
        setShowStatusModal(true);
        
        if (data.status === 'approved') {
          message.success('恭喜！您的贷款申请已批准');
        } else if (data.status === 'rejected') {
          message.error('很抱歉，您的贷款申请被拒绝');
        }
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, []);

  // 提交申请
  const handleSubmit = async () => {
    setSubmitLoading(true);
    
    try {
      const applicationData = {
        personalInfo,
        addressInfo,
        bankInfo,
        employmentInfo,
        loanTerms
      };

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(applicationData)
      });

      if (response.ok) {
        const result = await response.json();
        setApplicationStatus('submitted');
        message.success('申请提交成功！我们正在处理您的申请...');
        
        // 通知父组件
        onSubmit();
      } else {
        const error = await response.json();
        throw new Error(error.message || '提交失败');
      }
    } catch (error) {
      console.error('提交申请失败:', error);
      message.error('提交失败，请检查您的网络连接或稍后重试');
      setSubmitLoading(false);
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      submitted: '已提交',
      under_review: '审查中',
      approved: '已批准',
      rejected: '已拒绝',
      pending_documents: '待补充文件'
    };
    return statusMap[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      submitted: 'blue',
      under_review: 'processing',
      approved: 'success',
      rejected: 'error',
      pending_documents: 'warning'
    };
    return colorMap[status] || 'default';
  };

  // 数据完整性检查
  const isDataComplete = () => {
    return personalInfo && addressInfo && bankInfo && employmentInfo && loanTerms;
  };

  return (
    <div className="review-submit-step">
      <div className="step-header">
        <Title level={3}>
          <CheckCircleOutlined /> 审查与提交申请
        </Title>
        <Paragraph type="secondary">
          请仔细审查您的申请信息。确认无误后，点击提交按钮完成贷款申请。
        </Paragraph>
      </div>

      {/* 数据完整性检查 */}
      {!isDataComplete() && (
        <Alert
          type="error"
          message="申请信息不完整"
          description="请返回前面的步骤完成所有必填信息的填写。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 个人信息 */}
      {personalInfo && (
        <Card 
          title="个人基本信息" 
          extra={
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(0)}
            >
              编辑
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="姓名">
              {personalInfo.firstName} {personalInfo.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {personalInfo.email}
            </Descriptions.Item>
            <Descriptions.Item label="电话">
              {formatters.formatPhoneNumber(personalInfo.phoneNumber)}
            </Descriptions.Item>
            <Descriptions.Item label="出生日期">
              {personalInfo.dateOfBirth.toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="婚姻状况">
              {personalInfo.maritalStatus === 'single' ? '单身' : 
               personalInfo.maritalStatus === 'married' ? '已婚' :
               personalInfo.maritalStatus === 'divorced' ? '离异' : '丧偶'}
            </Descriptions.Item>
            <Descriptions.Item label="受抚养人数">
              {personalInfo.dependents}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 地址信息 */}
      {addressInfo && (
        <Card 
          title="地址信息" 
          extra={
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(1)}
            >
              编辑
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="地址" span={2}>
              {addressInfo.streetAddress}<br />
              {addressInfo.city}, {addressInfo.state} {formatters.formatZipCode(addressInfo.zipCode)}
            </Descriptions.Item>
            <Descriptions.Item label="居住类型">
              {addressInfo.housingType === 'own' ? '自有住房' :
               addressInfo.housingType === 'rent' ? '租房' :
               addressInfo.housingType === 'mortgage' ? '按揭房屋' : '与家人同住'}
            </Descriptions.Item>
            <Descriptions.Item label="居住年限">
              {addressInfo.yearsAtAddress} 年
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 银行信息 */}
      {bankInfo && (
        <Card 
          title="银行账户信息" 
          extra={
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(2)}
            >
              编辑
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="银行名称">
              {bankInfo.bankName}
            </Descriptions.Item>
            <Descriptions.Item label="账户类型">
              {bankInfo.accountType === 'checking' ? '支票账户' : '储蓄账户'}
            </Descriptions.Item>
            <Descriptions.Item label="路由号">
              {bankInfo.routingNumber}
            </Descriptions.Item>
            <Descriptions.Item label="账户号">
              ***{bankInfo.accountNumber.slice(-4)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 就业信息 */}
      {employmentInfo && (
        <Card 
          title="就业与收入信息" 
          extra={
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(3)}
            >
              编辑
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="SSN">
              ***-**-{employmentInfo.ssn.slice(-4)}
            </Descriptions.Item>
            <Descriptions.Item label="就业状况">
              {employmentInfo.employmentStatus === 'employed' ? '在职员工' :
               employmentInfo.employmentStatus === 'self_employed' ? '自雇人士' :
               employmentInfo.employmentStatus === 'unemployed' ? '未就业' :
               employmentInfo.employmentStatus === 'retired' ? '退休' : '学生'}
            </Descriptions.Item>
            {employmentInfo.employerName && (
              <Descriptions.Item label="雇主名称">
                {employmentInfo.employerName}
              </Descriptions.Item>
            )}
            {employmentInfo.jobTitle && (
              <Descriptions.Item label="职位">
                {employmentInfo.jobTitle}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="年收入">
              ${formatters.formatCurrency(employmentInfo.annualIncome)}
            </Descriptions.Item>
            <Descriptions.Item label="月支出">
              ${formatters.formatCurrency(employmentInfo.monthlyExpenses)}
            </Descriptions.Item>
            {employmentInfo.otherMonthlyIncome && employmentInfo.otherMonthlyIncome > 0 && (
              <Descriptions.Item label="其他月收入">
                ${formatters.formatCurrency(employmentInfo.otherMonthlyIncome)}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 贷款条款 */}
      {loanTerms && (
        <Card 
          title="贷款条款" 
          extra={
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(4)}
            >
              编辑
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="贷款类型">
              {loanTerms.loanType === 'personal' ? '个人贷款' :
               loanTerms.loanType === 'auto' ? '汽车贷款' : '房屋净值贷款'}
            </Descriptions.Item>
            <Descriptions.Item label="贷款金额">
              ${formatters.formatCurrency(loanTerms.loanAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="贷款期限">
              {loanTerms.loanTerm} 个月
            </Descriptions.Item>
            <Descriptions.Item label="合规同意">
              <Space>
                <Tag color={loanTerms.fcraConsent ? 'green' : 'red'}>
                  FCRA {loanTerms.fcraConsent ? '已同意' : '未同意'}
                </Tag>
                <Tag color={loanTerms.tcpaConsent ? 'green' : 'red'}>
                  TCPA {loanTerms.tcpaConsent ? '已同意' : '未同意'}
                </Tag>
                <Tag color={loanTerms.tilaAcknowledgment ? 'green' : 'red'}>
                  TILA {loanTerms.tilaAcknowledgment ? '已确认' : '未确认'}
                </Tag>
                <Tag color={loanTerms.ecoaAcknowledgment ? 'green' : 'red'}>
                  ECOA {loanTerms.ecoaAcknowledgment ? '已确认' : '未确认'}
                </Tag>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 提交前最终确认 */}
      <Alert
        type="info"
        message="提交申请"
        description={
          <div>
            <p>• 提交后，我们将立即开始处理您的贷款申请</p>
            <p>• 您将通过邮件和短信收到申请状态更新</p>
            <p>• 通常在24-48小时内完成初步审查</p>
            <p>• 请确保您提供的联系方式准确无误</p>
          </div>
        }
        icon={<SafetyCertificateOutlined />}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 申请状态显示 */}
      {applicationStatus && (
        <Card style={{ marginBottom: 24 }}>
          <div className="application-status">
            <Text>当前申请状态：</Text>
            <Tag color={getStatusColor(applicationStatus)} style={{ marginLeft: 8, fontSize: '14px' }}>
              {getStatusText(applicationStatus)}
            </Tag>
          </div>
        </Card>
      )}

      {/* 导航按钮 */}
      <div className="step-actions">
        <Space size="large">
          <Button
            size="large"
            onClick={onPrev}
            disabled={!canGoPrev || loading || submitLoading}
          >
            上一步
          </Button>
          
          <Button
            type="primary"
            size="large"
            icon={submitLoading ? undefined : <SendOutlined />}
            onClick={handleSubmit}
            loading={submitLoading}
            disabled={!isDataComplete() || loading}
          >
            {submitLoading ? '提交中...' : '提交贷款申请'}
          </Button>
        </Space>
      </div>

      {/* 申请状态弹窗 */}
      <Modal
        title="申请处理结果"
        open={showStatusModal}
        onCancel={() => setShowStatusModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowStatusModal(false)}>
            关闭
          </Button>
        ]}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {applicationStatus === 'approved' && (
            <div>
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#52c41a' }}>恭喜！申请已批准</Title>
              <Paragraph>
                您的贷款申请已获得批准。我们将在1个工作日内与您联系，
                完成最终的文件确认和资金发放流程。
              </Paragraph>
            </div>
          )}
          {applicationStatus === 'rejected' && (
            <div>
              <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#ff4d4f' }}>申请未获批准</Title>
              <Paragraph>
                很抱歉，您的贷款申请未能通过审批。我们将通过邮件发送详细的
                拒绝原因和改进建议。您可以在30天后重新申请。
              </Paragraph>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ReviewSubmitStep;
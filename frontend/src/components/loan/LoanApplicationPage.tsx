import React from 'react';
import { Layout, Typography, Breadcrumb } from 'antd';
import { HomeOutlined, CreditCardOutlined } from '@ant-design/icons';
import MultiStepLoanForm from './MultiStepLoanForm';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const LoanApplicationPage: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '0' }}>
        {/* 面包屑导航 */}
        <div style={{ padding: '16px 24px', background: 'white', marginBottom: 0 }}>
          <Breadcrumb
            items={[
              {
                href: '/',
                title: <><HomeOutlined /><span>首页</span></>,
              },
              {
                href: '/loans',
                title: <><CreditCardOutlined /><span>贷款产品</span></>,
              },
              {
                title: '贷款申请',
              },
            ]}
          />
        </div>

        {/* 页面标题 */}
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 24px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          marginBottom: 0
        }}>
          <Title level={1} style={{ color: 'white', marginBottom: 8 }}>
            在线贷款申请
          </Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', marginBottom: 0 }}>
            快速、安全、便捷的美国合规贷款申请流程
          </Paragraph>
        </div>

        {/* 多步骤表单 */}
        <MultiStepLoanForm />
      </Content>
    </Layout>
  );
};

export default LoanApplicationPage;
import React from 'react';
import { Card, Button, Space, Grid } from 'antd-mobile';
import { 
  AppOutline,
  FileOutline,
  CreditCardOutline,
  BellOutline
} from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Apply for Loan',
      icon: <AppOutline />,
      path: '/apply',
      color: '#1677ff'
    },
    {
      title: 'My Loans',
      icon: <FileOutline />,
      path: '/my-loans',
      color: '#52c41a'
    },
    {
      title: 'Make Payment',
      icon: <CreditCardOutline />,
      path: '/user/payments',
      color: '#722ed1'
    },
    {
      title: 'Notifications',
      icon: <BellOutline />,
      path: '/user/notifications',
      color: '#fa8c16'
    }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome back!</h1>
        <p>Manage your loans and payments</p>
      </div>

      <Card title="Quick Actions" className="quick-actions-card">
        <Grid columns={2} gap={12}>
          {quickActions.map((action, index) => (
            <Grid.Item key={index}>
              <div 
                className="action-card"
                onClick={() => navigate(action.path)}
                style={{ '--primary-color': action.color } as React.CSSProperties}
              >
                <div className="action-icon">
                  {action.icon}
                </div>
                <div className="action-title">{action.title}</div>
              </div>
            </Grid.Item>
          ))}
        </Grid>
      </Card>

      <Card title="Account Overview" className="overview-card">
        <div className="overview-content">
          <p>Dashboard content will be implemented with full API integration</p>
          <Button 
            color="primary" 
            onClick={() => navigate('/user/payments')}
            block
          >
            Go to Payment Center
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
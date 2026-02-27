import React from 'react';
import { Card, Button, List, Tag } from 'antd-mobile';
import { 
  FileOutline,
  EyeOutline,
  PayCircleOutline 
} from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import './MyLoans.css';

const MyLoansPage: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - will be replaced with real API calls
  const mockLoans = [
    {
      id: 'loan_12345678',
      amount: 15000,
      status: 'active',
      nextPayment: '2026-03-15',
      monthlyPayment: 520.50,
      remainingBalance: 12800
    },
    {
      id: 'loan_87654321',
      amount: 25000,
      status: 'completed',
      nextPayment: null,
      monthlyPayment: 0,
      remainingBalance: 0
    }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: '#1677ff',
      completed: '#52c41a',
      pending: '#faad14',
      defaulted: '#ff4d4f'
    };
    return colors[status as keyof typeof colors] || '#8c8c8c';
  };

  return (
    <div className="my-loans-page">
      <div className="my-loans-header">
        <h1>My Loans</h1>
        <p>Manage your loan accounts</p>
      </div>

      <Card title="Active Loans">
        <List>
          {mockLoans.map((loan) => (
            <List.Item
              key={loan.id}
              prefix={<FileOutline />}
              extra={
                <div className="loan-actions">
                  <Button 
                    size="mini" 
                    fill="outline"
                    onClick={() => navigate(`/user/loan-details/${loan.id}`)}
                  >
                    <EyeOutline />
                  </Button>
                  {loan.status === 'active' && (
                    <Button 
                      size="mini" 
                      color="primary"
                      onClick={() => navigate(`/user/payments/${loan.id}`)}
                    >
                      <PayCircleOutline />
                    </Button>
                  )}
                </div>
              }
              description={
                <div className="loan-meta">
                  <div>Amount: ${loan.amount.toLocaleString()}</div>
                  {loan.status === 'active' && (
                    <>
                      <div>Balance: ${loan.remainingBalance.toLocaleString()}</div>
                      <div>Next Payment: {loan.nextPayment}</div>
                    </>
                  )}
                </div>
              }
            >
              <div className="loan-info">
                <div className="loan-id">#{loan.id.slice(-6).toUpperCase()}</div>
                <Tag color={getStatusColor(loan.status)}>
                  {loan.status.toUpperCase()}
                </Tag>
              </div>
            </List.Item>
          ))}
        </List>
      </Card>

      <Card className="quick-actions-card">
        <div className="quick-actions">
          <Button 
            block 
            color="primary" 
            onClick={() => navigate('/apply')}
          >
            Apply for New Loan
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MyLoansPage;
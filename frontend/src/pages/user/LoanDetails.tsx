import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Space, 
  Progress,
  Tag,
  Modal,
  Divider,
  Grid,
  Toast,
  Badge,
  Stepper,
  Image
} from 'antd-mobile';
import {
  FileOutline,
  CalendarOutline,
  DollarCircleOutline,
  DownloadOutline,
  PayCircleOutline,
  InformationCircleOutline,
  ClockCircleOutline,
  CheckCircleOutline,
  DocumentTextOutline,
  BankOutline
} from 'antd-mobile-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { userAPI } from '../../utils/api';
import { useSocket } from '../../utils/socket';
import { useAuthStore } from '../../store/useAuthStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCard from '../../components/user/PaymentCard';
import './LoanDetails.css';

// Zod validation schemas
const loanDetailsSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  term: z.number().positive(),
  status: z.enum(['pending', 'approved', 'active', 'completed', 'defaulted'])
});

interface LoanDetails {
  id: string;
  applicationId: string;
  amount: number;
  interestRate: number;
  term: number;
  monthlyPayment: number;
  remainingBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'defaulted';
  startDate: string;
  maturityDate: string;
  nextPaymentDate: string;
  paymentsMade: number;
  paymentsRemaining: number;
  latePayments: number;
  creditScore: number;
  purpose: string;
}

interface PaymentScheduleItem {
  paymentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
  status: 'paid' | 'due' | 'overdue' | 'upcoming';
  paidDate?: string;
}

interface LoanDocument {
  id: string;
  name: string;
  type: 'agreement' | 'statement' | 'receipt' | 'notice';
  size: number;
  uploadDate: string;
  url: string;
  status: 'approved' | 'pending' | 'rejected';
}

const LoanDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { loanId } = useParams<{ loanId: string }>();
  const { user } = useAuthStore();
  const { on, off, emit } = useSocket();

  // State management
  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [loanDocuments, setLoanDocuments] = useState<LoanDocument[]>([]);
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showRateDetailsModal, setShowRateDetailsModal] = useState(false);

  // Load loan details
  useEffect(() => {
    if (loanId) {
      loadLoanDetails();
    }
  }, [loanId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const handleLoanUpdate = (data: any) => {
      if (data.loanId === loanId) {
        Toast.show({
          icon: 'success',
          content: `Loan status updated: ${data.status}`
        });
        loadLoanDetails();
      }
    };

    on('loan:statusChanged', handleLoanUpdate);
    return () => off('loan:statusChanged', handleLoanUpdate);
  }, [loanId, on, off]);

  const loadLoanDetails = async () => {
    try {
      setLoading(true);
      
      const [detailsRes, scheduleRes, docsRes] = await Promise.all([
        userAPI.getLoanDetails(loanId!),
        userAPI.getPaymentSchedule(loanId!),
        userAPI.getLoanDocuments(loanId!)
      ]);

      if (detailsRes.success) {
        setLoanDetails(detailsRes.data);
      }
      
      if (scheduleRes.success) {
        setPaymentSchedule(scheduleRes.data);
      }
      
      if (docsRes.success) {
        setLoanDocuments(docsRes.data);
      }
    } catch (error) {
      console.error('Failed to load loan details:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to load loan information'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await userAPI.downloadDocument(documentId);
      
      if (response.success) {
        // Create download link
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        
        Toast.show({
          icon: 'success',
          content: 'Document downloaded successfully'
        });
      }
    } catch (error) {
      console.error('Document download failed:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to download document'
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#faad14',
      approved: '#52c41a',
      active: '#1677ff',
      completed: '#52c41a',
      defaulted: '#ff4d4f'
    };
    return colors[status as keyof typeof colors] || '#8c8c8c';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      paid: '#52c41a',
      due: '#faad14', 
      overdue: '#ff4d4f',
      upcoming: '#8c8c8c'
    };
    return colors[status as keyof typeof colors] || '#8c8c8c';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!loanDetails) {
    return (
      <div className="loan-details-error">
        <Card>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <InformationCircleOutline style={{ fontSize: '48px', color: '#ff4d4f' }} />
            <p>Loan not found</p>
            <Button color="primary" onClick={() => navigate('/my-loans')}>
              Back to My Loans
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progressPercent = ((loanDetails.totalPaid / loanDetails.amount) * 100);

  return (
    <div className="loan-details-page">
      {/* Header */}
      <div className="loan-details-header">
        <h1>Loan Details</h1>
        <p>Loan #{loanDetails.id.slice(-8).toUpperCase()}</p>
      </div>

      {/* Card 1: Basic Loan Information */}
      <PaymentCard
        title="Loan Overview"
        icon={<FileOutline />}
        className="loan-overview-card"
      >
        <div className="loan-basic-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Loan Amount</span>
              <span className="value primary">${loanDetails.amount.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <span className="label">Interest Rate</span>
              <span className="value">{loanDetails.interestRate}% APR</span>
            </div>
            <div className="info-item">
              <span className="label">Term</span>
              <span className="value">{loanDetails.term} months</span>
            </div>
            <div className="info-item">
              <span className="label">Monthly Payment</span>
              <span className="value">${loanDetails.monthlyPayment.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="status-section">
            <Tag color={getStatusColor(loanDetails.status)} style={{ marginRight: '8px' }}>
              {loanDetails.status.toUpperCase()}
            </Tag>
            <span className="purpose-text">Purpose: {loanDetails.purpose}</span>
          </div>

          <div className="dates-section">
            <div className="date-item">
              <CalendarOutline />
              <span>Start Date: {new Date(loanDetails.startDate).toLocaleDateString()}</span>
            </div>
            <div className="date-item">
              <CalendarOutline />
              <span>Maturity: {new Date(loanDetails.maturityDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </PaymentCard>

      {/* Card 2: Balance Details */}
      <PaymentCard
        title="Balance Information"
        icon={<DollarCircleOutline />}
        action={
          <Button size="small" fill="none" onClick={() => navigate(`/user/payments/${loanId}`)}>
            Make Payment
          </Button>
        }
      >
        <div className="balance-details">
          <div className="balance-progress">
            <div className="progress-info">
              <span>Loan Progress</span>
              <span>{progressPercent.toFixed(1)}% Paid</span>
            </div>
            <Progress percent={progressPercent} />
          </div>

          <div className="balance-grid">
            <div className="balance-item">
              <span className="label">Remaining Balance</span>
              <span className="value primary">${loanDetails.remainingBalance.toLocaleString()}</span>
            </div>
            <div className="balance-item">
              <span className="label">Principal Paid</span>
              <span className="value">${loanDetails.principalPaid.toLocaleString()}</span>
            </div>
            <div className="balance-item">
              <span className="label">Interest Paid</span>
              <span className="value">${loanDetails.interestPaid.toLocaleString()}</span>
            </div>
            <div className="balance-item">
              <span className="label">Total Paid</span>
              <span className="value success">${loanDetails.totalPaid.toLocaleString()}</span>
            </div>
          </div>

          <div className="next-payment">
            <div className="next-payment-info">
              <ClockCircleOutline />
              <div>
                <div className="next-date">Next Payment Due</div>
                <div className="due-date">{new Date(loanDetails.nextPaymentDate).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </PaymentCard>

      {/* Card 3: Payment Schedule Preview */}
      <PaymentCard
        title="Payment Schedule"
        icon={<CalendarOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowScheduleModal(true)}>
            View All
          </Button>
        }
      >
        <div className="schedule-preview">
          <div className="schedule-stats">
            <div className="stat-item">
              <span className="stat-value">{loanDetails.paymentsMade}</span>
              <span className="stat-label">Payments Made</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{loanDetails.paymentsRemaining}</span>
              <span className="stat-label">Remaining</span>
            </div>
            <div className="stat-item">
              <span className="stat-value error">{loanDetails.latePayments}</span>
              <span className="stat-label">Late Payments</span>
            </div>
          </div>

          <List>
            {paymentSchedule.slice(0, 3).map((payment) => (
              <List.Item
                key={payment.paymentNumber}
                prefix={
                  <Badge 
                    content={payment.paymentNumber} 
                    style={{ 
                      '--right': '-2px',
                      '--top': '-2px',
                      backgroundColor: getPaymentStatusColor(payment.status)
                    }}
                  >
                    <div className={`payment-status-icon ${payment.status}`}>
                      {payment.status === 'paid' ? <CheckCircleOutline /> : <ClockCircleOutline />}
                    </div>
                  </Badge>
                }
                description={`Principal: $${payment.principalAmount.toLocaleString()} | Interest: $${payment.interestAmount.toLocaleString()}`}
              >
                <div className="payment-schedule-item">
                  <div className="payment-amount">${payment.totalAmount.toLocaleString()}</div>
                  <div className="payment-date">{new Date(payment.dueDate).toLocaleDateString()}</div>
                </div>
              </List.Item>
            ))}
          </List>
        </div>
      </PaymentCard>

      {/* Card 4: Interest Rate Information */}
      <PaymentCard
        title="Rate Information"
        icon={<BankOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowRateDetailsModal(true)}>
            Details
          </Button>
        }
      >
        <div className="rate-information">
          <div className="rate-display">
            <div className="main-rate">
              <span className="rate-value">{loanDetails.interestRate}%</span>
              <span className="rate-label">Annual Percentage Rate (APR)</span>
            </div>
          </div>

          <div className="rate-details">
            <div className="rate-item">
              <span className="label">Credit Score Used</span>
              <span className="value">{loanDetails.creditScore}</span>
            </div>
            <div className="rate-item">
              <span className="label">Rate Type</span>
              <span className="value">Fixed Rate</span>
            </div>
          </div>

          <div className="rate-impact">
            <p className="impact-text">
              Your excellent payment history has maintained your favorable rate. 
              Continue making on-time payments to preserve your credit standing.
            </p>
          </div>
        </div>
      </PaymentCard>

      {/* Card 5: Loan Documents */}
      <PaymentCard
        title="Loan Documents"
        icon={<DocumentTextOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowDocumentModal(true)}>
            Manage
          </Button>
        }
      >
        <div className="loan-documents">
          <List>
            {loanDocuments.slice(0, 4).map((doc) => (
              <List.Item
                key={doc.id}
                prefix={<DocumentTextOutline />}
                extra={
                  <Button 
                    size="mini" 
                    fill="none"
                    onClick={() => downloadDocument(doc.id, doc.name)}
                  >
                    <DownloadOutline />
                  </Button>
                }
                description={`${(doc.size / 1024).toFixed(0)}KB • ${new Date(doc.uploadDate).toLocaleDateString()}`}
              >
                <div className="document-item">
                  <div className="document-name">{doc.name}</div>
                  <Tag 
                    color={doc.status === 'approved' ? 'success' : doc.status === 'pending' ? 'warning' : 'danger'}
                    style={{ fontSize: '10px' }}
                  >
                    {doc.status}
                  </Tag>
                </div>
              </List.Item>
            ))}
          </List>

          {loanDocuments.length === 0 && (
            <div className="empty-documents">
              <DocumentTextOutline />
              <p>No documents available</p>
            </div>
          )}
        </div>
      </PaymentCard>

      {/* Card 6: Action Buttons */}
      <PaymentCard className="action-buttons-card">
        <div className="action-buttons">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              block 
              color="primary" 
              size="large"
              onClick={() => navigate(`/user/payments/${loanId}`)}
            >
              <PayCircleOutline />
              Make Payment
            </Button>
            
            <Grid columns={2} gap={12}>
              <Grid.Item>
                <Button 
                  block 
                  fill="outline"
                  onClick={() => setShowScheduleModal(true)}
                >
                  Payment Schedule
                </Button>
              </Grid.Item>
              <Grid.Item>
                <Button 
                  block 
                  fill="outline"
                  onClick={() => navigate('/user/support')}
                >
                  Get Help
                </Button>
              </Grid.Item>
            </Grid>
          </Space>
        </div>
      </PaymentCard>

      {/* Modals */}
      
      {/* Full Payment Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        title="Complete Payment Schedule"
        closeOnMaskClick
        onClose={() => setShowScheduleModal(false)}
        content={
          <div className="full-schedule">
            <List>
              {paymentSchedule.map((payment) => (
                <List.Item
                  key={payment.paymentNumber}
                  prefix={
                    <Badge content={payment.paymentNumber}>
                      <div className={`payment-status-icon ${payment.status}`}>
                        {payment.status === 'paid' ? <CheckCircleOutline /> : <ClockCircleOutline />}
                      </div>
                    </Badge>
                  }
                  description={
                    <div>
                      <div>Principal: ${payment.principalAmount.toLocaleString()}</div>
                      <div>Interest: ${payment.interestAmount.toLocaleString()}</div>
                      <div>Balance: ${payment.remainingBalance.toLocaleString()}</div>
                      {payment.paidDate && <div>Paid: {new Date(payment.paidDate).toLocaleDateString()}</div>}
                    </div>
                  }
                >
                  <div>
                    <div className="payment-total">${payment.totalAmount.toLocaleString()}</div>
                    <div className="payment-due">Due: {new Date(payment.dueDate).toLocaleDateString()}</div>
                  </div>
                </List.Item>
              ))}
            </List>
          </div>
        }
      />

      {/* Documents Modal */}
      <Modal
        visible={showDocumentModal}
        title="All Loan Documents"
        closeOnMaskClick
        onClose={() => setShowDocumentModal(false)}
        content={
          <div className="all-documents">
            <List>
              {loanDocuments.map((doc) => (
                <List.Item
                  key={doc.id}
                  prefix={<DocumentTextOutline />}
                  extra={
                    <Button 
                      size="mini" 
                      fill="none"
                      onClick={() => downloadDocument(doc.id, doc.name)}
                    >
                      Download
                    </Button>
                  }
                  description={`${doc.type} • ${(doc.size / 1024).toFixed(0)}KB • ${new Date(doc.uploadDate).toLocaleDateString()}`}
                >
                  <div className="document-item">
                    <div>{doc.name}</div>
                    <Tag color={doc.status === 'approved' ? 'success' : doc.status === 'pending' ? 'warning' : 'danger'}>
                      {doc.status}
                    </Tag>
                  </div>
                </List.Item>
              ))}
            </List>
          </div>
        }
      />

      {/* Rate Details Modal */}
      <Modal
        visible={showRateDetailsModal}
        title="Interest Rate Details"
        closeOnMaskClick
        onClose={() => setShowRateDetailsModal(false)}
        content={
          <div className="rate-breakdown">
            <div className="rate-section">
              <h4>Current Rate: {loanDetails.interestRate}% APR</h4>
              <p>This is a fixed rate that will not change during the life of your loan.</p>
            </div>
            
            <Divider />
            
            <div className="rate-factors">
              <h4>Rate Factors</h4>
              <div className="factor-item">
                <span>Credit Score at Application:</span>
                <span>{loanDetails.creditScore}</span>
              </div>
              <div className="factor-item">
                <span>Loan Purpose:</span>
                <span>{loanDetails.purpose}</span>
              </div>
              <div className="factor-item">
                <span>Loan Term:</span>
                <span>{loanDetails.term} months</span>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default LoanDetailsPage;
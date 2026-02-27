import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  List, 
  Space, 
  DatePicker, 
  Radio, 
  Switch,
  Toast,
  Modal,
  Divider,
  Badge,
  Grid,
  Stepper,
  Form,
  Selector
} from 'antd-mobile';
import {
  BankOutline,
  CalendarOutline,
  ClockCircleOutline,
  DollarCircleOutline,
  PayCircleOutline,
  CheckCircleOutline,
  ExclamationCircleOutline,
  HistoryOutline,
  CreditCardOutline,
  SetOutline
} from 'antd-mobile-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { userAPI } from '../../utils/api';
import { useSocket } from '../../utils/socket';
import { useAuthStore } from '../../store/useAuthStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCard from '../../components/user/PaymentCard';
import './Payments.css';

// Zod validation schemas
const paymentAmountSchema = z.object({
  amount: z.number()
    .min(0.01, 'Amount must be greater than $0.01')
    .max(1000000, 'Amount cannot exceed $1,000,000'),
  paymentMethod: z.enum(['auto_debit', 'bank_transfer', 'debit_card']),
  scheduledDate: z.date().optional()
});

interface PaymentSummary {
  totalBalance: number;
  monthlyPayment: number;
  nextDueDate: string;
  pastDue: number;
  interestRate: number;
  principalBalance: number;
  totalPaid: number;
}

interface PaymentMethod {
  id: string;
  type: 'bank' | 'card';
  name: string;
  last4: string;
  isDefault: boolean;
  verified: boolean;
}

interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  method: string;
  confirmationNumber: string;
}

interface AutoPaySettings {
  enabled: boolean;
  amount: 'minimum' | 'full' | 'custom';
  customAmount?: number;
  dayOfMonth: number;
  methodId: string;
}

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { loanId } = useParams<{ loanId?: string }>();
  const { user } = useAuthStore();
  const { on, off, emit } = useSocket();

  // State management
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [autoPaySettings, setAutoPaySettings] = useState<AutoPaySettings | null>(null);
  
  // Form states
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [paymentType, setPaymentType] = useState<'one_time' | 'scheduled'>('one_time');
  
  // Modal states
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showhistoryModal, setShowHistoryModal] = useState(false);

  // Load payment data
  useEffect(() => {
    loadPaymentData();
  }, [loanId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const handlePaymentProcessed = (data: any) => {
      if (data.loanId === loanId || !loanId) {
        Toast.show({
          icon: 'success',
          content: `Payment of $${data.amount} processed successfully!`
        });
        loadPaymentData();
      }
    };

    const handlePaymentFailed = (data: any) => {
      Toast.show({
        icon: 'fail',
        content: `Payment failed: ${data.reason}`
      });
    };

    on('payment:processed', handlePaymentProcessed);
    on('payment:failed', handlePaymentFailed);

    return () => {
      off('payment:processed', handlePaymentProcessed);
      off('payment:failed', handlePaymentFailed);
    };
  }, [loanId, on, off]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, methodsRes, historyRes, autoPayRes] = await Promise.all([
        userAPI.getPaymentSummary(loanId),
        userAPI.getPaymentMethods(),
        userAPI.getPaymentHistory(loanId),
        userAPI.getAutoPaySettings(loanId)
      ]);

      if (summaryRes.success) {
        setPaymentSummary(summaryRes.data);
        setSelectedAmount(summaryRes.data.monthlyPayment);
      }
      
      if (methodsRes.success) {
        setPaymentMethods(methodsRes.data);
        const defaultMethod = methodsRes.data.find((m: PaymentMethod) => m.isDefault);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod.id);
        }
      }
      
      if (historyRes.success) {
        setPaymentHistory(historyRes.data);
      }
      
      if (autoPayRes.success) {
        setAutoPaySettings(autoPayRes.data);
      }
    } catch (error) {
      console.error('Failed to load payment data:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to load payment information'
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePayment = () => {
    try {
      paymentAmountSchema.parse({
        amount: selectedAmount,
        paymentMethod: selectedMethod,
        scheduledDate: paymentType === 'scheduled' ? selectedDate : undefined
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        Toast.show({
          icon: 'fail',
          content: error.errors[0]?.message || 'Invalid payment information'
        });
      }
      return false;
    }
  };

  const submitPayment = async () => {
    if (!validatePayment()) return;

    try {
      setSubmitting(true);
      
      const paymentData = {
        loanId,
        amount: selectedAmount,
        paymentMethodId: selectedMethod,
        type: paymentType,
        scheduledDate: paymentType === 'scheduled' ? selectedDate.toISOString() : undefined
      };

      const response = await userAPI.submitPayment(paymentData);
      
      if (response.success) {
        Toast.show({
          icon: 'success',
          content: paymentType === 'one_time' 
            ? 'Payment submitted successfully!'
            : 'Payment scheduled successfully!'
        });
        
        setShowConfirmModal(false);
        loadPaymentData();
        
        // Emit socket event for real-time updates
        emit('payment:submitted', {
          loanId,
          amount: selectedAmount,
          type: paymentType
        });
      }
    } catch (error) {
      console.error('Payment submission failed:', error);
      Toast.show({
        icon: 'fail',
        content: 'Payment submission failed. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateAutoPay = async (settings: Partial<AutoPaySettings>) => {
    try {
      const response = await userAPI.updateAutoPaySettings(loanId, {
        ...autoPaySettings,
        ...settings
      });
      
      if (response.success) {
        setAutoPaySettings(response.data);
        Toast.show({
          icon: 'success',
          content: 'AutoPay settings updated successfully!'
        });
      }
    } catch (error) {
      console.error('Failed to update AutoPay:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to update AutoPay settings'
      });
    }
  };

  // Quick amount options
  const quickAmounts = useMemo(() => {
    if (!paymentSummary) return [];
    
    return [
      { label: 'Minimum', value: paymentSummary.monthlyPayment, icon: <DollarCircleOutline /> },
      { label: 'Full Balance', value: paymentSummary.totalBalance, icon: <PayCircleOutline /> },
      { label: 'Principal Only', value: paymentSummary.principalBalance, icon: <BankOutline /> }
    ];
  }, [paymentSummary]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!paymentSummary) {
    return (
      <div className="payment-error">
        <Card>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <ExclamationCircleOutline style={{ fontSize: '48px', color: '#ff4d4f' }} />
            <p>Unable to load payment information</p>
            <Button color="primary" onClick={() => navigate('/my-loans')}>
              Back to My Loans
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="payments-page">
      {/* Header */}
      <div className="payments-header">
        <h1>Payment Center</h1>
        {loanId && (
          <p className="loan-info">Loan #{loanId.slice(-6)}</p>
        )}
      </div>

      {/* Card 1: Payment Summary Overview */}
      <PaymentCard
        title="Account Summary"
        icon={<DollarCircleOutline />}
        className="summary-card"
      >
        <div className="summary-grid">
          <div className="summary-item">
            <div className="label">Current Balance</div>
            <div className="value primary">${paymentSummary.totalBalance.toLocaleString()}</div>
          </div>
          <div className="summary-item">
            <div className="label">Monthly Payment</div>
            <div className="value">${paymentSummary.monthlyPayment.toLocaleString()}</div>
          </div>
          <div className="summary-item">
            <div className="label">Next Due Date</div>
            <div className="value">{new Date(paymentSummary.nextDueDate).toLocaleDateString()}</div>
          </div>
          {paymentSummary.pastDue > 0 && (
            <div className="summary-item past-due">
              <div className="label">Past Due</div>
              <div className="value error">${paymentSummary.pastDue.toLocaleString()}</div>
            </div>
          )}
        </div>
        
        {paymentSummary.pastDue > 0 && (
          <div className="alert-banner">
            <ExclamationCircleOutline />
            <span>You have a past due amount of ${paymentSummary.pastDue.toLocaleString()}</span>
          </div>
        )}
      </PaymentCard>

      {/* Card 2: Quick Payment Amount Selection */}
      <PaymentCard
        title="Select Payment Amount"
        icon={<PayCircleOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowAmountModal(true)}>
            Custom
          </Button>
        }
      >
        <Grid columns={3} gap={8}>
          {quickAmounts.map((option) => (
            <Grid.Item key={option.label}>
              <div 
                className={`amount-option ${selectedAmount === option.value ? 'selected' : ''}`}
                onClick={() => setSelectedAmount(option.value)}
              >
                {option.icon}
                <div className="amount-label">{option.label}</div>
                <div className="amount-value">${option.value.toLocaleString()}</div>
              </div>
            </Grid.Item>
          ))}
        </Grid>
        
        <div className="selected-amount">
          <strong>Selected: ${selectedAmount.toLocaleString()}</strong>
        </div>
      </PaymentCard>

      {/* Card 3: Payment Method Selection */}
      <PaymentCard
        title="Payment Method"
        icon={<CreditCardOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowMethodModal(true)}>
            Manage
          </Button>
        }
      >
        <div className="payment-methods">
          {paymentMethods.map((method) => (
            <div 
              key={method.id}
              className={`payment-method ${selectedMethod === method.id ? 'selected' : ''}`}
              onClick={() => setSelectedMethod(method.id)}
            >
              <div className="method-info">
                <div className="method-type">
                  {method.type === 'bank' ? <BankOutline /> : <CreditCardOutline />}
                </div>
                <div className="method-details">
                  <div className="method-name">{method.name}</div>
                  <div className="method-number">****{method.last4}</div>
                </div>
              </div>
              <div className="method-badges">
                {method.isDefault && <Badge content="Default" />}
                {method.verified && <CheckCircleOutline style={{ color: '#52c41a' }} />}
              </div>
            </div>
          ))}
        </div>
      </PaymentCard>

      {/* Card 4: Payment Schedule Options */}
      <PaymentCard
        title="When to Pay"
        icon={<CalendarOutline />}
      >
        <Radio.Group 
          value={paymentType} 
          onChange={(val) => setPaymentType(val as 'one_time' | 'scheduled')}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="one_time">
              <div className="schedule-option">
                <div className="option-title">Pay Now</div>
                <div className="option-desc">Process payment immediately</div>
              </div>
            </Radio>
            <Radio value="scheduled">
              <div className="schedule-option">
                <div className="option-title">Schedule Payment</div>
                <div className="option-desc">Choose a future date</div>
              </div>
            </Radio>
          </Space>
        </Radio.Group>

        {paymentType === 'scheduled' && (
          <div className="date-picker-container">
            <DatePicker
              value={selectedDate}
              onConfirm={(date) => setSelectedDate(date)}
              min={new Date()}
            >
              {(value) => (
                <Button color="primary" fill="none">
                  <CalendarOutline />
                  {value ? value.toLocaleDateString() : 'Select Date'}
                </Button>
              )}
            </DatePicker>
          </div>
        )}
      </PaymentCard>

      {/* Card 5: AutoPay Settings */}
      <PaymentCard
        title="AutoPay Settings"
        icon={<SetOutline />}
        action={
          <Switch
            checked={autoPaySettings?.enabled || false}
            onChange={(checked) => updateAutoPay({ enabled: checked })}
          />
        }
      >
        <div className="autopay-content">
          <div className="autopay-description">
            Never miss a payment with automatic monthly payments
          </div>
          
          {autoPaySettings?.enabled && (
            <div className="autopay-details">
              <div className="autopay-setting">
                <span>Amount:</span>
                <span className="setting-value">
                  {autoPaySettings.amount === 'minimum' && 'Minimum Payment'}
                  {autoPaySettings.amount === 'full' && 'Full Balance'}
                  {autoPaySettings.amount === 'custom' && `$${autoPaySettings.customAmount}`}
                </span>
              </div>
              <div className="autopay-setting">
                <span>Date:</span>
                <span className="setting-value">{autoPaySettings.dayOfMonth}th of each month</span>
              </div>
            </div>
          )}
          
          <Button 
            size="small" 
            fill="none" 
            onClick={() => setShowAutoPayModal(true)}
            disabled={!autoPaySettings?.enabled}
          >
            Configure AutoPay
          </Button>
        </div>
      </PaymentCard>

      {/* Card 6: Payment History Preview */}
      <PaymentCard
        title="Recent Payments"
        icon={<HistoryOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowHistoryModal(true)}>
            View All
          </Button>
        }
      >
        <List>
          {paymentHistory.slice(0, 3).map((payment) => (
            <List.Item
              key={payment.id}
              prefix={
                payment.status === 'completed' ? (
                  <CheckCircleOutline style={{ color: '#52c41a' }} />
                ) : payment.status === 'pending' ? (
                  <ClockCircleOutline style={{ color: '#faad14' }} />
                ) : (
                  <ExclamationCircleOutline style={{ color: '#ff4d4f' }} />
                )
              }
              description={`${payment.method} • ${payment.confirmationNumber}`}
            >
              <div className="payment-item">
                <div className="payment-amount">${payment.amount.toLocaleString()}</div>
                <div className="payment-date">{new Date(payment.date).toLocaleDateString()}</div>
              </div>
            </List.Item>
          ))}
        </List>
        
        {paymentHistory.length === 0 && (
          <div className="empty-state">
            <p>No payment history available</p>
          </div>
        )}
      </PaymentCard>

      {/* Card 7: Submit Payment Button */}
      <PaymentCard className="submit-card">
        <div className="submit-section">
          <div className="payment-summary">
            <div className="summary-line">
              <span>Amount:</span>
              <strong>${selectedAmount.toLocaleString()}</strong>
            </div>
            <div className="summary-line">
              <span>Method:</span>
              <span>{paymentMethods.find(m => m.id === selectedMethod)?.name || 'None selected'}</span>
            </div>
            <div className="summary-line">
              <span>When:</span>
              <span>
                {paymentType === 'one_time' ? 'Immediately' : selectedDate.toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <Button
            block
            color="primary"
            size="large"
            loading={submitting}
            disabled={!selectedAmount || !selectedMethod}
            onClick={() => setShowConfirmModal(true)}
          >
            {paymentType === 'one_time' ? 'Submit Payment' : 'Schedule Payment'}
          </Button>
        </div>
      </PaymentCard>

      {/* Card 8: FCRA Compliance Notice */}
      <PaymentCard className="compliance-card">
        <div className="compliance-notice">
          <h4>Important Information</h4>
          <p>
            By submitting this payment, you acknowledge that payment processing may take 1-3 business days. 
            Late fees may apply if payment is not received by the due date. For questions about your account, 
            please contact customer service.
          </p>
          <p className="fcra-notice">
            <strong>FCRA Notice:</strong> Payment information will be reported to credit bureaus and may impact your credit score.
          </p>
        </div>
      </PaymentCard>

      {/* Modals */}
      
      {/* Custom Amount Modal */}
      <Modal
        visible={showAmountModal}
        title="Enter Custom Amount"
        closeOnMaskClick
        onClose={() => setShowAmountModal(false)}
        content={
          <div>
            <Input
              placeholder="Enter amount"
              value={customAmount}
              onChange={(val) => setCustomAmount(val)}
              type="number"
            />
            <div style={{ marginTop: '16px' }}>
              <Button 
                block 
                color="primary"
                onClick={() => {
                  const amount = parseFloat(customAmount);
                  if (amount > 0) {
                    setSelectedAmount(amount);
                    setShowAmountModal(false);
                    setCustomAmount('');
                  }
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        }
      />

      {/* Payment Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        title="Confirm Payment"
        closeOnMaskClick
        onClose={() => setShowConfirmModal(false)}
        content={
          <div>
            <div className="confirmation-details">
              <p><strong>Amount:</strong> ${selectedAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> {paymentMethods.find(m => m.id === selectedMethod)?.name}</p>
              <p><strong>Processing:</strong> {paymentType === 'one_time' ? 'Immediate' : `Scheduled for ${selectedDate.toLocaleDateString()}`}</p>
            </div>
            <div className="confirmation-disclaimer">
              <p>Please review your payment details carefully. This action cannot be undone.</p>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                color="primary"
                loading={submitting}
                onClick={submitPayment}
              >
                Confirm Payment
              </Button>
              <Button 
                block 
                fill="none"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
            </Space>
          </div>
        }
      />
    </div>
  );
};

export default PaymentsPage;
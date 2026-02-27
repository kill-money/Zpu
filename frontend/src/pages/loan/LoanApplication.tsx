import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Steps, Card, Space, Switch, Checkbox, DatePicker, Upload, message, Modal } from 'antd';
import { UploadOutlined, InfoCircleOutlined, LockOutlined, BankOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';
import { LoanAPI } from '../../utils/api';
import './LoanApplication.css';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

// Real loan application form for production use with SSN and banking data
const LoanApplication: React.FC = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [creditConsentGiven, setCreditConsentGiven] = useState(false);
  
  const { user, createApplication, updateApplication, uploadIdentityDocument } = useAuthStore();

  // Real SSN validation
  const validateSSN = (rule: any, value: string) => {
    if (!value) return Promise.reject('SSN is required for loan processing');
    
    const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssnPattern.test(value)) {
      return Promise.reject('Invalid SSN format. Use XXX-XX-XXXX');
    }
    
    // Basic checksum validation for production
    const cleanSSN = value.replace(/[^\d]/g, '');
    if (cleanSSN === '000000000' || cleanSSN === '123456789') {
      return Promise.reject('Invalid SSN number');
    }
    
    // Check for sequential numbers (common fake SSNs)
    if (/^(\d)\1{8}$/.test(cleanSSN)) {
      return Promise.reject('Invalid SSN format');
    }
    
    return Promise.resolve();
  };

  // Real bank account validation
  const validateBankAccount = (rule: any, value: string) => {
    if (!value) return Promise.reject('Bank account number is required');
    
    const cleanAccount = value.replace(/[^\d]/g, '');
    if (cleanAccount.length < 8 || cleanAccount.length > 17) {
      return Promise.reject('Bank account number must be 8-17 digits');
    }
    
    return Promise.resolve();
  };

  // Real routing number validation with ABA checksum
  const validateRoutingNumber = (rule: any, value: string) => {
    if (!value) return Promise.reject('Routing number is required');
    
    const clean = value.replace(/[^\d]/g, '');
    if (clean.length !== 9) {
      return Promise.reject('Routing number must be exactly 9 digits');
    }
    
    // ABA routing number checksum validation
    const digits = clean.split('').map(Number);
    const checksum = 3 * (digits[0] + digits[3] + digits[6]) +
                    7 * (digits[1] + digits[4] + digits[7]) +
                    (digits[2] + digits[5] + digits[8]);
    
    if (checksum % 10 !== 0) {
      return Promise.reject('Invalid routing number');
    }
    
    return Promise.resolve();
  };

  // Step 1: Personal Information & SSN
  const PersonalInfoStep = () => (
    <Card title={
      <Space>
        <IdcardOutlined />
        Personal Information & Identity Verification
      </Space>
    }>
      <Form.Item
        label="Social Security Number"
        name="ssn"
        rules={[{ validator: validateSSN }]}
        extra="Required for credit check and identity verification. This information is encrypted and protected."
      >
        <Input
          placeholder="XXX-XX-XXXX"
          maxLength={11}
          prefix={<LockOutlined />}
          onChange={(e) => {
            // Auto-format SSN input
            let value = e.target.value.replace(/[^\d]/g, '');
            if (value.length >= 6) {
              value = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 9)}`;
            } else if (value.length >= 4) {
              value = `${value.slice(0, 3)}-${value.slice(3)}`;
            }
            form.setFieldsValue({ ssn: value });
          }}
        />
      </Form.Item>

      <Form.Item
        label="Date of Birth"
        name="dateOfBirth"
        rules={[{ required: true, message: 'Date of birth is required' }]}
      >
        <DatePicker 
          placeholder="Select date of birth"
          disabledDate={(current) => current && current.isAfter(new Date())}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item
        label="Annual Income"
        name="annualIncome"
        rules={[
          { required: true, message: 'Annual income is required' },
          { type: 'number', min: 10000, message: 'Minimum annual income is $10,000' }
        ]}
        extra="Gross annual income before taxes from all sources"
      >
        <InputNumber
          style={{ width: '100%' }}
          formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          min={0}
          max={10000000}
        />
      </Form.Item>

      <Form.Item
        label="Employment Status"
        name="employmentStatus"
        rules={[{ required: true, message: 'Employment status is required' }]}
      >
        <Select placeholder="Select employment status">
          <Option value="employed_full_time">Employed Full-Time</Option>
          <Option value="employed_part_time">Employed Part-Time</Option>
          <Option value="self_employed">Self-Employed</Option>
          <Option value="contractor">Independent Contractor</Option>
          <Option value="retired">Retired</Option>
          <Option value="unemployed">Unemployed</Option>
          <Option value="other">Other</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="Housing Status"
        name="housingStatus"
        rules={[{ required: true, message: 'Housing status is required' }]}
      >
        <Select placeholder="Select housing status">
          <Option value="own">Own</Option>
          <Option value="rent">Rent</Option>
          <Option value="live_with_family">Live with Family</Option>
          <Option value="other">Other</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="Monthly Housing Payment"
        name="monthlyHousingPayment"
        rules={[
          { required: true, message: 'Monthly housing payment is required' },
          { type: 'number', min: 0, message: 'Amount must be positive' }
        ]}
        extra="Monthly rent or mortgage payment (including insurance and taxes)"
      >
        <InputNumber
          style={{ width: '100%' }}
          formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          min={0}
        />
      </Form.Item>
    </Card>
  );

  // Step 2: Loan Details & Financial Information
  const LoanDetailsStep = () => (
    <Card title="Loan Information & Financial Details">
      <Form.Item
        label="Loan Amount Requested"
        name="loanAmount"
        rules={[
          { required: true, message: 'Loan amount is required' },
          { type: 'number', min: 1000, max: 500000, message: 'Loan amount must be between $1,000 and $500,000' }
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          min={1000}
          max={500000}
        />
      </Form.Item>

      <Form.Item
        label="Loan Purpose"
        name="loanPurpose"
        rules={[{ required: true, message: 'Loan purpose is required' }]}
      >
        <Select placeholder="Select loan purpose">
          <Option value="debt_consolidation">Debt Consolidation</Option>
          <Option value="home_improvement">Home Improvement</Option>
          <Option value="major_purchase">Major Purchase</Option>
          <Option value="medical_expenses">Medical Expenses</Option>
          <Option value="vacation">Vacation</Option>
          <Option value="wedding">Wedding</Option>
          <Option value="moving_relocation">Moving/Relocation</Option>
          <Option value="business_investment">Business Investment</Option>
          <Option value="education">Education</Option>
          <Option value="other">Other</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="Preferred Loan Term"
        name="loanTerm"
        rules={[{ required: true, message: 'Loan term is required' }]}
      >
        <Select placeholder="Select loan term">
          <Option value={12}>12 months</Option>
          <Option value={24}>24 months</Option>
          <Option value={36}>36 months</Option>
          <Option value={48}>48 months</Option>
          <Option value={60}>60 months</Option>
          <Option value={72}>72 months</Option>
          <Option value={84}>84 months</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="Monthly Debt Payments"
        name="monthlyDebtPayments"
        rules={[
          { required: true, message: 'Monthly debt payments are required' },
          { type: 'number', min: 0, message: 'Amount must be positive or zero' }
        ]}
        extra="Total of all monthly debt payments (credit cards, loans, etc.) excluding housing"
      >
        <InputNumber
          style={{ width: '100%' }}
          formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          min={0}
        />
      </Form.Item>

      <Form.Item
        label="Liquid Assets"
        name="liquidAssets"
        rules={[
          { required: true, message: 'Liquid assets amount is required' },
          { type: 'number', min: 0, message: 'Amount must be positive or zero' }
        ]}
        extra="Cash in checking, savings, and easily accessible investments"
      >
        <InputNumber
          style={{ width: '100%' }}
          formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
          min={0}
        />
      </Form.Item>
    </Card>
  );

  // Step 3: Bank Account for Loan Disbursement
  const BankAccountStep = () => (
    <Card title={
      <Space>
        <BankOutlined />
        Bank Account for Loan Disbursement
      </Space>
    }>
      <p style={{ marginBottom: 24, color: '#666' }}>
        <InfoCircleOutlined /> Provide your bank account information where loan funds will be deposited. 
        This account will be verified using micro-deposits or instant verification.
      </p>

      <Form.Item
        label="Bank Name"
        name="bankName"
        rules={[{ required: true, message: 'Bank name is required' }]}
      >
        <Input placeholder="Enter your bank name" />
      </Form.Item>

      <Form.Item
        label="Routing Number"
        name="routingNumber"
        rules={[{ validator: validateRoutingNumber }]}
        extra="9-digit routing number found on your checks"
      >
        <Input
          placeholder="XXXXXXXXX"
          maxLength={9}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d]/g, '');
            form.setFieldsValue({ routingNumber: value });
          }}
        />
      </Form.Item>

      <Form.Item
        label="Account Number"
        name="accountNumber"
        rules={[{ validator: validateBankAccount }]}
        extra="Your checking or savings account number"
      >
        <Input
          placeholder="Enter account number"
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d]/g, '');
            form.setFieldsValue({ accountNumber: value });
          }}
        />
      </Form.Item>

      <Form.Item
        label="Account Type"
        name="accountType"
        rules={[{ required: true, message: 'Account type is required' }]}
      >
        <Select placeholder="Select account type">
          <Option value="checking">Checking</Option>
          <Option value="savings">Savings</Option>
        </Select>
      </Form.Item>

      <Form.Item name="accountOwnershipConfirmation" valuePropName="checked">
        <Checkbox>
          I confirm that I am the primary account holder for this bank account and 
          authorize Zpu Financial to verify this account and deposit loan proceeds.
        </Checkbox>
      </Form.Item>
    </Card>
  );

  // Step 4: Document Upload & Identity Verification
  const DocumentUploadStep = () => (
    <Card title="Document Upload & Identity Verification">
      <Form.Item
        label="Government-Issued ID"
        name="governmentId"
        extra="Upload a clear photo of your driver's license, state ID, or passport"
      >
        <Upload
          accept="image/*"
          listType="picture-card"
          beforeUpload={() => false} // Prevent auto-upload
          maxCount={2}
        >
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload ID</div>
          </div>
        </Upload>
      </Form.Item>

      <Form.Item
        label="Proof of Income"
        name="incomeProof"
        extra="Upload recent pay stubs, tax returns, or bank statements showing income"
      >
        <Upload
          accept="image/*,.pdf"
          listType="picture-card"
          beforeUpload={() => false}
          maxCount={5}
        >
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload Documents</div>
          </div>
        </Upload>
      </Form.Item>

      <Form.Item
        label="Bank Statements"
        name="bankStatements"
        extra="Upload recent bank statements (last 2-3 months) to verify account ownership"
      >
        <Upload
          accept="image/*,.pdf"
          listType="picture-card"
          beforeUpload={() => false}
          maxCount={6}
        >
          <div>
            <UploadOutlined />
            <div style={{ marginType: 8 }}>Upload Statements</div>
          </div>
        </Upload>
      </Form.Item>
    </Card>
  );

  // Step 5: Consents & Disclosures (FCRA, TCPA, etc.)
  const ConsentsStep = () => (
    <Card title="Consents & Legal Disclosures">
      <div style={{ marginBottom: 24 }}>
        <h4>Required Consents for Loan Processing</h4>
        <p style={{ color: '#666' }}>
          The following consents are required by federal law for us to process your loan application:
        </p>
      </div>

      <Form.Item name="fcraConsent" valuePropName="checked" rules={[
        { required: true, message: 'FCRA consent is required to pull your credit report' }
      ]}>
        <Checkbox>
          <strong>Fair Credit Reporting Act (FCRA) Consent:</strong> I authorize Zpu Financial to obtain 
          my credit report and score from one or more credit reporting agencies for the purpose of 
          evaluating my creditworthiness for this loan application. I understand this may result in 
          a hard inquiry on my credit report.
        </Checkbox>
      </Form.Item>

      <Form.Item name="tcpaConsent" valuePropName="checked">
        <Checkbox>
          <strong>Telephone Consumer Protection Act (TCPA) Consent:</strong> I consent to receive 
          automated calls, texts, and emails from Zpu Financial regarding my loan application and 
          account, including marketing communications. Message and data rates may apply.
        </Checkbox>
      </Form.Item>

      <Form.Item name="electronicSignatureConsent" valuePropName="checked" rules={[
        { required: true, message: 'Electronic signature consent is required' }
      ]}>
        <Checkbox>
          <strong>Electronic Signature & Communication Consent:</strong> I agree to conduct this 
          transaction electronically and to receive all disclosures, notices, and documents 
          electronically. I understand I may request paper copies at any time.
        </Checkbox>
      </Form.Item>

      <Form.Item name="privacyPolicyConsent" valuePropName="checked" rules={[
        { required: true, message: 'Privacy policy acceptance is required' }
      ]}>
        <Checkbox>
          <strong>Privacy Policy:</strong> I have read and agree to Zpu Financial's 
          <a href="/privacy" target="_blank"> Privacy Policy</a> regarding the collection, 
          use, and sharing of my personal information.
        </Checkbox>
      </Form.Item>

      <Form.Item name="termsOfServiceConsent" valuePropName="checked" rules={[
        { required: true, message: 'Terms of service acceptance is required' }
      ]}>
        <Checkbox>
          <strong>Terms of Service:</strong> I have read and agree to Zpu Financial's 
          <a href="/terms" target="_blank"> Terms of Service</a> and understand the terms 
          and conditions of the loan products offered.
        </Checkbox>
      </Form.Item>

      <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f6f6f6', borderRadius: 6 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
          <strong>Important:</strong> By submitting this application, you are providing written 
          instructions under the Fair Credit Reporting Act authorizing Zpu Financial to obtain 
          information from your personal credit profile from TransUnion, Experian, and/or Equifax. 
          You authorize Zpu Financial to obtain such information solely to conduct a pre-qualification 
          for credit or to verify information provided in your application.
        </p>
      </div>
    </Card>
  );

  const steps = [
    {
      title: 'Personal Info',
      content: <PersonalInfoStep />,
    },
    {
      title: 'Loan Details',
      content: <LoanDetailsStep />,
    },
    {
      title: 'Bank Account',
      content: <BankAccountStep />,
    },
    {
      title: 'Documents',
      content: <DocumentUploadStep />,
    },
    {
      title: 'Consents',
      content: <ConsentsStep />,
    },
  ];

  const next = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch (error) {
      message.error('Please complete all required fields before continuing');
    }
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  const submitApplication = async () => {
    setLoading(true);
    
    try {
      const values = await form.validateFields();
      
      if (!applicationId) {
        // Create new application
        const newApplicationId = await createApplication({
          amount: values.loanAmount,
          purpose: values.loanPurpose
        });
        setApplicationId(newApplicationId);
      }
      
      // Process real SSN and bank verification
      if (values.ssn && values.routingNumber && values.accountNumber) {
        // Step 1: Verify SSN and pull credit report
        await LoanAPI.verifySSNAndPullCredit(
          applicationId!,
          values.ssn,
          user?.fullName || '',
          values.dateOfBirth,
          user?.address
        );
        
        // Step 2: Verify bank account
        await LoanAPI.verifyBankAccount(
          applicationId!,
          values.routingNumber,
          values.accountNumber,
          values.accountType
        );
        
        // Step 3: Process income verification (if documents uploaded)
        if (values.incomeProof && values.incomeProof.fileList?.length > 0) {
          await LoanAPI.verifyIncome(
            applicationId!,
            values.incomeProof.fileList.map((file: any) => ({
              type: 'paystub', // Would be determined from file analysis
              fileId: file.uid,
              amount: values.annualIncome / 12,
              period: 'monthly'
            })),
            {
              employer: 'To be verified',
              position: 'To be verified',
              salary: values.annualIncome
            }
          );
        }
        
        // Step 4: Perform real underwriting
        const underwritingResult = await LoanAPI.performUnderwriting(
          applicationId!,
          values.loanAmount,
          values.loanPurpose
        );
        
        // Step 5: Get loan pricing based on credit profile
        const pricingResult = await LoanAPI.getLoanPricing(
          applicationId!,
          {
            creditScore: underwritingResult.data.creditScore,
            creditHistory: underwritingResult.data.creditHistory
          },
          {
            principal: values.loanAmount,
            termMonths: values.loanTerm,
            loanType: 'personal'
          }
        );
        
        // Step 6: Submit for approval workflow
        await LoanAPI.submitForApproval(
          applicationId!,
          underwritingResult.data,
          pricingResult.data
        );
      }
      
      message.success('Application submitted successfully! You will receive updates via email and SMS.');
      
      // Redirect to application status page
      // navigate(`/application-status/${applicationId}`);
      
    } catch (error: any) {
      message.error(`Application submission failed: ${error.message}`);
      console.error('Application submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loan-application-container">
      <div className="loan-application-header">
        <h1>Loan Application</h1>
        <p>Complete your loan application with real financial verification</p>
      </div>

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map(item => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          accountOwnershipConfirmation: false,
          fcraConsent: false,
          tcpaConsent: false,
          electronicSignatureConsent: false,
          privacyPolicyConsent: false,
          termsOfServiceConsent: false
        }}
      >
        <div className="steps-content">
          {steps[currentStep].content}
        </div>
        
        <div className="steps-action" style={{ marginTop: 24, textAlign: 'center' }}>
          <Space size="large">
            {currentStep > 0 && (
              <Button onClick={prev}>
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={next}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button 
                type="primary" 
                onClick={submitApplication}
                loading={loading}
                size="large"
              >
                Submit Application
              </Button>
            )}
          </Space>
        </div>
      </Form>

      {/* Credit Check Consent Modal */}
      <Modal
        title="Credit Check Authorization"
        visible={consentModalVisible}
        onOk={() => {
          setCreditConsentGiven(true);
          setConsentModalVisible(false);
        }}
        onCancel={() => setConsentModalVisible(false)}
      >
        <p>
          By clicking "I Agree", you authorize Zpu Financial to obtain your credit report 
          from TransUnion, Experian, and/or Equifax for the purpose of evaluating your loan application.
        </p>
        <p>
          This will result in a hard inquiry on your credit report, which may temporarily 
          affect your credit score.
        </p>
      </Modal>
    </div>
  );
};

export default LoanApplication;
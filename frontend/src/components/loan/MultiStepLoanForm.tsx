import React, { useState, useCallback } from 'react';
import { Steps, Card, Button, message, Spin, Result } from 'antd';
import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// 表单步骤组件
import PersonalInfoStep from './steps/PersonalInfoStep';
import AddressInfoStep from './steps/AddressInfoStep';
import BankInfoStep from './steps/BankInfoStep';
import EmploymentInfoStep from './steps/EmploymentInfoStep';
import LoanTermsStep from './steps/LoanTermsStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';

// 类型和验证
import {
  FormStep,
  FORM_STEPS,
  PersonalInfoForm,
  AddressInfoForm,
  BankInfoForm,
  EmploymentInfoForm,
  LoanTermsForm,
  CompleteLoanApplication,
  completeLoanApplicationSchema
} from '../../schemas/loanApplicationSchema';

// 导入样式
import './LoanApplication.css';

// API
import { submitLoanApplication } from '../../api/userApi';

// 样式
import './MultiStepLoanForm.scss';

interface FormData {
  personalInfo?: PersonalInfoForm;
  addressInfo?: AddressInfoForm;
  bankInfo?: BankInfoForm;
  employmentInfo?: EmploymentInfoForm;
  loanTerms?: LoanTermsForm;
}

const MultiStepLoanForm: React.FC = () => {
  const navigate = useNavigate();
  
  // 表单状态
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.PERSONAL_INFO);
  const [formData, setFormData] = useState<FormData>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string>('');

  // 更新表单数据
  const updateFormData = useCallback(<T extends keyof FormData>(step: T, data: FormData[T]) => {
    setFormData(prev => ({
      ...prev,
      [step]: data
    }));
  }, []);

  // 下一步
  const handleNext = useCallback(() => {
    if (currentStep < FormStep.REVIEW_SUBMIT) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  // 上一步
  const handlePrev = useCallback(() => {
    if (currentStep > FormStep.PERSONAL_INFO) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // 跳转到指定步骤
  const goToStep = useCallback((step: FormStep) => {
    // 只允许跳转到已完成的步骤或当前步骤
    const completedSteps = getCompletedSteps();
    if (step <= Math.max(...completedSteps, currentStep)) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  // 获取已完成的步骤
  const getCompletedSteps = useCallback((): FormStep[] => {
    const completed: FormStep[] = [];
    
    if (formData.personalInfo) completed.push(FormStep.PERSONAL_INFO);
    if (formData.addressInfo) completed.push(FormStep.ADDRESS_INFO);
    if (formData.bankInfo) completed.push(FormStep.BANK_INFO);
    if (formData.employmentInfo) completed.push(FormStep.EMPLOYMENT_INFO);
    if (formData.loanTerms) completed.push(FormStep.LOAN_TERMS);
    
    return completed;
  }, [formData]);

  // 检查当前步骤是否完成
  const isCurrentStepComplete = useCallback((): boolean => {
    switch (currentStep) {
      case FormStep.PERSONAL_INFO:
        return !!formData.personalInfo;
      case FormStep.ADDRESS_INFO:
        return !!formData.addressInfo;
      case FormStep.BANK_INFO:
        return !!formData.bankInfo;
      case FormStep.EMPLOYMENT_INFO:
        return !!formData.employmentInfo;
      case FormStep.LOAN_TERMS:
        return !!formData.loanTerms;
      case FormStep.REVIEW_SUBMIT:
        return getCompletedSteps().length === 5;
      default:
        return false;
    }
  }, [currentStep, formData, getCompletedSteps]);

  // 提交申请
  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);

      // 验证完整表单数据
      const completeData: CompleteLoanApplication = {
        personalInfo: formData.personalInfo!,
        addressInfo: formData.addressInfo!,
        bankInfo: formData.bankInfo!,
        employmentInfo: formData.employmentInfo!,
        loanTerms: formData.loanTerms!
      };

      // 使用Zod验证完整数据
      const validatedData = completeLoanApplicationSchema.parse(completeData);

      // 提交到后端
      const response = await submitLoanApplication(validatedData);

      if (response.success) {
        setApplicationId(response.application.id);
        setSubmitted(true);
        message.success('贷款申请提交成功！');
      } else {
        throw new Error(response.message || '提交失败');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      
      if (error.name === 'ZodError') {
        message.error('表单数据验证失败，请检查所有字段');
      } else {
        message.error(error.message || '提交申请时发生错误，请重试');
      }
    } finally {
      setLoading(false);
    }
  }, [formData]);

  // 如果已提交成功，显示成功页面
  if (submitted) {
    return (
      <div className="multi-step-form">
        <Card className="success-card">
          <Result
            status="success"
            title="贷款申请提交成功！"
            subTitle={`您的申请ID: ${applicationId}。我们将在1-2个工作日内审核您的申请。`}
            extra={[
              <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
                返回面板
              </Button>,
              <Button key="applications" onClick={() => navigate('/applications')}>
                查看申请记录
              </Button>
            ]}
          >
            <div className="success-details">
              <h4>后续步骤：</h4>
              <ul>
                <li>我们将通过邮件和短信通知您审核进度</li>
                <li>如果需要补充材料，我们会及时联系您</li>
                <li>审核通过后，资金将在1-2个工作日内到账</li>
              </ul>
            </div>
          </Result>
        </Card>
      </div>
    );
  }

  // 步骤配置
  const steps = FORM_STEPS.map((step, index) => {
    const completed = getCompletedSteps().includes(step.id);
    const current = currentStep === step.id;
    
    return {
      title: step.title,
      description: step.description,
      status: completed ? 'finish' : (current ? 'process' : 'wait'),
      icon: completed ? <CheckCircleOutlined /> : undefined
    };
  });

  // 渲染当前步骤内容
  const renderStepContent = () => {
    const commonProps = {
      onNext: handleNext,
      onPrev: handlePrev,
      canGoNext: isCurrentStepComplete(),
      canGoPrev: currentStep > FormStep.PERSONAL_INFO,
      loading
    };

    switch (currentStep) {
      case FormStep.PERSONAL_INFO:
        return (
          <PersonalInfoStep
            {...commonProps}
            data={formData.personalInfo}
            onDataChange={(data) => updateFormData('personalInfo', data)}
          />
        );

      case FormStep.ADDRESS_INFO:
        return (
          <AddressInfoStep
            {...commonProps}
            data={formData.addressInfo}
            onDataChange={(data) => updateFormData('addressInfo', data)}
          />
        );

      case FormStep.BANK_INFO:
        return (
          <BankInfoStep
            {...commonProps}
            data={formData.bankInfo}
            onDataChange={(data) => updateFormData('bankInfo', data)}
          />
        );

      case FormStep.EMPLOYMENT_INFO:
        return (
          <EmploymentInfoStep
            {...commonProps}
            data={formData.employmentInfo}
            onDataChange={(data) => updateFormData('employmentInfo', data)}
          />
        );

      case FormStep.LOAN_TERMS:
        return (
          <LoanTermsStep
            {...commonProps}
            data={formData.loanTerms}
            onDataChange={(data) => updateFormData('loanTerms', data)}
          />
        );

      case FormStep.REVIEW_SUBMIT:
        return (
          <ReviewSubmitStep
            personalInfo={formData.personalInfo}
            addressInfo={formData.addressInfo}
            bankInfo={formData.bankInfo}
            employmentInfo={formData.employmentInfo}
            loanTerms={formData.loanTerms}
            onSubmit={handleSubmit}
            onEdit={goToStep}
            onPrev={handlePrev}
            canGoPrev={true}
            loading={loading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="multi-step-loan-container">
      {/* 进度条 */}
      <div className="loan-progress-steps">
        <Steps
          current={currentStep}
          type="navigation"
          size="small"
          onChange={goToStep}
          items={steps}
        />
      </div>

      {/* 表单内容 */}
      <div className="loan-form-container">
        <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}>
          {renderStepContent()}
        </Spin>
      </div>
    </div>
  );
};

export default MultiStepLoanForm;
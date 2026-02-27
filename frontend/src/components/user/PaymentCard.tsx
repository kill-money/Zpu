import React from 'react';
import { Card } from 'antd-mobile';
import './PaymentCard.css';

interface PaymentCardProps {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  title,
  icon,
  action,
  className = '',
  children,
  onClick
}) => {
  return (
    <Card 
      className={`payment-card ${className}`}
      onClick={onClick}
    >
      {(title || icon || action) && (
        <div className="payment-card-header">
          <div className="header-left">
            {icon && <span className="card-icon">{icon}</span>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
          {action && (
            <div className="header-right">
              {action}
            </div>
          )}
        </div>
      )}
      
      {children && (
        <div className="payment-card-content">
          {children}
        </div>
      )}
    </Card>
  );
};

export default PaymentCard;
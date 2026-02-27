import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Space,
  Tag,
  Modal,
  Switch,
  Toast,
  Badge,
  Divider,
  Radio,
  Selector
} from 'antd-mobile';
import {
  BellOutline,
  MessageOutline,
  CheckCircleOutline,
  ExclamationCircleOutline,
  InformationCircleOutline,
  DeleteOutline,
  SetOutline,
  MailOutline,
  SoundOutline
} from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { userAPI } from '../../utils/api';
import { useSocket } from '../../utils/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCard from '../../components/user/PaymentCard';
import './Notifications.css';

// Zod validation schemas
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  paymentReminders: z.boolean(),
  promotionalEmails: z.boolean()
});

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'payment' | 'loan' | 'system';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  paymentReminders: boolean;
  promotionalEmails: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { on, off, emit } = useSocket();

  // State management
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [filter, setFilter] = useState<string>('all');
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [settingsUpdating, setSettingsUpdating] = useState(false);

  const filterOptions = [
    { label: 'All Notifications', value: 'all' },
    { label: 'Unread Only', value: 'unread' },
    { label: 'Payment Related', value: 'payment' },
    { label: 'Loan Updates', value: 'loan' },
    { label: 'System Alerts', value: 'system' }
  ];

  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
  }, []);

  // Socket listeners for real-time notifications
  useEffect(() => {
    const handleNewNotification = (data: Notification) => {
      setNotifications(prev => [data, ...prev]);
      
      Toast.show({
        icon: 'success',
        content: data.title,
        duration: 3000
      });
    };

    on('notification:new', handleNewNotification);
    return () => off('notification:new', handleNewNotification);
  }, [on, off]);

  const loadNotifications = async () => {
    try {
      const response = await userAPI.getNotifications();
      
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to load notifications'
      });
    }
  };

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getNotificationSettings();
      
      if (response.success) {
        setNotificationSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await userAPI.markNotificationAsRead(notificationId);
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        
        // Emit socket event
        emit('notification:read', { notificationId });
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await userAPI.markAllNotificationsAsRead();
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        
        Toast.show({
          icon: 'success',
          content: 'All notifications marked as read'
        });
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to update notifications'
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await userAPI.deleteNotification(notificationId);
      
      if (response.success) {
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        );
        
        Toast.show({
          icon: 'success',
          content: 'Notification deleted'
        });
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to delete notification'
      });
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      setSettingsUpdating(true);
      
      const updatedSettings = { ...notificationSettings, ...settings };
      const response = await userAPI.updateNotificationSettings(updatedSettings);
      
      if (response.success) {
        setNotificationSettings(response.data);
        Toast.show({
          icon: 'success',
          content: 'Settings updated successfully'
        });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to update settings'
      });
    } finally {
      setSettingsUpdating(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      info: <InformationCircleOutline />,
      success: <CheckCircleOutline />,
      warning: <ExclamationCircleOutline />,
      payment: <MailOutline />,
      loan: <MessageOutline />,
      system: <BellOutline />
    };
    return icons[type as keyof typeof icons] || <BellOutline />;
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      info: '#1677ff',
      success: '#52c41a',
      warning: '#faad14',
      payment: '#722ed1',
      loan: '#13c2c2',
      system: '#8c8c8c'
    };
    return colors[type as keyof typeof colors] || '#8c8c8c';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: '#52c41a',
      medium: '#faad14',
      high: '#ff4d4f'
    };
    return colors[priority as keyof typeof colors] || '#8c8c8c';
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.isRead;
      case 'payment':
        return notif.type === 'payment';
      case 'loan':
        return notif.type === 'loan';
      case 'system':
        return notif.type === 'system';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <h1>
          Notifications
          {unreadCount > 0 && (
            <Badge 
              content={unreadCount} 
              style={{ marginLeft: '8px', backgroundColor: '#ff4d4f' }}
            />
          )}
        </h1>
        <p>Stay updated with your loan and payment information</p>
      </div>

      {/* Card 1: Notification List */}
      <PaymentCard
        title="Recent Notifications"
        icon={<BellOutline />}
        action={
          <Space>
            <Button size="small" fill="none" onClick={markAllAsRead}>
              Mark All Read
            </Button>
            <Button size="small" fill="none" onClick={() => setShowNotificationModal(true)}>
              View All
            </Button>
          </Space>
        }
      >
        <div className="notification-list">
          <div className="filter-section">
            <Selector
              options={filterOptions}
              value={[filter]}
              onChange={(val) => setFilter(val[0])}
            />
          </div>

          <List>
            {filteredNotifications.slice(0, 5).map((notif) => (
              <List.Item
                key={notif.id}
                prefix={
                  <div 
                    className="notification-icon"
                    style={{ color: getNotificationColor(notif.type) }}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>
                }
                extra={
                  <Space>
                    <Tag 
                      color={getPriorityColor(notif.priority)}
                      style={{ fontSize: '10px' }}
                    >
                      {notif.priority}
                    </Tag>
                    <Button 
                      size="mini" 
                      fill="none"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                    >
                      <DeleteOutline />
                    </Button>
                  </Space>
                }
                description={
                  <div className="notification-meta">
                    <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{notif.type}</span>
                  </div>
                }
                onClick={() => {
                  if (!notif.isRead) {
                    markAsRead(notif.id);
                  }
                  setSelectedNotification(notif);
                }}
                className={!notif.isRead ? 'unread-notification' : ''}
              >
                <div className="notification-content">
                  <div className="notification-title">
                    {notif.title}
                    {!notif.isRead && (
                      <Badge 
                        content=""
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: '#1677ff',
                          marginLeft: '8px'
                        }}
                      />
                    )}
                  </div>
                  <div className="notification-message">{notif.message}</div>
                </div>
              </List.Item>
            ))}
          </List>

          {filteredNotifications.length === 0 && (
            <div className="empty-notifications">
              <BellOutline />
              <p>No notifications found</p>
            </div>
          )}
        </div>
      </PaymentCard>

      {/* Card 2: Notification Settings */}
      <PaymentCard
        title="Notification Settings"
        icon={<SetOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowSettingsModal(true)}>
            Configure
          </Button>
        }
      >
        <div className="notification-settings">
          {notificationSettings && (
            <>
              <div className="settings-summary">
                <div className="setting-item">
                  <span className="setting-label">Email Notifications</span>
                  <Switch 
                    checked={notificationSettings.emailNotifications} 
                    onChange={(checked) => updateNotificationSettings({ emailNotifications: checked })}
                    loading={settingsUpdating}
                  />
                </div>
                <div className="setting-item">
                  <span className="setting-label">Push Notifications</span>
                  <Switch 
                    checked={notificationSettings.pushNotifications} 
                    onChange={(checked) => updateNotificationSettings({ pushNotifications: checked })}
                    loading={settingsUpdating}
                  />
                </div>
                <div className="setting-item">
                  <span className="setting-label">Payment Reminders</span>
                  <Switch 
                    checked={notificationSettings.paymentReminders} 
                    onChange={(checked) => updateNotificationSettings({ paymentReminders: checked })}
                    loading={settingsUpdating}
                  />
                </div>
              </div>

              <div className="quiet-hours">
                <div className="quiet-hours-toggle">
                  <span>Quiet Hours</span>
                  <Switch 
                    checked={notificationSettings.quietHoursEnabled} 
                    onChange={(checked) => updateNotificationSettings({ quietHoursEnabled: checked })}
                    loading={settingsUpdating}
                  />
                </div>
                {notificationSettings.quietHoursEnabled && (
                  <div className="quiet-hours-time">
                    <span>No notifications from {notificationSettings.quietHoursStart} to {notificationSettings.quietHoursEnd}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </PaymentCard>

      {/* Card 3: Quick Actions */}
      <PaymentCard
        title="Quick Actions"
        icon={<MessageOutline />}
      >
        <div className="quick-actions">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              block 
              color="primary"
              onClick={() => navigate('/user/support')}
            >
              <MessageOutline />
              Contact Support
            </Button>
            
            <Button 
              block 
              fill="outline"
              onClick={() => navigate('/user/payments')}
            >
              <MailOutline />
              Payment Center
            </Button>
            
            <Button 
              block 
              fill="outline"
              onClick={() => setShowSettingsModal(true)}
            >
              <SetOutline />
              Manage Settings
            </Button>
          </Space>
        </div>
      </PaymentCard>

      {/* Modals */}
      
      {/* All Notifications Modal */}
      <Modal
        visible={showNotificationModal}
        title="All Notifications"
        closeOnMaskClick
        onClose={() => setShowNotificationModal(false)}
        content={
          <div className="all-notifications">
            <List>
              {filteredNotifications.map((notif) => (
                <List.Item
                  key={notif.id}
                  prefix={
                    <div 
                      className="notification-icon"
                      style={{ color: getNotificationColor(notif.type) }}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>
                  }
                  extra={
                    <Tag color={getPriorityColor(notif.priority)}>
                      {notif.priority}
                    </Tag>
                  }
                  description={notif.message}
                  onClick={() => {
                    if (!notif.isRead) {
                      markAsRead(notif.id);
                    }
                    setSelectedNotification(notif);
                    setShowNotificationModal(false);
                  }}
                >
                  <div className="notification-item">
                    <div className="notification-title">
                      {notif.title}
                      {!notif.isRead && <Badge content="" />}
                    </div>
                    <div className="notification-time">
                      {new Date(notif.createdAt).toLocaleString()}
                    </div>
                  </div>
                </List.Item>
              ))}
            </List>
          </div>
        }
      />

      {/* Notification Settings Modal */}
      <Modal
        visible={showSettingsModal}
        title="Notification Settings"
        closeOnMaskClick
        onClose={() => setShowSettingsModal(false)}
        content={
          <div className="settings-modal">
            {notificationSettings && (
              <>
                <div className="settings-section">
                  <h4>Notification Types</h4>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-name">Email Notifications</span>
                      <span className="setting-desc">Receive notifications via email</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailNotifications} 
                      onChange={(checked) => updateNotificationSettings({ emailNotifications: checked })}
                    />
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-name">Push Notifications</span>
                      <span className="setting-desc">Receive push notifications on your device</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.pushNotifications} 
                      onChange={(checked) => updateNotificationSettings({ pushNotifications: checked })}
                    />
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-name">SMS Notifications</span>
                      <span className="setting-desc">Receive important updates via SMS</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.smsNotifications} 
                      onChange={(checked) => updateNotificationSettings({ smsNotifications: checked })}
                    />
                  </div>
                </div>

                <Divider />

                <div className="settings-section">
                  <h4>Content Preferences</h4>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-name">Payment Reminders</span>
                      <span className="setting-desc">Get reminded about upcoming payments</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.paymentReminders} 
                      onChange={(checked) => updateNotificationSettings({ paymentReminders: checked })}
                    />
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-name">Promotional Emails</span>
                      <span className="setting-desc">Receive offers and promotions</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.promotionalEmails} 
                      onChange={(checked) => updateNotificationSettings({ promotionalEmails: checked })}
                    />
                  </div>
                </div>

                <Divider />

                <div className="settings-section">
                  <h4>Quiet Hours</h4>
                  <p>Set quiet hours to avoid notifications during specific times</p>
                  
                  <div className="setting-item">
                    <span className="setting-name">Enable Quiet Hours</span>
                    <Switch 
                      checked={notificationSettings.quietHoursEnabled} 
                      onChange={(checked) => updateNotificationSettings({ quietHoursEnabled: checked })}
                    />
                  </div>
                  
                  {notificationSettings.quietHoursEnabled && (
                    <div className="quiet-hours-config">
                      <div className="time-range">
                        <span>From: {notificationSettings.quietHoursStart}</span>
                        <span>To: {notificationSettings.quietHoursEnd}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <Modal
          visible={!!selectedNotification}
          title={selectedNotification.title}
          closeOnMaskClick
          onClose={() => setSelectedNotification(null)}
          content={
            <div className="notification-detail">
              <div className="notification-header">
                <div 
                  className="notification-type"
                  style={{ color: getNotificationColor(selectedNotification.type) }}
                >
                  {getNotificationIcon(selectedNotification.type)}
                  <span>{selectedNotification.type}</span>
                </div>
                <Tag color={getPriorityColor(selectedNotification.priority)}>
                  {selectedNotification.priority} priority
                </Tag>
              </div>
              
              <div className="notification-body">
                <p>{selectedNotification.message}</p>
              </div>
              
              <div className="notification-footer">
                <div className="notification-timestamp">
                  <span>Received: {new Date(selectedNotification.createdAt).toLocaleString()}</span>
                  {selectedNotification.expiresAt && (
                    <span>Expires: {new Date(selectedNotification.expiresAt).toLocaleString()}</span>
                  )}
                </div>
                
                {selectedNotification.actionUrl && selectedNotification.actionLabel && (
                  <div className="notification-action">
                    <Button 
                      block 
                      color="primary"
                      onClick={() => {
                        navigate(selectedNotification.actionUrl!);
                        setSelectedNotification(null);
                      }}
                    >
                      {selectedNotification.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default NotificationsPage;
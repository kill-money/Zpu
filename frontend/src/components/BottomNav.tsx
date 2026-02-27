import React from 'react';
import { TabBar } from 'antd-mobile';
import { 
  AppOutline, 
  UserOutline, 
  FileOutline, 
  CreditCardOutline,
  BellOutline 
} from 'antd-mobile-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const tabs: TabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: <AppOutline />,
    path: '/dashboard'
  },
  {
    key: 'loans',
    label: 'My Loans',
    icon: <FileOutline />,
    path: '/my-loans'
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: <CreditCardOutline />,
    path: '/user/payments'
  },
  {
    key: 'notifications', 
    label: 'Notifications',
    icon: <BellOutline />,
    path: '/user/notifications'
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: <UserOutline />,
    path: '/profile'
  }
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current path
  const getActiveKey = () => {
    const path = location.pathname;
    
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.startsWith('/my-loans')) return 'loans';
    if (path.startsWith('/user/payments')) return 'payments';
    if (path.startsWith('/user/notifications') || path.startsWith('/user/messages')) return 'notifications';
    if (path.startsWith('/profile')) return 'profile';
    
    return 'dashboard'; // default
  };

  const handleTabChange = (key: string) => {
    const tab = tabs.find(t => t.key === key);
    if (tab) {
      navigate(tab.path);
    }
  };

  // Don't show bottom nav on certain pages
  const hiddenPaths = ['/login', '/register', '/apply', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) {
    return null;
  }

  return (
    <div className="bottom-nav-container">
      <TabBar 
        activeKey={getActiveKey()} 
        onChange={handleTabChange}
        className="bottom-nav-tabbar"
      >
        {tabs.map(tab => (
          <TabBar.Item 
            key={tab.key} 
            icon={tab.icon} 
            title={tab.label} 
          />
        ))}
      </TabBar>
    </div>
  );
};

export default BottomNav;
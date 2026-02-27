import React, { useState } from 'react';
import { Card, Form, Input, Button, Toast, Space } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      navigate('/');
      Toast.show({ content: '登录成功', icon: 'success' });
    } catch (e: any) {
      Toast.show({ content: e.response?.data?.error || '登录失败', icon: 'fail' });
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <Card title="登录您的账户">
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 8 }]}>
            <Input placeholder="请输入密码" type="password" />
          </Form.Item>
          <Space direction="vertical" block>
            <Button block color="primary" loading={isLoading} type="submit">
              登录
            </Button>
            <Button block onClick={() => navigate('/register')}>
              没有账户？立即注册
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
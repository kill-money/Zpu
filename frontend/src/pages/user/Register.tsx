import React, { useState } from 'react';
import { Card, Form, Input, Button, Toast, Space } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string; fullName: string; phone: string }) => {
    try {
      await register(values);
      Toast.show({ content: '注册成功，请查收邮件验证', icon: 'success' });
      navigate('/login');
    } catch (e: any) {
      Toast.show({ content: e.response?.data?.error || '注册失败', icon: 'fail' });
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <Card title="创建新账户">
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="fullName" label="姓名" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, pattern: /^\+?1?\d{10}$/ }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, min: 8 },
              { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: '密码须包含大小写字母和数字' }
            ]}
          >
            <Input placeholder="请输入密码（至少8位，包含大小写字母和数字）" type="password" />
          </Form.Item>
          <Space direction="vertical" block>
            <Button block color="primary" loading={isLoading} type="submit">
              注册
            </Button>
            <Button block onClick={() => navigate('/login')}>
              已有账户？立即登录
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
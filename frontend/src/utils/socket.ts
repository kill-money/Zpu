// frontend/src/utils/socket.ts - Socket.IO客户端实时通信
import { io, Socket } from 'socket.io-client';

// Socket.IO连接配置
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;
  private eventListeners: Map<string, Set<Function>> = new Map();

  // 初始化Socket连接
  connect(token?: string): void {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    console.log('[Socket] Connecting to server...');

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      auth: {
        token: token || localStorage.getItem('authToken')
      },
      query: {
        clientType: 'web',
        version: process.env.REACT_APP_VERSION || '1.0.0'
      }
    });

    this.setupEventHandlers();
  }

  // 设置Socket事件处理
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 触发连接成功回调
      this.emit('socket:connected', { socketId: this.socket?.id });
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      
      // 触发断开连接回调
      this.emit('socket:disconnected', { reason });
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this.handleConnectionError(error);
    });

    // 重新连接
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
    });

    // 重新连接失败
    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Failed to reconnect after maximum attempts');
      this.emit('socket:reconnectFailed');
    });

    // === 业务事件处理 ===

    // 贷款状态变更通知（用户端）
    this.socket.on('loan:statusChanged', (data) => {
      console.log('[Socket] Loan status changed:', data);
      this.emit('loan:statusChanged', data);
    });

    // 新贷款申请通知（管理端）
    this.socket.on('loan:submitted', (data) => {
      console.log('[Socket] New loan application submitted:', data);
      this.emit('loan:submitted', data);
    });

    // 申请处理通知（管理端）
    this.socket.on('application:processed', (data) => {
      console.log('[Socket] Application processed:', data);
      this.emit('application:processed', data);
    });

    // 利率更新通知（全局）
    this.socket.on('rates:updated', (data) => {
      console.log('[Socket] Rates updated:', data);
      this.emit('rates:updated', data);
    });

    // 系统通知
    this.socket.on('system:notification', (data) => {
      console.log('[Socket] System notification:', data);
      this.emit('system:notification', data);
    });

    // 管理员消息（管理端）
    this.socket.on('admin:message', (data) => {
      console.log('[Socket] Admin message:', data);
      this.emit('admin:message', data);
    });

    // 用户消息（用户端）
    this.socket.on('user:message', (data) => {
      console.log('[Socket] User message:', data);
      this.emit('user:message', data);
    });

    // 实时统计更新（管理端）
    this.socket.on('stats:update', (data) => {
      console.log('[Socket] Statistics updated:', data);
      this.emit('stats:update', data);
    });

    // === 还款相关事件处理 ===

    // 还款处理成功通知
    this.socket.on('payment:processed', (data) => {
      console.log('[Socket] Payment processed:', data);
      this.emit('payment:processed', data);
    });

    // 还款失败通知
    this.socket.on('payment:failed', (data) => {
      console.log('[Socket] Payment failed:', data);
      this.emit('payment:failed', data);
    });

    // 自动还款设置更新
    this.socket.on('autopay:updated', (data) => {
      console.log('[Socket] AutoPay settings updated:', data);
      this.emit('autopay:updated', data);
    });

    // 还款提醒通知
    this.socket.on('payment:reminder', (data) => {
      console.log('[Socket] Payment reminder:', data);
      this.emit('payment:reminder', data);
    });

    // 还款到期通知
    this.socket.on('payment:due', (data) => {
      console.log('[Socket] Payment due:', data);
      this.emit('payment:due', data);
    });

    // === 文档相关事件处理 ===

    // 文档状态变更通知
    this.socket.on('document:statusChanged', (data) => {
      console.log('[Socket] Document status changed:', data);
      this.emit('document:statusChanged', data);
    });

    // === 通知相关事件处理 ===

    // 新通知
    this.socket.on('notification:new', (data) => {
      console.log('[Socket] New notification:', data);
      this.emit('notification:new', data);
    });
  }

  // 处理连接错误
  private handleConnectionError(error: any): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Socket] Max reconnect attempts reached');
      this.emit('socket:maxReconnectAttemptsReached');
      return;
    }

    // 如果是认证错误，尝试刷新token
    if (error.type === 'TransportError' && error.description === 401) {
      console.log('[Socket] Authentication error, attempting token refresh...');
      this.refreshTokenAndReconnect();
    }
  }

  // 刷新token并重新连接
  private async refreshTokenAndReconnect(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.accessToken);
      
      // 重新连接
      this.disconnect();
      this.connect(data.accessToken);
      
    } catch (error) {
      console.error('[Socket] Token refresh failed:', error);
      // 清除存储并跳转到登录页
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 检查连接状态
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // 发送消息到服务器
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      console.log(`[Socket] Emitting ${event}:`, data);
      this.socket.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit ${event}: not connected`);
    }
  }

  // 监听事件
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    // 如果socket已连接，直接绑定事件
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  // 移除事件监听器
  off(event: string, callback?: Function): void {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
      this.socket?.off(event, callback as any);
    } else {
      this.eventListeners.delete(event);
      this.socket?.off(event);
    }
  }

  // 一次性事件监听
  once(event: string, callback: Function): void {
    if (this.socket?.connected) {
      this.socket.once(event, callback as any);
    } else {
      console.warn(`[Socket] Cannot listen to ${event}: not connected`);
    }
  }

  // 获取Socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // 手动重新连接
  reconnect(): void {
    if (this.socket) {
      console.log('[Socket] Manual reconnect...');
      this.socket.connect();
    }
  }

  // 发送心跳包
  sendHeartbeat(): void {
    if (this.isSocketConnected()) {
      this.emit('heartbeat', { timestamp: Date.now() });
    }
  }

  // === 业务方法 ===

  // 加入用户房间
  joinUserRoom(userId: string): void {
    this.emit('join:user-room', { userId });
  }

  // 加入管理员房间
  joinAdminRoom(): void {
    this.emit('join:admin-room');
  }

  // 离开房间
  leaveRoom(roomName: string): void {
    this.emit('leave:room', { roomName });
  }

  // 发送实时申请状态查询
  queryApplicationStatus(applicationId: string): void {
    this.emit('query:application-status', { applicationId });
  }

  // 发送实时统计请求（管理端）
  requestStatisticsUpdate(): void {
    this.emit('request:stats-update');
  }

  // 标记消息已读
  markMessageAsRead(messageId: string): void {
    this.emit('message:read', { messageId });
  }

  // 发送用户活动状态
  sendUserActivity(activity: string): void {
    this.emit('user:activity', { 
      activity, 
      timestamp: Date.now(),
      page: window.location.pathname
    });
  }
}

// 创建全局Socket管理器实例
const socketManager = new SocketManager();

// React Hook for Socket.IO
export const useSocket = () => {
  const connect = (token?: string) => {
    socketManager.connect(token);
  };

  const disconnect = () => {
    socketManager.disconnect();
  };

  const on = (event: string, callback: Function) => {
    socketManager.on(event, callback);
  };

  const off = (event: string, callback?: Function) => {
    socketManager.off(event, callback);
  };

  const emit = (event: string, data?: any) => {
    socketManager.emit(event, data);
  };

  const isConnected = () => {
    return socketManager.isSocketConnected();
  };

  return {
    connect,
    disconnect,
    on,
    off,
    emit,
    isConnected,
    getSocketId: () => socketManager.getSocketId(),
    joinUserRoom: (userId: string) => socketManager.joinUserRoom(userId),
    joinAdminRoom: () => socketManager.joinAdminRoom(),
    sendHeartbeat: () => socketManager.sendHeartbeat(),
    queryApplicationStatus: (appId: string) => socketManager.queryApplicationStatus(appId),
    requestStatisticsUpdate: () => socketManager.requestStatisticsUpdate()
  };
};

// 预定义的事件类型
export const SocketEvents = {
  // 连接相关
  CONNECTED: 'socket:connected',
  DISCONNECTED: 'socket:disconnected',
  RECONNECT_FAILED: 'socket:reconnectFailed',
  
  // 贷款相关
  LOAN_STATUS_CHANGED: 'loan:statusChanged',
  LOAN_SUBMITTED: 'loan:submitted',
  APPLICATION_PROCESSED: 'application:processed',
  
  // 还款相关
  PAYMENT_PROCESSED: 'payment:processed',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_SUBMITTED: 'payment:submitted',
  AUTOPAY_UPDATED: 'autopay:updated',
  PAYMENT_REMINDER: 'payment:reminder',
  PAYMENT_DUE: 'payment:due',
  
  // 利率更新
  RATES_UPDATED: 'rates:updated',
  
  // 通知相关
  SYSTEM_NOTIFICATION: 'system:notification',
  ADMIN_MESSAGE: 'admin:message',
  USER_MESSAGE: 'user:message',
  
  // 统计更新
  STATS_UPDATE: 'stats:update'
} as const;

// 导出Socket管理器实例和类型
export { socketManager, SocketManager };
export type { Socket };

export default socketManager;
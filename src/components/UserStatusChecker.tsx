'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 用户状态检查组件
 * 定期检查用户是否被禁用或设为待审核，如果是则强制退出登录
 */
export default function UserStatusChecker() {
  const router = useRouter();

  useEffect(() => {
    // 检查用户状态的函数
    const checkUserStatus = async () => {
      try {
        // 调用一个轻量级的 API 来检查用户状态
        const response = await fetch('/api/user/my-stats', {
          method: 'GET',
          credentials: 'include',
        });

        // 如果返回 403，说明用户被禁用或待审核
        if (response.status === 403) {
          const data = await response.json().catch(() => ({}));
          
          // 清除所有 cookie
          document.cookie.split(';').forEach((c) => {
            document.cookie = c
              .replace(/^ +/, '')
              .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
          });

          // 显示提示信息
          alert(data.error || '您的账户状态已变更，请重新登录');

          // 重定向到登录页
          router.push('/login');
        }
      } catch (error) {
        // 忽略网络错误，避免影响用户体验
        // eslint-disable-next-line no-console
        console.error('检查用户状态失败:', error);
      }
    };

    // 立即检查一次
    checkUserStatus();

    // 每30秒检查一次
    const interval = setInterval(checkUserStatus, 30000);

    return () => clearInterval(interval);
  }, [router]);

  return null; // 这个组件不渲染任何内容
}

/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from './auth';
import { DbManager } from './db';

/**
 * 验证用户状态（是否被禁用或待审核）
 * @param request NextRequest 对象
 * @returns 如果用户状态正常返回 null，否则返回错误响应
 */
export async function validateUserStatus(
  request: NextRequest
): Promise<NextResponse | null> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  // localstorage 模式不支持用户状态检查
  if (storageType === 'localstorage') {
    return null;
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return null; // 没有认证信息，让其他中间件处理
  }

  const username = authInfo.username;

  // 站长账户跳过检查
  if (username === process.env.USERNAME) {
    return null;
  }

  try {
    const db = new DbManager();
    const config = await db.getAdminConfig();

    if (!config) {
      return null; // 配置不存在，跳过检查
    }

    const user = config.UserConfig.Users.find((u) => u.username === username);

    if (!user) {
      // 用户不存在，清除认证
      return NextResponse.json(
        { error: '用户不存在，请重新登录' },
        { status: 401 }
      );
    }

    // 检查是否被禁用
    if (user.banned) {
      return NextResponse.json(
        { error: '账户已被禁用，请联系管理员' },
        { status: 403 }
      );
    }

    // 检查是否待审核（approved 为 undefined 视为已审核，兼容旧数据）
    if (user.approved === false) {
      return NextResponse.json(
        { error: '账户待审核，请等待管理员审核后再登录' },
        { status: 403 }
      );
    }

    return null; // 用户状态正常
  } catch (error) {
    console.error('验证用户状态失败:', error);
    return null; // 出错时不阻止访问，避免影响正常用户
  }
}

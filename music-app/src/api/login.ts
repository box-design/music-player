import api from './index';

export async function loginByPhone(phone: string, password: string) {
  const res = await api.get('/login/cellphone', {
    params: { phone, password },
  }) as {
    code: number;
    account?: { id: number };
    profile?: {
      userId: number;
      nickname: string;
      avatarUrl: string;
    };
    cookie?: string;
    token?: string;
    message?: string;
  };
  return res;
}

export async function loginByEmail(email: string, password: string) {
  const res = await api.get('/login', {
    params: { email, password },
  }) as {
    code: number;
    account?: { id: number };
    profile?: {
      userId: number;
      nickname: string;
      avatarUrl: string;
    };
    cookie?: string;
    message?: string;
  };
  return res;
}

// 二维码登录
export async function getQRKey() {
  const res = await api.get('/login/qr/key') as {
    code: number;
    data: { unikey: string };
  };
  return res.data.unikey;
}

export async function createQR(key: string) {
  const res = await api.get('/login/qr/create', {
    params: { key, qrimg: true },
  }) as {
    code: number;
    data: { qrurl: string; qrimg: string };
  };
  return res.data;
}

export async function checkQR(key: string) {
  const res = await api.get('/login/qr/check', {
    params: { key, timestamp: Date.now() },
  }) as {
    code: number;
    message: string;
    cookie?: string;
  };
  return res;
}

export async function getLoginStatus() {
  const res = await api.get('/login/status') as {
    data: {
      code: number;
      account?: { id: number };
      profile?: {
        userId: number;
        nickname: string;
        avatarUrl: string;
        signature?: string;
      };
    };
  };
  return res.data;
}

export async function logout() {
  const res = await api.get('/logout') as { code: number };
  return res.code === 200;
}

export async function getCaptcha(phone: string) {
  const res = await api.get('/captcha/sent', { params: { phone } }) as {
    code: number;
    message?: string;
  };
  return res;
}

export async function verifyCaptcha(phone: string, captcha: string) {
  const res = await api.get('/captcha/verify', {
    params: { phone, captcha },
  }) as { code: number; message?: string };
  return res;
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Mail, QrCode, RefreshCw } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { loginByPhone, loginByEmail, getQRKey, createQR, checkQR, getLoginStatus } from '@/api/login';
import { useUserStore } from '@/stores/useUserStore';
import { storage } from '@/utils/storage';

type LoginType = 'qr' | 'phone' | 'email';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { setLoggedIn, setUserInfo, setCookie } = useUserStore();
  const [loginType, setLoginType] = useState<LoginType>('qr');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrStatus, setQrStatus] = useState('等待扫描');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const qrTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 初始化二维码
  const initQR = useCallback(async () => {
    try {
      const key = await getQRKey();
      const qrData = await createQR(key);
      setQrUrl(qrData.qrimg || qrData.qrurl);
      setQrStatus('等待扫描');

      // 轮询检查状态
      if (qrTimer.current) clearInterval(qrTimer.current);
      qrTimer.current = setInterval(async () => {
        const res = await checkQR(key);
        if (res.code === 800) {
          setQrStatus('二维码已过期，请刷新');
          if (qrTimer.current) clearInterval(qrTimer.current);
        } else if (res.code === 801) {
          setQrStatus('等待扫描');
        } else if (res.code === 802) {
          setQrStatus('等待确认');
        } else if (res.code === 803) {
          setQrStatus('登录成功');
          if (qrTimer.current) clearInterval(qrTimer.current);
          if (res.cookie) {
            handleLoginSuccess(res.cookie);
          }
        }
      }, 2000);
    } catch (e) {
      setQrStatus('加载失败，请刷新');
    }
  }, []);

  useEffect(() => {
    if (loginType === 'qr') {
      initQR();
    }
    return () => {
      if (qrTimer.current) clearInterval(qrTimer.current);
    };
  }, [loginType, initQR]);

  const handleLoginSuccess = async (cookie: string) => {
    storage.set('cookie', cookie);
    setCookie(cookie);
    // 获取账户信息以更新 userInfo，确保 Sidebar 能显示登录状态
    try {
      const status = await getLoginStatus();
      if (status.profile) {
        setUserInfo({
          userId: status.profile.userId,
          nickname: status.profile.nickname,
          avatarUrl: status.profile.avatarUrl,
        });
      } else if (status.account) {
        setUserInfo({
          userId: status.account.id,
          nickname: '',
          avatarUrl: '',
        });
      }
    } catch {
      // 即使获取用户信息失败，也继续登录流程
    }
    setLoggedIn(true);
    navigate('/');
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginByPhone(phone, password);
      if (res.code === 200 && res.cookie) {
        handleLoginSuccess(res.cookie);
      } else {
        setError(res.message || t('common.loginFailed'));
      }
    } catch {
      setError(t('common.loginFailedCheck'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginByEmail(email, emailPassword);
      if (res.code === 200 && res.cookie) {
        handleLoginSuccess(res.cookie);
      } else {
        setError(res.message || t('common.loginFailed'));
      }
    } catch {
      setError(t('common.loginFailedCheck'));
    } finally {
      setLoading(false);
    }
  };

  const qrStatusTextMap: Record<string, string> = {
    '等待扫描': t('loginPage.waitingScan'),
    '等待确认': t('loginPage.waitingConfirm'),
    '登录成功': t('loginPage.loginSuccess'),
    '二维码已过期，请刷新': t('loginPage.qrExpired'),
    '加载失败，请刷新': t('loginPage.qrLoadFailed'),
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold text-text-primary text-center mb-8">{t('loginPage.title')}</h1>

      {/* 登录方式切换 */}
      <div className="flex justify-center gap-4 mb-8">
        {[
          { key: 'qr' as LoginType, label: t('loginPage.qrCode'), icon: QrCode },
          { key: 'phone' as LoginType, label: t('loginPage.phone'), icon: Smartphone },
          { key: 'email' as LoginType, label: t('loginPage.email'), icon: Mail },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setLoginType(item.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
              loginType === item.key
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      {/* 二维码登录 */}
      {loginType === 'qr' && (
        <div className="flex flex-col items-center">
          <div className="relative w-52 h-52 bg-white rounded-xl p-4 mb-4">
            {qrUrl ? (
              <img src={qrUrl} alt={t('loginPage.qrCode')} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-tertiary">{t('common.loading')}</div>
            )}
            {qrStatus.includes('过期') && (
              <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center">
                <p className="text-white text-sm mb-2">{t('loginPage.qrExpiredTitle')}</p>
                <button
                  onClick={initQR}
                  className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-sm rounded-full"
                >
                  <RefreshCw size={14} /> {t('common.refresh')}
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-text-secondary">{qrStatusTextMap[qrStatus] || qrStatus}</p>
          <p className="text-xs text-text-tertiary mt-2">{t('loginPage.scanHint')}</p>
        </div>
      )}

      {/* 手机号登录 */}
      {loginType === 'phone' && (
        <form onSubmit={handlePhoneLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('loginPage.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('loginPage.enterPhone')}
              className="w-full px-4 py-2.5 bg-surface rounded-lg text-text-primary placeholder-text-tertiary border border-transparent focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('loginPage.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('loginPage.enterPassword')}
              className="w-full px-4 py-2.5 bg-surface rounded-lg text-text-primary placeholder-text-tertiary border border-transparent focus:border-primary/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loggingIn') : t('common.login')}
          </button>
        </form>
      )}

      {/* 邮箱登录 */}
      {loginType === 'email' && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('loginPage.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('loginPage.enterEmail')}
              className="w-full px-4 py-2.5 bg-surface rounded-lg text-text-primary placeholder-text-tertiary border border-transparent focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('loginPage.password')}</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder={t('loginPage.enterPassword')}
              className="w-full px-4 py-2.5 bg-surface rounded-lg text-text-primary placeholder-text-tertiary border border-transparent focus:border-primary/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !emailPassword}
            className="w-full py-2.5 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loggingIn') : t('common.login')}
          </button>
        </form>
      )}
    </div>
  );
}

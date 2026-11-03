import { FlaskConical, Loader2 } from 'lucide-react';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginScreen({
  googleBusy = false,
  localBusy = false,
  googleAuthError = null,
  showHiddenGsiButton = false,
  onGoogleSignIn,
  onGuestContinue,
  onEmailSignIn,
  onRetryGoogle,
}) {
  if (localBusy) {
    return (
      <div className="login-container">
        <div className="login-card glass-card animate-fade-in">
          <div className="login-header">
            <div className="logo-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <FlaskConical className="logo-icon" size={32} />
              <span className="logo-text">AURA</span>
            </div>
            <h2>Biomedical Intelligence Engine</h2>
            <p className="subtitle">Secure Google Account Authentication</p>
          </div>
          <div className="login-loading" data-testid="local-login-loading">
            <Loader2 className="animate-spin accent-spinner" size={40} />
            <p>Authenticating credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card glass-card animate-fade-in">
        <div className="login-header">
          <div className="logo-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <FlaskConical className="logo-icon" size={32} />
            <span className="logo-text">AURA</span>
          </div>
          <h2>Biomedical Intelligence Engine</h2>
          <p className="subtitle">Sign in with Google or continue as Guest</p>
        </div>

        <div className="login-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p className="login-instruction" style={{ marginBottom: '0', textAlign: 'center', width: '100%' }}>
            Two ways to start — Google is optional. Guest works offline and never depends on Google.
          </p>

          <div className="login-primary-actions" data-testid="login-primary-actions">
            <div className="google-signin-slot" data-testid="google-signin-slot">
              {showHiddenGsiButton && (
                <div
                  id="google-signin-btn-container"
                  data-testid="gsi-button-container"
                  className="hidden-gsi-button"
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className="google-signin-custom-btn"
                data-testid="google-signin-btn"
                onClick={onGoogleSignIn}
                disabled={googleBusy}
                aria-busy={googleBusy}
              >
                {googleBusy ? <Loader2 className="animate-spin" size={18} /> : <GoogleMark />}
                <span>{googleBusy ? 'Signing in…' : 'Sign in with Google'}</span>
              </button>
            </div>

            <button
              type="button"
              className="guest-login-btn glass-card"
              data-testid="guest-continue-btn"
              onClick={onGuestContinue}
            >
              <FlaskConical size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>Continue as Guest</span>
            </button>
          </div>

          {googleAuthError?.message && (
            <div className="google-signin-error" role="alert" data-testid="google-signin-error">
              <p>{googleAuthError.message}</p>
              {googleAuthError.details && (
                <details className="google-signin-error-details" data-testid="google-signin-error-details">
                  <summary>Technical details</summary>
                  <pre>{googleAuthError.details}</pre>
                </details>
              )}
              {googleAuthError.canRetry && (
                <button
                  type="button"
                  className="google-signin-retry-btn"
                  data-testid="google-signin-retry"
                  onClick={onRetryGoogle || onGoogleSignIn}
                  disabled={googleBusy}
                >
                  Retry Google sign-in
                </button>
              )}
            </div>
          )}

          <div className="divider-or" style={{ margin: '4px 0' }}>
            <span>or enter your email</span>
          </div>

          <form onSubmit={onEmailSignIn} className="custom-login-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <input
              type="email"
              placeholder="name@organization.com"
              required
              className="custom-login-input glass-card"
              data-testid="email-login-input"
              style={{ width: '100%', maxWidth: '420px', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
            <button
              type="submit"
              className="custom-sign-in-btn"
              data-testid="email-login-submit"
              style={{ width: '100%', maxWidth: '420px', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
            >
              <span>Sign In with Email</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

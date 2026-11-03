import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';
import { classifyGoogleAuthError } from './auth/googleAuth';

describe('LoginScreen', () => {
  it('shows Google and Guest as separate side-by-side actions', () => {
    render(
      <LoginScreen
        onGoogleSignIn={() => {}}
        onGuestContinue={() => {}}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );

    const actions = screen.getByTestId('login-primary-actions');
    expect(actions.className).toContain('login-primary-actions');
    expect(screen.getByTestId('google-signin-btn')).toHaveTextContent('Sign in with Google');
    expect(screen.getByTestId('guest-continue-btn')).toHaveTextContent('Continue as Guest');
    expect(actions.children).toHaveLength(2);
  });

  it('lets Guest continue without invoking Google', () => {
    const onGoogleSignIn = vi.fn();
    const onGuestContinue = vi.fn();
    render(
      <LoginScreen
        onGoogleSignIn={onGoogleSignIn}
        onGuestContinue={onGuestContinue}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );

    fireEvent.click(screen.getByTestId('guest-continue-btn'));
    expect(onGuestContinue).toHaveBeenCalledTimes(1);
    expect(onGoogleSignIn).not.toHaveBeenCalled();
  });

  it('keeps Guest available after a cancelled or failed Google sign-in and offers retry', () => {
    const onGoogleSignIn = vi.fn();
    const onGuestContinue = vi.fn();
    const cancelled = classifyGoogleAuthError({ code: 'USER_CANCELLED' });

    render(
      <LoginScreen
        googleAuthError={cancelled}
        onGoogleSignIn={onGoogleSignIn}
        onGuestContinue={onGuestContinue}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );

    expect(screen.getByTestId('google-signin-error')).toHaveTextContent(/cancelled/i);
    expect(screen.getByTestId('google-signin-error')).toHaveTextContent(/guest/i);
    expect(screen.getByTestId('google-signin-error-details')).toHaveTextContent(/USER_CANCELLED/);
    fireEvent.click(screen.getByTestId('google-signin-retry'));
    fireEvent.click(screen.getByTestId('guest-continue-btn'));
    expect(onGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(onGuestContinue).toHaveBeenCalledTimes(1);
  });

  it('does not replace the screen with a spinner while Google is busy, so Guest stays visible', () => {
    render(
      <LoginScreen
        googleBusy
        onGoogleSignIn={() => {}}
        onGuestContinue={() => {}}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );

    expect(screen.queryByTestId('local-login-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('google-signin-btn')).toHaveTextContent('Signing in');
    expect(screen.getByTestId('guest-continue-btn')).toBeEnabled();
  });

  it('keeps the same two visible buttons on web; GSI stays hidden and is not a third control', () => {
    const { rerender } = render(
      <LoginScreen
        showHiddenGsiButton
        onGoogleSignIn={() => {}}
        onGuestContinue={() => {}}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );
    const webActions = screen.getByTestId('login-primary-actions');
    expect(screen.getByTestId('gsi-button-container')).toHaveClass('hidden-gsi-button');
    expect(screen.getByTestId('google-signin-btn')).toHaveTextContent('Sign in with Google');
    expect(screen.getByTestId('guest-continue-btn')).toHaveTextContent('Continue as Guest');
    expect(webActions.querySelectorAll('button')).toHaveLength(2);

    rerender(
      <LoginScreen
        showHiddenGsiButton={false}
        onGoogleSignIn={() => {}}
        onGuestContinue={() => {}}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );
    expect(screen.queryByTestId('gsi-button-container')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-primary-actions').querySelectorAll('button')).toHaveLength(2);
  });

  it('hides technical details until expanded', () => {
    const failed = classifyGoogleAuthError({
      code: 'UNIMPLEMENTED',
      message: 'You CANNOT use scopes without modifying the main activity. Please follow the docs!',
    });
    render(
      <LoginScreen
        googleAuthError={failed}
        onGoogleSignIn={() => {}}
        onGuestContinue={() => {}}
        onEmailSignIn={(e) => e.preventDefault()}
      />
    );
    const details = screen.getByTestId('google-signin-error-details');
    expect(details).not.toHaveAttribute('open');
    expect(details).toHaveTextContent('Technical details');
    expect(details).toHaveTextContent('You CANNOT use scopes');
  });
});

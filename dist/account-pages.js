// Account forms share the configured email callback and use account-neutral messages.
(() => {
  const byId = id => document.getElementById(id);
  const client = window.kamaSupabase;
  const auth = client?.auth;
  const unavailable = window.kamaSupabaseError || 'Account service is unavailable. Try again later.';

  if (byId('intro')) {
    const setup = byId('setupMessage');
    function showSetup(message) {
      setup.textContent = message;
      setup.classList.remove('hidden');
    }
    if (!auth) {
      showSetup(unavailable);
    } else {
      auth.getUser().then(({ data }) => {
        if (!data?.user) return;
        byId('intro').textContent = 'Your next evening starts here.';
        document.querySelector('.actions').classList.add('hidden');
        byId('continue').classList.remove('hidden');
      }).catch(() => showSetup('Connection interrupted. Try signing in again.'));
    }
  }

  function bind(formId, statusId, submitAction) {
    const form = byId(formId);
    if (!form) return;
    const status = byId(statusId);
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      if (!auth) {
        status.textContent = unavailable;
        return;
      }
      submit.disabled = true;
      status.textContent = '';
      try {
        await submitAction(status);
      } catch {
        status.textContent = 'Account service is temporarily unavailable. Try again later.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  function credentials() {
    return { email: byId('email').value.trim(), password: byId('password').value };
  }

  function showSuccess() {
    byId('formPanel').classList.add('hidden');
    byId('success').classList.remove('hidden');
    byId('successTitle').focus();
  }

  function providerUnavailable(error) {
    return error && (!Number.isInteger(error.status) || error.status < 400 || error.status >= 500);
  }

  bind('signinForm', 'status', async status => {
    const { error } = await auth.signInWithPassword(credentials());
    if (providerUnavailable(error)) throw error;
    if (error) {
      status.textContent = 'Could not sign in. Check your email and password or request a password reset.';
      return;
    }
    showSuccess();
  });

  bind('signupForm', 'status', async status => {
    const { data, error } = await auth.signUp({
      ...credentials(),
      options: { emailRedirectTo: window.kamaAuthRedirectUrl }
    });
    if (providerUnavailable(error)) throw error;
    if (error?.code === 'weak_password') {
      status.textContent = 'Choose a stronger password. Use a unique password or passphrase.';
      return;
    }
    if (!error && data?.session) {
      byId('successTitle').textContent = 'Account created';
      byId('successText').textContent = 'Your evening is waiting.';
    } else {
      byId('successTitle').textContent = 'Check your email';
      byId('successText').textContent = 'If we can create an account for this address, you’ll receive a confirmation link. If you already have an account, sign in or reset your password.';
      byId('continue').href = 'signin.html';
      byId('continue').textContent = 'Sign in';
    }
    showSuccess();
  });

  bind('resetForm', 'resetStatus', async status => {
    const { error } = await auth.resetPasswordForEmail(byId('resetEmail').value.trim(), {
      redirectTo: window.kamaAuthRedirectUrl
    });
    if (providerUnavailable(error)) throw error;
    status.textContent = 'If this address can receive a reset link, we’ll send one. Check your spam folder and wait a few minutes before trying again.';
  });
})();

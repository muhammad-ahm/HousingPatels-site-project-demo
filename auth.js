// ===================================================
// Housing Patel — Auth controller
// Wires the Login/Register forms to the Pages Functions API
// via fetch(), and protects dashboard.html.
// ===================================================

function showFormError(message) {
    const el = document.getElementById('formError');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    const successEl = document.getElementById('formSuccess');
    if (successEl) successEl.style.display = 'none';
}

function showFormSuccess(message) {
    const el = document.getElementById('formSuccess');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    const errorEl = document.getElementById('formError');
    if (errorEl) errorEl.style.display = 'none';
}

function setSubmitting(button, isSubmitting, normalText) {
    if (!button) return;
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? 'Please wait…' : normalText;
}

async function postJson(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Marks this as a JS-initiated request. The real CSRF defense is
            // the Origin-header check on the server (functions/_lib/csrf.js);
            // this header is just an extra, conventional signal alongside it.
            'X-Requested-With': 'fetch',
        },
        body: JSON.stringify(data),
        credentials: 'same-origin',
    });
    let body = {};
    try {
        body = await response.json();
    } catch {
        // non-JSON response, leave body empty
    }
    return { ok: response.ok, status: response.status, body };
}

document.addEventListener('DOMContentLoaded', function () {
    // ===================================================
    // Registration form
    // ===================================================
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // validation.js's DOMContentLoaded listener is registered first
            // (it's loaded before auth.js in the HTML), so this function is
            // guaranteed to exist by the time this handler can fire.
            if (typeof window.validateRegisterForm === 'function' && !window.validateRegisterForm()) {
                return;
            }

            const submitBtn = document.getElementById('submitBtn');

            const payload = {
                name: document.getElementById('name').value.trim(),
                gender: document.getElementById('gender').value,
                dob: document.getElementById('dob').value,
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                password: document.getElementById('password').value,
            };

            const confirmPassword = document.getElementById('password_confirm').value;
            if (payload.password !== confirmPassword) {
                showFormError("Passwords don't match.");
                return;
            }

            setSubmitting(submitBtn, true, 'Submit');
            const { ok, body } = await postJson('/auth/register', payload);
            setSubmitting(submitBtn, false, 'Submit');

            if (!ok) {
                showFormError(body.error || 'Something went wrong. Please try again.');
                return;
            }

            showFormSuccess('Account created! Redirecting…');
            setTimeout(() => { window.location.href = './dashboard.html'; }, 800);
        });
    }

    // ===================================================
    // Login form
    // ===================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (typeof window.validateLoginForm === 'function' && !window.validateLoginForm()) {
                return;
            }

            const submitBtn = document.getElementById('submitBtn');

            const payload = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value,
            };

            setSubmitting(submitBtn, true, 'Login');
            const { ok, status, body } = await postJson('/auth/login', payload);
            setSubmitting(submitBtn, false, 'Login');

            if (!ok) {
                if (status === 429) {
                    showFormError(body.error || 'Too many attempts. Please wait a few minutes.');
                } else {
                    showFormError(body.error || 'Incorrect email or password.');
                }
                return;
            }

            showFormSuccess('Welcome back! Redirecting…');
            setTimeout(() => { window.location.href = './dashboard.html'; }, 600);
        });
    }

    // ===================================================
    // Dashboard protection + logout
    // ===================================================
    const dashboardRoot = document.getElementById('dashboardRoot');
    if (dashboardRoot) {
        (async function protectDashboard() {
            const response = await fetch('/auth/me', { credentials: 'same-origin' });
            if (!response.ok) {
                window.location.href = './login.html';
                return;
            }
            const data = await response.json();
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.textContent = data.name || 'there';
            dashboardRoot.style.display = 'flex';
        })();

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function () {
                await fetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'fetch' },
                    credentials: 'same-origin',
                });
                window.location.href = './login.html';
            });
        }
    }
});

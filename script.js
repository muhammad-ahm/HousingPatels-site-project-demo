// Simple client-side auth demo for HousingPatels.
// NOTE: This is a DEMO pattern, not real security. Data lives in the
// browser's localStorage in plain text — fine for showing the login/
// registration flow works, not for real user accounts. For a real
// backend on Cloudflare Pages, look into Pages Functions + D1 later.

const USERS_KEY = "housingpatels_users";
const SESSION_KEY = "housingpatels_current_user";

function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.style.color = "#c0392b";
}

function showSuccess(el, message) {
    if (!el) return;
    el.textContent = message;
    el.style.color = "#15803d";
}

// ---------------- Registration ----------------
const registrationForm = document.getElementById("registrationForm");
if (registrationForm) {
    const statusEl = document.getElementById("formStatus");

    registrationForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const gender = document.getElementById("gender").value;
        const dob = document.getElementById("dob").value;
        const email = document.getElementById("email").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value;

        if (!name || !gender || !dob || !email || !phone || !password) {
            showError(statusEl, "Please fill in all fields.");
            return;
        }

        const users = getUsers();

        if (users.some(function (u) { return u.email === email; })) {
            showError(statusEl, "An account with this email already exists.");
            return;
        }

        users.push({
            name: name,
            gender: gender,
            dob: dob,
            email: email,
            phone: phone,
            password: password
        });
        saveUsers(users);

        showSuccess(statusEl, "Account created! Redirecting to login...");
        setTimeout(function () {
            window.location.href = "login.html";
        }, 1200);
    });
}

// ---------------- Login ----------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    const statusEl = document.getElementById("formStatus");

    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const email = document.getElementById("username").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            showError(statusEl, "Please enter your email and password.");
            return;
        }

        const users = getUsers();
        const match = users.find(function (u) {
            return u.email === email && u.password === password;
        });

        if (!match) {
            showError(statusEl, "Invalid email or password.");
            return;
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify({ name: match.name, email: match.email }));
        showSuccess(statusEl, "Login successful! Redirecting...");
        setTimeout(function () {
            window.location.href = "index.html";
        }, 1000);
    });
}

// ---------------- Logout helper (optional, call from index.html) ----------------
function housingPatelsLogout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
}

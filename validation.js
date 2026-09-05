// ===================================================
// Housing Patel — Client-side form validation
// This is a UX layer only. The PHP backend re-validates
// everything server-side and is the real source of truth —
// this script never replaces that, it just gives the user
// faster feedback before they hit submit.
// ===================================================

function showFieldError(input, message) {
    clearFieldError(input);
    input.classList.add("field-invalid");
    const err = document.createElement("small");
    err.className = "field-error-msg";
    err.textContent = message;
    input.insertAdjacentElement("afterend", err);
}

function clearFieldError(input) {
    input.classList.remove("field-invalid");
    input.classList.remove("field-valid");
    const next = input.nextElementSibling;
    if (next && next.classList.contains("field-error-msg")) {
        next.remove();
    }
}

function markFieldValid(input) {
    clearFieldError(input);
    input.classList.add("field-valid");
}

function isValidEmailFormat(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ---------------------------------------------------
// Password strength check
// Returns { score: 0-4, label: string }
// ---------------------------------------------------
function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

    const labels = ["Too weak", "Weak", "Okay", "Good", "Strong"];
    return { score, label: labels[score] };
}

function renderPasswordStrength(password, meterEl, labelEl) {
    if (!password) {
        meterEl.style.width = "0%";
        meterEl.style.backgroundColor = "transparent";
        labelEl.textContent = "";
        return;
    }
    const { score, label } = checkPasswordStrength(password);
    const percent = (score / 4) * 100;
    const colors = ["#c0392b", "#e67e22", "#f1c40f", "#2ecc71", "#159957"];
    meterEl.style.width = percent + "%";
    meterEl.style.backgroundColor = colors[score];
    labelEl.textContent = label;
}

// ===================================================
// Registration form wiring
// ===================================================
document.addEventListener("DOMContentLoaded", function () {
    const regForm = document.querySelector('form[action*="process-register"]');
    if (regForm) {
        const nameInput = regForm.querySelector('[name="name"]');
        const emailInput = regForm.querySelector('[name="email"]');
        const phoneInput = regForm.querySelector('[name="phone"]');
        const passwordInput = regForm.querySelector('[name="password"]');
        const confirmInput = regForm.querySelector('[name="password_confirm"]');
        const submitBtn = regForm.querySelector('button[type="submit"]');

        // Password strength meter UI, inserted right after the password field
        const strengthWrap = document.createElement("div");
        strengthWrap.className = "password-strength-wrap";
        strengthWrap.innerHTML =
            '<div class="password-strength-track"><div class="password-strength-fill"></div></div>' +
            '<small class="password-strength-label"></small>';
        passwordInput.insertAdjacentElement("afterend", strengthWrap);
        const strengthFill = strengthWrap.querySelector(".password-strength-fill");
        const strengthLabel = strengthWrap.querySelector(".password-strength-label");

        function validateName() {
            if (nameInput.value.trim().length === 0) {
                showFieldError(nameInput, "Name is required.");
                return false;
            }
            markFieldValid(nameInput);
            return true;
        }

        function validateEmail() {
            if (!isValidEmailFormat(emailInput.value.trim())) {
                showFieldError(emailInput, "Enter a valid email address.");
                return false;
            }
            markFieldValid(emailInput);
            return true;
        }

        function validatePhone() {
            const digits = phoneInput.value.replace(/\D/g, "");
            if (digits.length < 10) {
                showFieldError(phoneInput, "Enter a valid phone number.");
                return false;
            }
            markFieldValid(phoneInput);
            return true;
        }

        function validatePassword() {
            renderPasswordStrength(passwordInput.value, strengthFill, strengthLabel);
            if (passwordInput.value.length < 8) {
                showFieldError(passwordInput, "Use at least 8 characters.");
                return false;
            }
            markFieldValid(passwordInput);
            return true;
        }

        function validateConfirm() {
            if (confirmInput.value !== passwordInput.value || confirmInput.value === "") {
                showFieldError(confirmInput, "Passwords don't match.");
                return false;
            }
            markFieldValid(confirmInput);
            return true;
        }

        nameInput.addEventListener("input", validateName);
        emailInput.addEventListener("input", validateEmail);
        phoneInput.addEventListener("input", validatePhone);
        passwordInput.addEventListener("input", function () {
            validatePassword();
            if (confirmInput.value) validateConfirm();
        });
        confirmInput.addEventListener("input", validateConfirm);

        regForm.addEventListener("submit", function (e) {
            const checks = [validateName(), validateEmail(), validatePhone(), validatePassword(), validateConfirm()];
            if (checks.includes(false)) {
                e.preventDefault();
            }
        });
    }

    // ===================================================
    // Login form wiring (lighter touch — server does the real check)
    // ===================================================
    const loginForm = document.querySelector('form[action*="process-login"]');
    if (loginForm) {
        const emailInput = loginForm.querySelector('[name="email"]');
        emailInput.addEventListener("blur", function () {
            if (emailInput.value.trim() === "") return;
            if (!isValidEmailFormat(emailInput.value.trim())) {
                showFieldError(emailInput, "Enter a valid email address.");
            } else {
                markFieldValid(emailInput);
            }
        });
    }
});

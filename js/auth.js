const AUTH_API_URL = "http://127.0.0.1:8000/auth";

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const registerForm = document.getElementById("registerForm");
const registerFullName = document.getElementById("registerFullName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerBtn = document.getElementById("registerBtn");

const authMessage = document.getElementById("authMessage");

const authLoginTab = document.getElementById("authLoginTab");
const authRegisterTab = document.getElementById("authRegisterTab");
const goToRegisterBtn = document.getElementById("goToRegisterBtn");
const goToLoginBtn = document.getElementById("goToLoginBtn");

document.addEventListener("DOMContentLoaded", setupInitialAuthMode);

authLoginTab.addEventListener("click", function () {
  setAuthMode("login", true);
});

authRegisterTab.addEventListener("click", function () {
  setAuthMode("register", true);
});

goToRegisterBtn.addEventListener("click", function () {
  setAuthMode("register", true);
});

goToLoginBtn.addEventListener("click", function () {
  setAuthMode("login", true);
});

window.addEventListener("hashchange", setupInitialAuthMode);

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const payload = {
    email: loginEmail.value.trim(),
    password: loginPassword.value,
  };

  if (!payload.email || !payload.password) {
    showAuthMessage("Completá email y contraseña.", true);
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Ingresando...";

    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo iniciar sesión.");
    }

    saveSession(result);

    showAuthMessage("Ingreso correcto. Redirigiendo...", true);

    window.location.href = "./app.html";
  } catch (error) {
    console.error(error);
    showAuthMessage(error.message || "No se pudo iniciar sesión.", true);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Ingresar";
  }
});

registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const payload = {
    full_name: registerFullName.value.trim() || null,
    email: registerEmail.value.trim(),
    password: registerPassword.value,
  };

  if (!payload.email || !payload.password) {
    showAuthMessage("Completá email y contraseña.", true);
    return;
  }

  if (payload.password.length < 6) {
    showAuthMessage("La contraseña debe tener al menos 6 caracteres.", true);
    return;
  }

  try {
    registerBtn.disabled = true;
    registerBtn.textContent = "Creando cuenta...";

    const response = await fetch(`${AUTH_API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo crear la cuenta.");
    }

    saveSession(result);

    showAuthMessage("Cuenta creada correctamente. Redirigiendo...", true);

    window.location.href = "./app.html";
  } catch (error) {
    console.error(error);
    showAuthMessage(error.message || "No se pudo crear la cuenta.", true);
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = "Crear cuenta";
  }
});

function setupInitialAuthMode() {
  const hash = window.location.hash;

  if (hash === "#registerForm" || hash === "#crear-cuenta") {
    setAuthMode("register", false);
    return;
  }

  setAuthMode("login", false);
}

function setAuthMode(mode, updateUrl) {
  showAuthMessage("", false);

  const isRegisterMode = mode === "register";

  loginForm.classList.toggle("auth-form-hidden", isRegisterMode);
  registerForm.classList.toggle("auth-form-hidden", !isRegisterMode);

  authLoginTab.classList.toggle("active", !isRegisterMode);
  authRegisterTab.classList.toggle("active", isRegisterMode);

  if (updateUrl) {
    const newHash = isRegisterMode ? "#registerForm" : "#loginForm";
    history.replaceState(null, "", newHash);
  }
}

function saveSession(result) {
  localStorage.setItem("plazoclaro_token", result.access_token);
  localStorage.setItem("plazoclaro_user", JSON.stringify(result.user));
}

function showAuthMessage(message, visible) {
  if (!visible || !message) {
    authMessage.classList.add("hidden");
    authMessage.textContent = "";
    return;
  }

  authMessage.textContent = message;
  authMessage.classList.remove("hidden");
}
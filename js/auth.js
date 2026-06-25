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

    window.location.href = "./index.html";
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

    window.location.href = "./index.html";
  } catch (error) {
    console.error(error);
    showAuthMessage(error.message || "No se pudo crear la cuenta.", true);
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = "Crear cuenta";
  }
});


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
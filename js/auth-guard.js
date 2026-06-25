const AUTH_GUARD_API_URL = "http://127.0.0.1:8000/auth";

const token = localStorage.getItem("plazoclaro_token");

if (!token) {
  window.location.href = "./auth.html";
} else {
  validateCurrentSession();
}


async function validateCurrentSession() {
  try {
    const response = await fetch(`${AUTH_GUARD_API_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearSessionAndRedirect();
      return;
    }

    const user = await response.json();

    localStorage.setItem("plazoclaro_user", JSON.stringify(user));
  } catch (error) {
    console.error("No se pudo validar la sesión.", error);
    clearSessionAndRedirect();
  }
}


function clearSessionAndRedirect() {
  localStorage.removeItem("plazoclaro_token");
  localStorage.removeItem("plazoclaro_user");

  window.location.href = "./auth.html";
}
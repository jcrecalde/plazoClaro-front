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

    renderAuthenticatedUser(user);
  } catch (error) {
    console.error("No se pudo validar la sesión.", error);
    clearSessionAndRedirect();
  }
}


function renderAuthenticatedUser(user) {
  const navbarContent = document.querySelector(".navbar-content");

  if (!navbarContent) {
    return;
  }

  const existingUserBox = document.getElementById("authenticatedUserBox");

  if (existingUserBox) {
    existingUserBox.remove();
  }

  const userBox = document.createElement("div");
  userBox.id = "authenticatedUserBox";
  userBox.className = "authenticated-user-box";

  const userLabel = document.createElement("span");
  userLabel.className = "authenticated-user-label";
  userLabel.textContent = getUserDisplayName(user);

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "authenticated-logout-btn";
  logoutButton.textContent = "Cerrar sesión";

  logoutButton.addEventListener("click", function () {
    clearSessionAndRedirect();
  });

  userBox.appendChild(userLabel);
  userBox.appendChild(logoutButton);

  navbarContent.appendChild(userBox);
}


function getUserDisplayName(user) {
  if (!user) {
    return "Usuario";
  }

  if (user.full_name) {
    return user.full_name;
  }

  if (user.email) {
    return user.email;
  }

  return "Usuario";
}


function clearSessionAndRedirect() {
  localStorage.removeItem("plazoclaro_token");
  localStorage.removeItem("plazoclaro_user");

  window.location.href = "./auth.html";
}
const DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines";

const deadlinesTableBody = document.getElementById("deadlinesTableBody");
const dashboardSummary = document.getElementById("dashboardSummary");
const dashboardMessage = document.getElementById("dashboardMessage");
const refreshDeadlinesBtn = document.getElementById("refreshDeadlinesBtn");

const totalDeadlines = document.getElementById("totalDeadlines");
const pendingDeadlines = document.getElementById("pendingDeadlines");
const completedDeadlines = document.getElementById("completedDeadlines");
const expiredDeadlines = document.getElementById("expiredDeadlines");

const filterButtons = document.querySelectorAll(".filter-btn");

let allDeadlines = [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", loadDeadlines);

refreshDeadlinesBtn.addEventListener("click", loadDeadlines);

filterButtons.forEach((button) => {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;

    setActiveFilterButton(currentFilter);
    renderDeadlines(getFilteredDeadlines());
  });
});

async function loadDeadlines() {
  try {
    showMessage("", false);

    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Cargando vencimientos...</td>
      </tr>
    `;

    const response = await fetch(DEADLINES_API_URL);

    if (!response.ok) {
      throw new Error("No se pudieron obtener los vencimientos.");
    }

    const deadlines = await response.json();

    allDeadlines = sortDeadlines(deadlines);
    updateSummaryCards(allDeadlines);
    renderDeadlines(getFilteredDeadlines());
  } catch (error) {
    console.error(error);

    dashboardSummary.textContent = "No se pudieron cargar los vencimientos.";

    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">No se pudieron cargar los vencimientos. Verificá que el backend esté levantado.</td>
      </tr>
    `;
  }
}

function sortDeadlines(deadlines) {
  return [...deadlines].sort((a, b) => {
    const statusOrder = {
      expired: 1,
      pending: 2,
      completed: 3,
    };

    const statusA = statusOrder[getComputedStatus(a)] || 99;
    const statusB = statusOrder[getComputedStatus(b)] || 99;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    return new Date(a.deadline_date) - new Date(b.deadline_date);
  });
}

function getComputedStatus(deadline) {
  if (deadline.status === "completed") {
    return "completed";
  }

  if (isExpired(deadline.deadline_date)) {
    return "expired";
  }

  return "pending";
}

function getFilteredDeadlines() {
  if (currentFilter === "all") {
    return allDeadlines;
  }

  return allDeadlines.filter((deadline) => getComputedStatus(deadline) === currentFilter);
}

function updateSummaryCards(deadlines) {
  const counts = {
    total: deadlines.length,
    pending: 0,
    completed: 0,
    expired: 0,
  };

  deadlines.forEach((deadline) => {
    const status = getComputedStatus(deadline);

    if (status === "pending") counts.pending++;
    if (status === "completed") counts.completed++;
    if (status === "expired") counts.expired++;
  });

  totalDeadlines.textContent = counts.total;
  pendingDeadlines.textContent = counts.pending;
  completedDeadlines.textContent = counts.completed;
  expiredDeadlines.textContent = counts.expired;
}

function renderDeadlines(deadlines) {
  if (!allDeadlines.length) {
    dashboardSummary.textContent = "No hay plazos guardados todavía.";

    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Todavía no hay vencimientos guardados.</td>
      </tr>
    `;

    return;
  }

  dashboardSummary.textContent = `${allDeadlines.length} plazo(s) guardado(s).`;

  if (!deadlines.length) {
    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">No hay vencimientos para el filtro seleccionado.</td>
      </tr>
    `;

    return;
  }

  deadlinesTableBody.innerHTML = "";

  deadlines.forEach((deadline) => {
    const computedStatus = getComputedStatus(deadline);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHTML(deadline.case_name || "Sin expediente")}</td>
      <td>${escapeHTML(deadline.action_type || "Sin actuación")}</td>
      <td>${formatDate(deadline.notification_date)}</td>
      <td><strong>${formatDate(deadline.deadline_date)}</strong></td>
      <td>
        <span class="status-badge ${getStatusClass(computedStatus)}">
          ${getStatusLabel(computedStatus)}
        </span>
      </td>
      <td>
        <div class="table-actions">
          ${
            deadline.status !== "completed"
              ? `<button class="btn-small btn-complete" data-id="${deadline.id}">Completar</button>`
              : `<button class="btn-small btn-pending" data-id="${deadline.id}">Pendiente</button>`
          }
          <button class="btn-small btn-delete" data-id="${deadline.id}">Eliminar</button>
        </div>
      </td>
    `;

    deadlinesTableBody.appendChild(row);
  });

  attachActionEvents();
}

function attachActionEvents() {
  const completeButtons = document.querySelectorAll(".btn-complete");
  const pendingButtons = document.querySelectorAll(".btn-pending");
  const deleteButtons = document.querySelectorAll(".btn-delete");

  completeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      updateDeadlineStatus(button.dataset.id, "completed");
    });
  });

  pendingButtons.forEach((button) => {
    button.addEventListener("click", function () {
      updateDeadlineStatus(button.dataset.id, "pending");
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      deleteDeadline(button.dataset.id);
    });
  });
}

async function updateDeadlineStatus(deadlineId, status) {
  try {
    const response = await fetch(`${DEADLINES_API_URL}/${deadlineId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("No se pudo actualizar el estado.");
    }

    showMessage("Estado actualizado correctamente.", true);
    loadDeadlines();
  } catch (error) {
    console.error(error);
    showMessage("No se pudo actualizar el estado del plazo.", true);
  }
}

async function deleteDeadline(deadlineId) {
  const confirmDelete = confirm("¿Seguro que querés eliminar este plazo?");

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(`${DEADLINES_API_URL}/${deadlineId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("No se pudo eliminar el plazo.");
    }

    showMessage("Plazo eliminado correctamente.", true);
    loadDeadlines();
  } catch (error) {
    console.error(error);
    showMessage("No se pudo eliminar el plazo.", true);
  }
}

function setActiveFilterButton(filter) {
  filterButtons.forEach((button) => {
    if (button.dataset.filter === filter) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

function isExpired(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate < today;
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status) {
  if (status === "pending") return "Pendiente";
  if (status === "completed") return "Completado";
  if (status === "expired") return "Vencido";

  return "Sin estado";
}

function getStatusClass(status) {
  if (status === "pending") return "status-pending";
  if (status === "completed") return "status-completed";
  if (status === "expired") return "status-expired";

  return "";
}

function showMessage(message, visible) {
  if (!visible || !message) {
    dashboardMessage.classList.add("hidden");
    dashboardMessage.textContent = "";
    return;
  }

  dashboardMessage.textContent = message;
  dashboardMessage.classList.remove("hidden");
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
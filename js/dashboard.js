const DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines";

const deadlinesTableBody = document.getElementById("deadlinesTableBody");
const dashboardSummary = document.getElementById("dashboardSummary");
const dashboardMessage = document.getElementById("dashboardMessage");
const refreshDeadlinesBtn = document.getElementById("refreshDeadlinesBtn");

const totalDeadlines = document.getElementById("totalDeadlines");
const pendingDeadlines = document.getElementById("pendingDeadlines");
const completedDeadlines = document.getElementById("completedDeadlines");
const expiredDeadlines = document.getElementById("expiredDeadlines"); 
const upcomingDeadlines = document.getElementById("upcomingDeadlines");
  
const deadlineSearch = document.getElementById("deadlineSearch");
const filterButtons = document.querySelectorAll(".filter-btn"); 

const deadlineDetailPanel = document.getElementById("deadlineDetailPanel");
const closeDetailBtn = document.getElementById("closeDetailBtn");

const detailCaseName = document.getElementById("detailCaseName");
const detailActionType = document.getElementById("detailActionType");
const detailNotificationDate = document.getElementById("detailNotificationDate");
const detailStartRule = document.getElementById("detailStartRule");
const detailStartDate = document.getElementById("detailStartDate");
const detailDeadlineDate = document.getElementById("detailDeadlineDate");
const detailStatus = document.getElementById("detailStatus");
const detailExcludedDays = document.getElementById("detailExcludedDays");
const detailNotes = document.getElementById("detailNotes"); 

const deadlineEditPanel = document.getElementById("deadlineEditPanel");
const deadlineEditForm = document.getElementById("deadlineEditForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const editDeadlineId = document.getElementById("editDeadlineId");
const editCaseName = document.getElementById("editCaseName");
const editActionType = document.getElementById("editActionType");
const editNotificationDate = document.getElementById("editNotificationDate");
const editStartRule = document.getElementById("editStartRule");
const editDaysCount = document.getElementById("editDaysCount");
const editDayType = document.getElementById("editDayType");
const editJurisdiction = document.getElementById("editJurisdiction");
const editNotes = document.getElementById("editNotes");

let allDeadlines = [];
let currentFilter = "all"; 
let currentSearch = "";

document.addEventListener("DOMContentLoaded", loadDeadlines);

refreshDeadlinesBtn.addEventListener("click", loadDeadlines);


deadlineSearch.addEventListener("input", function () {
  currentSearch = deadlineSearch.value.trim().toLowerCase();
  renderDeadlines(getFilteredDeadlines());
});

closeDetailBtn.addEventListener("click", function () {
  deadlineDetailPanel.classList.add("hidden");
}); 

cancelEditBtn.addEventListener("click", function () {
  deadlineEditPanel.classList.add("hidden");
});

filterButtons.forEach((button) => {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;

    setActiveFilterButton(currentFilter);
    renderDeadlines(getFilteredDeadlines());
  });
}); 


deadlineEditForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const deadlineId = editDeadlineId.value;

  const payload = {
    case_name: editCaseName.value.trim() || null,
    action_type: editActionType.value || null,
    notification_date: editNotificationDate.value,
    days_count: Number(editDaysCount.value),
    day_type: editDayType.value,
    jurisdiction: editJurisdiction.value,
    start_rule: editStartRule.value,
    notes: editNotes.value.trim() || null,
  };

  if (!deadlineId) {
    showMessage("No se encontró el ID del plazo a editar.", true);
    return;
  }

  if (!payload.notification_date || !payload.days_count || payload.days_count <= 0) {
    showMessage("Completá una fecha válida y una cantidad de días mayor a cero.", true);
    return;
  }

  try {
    const response = await fetch(`${DEADLINES_API_URL}/${deadlineId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("No se pudo editar el plazo.");
    }

    showMessage("Plazo editado y recalculado correctamente.", true);

    deadlineEditPanel.classList.add("hidden");

    await loadDeadlines();
  } catch (error) {
    console.error(error);
    showMessage("No se pudo editar el plazo. Verificá que el backend esté funcionando.", true);
  }
});

async function loadDeadlines() {
  try {
    showMessage("", false);

    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="7">Cargando vencimientos...</td>
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
        <td colspan="7">No se pudieron cargar los vencimientos. Verificá que el backend esté levantado.</td>
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
  let filteredDeadlines = allDeadlines;

  if (currentFilter === "upcoming") {
    filteredDeadlines = filteredDeadlines.filter((deadline) =>
      isUpcoming(deadline)
    );
  } else if (currentFilter !== "all") {
    filteredDeadlines = filteredDeadlines.filter(
      (deadline) => getComputedStatus(deadline) === currentFilter
    );
  }

  if (currentSearch) {
    filteredDeadlines = filteredDeadlines.filter((deadline) => {
      const computedStatus = getComputedStatus(deadline);

      const searchableText = [
        deadline.case_name,
        deadline.action_type,
        deadline.notes,
        deadline.notification_date,
        deadline.start_date,
        deadline.deadline_date,
        getStatusLabel(computedStatus),
        getStartRuleLabel(deadline.start_rule),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(currentSearch);
    });
  }

  return filteredDeadlines;
}

function updateSummaryCards(deadlines) {
  const counts = {
    total: deadlines.length,
    pending: 0,
    completed: 0,
    expired: 0,
    upcoming: 0,
  };

  deadlines.forEach((deadline) => {
    const status = getComputedStatus(deadline);

    if (status === "pending") counts.pending++;
    if (status === "completed") counts.completed++;
    if (status === "expired") counts.expired++;
    if (isUpcoming(deadline)) counts.upcoming++;
  });

  totalDeadlines.textContent = counts.total;
  pendingDeadlines.textContent = counts.pending;
  completedDeadlines.textContent = counts.completed;
  expiredDeadlines.textContent = counts.expired;
  upcomingDeadlines.textContent = counts.upcoming;
}

function renderDeadlines(deadlines) {
  if (!allDeadlines.length) {
    dashboardSummary.textContent = "No hay plazos guardados todavía.";

    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="7">Todavía no hay vencimientos guardados.</td>
      </tr>
    `;

    return;
  }

  dashboardSummary.textContent = `${allDeadlines.length} plazo(s) guardado(s).`;

  if (!deadlines.length) {
    let emptyMessage = "No hay vencimientos para el filtro seleccionado.";

    if (currentSearch) {
      emptyMessage = "No hay vencimientos que coincidan con la búsqueda.";
    }

    if (currentFilter === "upcoming") {
      emptyMessage = "No hay vencimientos pendientes dentro de los próximos 7 días.";
    }

    deadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="7">${emptyMessage}</td>
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
      <td>${getStartRuleLabel(deadline.start_rule)}</td>
      <td><strong>${formatDate(deadline.deadline_date)}</strong>${renderUrgencyBadge(deadline)}</td>
      <td>
        <span class="status-badge ${getStatusClass(computedStatus)}">
          ${getStatusLabel(computedStatus)}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-small btn-detail" data-id="${deadline.id}">
            Ver detalle
          </button>

          <button class="btn-small btn-edit" data-id="${deadline.id}">
            Editar
          </button>

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
  const detailButtons = document.querySelectorAll(".btn-detail");
  const editButtons = document.querySelectorAll(".btn-edit");
  const completeButtons = document.querySelectorAll(".btn-complete");
  const pendingButtons = document.querySelectorAll(".btn-pending");
  const deleteButtons = document.querySelectorAll(".btn-delete");

  detailButtons.forEach((button) => {
    button.addEventListener("click", function () {
      showDeadlineDetail(button.dataset.id);
    });
  });

  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      showEditForm(button.dataset.id);
    });
  });

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


function showDeadlineDetail(deadlineId) {
  const deadline = allDeadlines.find((item) => item.id === deadlineId);

  if (!deadline) {
    showMessage("No se pudo encontrar el detalle del plazo.", true);
    return;
  }

  const computedStatus = getComputedStatus(deadline);

  detailCaseName.textContent = deadline.case_name || "Sin expediente";
  detailActionType.textContent = deadline.action_type || "Sin actuación";
  detailNotificationDate.textContent = formatDate(deadline.notification_date);
  detailStartRule.textContent = getStartRuleLabel(deadline.start_rule);
  detailStartDate.textContent = formatDate(deadline.start_date);
  detailDeadlineDate.textContent = formatDate(deadline.deadline_date);
  detailStatus.textContent = getStatusLabel(computedStatus);
  detailNotes.textContent = deadline.notes || "Sin observaciones cargadas.";

  renderExcludedDaysDetail(deadline.excluded_days || []);

  deadlineDetailPanel.classList.remove("hidden");

  deadlineDetailPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}


function renderExcludedDaysDetail(excludedDays) {
  detailExcludedDays.innerHTML = "";

  if (!excludedDays.length) {
    const item = document.createElement("li");
    item.textContent = "No se excluyeron días durante el período computado.";
    detailExcludedDays.appendChild(item);
    return;
  }

  excludedDays.forEach((excludedDay) => {
    const item = document.createElement("li");
    item.textContent = `${formatDate(excludedDay.date)} - ${excludedDay.reason}`;
    detailExcludedDays.appendChild(item);
  });
} 


function showEditForm(deadlineId) {
  const deadline = allDeadlines.find((item) => item.id === deadlineId);

  if (!deadline) {
    showMessage("No se pudo encontrar el plazo para editar.", true);
    return;
  }

  editDeadlineId.value = deadline.id;
  editCaseName.value = deadline.case_name || "";
  editActionType.value = deadline.action_type || "";
  editNotificationDate.value = deadline.notification_date;
  editStartRule.value = deadline.start_rule || "next_day";
  editDaysCount.value = deadline.days_count;
  editDayType.value = deadline.day_type;
  editJurisdiction.value = deadline.jurisdiction;
  editNotes.value = deadline.notes || "";

  deadlineDetailPanel.classList.add("hidden");
  deadlineEditPanel.classList.remove("hidden");

  deadlineEditPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
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

function isUpcoming(deadline) {
  if (deadline.status === "completed") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextSevenDays = new Date(today);
  nextSevenDays.setDate(today.getDate() + 7);

  const [year, month, day] = deadline.deadline_date.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate >= today && deadlineDate <= nextSevenDays;
} 

function getDaysUntilDeadline(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  const differenceInMs = deadlineDate - today;
  return Math.round(differenceInMs / (1000 * 60 * 60 * 24));
}

function getUrgencyInfo(deadline) {
  if (deadline.status === "completed") {
    return null;
  }

  const daysUntilDeadline = getDaysUntilDeadline(deadline.deadline_date);

  if (daysUntilDeadline < 0) {
    return {
      label: "Vencido",
      className: "urgency-expired",
    };
  }

  if (daysUntilDeadline === 0) {
    return {
      label: "Vence hoy",
      className: "urgency-today",
    };
  }

  if (daysUntilDeadline === 1) {
    return {
      label: "Vence mañana",
      className: "urgency-tomorrow",
    };
  }

  if (daysUntilDeadline <= 7) {
    return {
      label: `En ${daysUntilDeadline} días`,
      className: "urgency-upcoming",
    };
  }

  return {
    label: "Más adelante",
    className: "urgency-later",
  };
}

function renderUrgencyBadge(deadline) {
  const urgencyInfo = getUrgencyInfo(deadline);

  if (!urgencyInfo) {
    return "";
  }

  return `
    <span class="urgency-badge ${urgencyInfo.className}">
      ${urgencyInfo.label}
    </span>
  `;
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

function getStartRuleLabel(startRule) {
  if (startRule === "same_day") return "Mismo día";
  return "Día siguiente";
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
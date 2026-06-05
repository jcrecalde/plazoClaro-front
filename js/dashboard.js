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

const exportDetailPdfBtn = document.getElementById("exportDetailPdfBtn");

const deadlineDetailPanel = document.getElementById("deadlineDetailPanel");
const closeDetailBtn = document.getElementById("closeDetailBtn");

const detailCaseName = document.getElementById("detailCaseName");
const detailActionType = document.getElementById("detailActionType");
const detailNotificationDate = document.getElementById("detailNotificationDate");
const detailStartRule = document.getElementById("detailStartRule");
const detailStartDate = document.getElementById("detailStartDate");
const detailDeadlineDate = document.getElementById("detailDeadlineDate");
const detailStatus = document.getElementById("detailStatus");
const detailDepartment = document.getElementById("detailDepartment");
const detailExcludedDays = document.getElementById("detailExcludedDays");
const detailNotes = document.getElementById("detailNotes");
const detailHistory = document.getElementById("detailHistory");

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
const editDepartment = document.getElementById("editDepartment");
const editDepartmentGroup = document.getElementById("editDepartmentGroup");
const editNotes = document.getElementById("editNotes");   

const nonWorkingDaysTopScroll = document.getElementById("nonWorkingDaysTopScroll");
const nonWorkingDaysTopScrollInner = document.getElementById("nonWorkingDaysTopScrollInner");
const nonWorkingDaysTableScroll = document.getElementById("nonWorkingDaysTableScroll");

populatePbaDepartmentSelect(editDepartment, {
  includeEmpty: true,
  emptyLabel: "Sin departamento específico",
});

let allDeadlines = [];
let currentFilter = "all";
let currentSearch = "";
let selectedDeadlineForDetail = null;  

let isSyncingHorizontalScroll = false;

if (nonWorkingDaysTopScroll && nonWorkingDaysTableScroll) {
  nonWorkingDaysTopScroll.addEventListener("scroll", function () {
    if (isSyncingHorizontalScroll) return;

    isSyncingHorizontalScroll = true;
    nonWorkingDaysTableScroll.scrollLeft = nonWorkingDaysTopScroll.scrollLeft;
    isSyncingHorizontalScroll = false;
  });

  nonWorkingDaysTableScroll.addEventListener("scroll", function () {
    if (isSyncingHorizontalScroll) return;

    isSyncingHorizontalScroll = true;
    nonWorkingDaysTopScroll.scrollLeft = nonWorkingDaysTableScroll.scrollLeft;
    isSyncingHorizontalScroll = false;
  });
}

document.addEventListener("DOMContentLoaded", loadDeadlines);

refreshDeadlinesBtn.addEventListener("click", loadDeadlines);


deadlineSearch.addEventListener("input", function () {
  currentSearch = deadlineSearch.value.trim().toLowerCase();
  renderDeadlines(getFilteredDeadlines());
});

closeDetailBtn.addEventListener("click", function () {
  deadlineDetailPanel.classList.add("hidden");
});  

exportDetailPdfBtn.addEventListener("click", function () {
  if (!selectedDeadlineForDetail) {
    showMessage("Primero seleccioná un plazo para exportar.", true);
    return;
  }

  exportDeadlineDetailToPdf(selectedDeadlineForDetail);
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


editJurisdiction.addEventListener("change", updateEditDepartmentVisibility); 


function updateNonWorkingDaysTopScrollWidth() {
  if (!nonWorkingDaysTopScrollInner || !nonWorkingDaysTableScroll) return;

  const table = nonWorkingDaysTableScroll.querySelector(".deadlines-table");

  if (!table) return;

  nonWorkingDaysTopScrollInner.style.width = `${table.scrollWidth}px`;
}

function updateEditDepartmentVisibility() {
  if (editJurisdiction.value === "pba") {
    editDepartmentGroup.classList.remove("hidden");
    editDepartmentGroup.style.display = "block";
    return;
  }

  editDepartment.value = "";
  editDepartmentGroup.classList.add("hidden");
  editDepartmentGroup.style.display = "none";
}


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
    department: editJurisdiction.value === "pba" ? editDepartment.value || null : null,
    locality: null,
    court: null,
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
  updateNonWorkingDaysTopScrollWidth();
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
  selectedDeadlineForDetail = deadline;

  detailCaseName.textContent = deadline.case_name || "Sin expediente";
  detailActionType.textContent = deadline.action_type || "Sin actuación";
  detailNotificationDate.textContent = formatDate(deadline.notification_date);
  detailStartRule.textContent = getStartRuleLabel(deadline.start_rule);
  detailStartDate.textContent = formatDate(deadline.start_date);
  detailDeadlineDate.textContent = formatDate(deadline.deadline_date);
  detailStatus.textContent = getStatusLabel(computedStatus);
  detailDepartment.textContent = deadline.department || "Sin departamento específico";
  detailNotes.textContent = deadline.notes || "Sin observaciones cargadas.";

  renderExcludedDaysDetail(deadline.excluded_days || []); 
  renderDeadlineHistory(deadline.history || []);

  deadlineDetailPanel.classList.remove("hidden");

  deadlineDetailPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}


function renderExcludedDaysDetail(excludedDays) {
  detailExcludedDays.innerHTML = "";

  if (!excludedDays.length) {
    detailExcludedDays.innerHTML = `
      <li class="detail-notes">
        No se excluyeron días durante el período computado.
      </li>
    `;
    return;
  }

  detailExcludedDays.innerHTML = excludedDays
    .map((day) => {
      return `
        <li class="excluded-day-card">
          <strong>${formatDate(day.date)} - ${escapeHTML(day.reason)}</strong>

          <div class="excluded-day-meta">
            <span>${getExcludedDayTypeLabel(day.type, day.reason)}</span>
            <span>Alcance: ${getExcludedDayScopeLabel(day.scope, day.type, day.reason)}</span>
            <span>Fuente: ${getExcludedDaySourceLabel(day.source, day.type, day.reason)}</span>
            <span>${getExcludedDayVerifiedLabel(day.verified)}</span>
          </div>

          ${
            day.department
              ? `<p><strong>Departamento:</strong> ${escapeHTML(day.department)}</p>`
              : ""
          }

          ${
            day.source_reference
              ? `<p><strong>Referencia:</strong> ${escapeHTML(day.source_reference)}</p>`
              : ""
          }
        </li>
      `;
    })
    .join("");
}

function renderDeadlineHistory(history) {
  detailHistory.innerHTML = "";

  if (!history.length) {
    detailHistory.innerHTML = `
      <p class="detail-notes">Sin cambios registrados.</p>
    `;
    return;
  }

  const sortedHistory = [...history].sort((a, b) => {
    return new Date(b.changed_at) - new Date(a.changed_at);
  });

  sortedHistory.forEach((item) => {
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");

    const previousData = item.previous_data || {};
    const newData = item.new_data || {};

    historyItem.innerHTML = `
      <div class="history-header">
        <strong>${formatDateTime(item.changed_at)}</strong>
        <span>${getChangeTypeLabel(item.change_type)}</span>
      </div>

      <div class="history-grid">
        <div>
          <span>Vencimiento anterior</span>
          <strong>${formatDate(previousData.deadline_date)}</strong>
        </div>

        <div>
          <span>Nuevo vencimiento</span>
          <strong>${formatDate(newData.deadline_date)}</strong>
        </div>

        <div>
          <span>Días anteriores</span>
          <strong>${previousData.days_count || "-"}</strong>
        </div>

        <div>
          <span>Días nuevos</span>
          <strong>${newData.days_count || "-"}</strong>
        </div>

        <div>
          <span>Inicio anterior</span>
          <strong>${getStartRuleLabel(previousData.start_rule)}</strong>
        </div>

        <div>
          <span>Nuevo inicio</span>
          <strong>${getStartRuleLabel(newData.start_rule)}</strong>
        </div>
      </div>

      <div class="history-notes">
        <span>Observación nueva</span>
        <p>${escapeHTML(newData.notes || "Sin observaciones.")}</p>
      </div>
    `;

    detailHistory.appendChild(historyItem);
  });
}

function getChangeTypeLabel(changeType) {
  if (changeType === "update") return "Edición del plazo";
  return "Cambio registrado";
}

function formatDateTime(dateString) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  editDepartment.value = deadline.department || "";
  editNotes.value = deadline.notes || "";

  updateEditDepartmentVisibility();

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
  if (!dateString) {
    return "-";
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

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

 
function exportDeadlineDetailToPdf(deadline) {
  const computedStatus = getComputedStatus(deadline);

  const excludedDaysHtml = getExcludedDaysHtmlForPdf(deadline.excluded_days || []);

  const caseName = escapeHTML(deadline.case_name || "Sin expediente");
  const actionType = escapeHTML(deadline.action_type || "Sin actuación");
  const notes = escapeHTML(deadline.notes || "Sin observaciones cargadas.");

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    showMessage("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para exportar el PDF.", true);
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Detalle de plazo - PlazoClaro</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          color: #111827;
          margin: 40px;
          line-height: 1.5;
        }

        .header {
          border-bottom: 2px solid #111827;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .brand {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .brand span {
          color: #9A6A1F;
        }

        h1 {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 26px;
          margin: 0;
        }

        .subtitle {
          color: #5F6B7A;
          margin-top: 6px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin: 24px 0;
        }

        .box {
          border: 1px solid #D8D2C4;
          padding: 12px;
          border-radius: 8px;
          background: #FAFAF8;
        }

        .label {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #5F6B7A;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .value {
          font-weight: 700;
          color: #111827;
        }

        .deadline {
          font-size: 22px;
          font-family: Georgia, "Times New Roman", serif;
        }

        .section {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #D8D2C4;
        }

        ul {
          padding-left: 20px;
        }

        li {
          margin-bottom: 6px;
        }

        .notes {
          border: 1px solid #D8D2C4;
          background: #FAFAF8;
          padding: 12px;
          border-radius: 8px;
          white-space: pre-wrap;
        }

        .warning {
          margin-top: 30px;
          border: 1px solid #E7C873;
          background: #FFF8E7;
          color: #6B4E16;
          padding: 14px;
          border-radius: 8px;
          font-size: 13px;
        }

        .footer {
          margin-top: 28px;
          font-size: 12px;
          color: #5F6B7A;
        } 


        .excluded-day-pdf {
          border: 1px solid #D8D2C4;
          background: #FAFAF8;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .excluded-day-pdf strong {
          color: #111827;
        }

        .excluded-day-pdf p {
          margin: 8px 0 0;
          color: #5F6B7A;
          font-size: 13px;
        }

        .excluded-day-meta-pdf {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .excluded-day-meta-pdf span {
          border: 1px solid #D8D2C4;
          background: #FFFFFF;
          color: #5F6B7A;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
        }

        @media print {
          body {
            margin: 24px;
          }

          button {
            display: none;
          }
        }
      </style>
    </head>

    <body>
      <div class="header">
        <div class="brand">Plazo<span>Claro</span></div>
        <h1>Detalle del cálculo de plazo</h1>
        <p class="subtitle">Documento generado desde el panel de vencimientos.</p>
      </div>

      <div class="grid">
        <div class="box">
          <span class="label">Expediente</span>
          <span class="value">${caseName}</span>
        </div>

        <div class="box">
          <span class="label">Actuación</span>
          <span class="value">${actionType}</span>
        </div>

        <div class="box">
          <span class="label">Fecha de notificación</span>
          <span class="value">${formatDate(deadline.notification_date)}</span>
        </div>

        <div class="box">
          <span class="label">Inicio del cómputo</span>
          <span class="value">${getStartRuleLabel(deadline.start_rule)}</span>
        </div>

        <div class="box">
          <span class="label">Inicio efectivo</span>
          <span class="value">${formatDate(deadline.start_date)}</span>
        </div>

        <div class="box">
          <span class="label">Estado</span>
          <span class="value">${getStatusLabel(computedStatus)}</span>
        </div>

        <div class="box">
          <span class="label">Tipo de plazo</span>
          <span class="value">${getDayTypeLabelForPdf(deadline.day_type)}</span>
        </div>

        <div class="box">
          <span class="label">Cantidad de días</span>
          <span class="value">${deadline.days_count}</span>
        </div>

        <div class="box">
          <span class="label">Jurisdicción</span>
          <span class="value">${getJurisdictionLabelForPdf(deadline.jurisdiction)}</span>
        </div>

        <div class="box">
          <span class="label">Departamento judicial</span>
          <span class="value">${getDepartmentLabelForPdf(deadline.department)}</span>
        </div>

        <div class="box">
          <span class="label">Fecha de vencimiento</span>
          <span class="value deadline">${formatDate(deadline.deadline_date)}</span>
        </div>

      <div class="section">
        <h2>Días excluidos</h2>
        ${excludedDaysHtml}
      </div>

      <div class="section">
        <h2>Observaciones</h2>
        <div class="notes">${notes}</div>
      </div>

      <div class="warning">
        <strong>Aviso:</strong>
        este documento es orientativo. El cálculo debe ser verificado por el profesional conforme a la normativa aplicable,
        resoluciones judiciales, ferias, asuetos y particularidades del expediente.
      </div>

      <div class="footer">
        PlazoClaro — Cálculo orientativo de plazos judiciales.
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);
}

function getExcludedDaysHtmlForPdf(excludedDays) {
  if (!excludedDays.length) {
    return "<p>No se excluyeron días durante el período computado.</p>";
  }

  return excludedDays
    .map((day) => {
      return `
        <div class="excluded-day-pdf">
          <strong>${formatDate(day.date)} - ${escapeHTML(day.reason)}</strong>

          <div class="excluded-day-meta-pdf">
            <span>${getExcludedDayTypeLabel(day.type, day.reason)}</span>
            <span>Alcance: ${getExcludedDayScopeLabel(day.scope, day.type, day.reason)}</span>
            <span>Fuente: ${getExcludedDaySourceLabel(day.source, day.type, day.reason)}</span>
            <span>${getExcludedDayVerifiedLabel(day.verified)}</span>
          </div>

          ${
            day.department
              ? `<p><strong>Departamento:</strong> ${escapeHTML(day.department)}</p>`
              : ""
          }

          ${
            day.source_reference
              ? `<p><strong>Referencia:</strong> ${escapeHTML(day.source_reference)}</p>`
              : ""
          }
        </div>
      `;
    })
    .join("");
} 


function getDayTypeLabelForPdf(dayType) {
  if (dayType === "business") return "Días hábiles";
  if (dayType === "calendar") return "Días corridos";
  return "No especificado";
}

function getJurisdictionLabelForPdf(jurisdiction) {
  if (jurisdiction === "pba") return "Provincia de Buenos Aires";
  if (jurisdiction === "national_federal") return "Nacional / Federal";

  return "Jurisdicción no especificada";
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

function getDepartmentLabelForPdf(department) {
  return department || "Sin departamento específico";
} 


function getExcludedDayTypeLabel(type, reason = "") {
  const labels = {
    national_holiday: "Feriado nacional",
    provincial_holiday: "Feriado provincial",
    judicial_recess: "Feria judicial",
    court_holiday: "Asueto judicial",
    term_suspension: "Suspensión de términos",
    special_non_working_day: "Inhábil especial",
    weekend: "Fin de semana",
    holiday: "Feriado",
  };

  if (labels[type]) {
    return labels[type];
  }

  const normalizedReason = String(reason).toLowerCase();

  if (normalizedReason.includes("sábado") || normalizedReason.includes("domingo")) {
    return "Fin de semana";
  }

  if (normalizedReason.includes("feriado nacional")) {
    return "Feriado nacional";
  }

  if (normalizedReason.includes("suspensión")) {
    return "Suspensión de términos";
  }

  return "Día inhábil";
}

function getExcludedDayScopeLabel(scope, type, reason = "") {
  const labels = {
    national: "Nacional",
    provincial: "Provincial",
    department: "Departamento judicial",
    locality: "Localidad",
    court: "Organismo / juzgado",
    manual: "General / Manual",
    general: "General",
  };

  if (labels[scope]) {
    return labels[scope];
  }

  const normalizedReason = String(reason).toLowerCase();

  if (type === "weekend" || normalizedReason.includes("sábado") || normalizedReason.includes("domingo")) {
    return "General";
  }

  if (type === "national_holiday" || normalizedReason.includes("feriado nacional")) {
    return "Nacional";
  }

  return "General";
}

function getExcludedDaySourceLabel(source, type, reason = "") {
  const labels = {
    manual: "Manual",
    argentina_datos: "ArgentinaDatos",
    scba: "SCBA",
    csjn: "CSJN",
    system: "Sistema",
  };

  if (labels[source]) {
    return labels[source];
  }

  const normalizedReason = String(reason).toLowerCase();

  if (type === "weekend" || normalizedReason.includes("sábado") || normalizedReason.includes("domingo")) {
    return "Sistema";
  }

  return "Sin fuente";
}

function getExcludedDayVerifiedLabel(verified) {
  if (verified === true) return "Verificado";
  if (verified === false) return "Pendiente de verificación";

  return "Sin estado de verificación";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
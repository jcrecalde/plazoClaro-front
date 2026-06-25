const DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines";
const CASES_API_URL = "http://127.0.0.1:8000/cases"; 


function getAuthHeaders() {
  const token = localStorage.getItem("plazoclaro_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}


function getJsonAuthHeaders() {
  return {
    ...getAuthHeaders(),
    "Content-Type": "application/json",
  };
}


function handleUnauthorizedResponse(response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("plazoclaro_token");
    localStorage.removeItem("plazoclaro_user");
    window.location.href = "./auth.html";
    return true;
  }

  return false;
}

const agendaList = document.getElementById("agendaList");
const agendaSummary = document.getElementById("agendaSummary");
const refreshAgendaBtn = document.getElementById("refreshAgendaBtn");
const agendaSearch = document.getElementById("agendaSearch");
const agendaStatusFilter = document.getElementById("agendaStatusFilter");
const agendaCaseFilter = document.getElementById("agendaCaseFilter");

const expiredCount = document.getElementById("expiredCount");
const todayCount = document.getElementById("todayCount");
const upcomingCount = document.getElementById("upcomingCount");
const futureCount = document.getElementById("futureCount");
const completedCount = document.getElementById("completedCount");

let allDeadlines = [];
let allCases = [];
let currentSearch = "";
let currentStatusFilter = "";
let currentCaseFilter = "";

document.addEventListener("DOMContentLoaded", loadAgenda);
refreshAgendaBtn.addEventListener("click", loadAgenda);

agendaSearch.addEventListener("input", function () {
  currentSearch = agendaSearch.value.trim().toLowerCase();
  renderAgenda(getFilteredDeadlines());
});

agendaStatusFilter.addEventListener("change", function () {
  currentStatusFilter = agendaStatusFilter.value;
  renderAgenda(getFilteredDeadlines());
});

agendaCaseFilter.addEventListener("change", function () {
  currentCaseFilter = agendaCaseFilter.value;
  renderAgenda(getFilteredDeadlines());
});

async function loadAgenda() {
  try {
    agendaList.innerHTML = `
      <div class="case-card-placeholder">
        Cargando vencimientos...
      </div>
    `;

    const [deadlinesResponse, casesResponse] = await Promise.all([
      fetch(DEADLINES_API_URL, {
        headers: getAuthHeaders(),
      }),
      fetch(CASES_API_URL, {
        headers: getAuthHeaders(),
      }),
    ]);

    const deadlines = await deadlinesResponse.json();
    const cases = await casesResponse.json();

    if (handleUnauthorizedResponse(deadlinesResponse)) {
      return;
    }

    if (handleUnauthorizedResponse(casesResponse)) {
      return;
    }

    if (!deadlinesResponse.ok) {
      throw new Error(deadlines.detail || "No se pudieron cargar los vencimientos.");
    }

    if (!casesResponse.ok) {
      throw new Error(cases.detail || "No se pudieron cargar las causas.");
    }

    allCases = cases;
    allDeadlines = getVisibleAgendaDeadlines(deadlines, cases);

    populateCaseFilter();
    updateAgendaSummary(allDeadlines);
    renderAgenda(getFilteredDeadlines());
  } catch (error) {
    console.error(error);

    agendaSummary.textContent = "No se pudo cargar la agenda.";

    agendaList.innerHTML = `
      <div class="case-card-placeholder">
        No se pudo cargar la agenda. Verificá que el backend esté levantado.
      </div>
    `;
  }
} 


function getVisibleAgendaDeadlines(deadlines, cases) {
  const finalizedCaseIds = new Set(
    cases
      .filter((caseItem) => caseItem.status === "archived")
      .map((caseItem) => String(caseItem.id))
  );

  return deadlines.filter((deadline) => {
    if (!deadline.case_id) {
      return true;
    }

    return !finalizedCaseIds.has(String(deadline.case_id));
  });
}

function populateCaseFilter() {
  agendaCaseFilter.innerHTML = '<option value="">Todas las causas activas</option>';

  allCases
    .filter((item) => item.status === "active")
    .forEach((item) => {
      const option = document.createElement("option");

      option.value = item.id;
      option.textContent = item.case_number
        ? `${item.title} (${item.case_number})`
        : item.title;

      agendaCaseFilter.appendChild(option);
    });

  agendaCaseFilter.value = currentCaseFilter;
}

function updateAgendaSummary(deadlines) {
  const counts = {
    expired: 0,
    today: 0,
    upcoming: 0,
    future: 0,
    completed: 0,
  };

  deadlines.forEach((deadline) => {
    const agendaStatus = getAgendaStatus(deadline);

    if (agendaStatus === "expired") counts.expired++;
    if (agendaStatus === "today") counts.today++;
    if (agendaStatus === "upcoming") counts.upcoming++;
    if (agendaStatus === "future") counts.future++;
    if (agendaStatus === "completed") counts.completed++;
  });

  expiredCount.textContent = counts.expired;
  todayCount.textContent = counts.today;
  upcomingCount.textContent = counts.upcoming;
  futureCount.textContent = counts.future;
  completedCount.textContent = counts.completed;
}

function getFilteredDeadlines() {
  return allDeadlines.filter((deadline) => {
    const agendaStatus = getAgendaStatus(deadline);

    if (currentStatusFilter && agendaStatus !== currentStatusFilter) {
      return false;
    }

    if (currentCaseFilter && deadline.case_id !== currentCaseFilter) {
      return false;
    }

    if (!currentSearch) {
      return true;
    }

    const searchableText = [
      deadline.case_name,
      deadline.action_type,
      deadline.notes,
      deadline.jurisdiction,
      getJurisdictionLabel(deadline.jurisdiction),
      getCaseTitle(deadline.case_id),
      getAgendaStatusLabel(agendaStatus),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(currentSearch);
  });
}

function renderAgenda(deadlines) {
  if (!allDeadlines.length) {
    agendaSummary.textContent = "No hay plazos cargados todavía.";

    agendaList.innerHTML = `
      <div class="case-card-placeholder">
        Todavía no hay vencimientos cargados.
      </div>
    `;

    return;
  }

  const sortedDeadlines = sortDeadlinesByPriority(deadlines);

  updateAgendaListSummary(sortedDeadlines.length);

  if (!sortedDeadlines.length) {
    agendaList.innerHTML = `
      <div class="case-card-placeholder">
        ${getAgendaEmptyMessage()}
      </div>
    `;

    return;
  }

  const sections = [
    {
      key: "expired",
      title: "Vencidos pendientes",
      description: "Plazos vencidos que todavía no fueron marcados como completados.",
    },
    {
      key: "today",
      title: "Vencen hoy",
      description: "Plazos cuyo vencimiento opera durante el día de hoy.",
    },
    {
      key: "upcoming",
      title: "Próximos 7 días",
      description: "Vencimientos próximos que conviene atender con prioridad.",
    },
    {
      key: "future",
      title: "Más adelante",
      description: "Plazos futuros fuera de la ventana urgente.",
    },
    {
      key: "completed",
      title: "Completados",
      description: "Plazos ya marcados como cumplidos.",
    },
  ];

  agendaList.innerHTML = "";

  sections.forEach((section) => {
    const sectionDeadlines = sortedDeadlines.filter((deadline) => {
      return getAgendaStatus(deadline) === section.key;
    });

    if (!sectionDeadlines.length) {
      return;
    }

    renderAgendaSection(section, sectionDeadlines);
  });

  attachAgendaEvents();
} 


function updateAgendaListSummary(displayedCount) {
  if (currentSearch) {
    agendaSummary.textContent =
      `${displayedCount} resultado(s) encontrado(s) en la agenda operativa.`;
    return;
  }

  if (currentStatusFilter === "expired") {
    agendaSummary.textContent =
      `${displayedCount} vencimiento(s) vencido(s) pendiente(s).`;
    return;
  }

  if (currentStatusFilter === "today") {
    agendaSummary.textContent =
      `${displayedCount} vencimiento(s) para revisar hoy.`;
    return;
  }

  if (currentStatusFilter === "upcoming") {
    agendaSummary.textContent =
      `${displayedCount} vencimiento(s) próximo(s) dentro de los próximos 7 días.`;
    return;
  }

  if (currentStatusFilter === "future") {
    agendaSummary.textContent =
      `${displayedCount} vencimiento(s) futuro(s) fuera de la ventana urgente.`;
    return;
  }

  if (currentStatusFilter === "completed") {
    agendaSummary.textContent =
      `${displayedCount} vencimiento(s) completado(s).`;
    return;
  }

  if (currentCaseFilter) {
    agendaSummary.textContent =
      `${displayedCount} vencimiento(s) mostrado(s) para la causa seleccionada.`;
    return;
  }

  agendaSummary.textContent =
    `${displayedCount} vencimiento(s) operativo(s) mostrado(s).`;
}

function getAgendaEmptyMessage() {
  if (currentSearch) {
    return "No hay vencimientos que coincidan con la búsqueda en la agenda operativa.";
  }

  if (currentStatusFilter === "expired") {
    return "No hay vencimientos vencidos pendientes.";
  }

  if (currentStatusFilter === "today") {
    return "No hay vencimientos para revisar hoy.";
  }

  if (currentStatusFilter === "upcoming") {
    return "No hay vencimientos próximos dentro de los próximos 7 días.";
  }

  if (currentStatusFilter === "future") {
    return "No hay vencimientos futuros fuera de la ventana urgente.";
  }

  if (currentStatusFilter === "completed") {
    return "No hay vencimientos completados.";
  }

  if (currentCaseFilter) {
    return "La causa seleccionada no tiene vencimientos para el filtro aplicado.";
  }

  return "No hay vencimientos operativos cargados.";
}


function renderAgendaSection(section, deadlines) {
  const sectionElement = document.createElement("section");
  sectionElement.className = `agenda-section agenda-section-${section.key}`;

  sectionElement.innerHTML = `
    <div class="agenda-section-header">
      <div>
        <h3>${section.title}</h3>
        <p>${section.description}</p>
      </div>

      <span class="agenda-section-count">
        ${deadlines.length}
      </span>
    </div>

    <div class="agenda-section-list"></div>
  `;

  const sectionList = sectionElement.querySelector(".agenda-section-list");

  deadlines.forEach((deadline) => {
    sectionList.appendChild(createAgendaCard(deadline));
  });

  agendaList.appendChild(sectionElement);
}

function createAgendaCard(deadline) {
  const agendaStatus = getAgendaStatus(deadline);
  const daysText = getDaysText(deadline.deadline_date, agendaStatus);

  const card = document.createElement("article");
  card.className = `agenda-card agenda-card-${agendaStatus}`;

  card.innerHTML = `
    <div class="agenda-card-header">
      <div>
        <div class="agenda-card-badges">
          <span class="case-card-kicker">
            ${getAgendaStatusLabel(agendaStatus)}
          </span>

          ${renderAgendaCaseBadge(deadline)}
        </div>

        <h3>${escapeHTML(deadline.case_name || getCaseTitle(deadline.case_id) || "Sin causa")}</h3>
      </div>

      <span class="status-badge ${getDeadlineStatusClass(agendaStatus)}">
        ${daysText}
      </span>
    </div>

    <div class="case-card-meta-grid">
      <div>
        <span>Actuación</span>
        <strong>${escapeHTML(deadline.action_type || "Sin actuación")}</strong>
      </div>

      <div>
        <span>Vencimiento</span>
        <strong>${formatDate(deadline.deadline_date)}</strong>
      </div>

      <div>
        <span>Notificación</span>
        <strong>${formatDate(deadline.notification_date)}</strong>
      </div>

      <div>
        <span>Jurisdicción</span>
        <strong>${getJurisdictionLabel(deadline.jurisdiction)}</strong>
      </div>
    </div>

    <div class="agenda-card-notes">
      <strong>Notas:</strong>
      ${escapeHTML(deadline.notes || "-")}
    </div>

    <div class="case-card-actions">
      ${
        deadline.case_id
          ? `<button class="btn-small btn-detail btn-open-case" data-id="${deadline.case_id}">
              Ver causa
            </button>`
          : ""
      }

      <button class="btn-small btn-complete btn-new-deadline-case" data-id="${deadline.case_id || ""}">
        ${deadline.case_id ? "Nuevo plazo para esta causa" : "Nuevo plazo general"}
      </button>

      ${
        deadline.status === "completed"
          ? `<button class="btn-small btn-pending btn-reopen-deadline" data-id="${deadline.id}">
              Reabrir
            </button>`
          : `<button class="btn-small btn-complete btn-complete-deadline" data-id="${deadline.id}">
              Marcar completado
            </button>`
      }
    </div>
  `;

  return card;
} 


function renderAgendaCaseBadge(deadline) {
  if (deadline.case_id) {
    return `
      <span class="dashboard-case-badge dashboard-case-badge-linked">
        Con causa
      </span>
    `;
  }

  return `
    <span class="dashboard-case-badge dashboard-case-badge-general">
      Plazo general
    </span>
  `;
}

function attachAgendaEvents() {
  document.querySelectorAll(".btn-open-case").forEach((button) => {
    button.addEventListener("click", function () {
      localStorage.setItem("plazoclaro_open_case_id", button.dataset.id);
      window.location.href = "./cases.html";
    });
  });

  document.querySelectorAll(".btn-new-deadline-case").forEach((button) => {
    button.addEventListener("click", function () {
      const selectedCaseId = button.dataset.id;

      if (selectedCaseId) {
        localStorage.setItem("plazoclaro_selected_case_id", selectedCaseId);
      } else {
        localStorage.removeItem("plazoclaro_selected_case_id");
      }

      window.location.href = "./calculator.html";
    });
  });

  document.querySelectorAll(".btn-complete-deadline").forEach((button) => {
    button.addEventListener("click", function () {
      updateDeadlineStatus(button.dataset.id, "completed");
    });
  });

  document.querySelectorAll(".btn-reopen-deadline").forEach((button) => {
    button.addEventListener("click", function () {
      updateDeadlineStatus(button.dataset.id, "pending");
    });
  });
} 


async function updateDeadlineStatus(deadlineId, status) {
  try {
    const response = await fetch(`${DEADLINES_API_URL}/${deadlineId}/status`, {
      method: "PATCH",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    const result = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo actualizar el vencimiento.");
    }

    await loadAgenda();
  } catch (error) {
    console.error(error);
    alert(
      error.message ||
        "No se pudo actualizar el vencimiento. Verificá que el backend esté funcionando."
    );
  }
}


function sortDeadlinesByPriority(deadlines) {
  const priority = {
    expired: 1,
    today: 2,
    upcoming: 3,
    future: 4,
    completed: 5,
  };

  return [...deadlines].sort((a, b) => {
    const statusA = getAgendaStatus(a);
    const statusB = getAgendaStatus(b);

    if (priority[statusA] !== priority[statusB]) {
      return priority[statusA] - priority[statusB];
    }

    return createLocalDate(a.deadline_date) - createLocalDate(b.deadline_date);
  });
}

function getAgendaStatus(deadline) {
  if (deadline.status === "completed") {
    return "completed";
  }

  const today = getToday();
  const deadlineDate = createLocalDate(deadline.deadline_date);

  if (deadlineDate < today) {
    return "expired";
  }

  if (isSameDate(deadlineDate, today)) {
    return "today";
  }

  const nextSevenDays = new Date(today);
  nextSevenDays.setDate(today.getDate() + 7);

  if (deadlineDate > today && deadlineDate <= nextSevenDays) {
    return "upcoming";
  }

  return "future";
}

function getAgendaStatusLabel(status) {
  if (status === "expired") return "Vencido pendiente";
  if (status === "today") return "Vence hoy";
  if (status === "upcoming") return "Próximo 7 días";
  if (status === "future") return "Más adelante";
  if (status === "completed") return "Completado";

  return "Sin estado";
}

function getDeadlineStatusClass(status) {
  if (status === "expired") return "status-expired";
  if (status === "today") return "status-pending";
  if (status === "upcoming") return "status-pending";
  if (status === "future") return "status-completed";
  if (status === "completed") return "status-completed";

  return "";
}

function getDaysText(dateString, status) {
  if (status === "completed") return "Completado";

  const today = getToday();
  const deadlineDate = createLocalDate(dateString);

  const differenceInMs = deadlineDate - today;
  const differenceInDays = Math.round(differenceInMs / (1000 * 60 * 60 * 24));

  if (differenceInDays < 0) {
    const days = Math.abs(differenceInDays);
    return days === 1 ? "Venció ayer" : `Venció hace ${days} días`;
  }

  if (differenceInDays === 0) {
    return "Vence hoy";
  }

  if (differenceInDays === 1) {
    return "Vence mañana";
  }

  return `Faltan ${differenceInDays} días`;
}

function getCaseTitle(caseId) {
  if (!caseId) return null;

  const selectedCase = allCases.find((item) => item.id === caseId);

  return selectedCase ? selectedCase.title : null;
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function createLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  return date;
}

function isSameDate(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = createLocalDate(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getJurisdictionLabel(jurisdiction) {
  const labels = {
    pba: "Provincia de Buenos Aires",
    national_federal: "Nacional / Federal",
    caba: "Ciudad Autónoma de Buenos Aires",
    catamarca: "Catamarca",
    chaco: "Chaco",
    chubut: "Chubut",
    cordoba: "Córdoba",
    corrientes: "Corrientes",
    entre_rios: "Entre Ríos",
    formosa: "Formosa",
    jujuy: "Jujuy",
    la_pampa: "La Pampa",
    la_rioja: "La Rioja",
    mendoza: "Mendoza",
    misiones: "Misiones",
    neuquen: "Neuquén",
    rio_negro: "Río Negro",
    salta: "Salta",
    san_juan: "San Juan",
    san_luis: "San Luis",
    santa_cruz: "Santa Cruz",
    santa_fe: "Santa Fe",
    santiago_del_estero: "Santiago del Estero",
    tierra_del_fuego: "Tierra del Fuego",
    tucuman: "Tucumán",
  };

  return labels[jurisdiction] || "Jurisdicción no especificada";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
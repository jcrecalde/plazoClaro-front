const HOME_DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines"; 
const HOME_CASES_API_URL = "http://127.0.0.1:8000/cases"; 

function getAuthHeaders() {
  const token = localStorage.getItem("plazoclaro_token");

  return {
    Authorization: `Bearer ${token}`,
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

const homeExpiredCount = document.getElementById("homeExpiredCount");
const homeTodayCount = document.getElementById("homeTodayCount");
const homeUpcomingCount = document.getElementById("homeUpcomingCount");
const homeTotalPendingCount = document.getElementById("homeTotalPendingCount");
const homeAlertsMessage = document.getElementById("homeAlertsMessage");
const homeUrgentList = document.getElementById("homeUrgentList"); 

const heroDeadlineCase = document.getElementById("heroDeadlineCase");
const heroDeadlineAction = document.getElementById("heroDeadlineAction");
const heroDeadlineDate = document.getElementById("heroDeadlineDate");
const heroDeadlineStatus = document.getElementById("heroDeadlineStatus");

document.addEventListener("DOMContentLoaded", loadHomeAlerts); 

let homeCases = [];

async function loadHomeAlerts() {
  if (!homeUrgentList) return;

  try {
    const [deadlinesResponse, casesResponse] = await Promise.all([
      fetch(HOME_DEADLINES_API_URL, {
        headers: getAuthHeaders(),
      }),
      fetch(HOME_CASES_API_URL, {
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

    homeCases = cases;

    const visibleDeadlines = getVisibleHomeDeadlines(deadlines, cases);

    const pendingDeadlines = visibleDeadlines.filter(
      (deadline) => deadline.status !== "completed"
    );

    const counts = getHomeAlertCounts(pendingDeadlines);

    homeExpiredCount.textContent = counts.expired;
    homeTodayCount.textContent = counts.today;
    homeUpcomingCount.textContent = counts.upcoming;
    homeTotalPendingCount.textContent = pendingDeadlines.length;

    renderHomeAlertMessage(counts, pendingDeadlines.length);
    renderHomeUrgentDeadlines(pendingDeadlines);
    renderHeroUrgentDeadline(pendingDeadlines);
  } catch (error) {
    console.error(error);

    homeAlertsMessage.textContent =
      error.message || "No se pudieron cargar las alertas. Verificá que el backend esté funcionando.";

    homeUrgentList.innerHTML = `
      <p class="result-empty">
        ${error.message || "No se pudieron cargar los vencimientos."}
      </p>
    `;
  }
} 


function getVisibleHomeDeadlines(deadlines, cases) {
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


function getHomeAlertCounts(deadlines) {
  const counts = {
    expired: 0,
    today: 0,
    upcoming: 0,
  };

  deadlines.forEach((deadline) => {
    const daysUntil = getHomeDaysUntil(deadline.deadline_date);

    if (daysUntil < 0) {
      counts.expired++;
    } else if (daysUntil === 0) {
      counts.today++;
    } else if (daysUntil <= 7) {
      counts.upcoming++;
    }
  });

  return counts;
}

function renderHomeAlertMessage(counts, totalPending) {
  if (!homeAlertsMessage) return;

  if (totalPending === 0) {
    homeAlertsMessage.textContent =
      "No hay vencimientos pendientes cargados.";
    homeAlertsMessage.className = "home-alerts-message home-alerts-message-ok";
    return;
  }

  if (counts.expired > 0 || counts.today > 0) {
    homeAlertsMessage.textContent =
      "Atención: hay vencimientos vencidos o para revisar hoy.";
    homeAlertsMessage.className = "home-alerts-message home-alerts-message-danger";
    return;
  }

  if (counts.upcoming > 0) {
    homeAlertsMessage.textContent =
      "Hay vencimientos próximos dentro de los próximos 7 días.";
    homeAlertsMessage.className = "home-alerts-message home-alerts-message-warning";
    return;
  }

  homeAlertsMessage.textContent =
    "No hay vencimientos urgentes en los próximos 7 días.";
  homeAlertsMessage.className = "home-alerts-message home-alerts-message-ok";
} 


function getHomeCaseTitle(caseId) {
  if (!caseId) return null;

  const selectedCase = homeCases.find(
    (item) => String(item.id) === String(caseId)
  );

  return selectedCase ? selectedCase.title : null;
}

function getHomeDeadlineTitle(deadline) {
  if (deadline.case_id) {
    return (
      getHomeCaseTitle(deadline.case_id) ||
      deadline.case_name ||
      "Sin causa asociada"
    );
  }

  return deadline.case_name || "Sin causa asociada";
} 


function renderHomeUrgentDeadlines(deadlines) {
  const urgentDeadlines = deadlines
    .map((deadline) => {
      return {
        ...deadline,
        daysUntil: getHomeDaysUntil(deadline.deadline_date),
      };
    })
    .filter((deadline) => deadline.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  if (!urgentDeadlines.length) {
    homeUrgentList.innerHTML = `
      <p class="result-empty">
        No hay vencimientos vencidos, de hoy o próximos a 7 días.
      </p>
    `;
    return;
  }

  homeUrgentList.innerHTML = urgentDeadlines
    .map((deadline) => {
      return `
        <article class="home-urgent-item ${getHomeUrgencyClass(deadline.daysUntil)}">
          <div>
            <span class="home-urgent-status">
              ${getHomeUrgencyLabel(deadline.daysUntil)}
            </span>

            <h4>${escapeHomeHTML(getHomeDeadlineTitle(deadline))}</h4>

            <p>
              ${escapeHomeHTML(deadline.action_type || "Sin actuación")}
            </p>
          </div>

          <div class="home-urgent-date">
            <span>Vencimiento</span>
            <strong>${formatHomeDate(deadline.deadline_date)}</strong>
          </div>
        </article>
      `;
    })
    .join("");
} 


function renderHeroUrgentDeadline(deadlines) {
  if (
    !heroDeadlineCase ||
    !heroDeadlineAction ||
    !heroDeadlineDate ||
    !heroDeadlineStatus
  ) {
    return;
  }

  const sortedDeadlines = deadlines
    .map((deadline) => {
      return {
        ...deadline,
        daysUntil: getHomeDaysUntil(deadline.deadline_date),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const urgentDeadline = sortedDeadlines[0];

  if (!urgentDeadline) {
    heroDeadlineCase.textContent = "Sin vencimientos pendientes";
    heroDeadlineAction.textContent = "-";
    heroDeadlineDate.textContent = "-";
    heroDeadlineStatus.textContent = "Al día";
    heroDeadlineStatus.className = "preview-value status-ok";
    return;
  }

  heroDeadlineCase.textContent = getHomeDeadlineTitle(urgentDeadline);

  heroDeadlineAction.textContent =
    urgentDeadline.action_type || "Sin actuación";

  heroDeadlineDate.textContent = formatHomeDate(urgentDeadline.deadline_date);

  heroDeadlineStatus.textContent = getHomeUrgencyLabel(urgentDeadline.daysUntil);

  if (urgentDeadline.daysUntil < 0) {
    heroDeadlineStatus.className = "preview-value status-danger";
  } else if (urgentDeadline.daysUntil === 0) {
    heroDeadlineStatus.className = "preview-value status-warning";
  } else {
    heroDeadlineStatus.className = "preview-value status-warning";
  }
}

function getHomeDaysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const differenceInMs = targetDate - today;

  return Math.round(differenceInMs / (1000 * 60 * 60 * 24));
}

function getHomeUrgencyLabel(daysUntil) {
  if (daysUntil < 0) {
    return `Vencido hace ${Math.abs(daysUntil)} día(s)`;
  }

  if (daysUntil === 0) {
    return "Vence hoy";
  }

  if (daysUntil === 1) {
    return "Vence mañana";
  }

  return `Vence en ${daysUntil} días`;
}

function getHomeUrgencyClass(daysUntil) {
  if (daysUntil < 0) return "home-urgent-expired";
  if (daysUntil === 0) return "home-urgent-today";
  return "home-urgent-upcoming";
}

function formatHomeDate(dateString) {
  if (!dateString) return "-";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function escapeHomeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
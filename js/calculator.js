const API_URL = "http://127.0.0.1:8000/calculator/deadline";
const DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines";

const form = document.getElementById("deadlineForm");

const emptyResult = document.getElementById("emptyResult");
const calculationResult = document.getElementById("calculationResult");

const deadlineDateElement = document.getElementById("deadlineDate");
const startDateDetail = document.getElementById("startDateDetail");
const daysDetail = document.getElementById("daysDetail");
const excludedDetail = document.getElementById("excludedDetail");
const jurisdictionDetail = document.getElementById("jurisdictionDetail"); 
const calculatorMessage = document.getElementById("calculatorMessage");

const clearResultBtn = document.getElementById("clearResultBtn"); 
const jurisdictionSelect = document.getElementById("jurisdiction");
const departmentSelect = document.getElementById("department");
const departmentGroup = document.getElementById("departmentGroup");
const departmentDetail = document.getElementById("departmentDetail");
const saveDeadlineBtn = document.getElementById("saveDeadlineBtn");  

populatePbaDepartmentSelect(departmentSelect, {
  includeEmpty: true,
  emptyLabel: "Sin departamento específico",
});

jurisdictionSelect.addEventListener("change", updateDepartmentVisibility);

function updateDepartmentVisibility() {
  if (jurisdictionSelect.value === "pba") {
    departmentGroup.classList.remove("hidden");
    departmentGroup.style.display = "block";
    return;
  }

  departmentSelect.value = "";
  departmentGroup.classList.add("hidden");
  departmentGroup.style.display = "none";
}

updateDepartmentVisibility();

let lastCalculationPayload = null;
let lastCalculationResult = null;

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const notificationDateValue = document.getElementById("notificationDate").value;
  const startRule = document.getElementById("startRule").value;
  const daysCount = Number(document.getElementById("daysCount").value);
  const dayType = document.getElementById("dayType").value;
  const selectedJurisdiction = jurisdictionSelect.value;

  if (!notificationDateValue || !daysCount || daysCount <= 0) {
    alert("Completá una fecha válida y una cantidad de días mayor a cero.");
    return;
  }

  const payload = {
    notification_date: notificationDateValue,
    days_count: daysCount,
    day_type: dayType,
    jurisdiction: selectedJurisdiction,
    start_rule: startRule,
    department: selectedJurisdiction === "pba" ? departmentSelect.value || null : null,
    locality: null,
    court: null,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("No se pudo calcular el vencimiento.");
    }

    const apiResult = await response.json();
    const result = normalizeApiResult(apiResult);

    lastCalculationPayload = payload;
    lastCalculationResult = result;

    renderResult(result);
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor. Verificá que el backend esté levantado.");
  }
});

saveDeadlineBtn.addEventListener("click", async function () {
  if (!lastCalculationPayload) {
    alert("Primero tenés que calcular un plazo antes de guardarlo.");
    return;
  }

  const caseName = document.getElementById("caseName").value.trim();
  const actionType = document.getElementById("actionType").value;
  const notes = document.getElementById("notes").value.trim();

  const payloadToSave = {
    case_name: caseName || null,
    action_type: actionType || null,
    notification_date: lastCalculationPayload.notification_date,
    days_count: lastCalculationPayload.days_count,
    day_type: lastCalculationPayload.day_type,
    jurisdiction: lastCalculationPayload.jurisdiction,
    start_rule: lastCalculationPayload.start_rule, 
    department: lastCalculationResult?.department || null,
    locality: lastCalculationResult?.locality || null,
    court: lastCalculationResult?.court || null,
    notes: notes || null,
  };

  try {
    saveDeadlineBtn.disabled = true;
    saveDeadlineBtn.textContent = "Guardando...";

    const response = await fetch(DEADLINES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadToSave),
    });

    if (!response.ok) {
      throw new Error("No se pudo guardar el plazo.");
    }

    const savedDeadline = await response.json();

    console.log("Plazo guardado:", savedDeadline);
    showCalculatorMessage("Plazo guardado correctamente. Podés verlo desde el dashboard.", true);
  } catch (error) {
    console.error(error);
    showCalculatorMessage("No se pudo guardar el plazo. Verificá que el backend y MongoDB estén funcionando.", true);
  } finally {
    saveDeadlineBtn.disabled = false;
    saveDeadlineBtn.textContent = "Guardar plazo";
  }
});

function createLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}


function normalizeApiResult(apiResult) {
  return {
    notificationDate: createLocalDate(apiResult.notification_date),
    startDate: createLocalDate(apiResult.start_date),
    deadlineDate: createLocalDate(apiResult.deadline_date),
    countedDays: apiResult.counted_days,
    excludedDays: (apiResult.excluded_days || []).map((item) => ({
      date: createLocalDate(item.date),
      reason: item.reason,
      type: item.type,
      scope: item.scope,
      department: item.department,
      locality: item.locality,
      court: item.court,
      source: item.source,
      sourceReference: item.source_reference,
      verified: item.verified,
    })),
    dayType: apiResult.day_type,
    jurisdiction: apiResult.jurisdiction,
    startRule: apiResult.start_rule,
    department: apiResult.department,
    locality: apiResult.locality,
    court: apiResult.court,
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getDayTypeLabel(dayType) {
  if (dayType === "business") return "días hábiles";
  return "días corridos";
}

function getJurisdictionLabel(jurisdiction) {
  if (jurisdiction === "pba") return "Provincia de Buenos Aires";
  if (jurisdiction === "national_federal") return "Nacional / Federal";

  return "Jurisdicción no especificada";
}

function renderResult(result) {
  emptyResult.classList.add("hidden");
  emptyResult.style.display = "none";

  calculationResult.classList.remove("hidden");
  calculationResult.style.display = "block";

  deadlineDateElement.textContent = formatDate(result.deadlineDate);

  const startRuleText =
    result.startRule === "same_day"
      ? "El cómputo comienza el mismo día de la fecha indicada"
      : "El cómputo comienza el día siguiente a la notificación";

  startDateDetail.textContent = `${startRuleText}: ${formatDate(result.startDate)}.`;

  daysDetail.textContent = `Se computaron ${result.countedDays} ${getDayTypeLabel(result.dayType)}.`;

  if (result.dayType === "business") {
    excludedDetail.innerHTML = renderExcludedDays(result.excludedDays);
  } else {
    excludedDetail.innerHTML = `
      <p class="result-empty">
        Al tratarse de días corridos, no se excluyeron sábados, domingos ni días inhábiles.
      </p>
    `;
  }

  jurisdictionDetail.textContent = `Jurisdicción seleccionada: ${getJurisdictionLabel(result.jurisdiction)}.`;

  if (result.department) {
    departmentDetail.textContent = `Departamento judicial seleccionado: ${result.department}.`;
  } else {
    departmentDetail.textContent = "No se seleccionó un departamento judicial específico.";
  }
}


function showCalculatorMessage(message, visible) {
  if (!visible || !message) {
    calculatorMessage.classList.add("hidden");
    calculatorMessage.textContent = "";
    return;
  }

  calculatorMessage.textContent = message;
  calculatorMessage.classList.remove("hidden");
}

clearResultBtn.addEventListener("click", function () {
  form.reset();
 
  lastCalculationPayload = null;
  lastCalculationResult = null;

  showCalculatorMessage("", false);

  calculationResult.classList.add("hidden");
  calculationResult.style.display = "none";

  emptyResult.classList.remove("hidden");
  emptyResult.style.display = "block";

  deadlineDateElement.textContent = "";
  startDateDetail.textContent = "";
  daysDetail.textContent = "";
  excludedDetail.textContent = "";
  jurisdictionDetail.textContent = ""; 
  departmentDetail.textContent = "";
}); 


function getExcludedDayTypeLabel(type) {
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

  return labels[type] || "Día inhábil";
}

function getExcludedDayScopeLabel(scope) {
  const labels = {
    national: "Nacional",
    provincial: "Provincial",
    department: "Departamento judicial",
    locality: "Localidad",
    court: "Organismo / juzgado",
    manual: "General / Manual",
    general: "General",
  };

  return labels[scope] || "General";
}

function getExcludedDaySourceLabel(source) {
  const labels = {
    manual: "Manual",
    argentina_datos: "ArgentinaDatos",
    scba: "SCBA",
    csjn: "CSJN",
    system: "Sistema",
  };

  return labels[source] || source || "Sin fuente";
}

function getExcludedDayVerifiedLabel(verified) {
  if (verified === true) return "Verificado";
  if (verified === false) return "Pendiente de verificación";

  return "Sin estado de verificación";
} 


function getExcludedDateKey(dateValue) {
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof dateValue === "string") {
    return dateValue.split("T")[0];
  }

  return "";
}

function getExcludedDateSortValue(dateValue) {
  const dateKey = getExcludedDateKey(dateValue);

  if (!dateKey) return 0;

  const [year, month, day] = dateKey.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function areConsecutiveExcludedDates(previousDate, currentDate) {
  const oneDayInMs = 24 * 60 * 60 * 1000;

  return (
    getExcludedDateSortValue(currentDate) -
      getExcludedDateSortValue(previousDate) ===
    oneDayInMs
  );
}

function getExcludedDaySourceReference(day) {
  return day.sourceReference ?? day.source_reference ?? null;
}

function getExcludedDayGroupKey(day) {
  return JSON.stringify({
    reason: day.reason || "",
    type: day.type || "",
    scope: day.scope || "",
    department: day.department || "",
    locality: day.locality || "",
    court: day.court || "",
    source: day.source || "",
    sourceReference: getExcludedDaySourceReference(day) || "",
    verified: day.verified,
  });
}

function groupExcludedDays(excludedDays) {
  if (!excludedDays || !excludedDays.length) {
    return [];
  }

  const sortedDays = [...excludedDays].sort(
    (a, b) => getExcludedDateSortValue(a.date) - getExcludedDateSortValue(b.date)
  );

  const groups = [];

  sortedDays.forEach((day) => {
    const groupKey = getExcludedDayGroupKey(day);
    const lastGroup = groups[groups.length - 1];

    const canJoinPreviousGroup =
      lastGroup &&
      lastGroup.groupKey === groupKey &&
      areConsecutiveExcludedDates(lastGroup.endDate, day.date);

    if (canJoinPreviousGroup) {
      lastGroup.endDate = day.date;
      lastGroup.days.push(day);
      return;
    }

    groups.push({
      ...day,
      startDate: day.date,
      endDate: day.date,
      sourceReference: getExcludedDaySourceReference(day),
      days: [day],
      groupKey,
    });
  });

  return groups;
}

function getExcludedDateRangeLabel(group) {
  const startDate = formatDate(group.startDate);
  const endDate = formatDate(group.endDate);

  if (startDate === endDate) {
    return startDate;
  }

  return `${startDate} al ${endDate}`;
} 


function renderExcludedDays(excludedDays) {
  if (!excludedDays || !excludedDays.length) {
    return `
      <p class="result-empty">
        No se excluyeron sábados, domingos ni días inhábiles durante el período computado.
      </p>
    `;
  }

  const hasUnverifiedDays = excludedDays.some((day) => day.verified === false);
  const groupedExcludedDays = groupExcludedDays(excludedDays);

  return `
    ${
      hasUnverifiedDays
        ? `
          <div class="verification-warning">
            <strong>Atención:</strong>
            este cálculo incluye días inhábiles importados automáticamente que todavía no fueron verificados.
            Revisá la fuente antes de usar este vencimiento como definitivo.
          </div>
        `
        : ""
    }

    <div class="excluded-days-list">
      ${groupedExcludedDays
        .map((day) => {
          return `
            <div class="excluded-day-card">
              <strong>${getExcludedDateRangeLabel(day)} - ${escapeHTML(day.reason)}</strong>

              <div class="excluded-day-meta">
                <span>${getExcludedDayTypeLabel(day.type)}</span>
                <span>Alcance: ${getExcludedDayScopeLabel(day.scope)}</span>
                <span>Fuente: ${getExcludedDaySourceLabel(day.source)}</span>
                <span>${getExcludedDayVerifiedLabel(day.verified)}</span>
              </div>

              ${
                day.days.length > 1
                  ? `<p><strong>Días agrupados:</strong> ${day.days.length}</p>`
                  : ""
              }

              ${
                day.department
                  ? `<p><strong>Departamento:</strong> ${escapeHTML(day.department)}</p>`
                  : ""
              }

              ${
                day.sourceReference
                  ? `<p><strong>Referencia:</strong> ${escapeHTML(day.sourceReference)}</p>`
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
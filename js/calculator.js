const API_URL = "http://127.0.0.1:8000/calculator/deadline";
const DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines"; 
const CASES_API_URL = "http://127.0.0.1:8000/cases";

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

const courtSelect = document.getElementById("court");
const courtGroup = document.getElementById("courtGroup");
const courtDetail = document.getElementById("courtDetail");

const saveDeadlineBtn = document.getElementById("saveDeadlineBtn"); 

const caseSelect = document.getElementById("caseSelect"); 

const actionTypeSelect = document.getElementById("actionType");
const actionTypeHint = document.getElementById("actionTypeHint");
const daysCountInput = document.getElementById("daysCount");
const dayTypeSelect = document.getElementById("dayType");

let availableCases = [];

populatePbaDepartmentSelect(departmentSelect, {
  includeEmpty: true,
  emptyLabel: "Sin departamento específico",
});

jurisdictionSelect.addEventListener("change", updateJurisdictionDependentFields);

function updateJurisdictionDependentFields() {
  const isPba = jurisdictionSelect.value === "pba";
  const isNationalFederal = jurisdictionSelect.value === "national_federal";

  if (isPba) {
    departmentGroup.classList.remove("hidden");
    departmentGroup.style.display = "block";
  } else {
    departmentSelect.value = "";
    departmentGroup.classList.add("hidden");
    departmentGroup.style.display = "none";
  }

  if (isNationalFederal) {
    courtGroup.classList.remove("hidden");
    courtGroup.style.display = "block";
  } else {
    courtSelect.value = "";
    courtGroup.classList.add("hidden");
    courtGroup.style.display = "none";
  }
} 


async function loadCasesForCalculator() {
  if (!caseSelect) return;

  try {
    const response = await fetch(CASES_API_URL);
    const cases = await response.json();

    if (!response.ok) {
      throw new Error("No se pudieron cargar las causas.");
    }

    availableCases = cases;

    caseSelect.innerHTML = '<option value="">Sin causa asociada</option>';

    cases
      .filter((item) => item.status === "active")
      .forEach((item) => {
        const option = document.createElement("option");

        option.value = item.id;
        option.textContent = item.case_number
          ? `${item.title} (${item.case_number})`
          : item.title;

        caseSelect.appendChild(option);
      });   

    preselectCaseFromStorage(); 

  } catch (error) {
    console.error(error);
    caseSelect.innerHTML = '<option value="">Sin causa asociada</option>';
  }
}

function handleCaseSelectionChange() {
  if (!caseSelect || !caseSelect.value) {
    return;
  }

  const selectedCase = availableCases.find((item) => item.id === caseSelect.value);

  if (!selectedCase) {
    caseSelect.value = "";
    return;
  }

  if (selectedCase.status !== "active") {
    caseSelect.value = "";

    showCalculatorMessage(
      "No se puede vincular un plazo a una causa finalizada. Primero reactivá la causa.",
      true
    );

    return;
  }

  const caseNameInput = document.getElementById("caseName");

  if (caseNameInput) {
    caseNameInput.value = selectedCase.title || "";
  }

  jurisdictionSelect.value = selectedCase.jurisdiction || "pba";

  updateJurisdictionDependentFields();

  if (selectedCase.jurisdiction === "pba") {
    departmentSelect.value = selectedCase.department || "";
  }

  if (selectedCase.jurisdiction === "national_federal") {
    courtSelect.value = selectedCase.court || "";
  }
}

updateJurisdictionDependentFields(); 


loadCasesForCalculator();

if (caseSelect) {
  caseSelect.addEventListener("change", handleCaseSelectionChange);
} 

if (actionTypeSelect) {
  populateActionTypeSelect(actionTypeSelect);
  updateActionTypeHint();

  actionTypeSelect.addEventListener("change", handleActionTypeChange);
}

let lastCalculationPayload = null;
let lastCalculationResult = null; 


function handleActionTypeChange() {
  if (!actionTypeSelect) return;

  const selectedRule = getActionTypeRule(actionTypeSelect.value);

  if (!selectedRule) {
    updateActionTypeHint();
    return;
  }

  if (selectedRule.suggestedDays) {
    daysCountInput.value = selectedRule.suggestedDays;
  }

  if (selectedRule.defaultDayType) {
    dayTypeSelect.value = selectedRule.defaultDayType;
  }

  updateActionTypeHint();
}

function updateActionTypeHint() {
  if (!actionTypeHint || !actionTypeSelect) return;

  const selectedRule = getActionTypeRule(actionTypeSelect.value);

  if (!selectedRule) {
    actionTypeHint.textContent =
      "Opcional. Al elegir una actuación, la app puede sugerir una cantidad de días editable.";
    return;
  }

  if (!selectedRule.suggestedDays) {
    actionTypeHint.textContent =
      "Este tipo de actuación no tiene una cantidad de días sugerida. Cargá el plazo manualmente.";
    return;
  }

  const dayTypeLabel =
    selectedRule.defaultDayType === "calendar" ? "días corridos" : "días hábiles";

  actionTypeHint.textContent =
    `Sugerencia orientativa: ${selectedRule.suggestedDays} ${dayTypeLabel}. ` +
    "El profesional puede modificarlo según el caso, fuero y normativa aplicable.";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const notificationDateValue = document.getElementById("notificationDate").value;
  const startRule = document.getElementById("startRule").value;
  const daysCount = Number(document.getElementById("daysCount").value);
  const dayType = document.getElementById("dayType").value;
  const selectedJurisdiction = jurisdictionSelect.value; 


  const selectedCourt = selectedJurisdiction === "national_federal" ? courtSelect.value || null : null;

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
    court: selectedCourt,
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


function preselectCaseFromStorage() {
  if (!caseSelect) return;

  const selectedCaseId = localStorage.getItem("plazoclaro_selected_case_id");

  if (!selectedCaseId) {
    return;
  }

  const selectedCase = availableCases.find((item) => item.id === selectedCaseId);

  localStorage.removeItem("plazoclaro_selected_case_id");

  if (!selectedCase) {
    showCalculatorMessage(
      "La causa seleccionada ya no está disponible. Se cargará el plazo sin causa asociada.",
      true
    );
    return;
  }

  if (selectedCase.status !== "active") {
    caseSelect.value = "";

    showCalculatorMessage(
      "La causa seleccionada está finalizada. Para cargarle un nuevo plazo, primero reactivala.",
      true
    );

    return;
  }

  caseSelect.value = selectedCaseId;
  handleCaseSelectionChange();
}

saveDeadlineBtn.addEventListener("click", async function () {
  if (!lastCalculationPayload) {
    alert("Primero tenés que calcular un plazo antes de guardarlo.");
    return;
  }

  const caseName = document.getElementById("caseName").value.trim();
  const actionType = document.getElementById("actionType").value;
  const notes = document.getElementById("notes").value.trim(); 
  const selectedCaseId = caseSelect ? caseSelect.value || null : null;

  if (selectedCaseId) {
    const selectedCase = availableCases.find((item) => item.id === selectedCaseId);

    if (!selectedCase || selectedCase.status !== "active") {
      showCalculatorMessage(
        "No se puede guardar un plazo vinculado a una causa finalizada. Primero reactivá la causa.",
        true
      );
      return;
    }
  }

  const payloadToSave = { 
    case_id: selectedCaseId,
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
 

function getJurisdictionScopeDetail(result) {
  if (result.jurisdiction === "pba") {
    if (result.department) {
      return `Departamento judicial seleccionado: ${result.department}.`;
    }

    return "No se seleccionó un departamento judicial específico.";
  }

  if (result.jurisdiction === "national_federal") {
    if (result.court) {
      return `Organismo seleccionado: ${result.court}.`;
    }

    return "Ámbito seleccionado: Nacional / Federal. No aplica departamento judicial provincial.";
  }

  if (result.jurisdiction === "caba") {
    return "Ámbito seleccionado: Ciudad Autónoma de Buenos Aires. No aplica departamento judicial provincial ni organismo específico.";
  }

  return (
    `Ámbito seleccionado: ${getJurisdictionLabel(result.jurisdiction)}. ` +
    "Cobertura básica: se excluyen fines de semana y feriados nacionales cargados. " +
    "Las ferias judiciales, asuetos o suspensiones provinciales deben verificarse o cargarse manualmente."
  );
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

  departmentDetail.textContent = getJurisdictionScopeDetail(result); 

  if (courtDetail) {
    courtDetail.textContent =
      result.jurisdiction === "national_federal" && result.court
        ? `Calendario específico aplicado: ${result.court}.`
        : "";
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

  if (caseSelect) {
    caseSelect.value = "";
  }

  updateJurisdictionDependentFields();
 
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
  if (courtDetail) {
  courtDetail.textContent = "";
  }
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
    tribunal_fiscal: "Tribunal Fiscal",
    caba: "CABA",
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
            <strong>Aviso:</strong>
            este cálculo es orientativo. El sistema excluye sábados, domingos y los días inhábiles
            cargados o importados para la jurisdicción seleccionada. El resultado debe ser verificado
            por el profesional conforme a la normativa aplicable, ferias, asuetos y particularidades
            del expediente.
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
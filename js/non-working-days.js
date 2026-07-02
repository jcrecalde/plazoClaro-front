const NON_WORKING_DAYS_API_URL = "http://127.0.0.1:8000/non-working-days";  

const AUTH_API_URL = "http://127.0.0.1:8000/auth";


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
  if (response.status === 401) {
    localStorage.removeItem("plazoclaro_token");
    localStorage.removeItem("plazoclaro_user");
    window.location.href = "./auth.html";
    return true;
  }

  return false;
}

const form = document.getElementById("nonWorkingDayForm");
const nonWorkingDate = document.getElementById("nonWorkingDate");
const reason = document.getElementById("reason");
const jurisdiction = document.getElementById("jurisdiction"); 
const nonWorkingDayType = document.getElementById("nonWorkingDayType");

const scope = document.getElementById("scope");
const department = document.getElementById("department");
const departmentGroup = document.getElementById("departmentGroup");
const sourceReference = document.getElementById("sourceReference");
const nonWorkingNotes = document.getElementById("nonWorkingNotes"); 

const adminImportPanel = document.getElementById("adminImportPanel");
 
const importYear = document.getElementById("importYear");
const importJurisdiction = document.getElementById("importJurisdiction");
const importNationalHolidaysBtn = document.getElementById("importNationalHolidaysBtn"); 
const importScbaCalendarBtn = document.getElementById("importScbaCalendarBtn"); 
const importCsjnCalendarBtn = document.getElementById("importCsjnCalendarBtn"); 
const importTribunalFiscalCalendarBtn = document.getElementById("importTribunalFiscalCalendarBtn"); 
const importCabaCalendarBtn = document.getElementById("importCabaCalendarBtn");

const filterYear = document.getElementById("filterYear"); 
const filterJurisdiction = document.getElementById("filterJurisdiction");
const filterType = document.getElementById("filterType");
const filterSource = document.getElementById("filterSource");
const filterVerified = document.getElementById("filterVerified");
const filterActive = document.getElementById("filterActive");
const applyNonWorkingDayFiltersBtn = document.getElementById("applyNonWorkingDayFiltersBtn");
const clearNonWorkingDayFiltersBtn = document.getElementById("clearNonWorkingDayFiltersBtn");

const nonWorkingDaysTableBody = document.getElementById("nonWorkingDaysTableBody");
const nonWorkingDaysSummary = document.getElementById("nonWorkingDaysSummary");
const nonWorkingDayMessage = document.getElementById("nonWorkingDayMessage");
const refreshNonWorkingDaysBtn = document.getElementById("refreshNonWorkingDaysBtn");  

const nonWorkingDaysTopScroll = document.getElementById("nonWorkingDaysTopScroll");
const nonWorkingDaysTopScrollInner = document.getElementById("nonWorkingDaysTopScrollInner");
const nonWorkingDaysTableScroll = document.getElementById("nonWorkingDaysTableScroll"); 

const filterScope = document.getElementById("filterScope");
const filterDepartment = document.getElementById("filterDepartment");
const filterDepartmentGroup = document.getElementById("filterDepartmentGroup"); 

const submitNonWorkingDayBtn = document.getElementById("submitNonWorkingDayBtn"); 

const nonWorkingDayFormBadge = document.getElementById("nonWorkingDayFormBadge");
const cancelEditNonWorkingDayBtn = document.getElementById("cancelEditNonWorkingDayBtn"); 

const nonWorkingDayHistoryPanel = document.getElementById("nonWorkingDayHistoryPanel");
const historyPanelTitle = document.getElementById("historyPanelTitle");
const nonWorkingDayHistoryContent = document.getElementById("nonWorkingDayHistoryContent");
const closeNonWorkingDayHistoryBtn = document.getElementById("closeNonWorkingDayHistoryBtn"); 

const totalNonWorkingDays = document.getElementById("totalNonWorkingDays");
const pendingVerificationDays = document.getElementById("pendingVerificationDays");
const verifiedNonWorkingDays = document.getElementById("verifiedNonWorkingDays");
const automaticNonWorkingDays = document.getElementById("automaticNonWorkingDays"); 


const showPendingVerificationBtn = document.getElementById("showPendingVerificationBtn");
const showAllNonWorkingDaysBtn = document.getElementById("showAllNonWorkingDaysBtn"); 


const verifyVisiblePendingDaysBtn = document.getElementById("verifyVisiblePendingDaysBtn"); 

const sourceStatusTableBody = document.getElementById("sourceStatusTableBody");
const refreshSourceStatusBtn = document.getElementById("refreshSourceStatusBtn");


let editingNonWorkingDayId = null; 
let editingNonWorkingDayData = null;
let currentNonWorkingDays = []; 


let currentAuthenticatedUser = getStoredAuthenticatedUser();

function getStoredAuthenticatedUser() {
  try {
    return JSON.parse(localStorage.getItem("plazoclaro_user")) || null;
  } catch (error) {
    return null;
  }
}

function isCurrentUserAdmin() {
  return currentAuthenticatedUser?.role === "admin";
}

function canModifyNonWorkingDay(day) {
  if (!day) return false;

  if (isCurrentUserAdmin()) {
    return true;
  }

  return day.source === "manual";
}

async function loadAuthenticatedUserForPage() {
  try {
    const response = await fetch(`${AUTH_API_URL}/me`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("plazoclaro_token");
      localStorage.removeItem("plazoclaro_user");
      window.location.href = "./auth.html";
      return;
    }

    const user = await response.json();

    if (!response.ok) {
      throw new Error("No se pudo validar el usuario actual.");
    }

    currentAuthenticatedUser = user;
    localStorage.setItem("plazoclaro_user", JSON.stringify(user));
  } catch (error) {
    console.error("No se pudo cargar el usuario actual.", error);
    currentAuthenticatedUser = getStoredAuthenticatedUser();
  }
}

function setupRoleBasedUi() {
  if (isCurrentUserAdmin()) {
    return;
  }

  if (adminImportPanel) {
    adminImportPanel.classList.add("hidden");
    adminImportPanel.style.display = "none";
  }

  if (verifyVisiblePendingDaysBtn) {
    verifyVisiblePendingDaysBtn.classList.add("hidden");
    verifyVisiblePendingDaysBtn.style.display = "none";
  }

  configureRegularUserManualForm();
} 


function configureRegularUserManualForm() {
  addRegularUserManualNotice();

  setSelectOptions(
    nonWorkingDayType,
    [
      {
        value: "special_non_working_day",
        label: "Inhábil especial",
      },
      {
        value: "court_holiday",
        label: "Asueto judicial",
      },
      {
        value: "term_suspension",
        label: "Suspensión de términos",
      },
      {
        value: "provincial_holiday",
        label: "Feriado local / provincial",
      },
      {
        value: "judicial_recess",
        label: "Feria judicial",
      },
    ],
    nonWorkingDayType.value
  );

  setSelectOptions(
    scope,
    [
      {
        value: "manual",
        label: "General / Manual",
      },
      {
        value: "department",
        label: "Departamento judicial",
      },
    ],
    scope.value
  );

  updateDepartmentVisibilityForManualLoad();
}

function addRegularUserManualNotice() {
  if (document.getElementById("regularUserManualNotice")) {
    return;
  }

  const notice = document.createElement("p");

  notice.id = "regularUserManualNotice";
  notice.className = "field-help";
  notice.textContent =
    "Los días cargados manualmente son privados de tu cuenta y solo se aplican a tus cálculos. Los calendarios oficiales son administrados por PlazoClaro.";

  nonWorkingDayFormBadge.insertAdjacentElement("afterend", notice);
}

function setSelectOptions(selectElement, options, selectedValue) {
  if (!selectElement) {
    return;
  }

  const previousValue = selectedValue || selectElement.value;

  selectElement.innerHTML = "";

  options.forEach((item) => {
    const option = document.createElement("option");

    option.value = item.value;
    option.textContent = item.label;

    selectElement.appendChild(option);
  });

  const hasPreviousValue = options.some((item) => item.value === previousValue);

  if (hasPreviousValue) {
    selectElement.value = previousValue;
    return;
  }

  if (options.length > 0) {
    selectElement.value = options[0].value;
  }
}

populatePbaDepartmentSelect(department, {
  includeEmpty: true,
  emptyLabel: "Sin departamento específico",
}); 

populatePbaDepartmentSelect(filterDepartment, {
  includeEmpty: true,
  emptyLabel: "Todos los departamentos",
});

scope.addEventListener("change", updateDepartmentVisibilityForManualLoad);
jurisdiction.addEventListener("change", updateDepartmentVisibilityForManualLoad); 

filterScope.addEventListener("change", updateFilterDepartmentVisibility);
filterJurisdiction.addEventListener("change", updateFilterDepartmentVisibility); 


if (importTribunalFiscalCalendarBtn) {
  importTribunalFiscalCalendarBtn.addEventListener(
    "click",
    importTribunalFiscalCalendar
  );
} 

if (importCabaCalendarBtn) {
  importCabaCalendarBtn.addEventListener("click", importCabaCalendar);
}

function updateDepartmentVisibilityForManualLoad() {
  const isPba = jurisdiction.value === "pba";

  if (!isPba && scope.value === "department") {
    scope.value = "manual";
  }

  const shouldShowDepartment = isPba && scope.value === "department";

  if (shouldShowDepartment) {
    departmentGroup.classList.remove("hidden");
    departmentGroup.style.display = "block";
    return;
  }

  department.value = "";
  departmentGroup.classList.add("hidden");
  departmentGroup.style.display = "none";
}

function resetNonWorkingDayFormMode() {
  editingNonWorkingDayId = null;
  editingNonWorkingDayData = null;

  form.reset();
  updateDepartmentVisibilityForManualLoad();

  submitNonWorkingDayBtn.textContent = "Guardar día inhábil";
  nonWorkingDayFormBadge.textContent = "Carga manual";
  cancelEditNonWorkingDayBtn.classList.add("hidden");
  form.classList.remove("editing-mode");
}


updateDepartmentVisibilityForManualLoad(); 
updateFilterDepartmentVisibility();

document.addEventListener("DOMContentLoaded", initializeNonWorkingDaysPage);

async function initializeNonWorkingDaysPage() {
  await loadAuthenticatedUserForPage();
  setupRoleBasedUi();
  await loadNonWorkingDays();
}

refreshNonWorkingDaysBtn.addEventListener("click", loadNonWorkingDays);

if (importNationalHolidaysBtn) {
  importNationalHolidaysBtn.addEventListener("click", importNationalHolidays);
}
importScbaCalendarBtn.addEventListener("click", importScbaCalendar); 
importCsjnCalendarBtn.addEventListener("click", importCsjnCalendar);

applyNonWorkingDayFiltersBtn.addEventListener("click", loadNonWorkingDays);
 
clearNonWorkingDayFiltersBtn.addEventListener("click", function () {
  filterYear.value = importYear.value || "2026";
  filterJurisdiction.value = importJurisdiction.value || "pba";
  filterType.value = "";
  filterSource.value = "";
  filterVerified.value = "";
  filterActive.value = ""; 
  filterScope.value = "";
  filterDepartment.value = ""; 

  updateFilterDepartmentVisibility();

  loadNonWorkingDays();
}); 

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


cancelEditNonWorkingDayBtn.addEventListener("click", function () {
  resetNonWorkingDayFormMode();
  showMessage("Edición cancelada. Podés cargar un nuevo día inhábil.", true);
}); 

showPendingVerificationBtn.addEventListener("click", function () {
  filterVerified.value = "false";
  filterActive.value = "true";
  loadNonWorkingDays();
});

showAllNonWorkingDaysBtn.addEventListener("click", function () {
  filterYear.value = importYear.value || "2026";
  filterJurisdiction.value = importJurisdiction.value || "pba";
  filterType.value = "";
  filterSource.value = "";
  filterVerified.value = "";
  filterActive.value = "";
  filterScope.value = "";
  filterDepartment.value = "";

  updateFilterDepartmentVisibility();

  loadNonWorkingDays();
});
 
verifyVisiblePendingDaysBtn.addEventListener("click", verifyVisiblePendingDays);

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const payload = {
    date: nonWorkingDate.value,
    reason: reason.value.trim(),
    jurisdiction: jurisdiction.value,
    type: nonWorkingDayType.value,
    scope: scope.value,
    department:
      jurisdiction.value === "pba" && scope.value === "department"
        ? department.value || null
        : null,
    locality: null,
    court: null,
    source: "manual",
    source_url: null,
    source_reference: sourceReference.value.trim() || null,
    notes: nonWorkingNotes.value.trim() || null,
    verified: editingNonWorkingDayId
      ? Boolean(editingNonWorkingDayData?.verified)
      : true,
    active: editingNonWorkingDayId
      ? Boolean(editingNonWorkingDayData?.active)
      : true,
  }; 

  if (!payload.date || !payload.reason) {
    showMessage("Completá la fecha y el motivo.", true);
    return;
  }

  try {
    const url = editingNonWorkingDayId
      ? `${NON_WORKING_DAYS_API_URL}/${editingNonWorkingDayId}`
      : NON_WORKING_DAYS_API_URL;

    const method = editingNonWorkingDayId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(payload),
    }); 

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error al guardar día inhábil:", errorData);

      throw new Error(
        errorData.detail || "No se pudo guardar el día inhábil."
      );
    }

    const wasEditing = Boolean(editingNonWorkingDayId);

    resetNonWorkingDayFormMode();

    await loadNonWorkingDays();

    showMessage(
      wasEditing
        ? "Día inhábil actualizado correctamente."
        : "Día inhábil guardado correctamente.",
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo guardar el día inhábil.", true);
  }
}); 

closeNonWorkingDayHistoryBtn.addEventListener("click", function () {
  nonWorkingDayHistoryPanel.classList.add("hidden");
}); 


if (refreshSourceStatusBtn) {
  refreshSourceStatusBtn.addEventListener("click", loadSourceStatus);
}

function startEditingNonWorkingDay(nonWorkingDayId) {
  const selectedDay = currentNonWorkingDays.find(
    (item) => item.id === nonWorkingDayId
  );

  if (!selectedDay) {
    showMessage("No se encontró el día inhábil seleccionado.", true);
    return;
  } 

  if (!canModifyNonWorkingDay(selectedDay)) {
    showMessage("No tenés permisos para editar este día inhábil global.", true);
    return;
  }

  editingNonWorkingDayId = nonWorkingDayId; 
  editingNonWorkingDayData = selectedDay;

  nonWorkingDate.value = selectedDay.date;
  reason.value = selectedDay.reason || "";
  jurisdiction.value = selectedDay.jurisdiction || "pba";
  nonWorkingDayType.value = selectedDay.type || "";
  scope.value = selectedDay.scope || "manual";
  department.value = selectedDay.department || "";
  sourceReference.value = selectedDay.source_reference || "";
  nonWorkingNotes.value = selectedDay.notes || "";

  updateDepartmentVisibilityForManualLoad();

  submitNonWorkingDayBtn.textContent = "Guardar cambios";
  nonWorkingDayFormBadge.textContent = "Editando día inhábil";
  cancelEditNonWorkingDayBtn.classList.remove("hidden");
  form.classList.add("editing-mode");

  showMessage("Editando día inhábil. Modificá los datos y guardá los cambios.", true);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
} 

function getSourceStatusPeriod(item) {
  if (!item.earliest_date || !item.latest_date) {
    return "-";
  }

  if (item.earliest_date === item.latest_date) {
    return formatDate(item.earliest_date);
  }

  return `${formatDate(item.earliest_date)} al ${formatDate(item.latest_date)}`;
}

function getPendingSourceStatusClass(item) {
  if (item.pending_verification > 0) {
    return "source-status-pending";
  }

  return "source-status-ok";
}


function showNonWorkingDayHistory(nonWorkingDayId) {
  const selectedDay = currentNonWorkingDays.find(
    (item) => item.id === nonWorkingDayId
  );

  if (!selectedDay) {
    showMessage("No se encontró el día inhábil seleccionado.", true);
    return;
  }

  historyPanelTitle.textContent = `Historial - ${formatDate(selectedDay.date)}`;

  const history = selectedDay.history || [];

  if (!history.length) {
    nonWorkingDayHistoryContent.innerHTML = `
      <p class="detail-notes">Sin cambios registrados.</p>
    `;
  } else {
    nonWorkingDayHistoryContent.innerHTML = history
      .slice()
      .reverse()
      .map((item) => {
        const changedFields = renderChangedHistoryFields(
          item.previous_data,
          item.new_data
        );

        return `
          <div class="history-item">
            <div class="history-header">
              <strong>${formatDateTime(item.changed_at)}</strong>
              <span>${getHistoryTypeLabel(item.change_type)}</span>
            </div>

            <div class="history-changes">
              ${changedFields}
            </div>
          </div>
        `;
      })
      .join("");
  }

  nonWorkingDayHistoryPanel.classList.remove("hidden");

  nonWorkingDayHistoryPanel.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}


function updateFilterDepartmentVisibility() {
  const isPba = filterJurisdiction.value === "pba";

  if (!isPba && filterScope.value === "department") {
    filterScope.value = "";
  }

  const shouldShowDepartment = isPba && filterScope.value === "department";

  if (shouldShowDepartment) {
    filterDepartmentGroup.classList.remove("hidden");
    filterDepartmentGroup.style.display = "block";
    return;
  }

  filterDepartment.value = "";
  filterDepartmentGroup.classList.add("hidden");
  filterDepartmentGroup.style.display = "none";
}


function updateNonWorkingDaysTopScrollWidth() {
  if (!nonWorkingDaysTopScrollInner || !nonWorkingDaysTableScroll) return;

  const table = nonWorkingDaysTableScroll.querySelector(".deadlines-table");

  if (!table) return;

  nonWorkingDaysTopScrollInner.style.width = `${table.scrollWidth}px`;
}

async function importNationalHolidays() {
  const year = Number(importYear.value);
  const selectedJurisdiction = importJurisdiction.value;

  if (!year || year < 2016 || year > 2035) {
    showMessage("Ingresá un año válido entre 2016 y 2035.", true);
    return;
  }

  try {
    importNationalHolidaysBtn.disabled = true;
    importNationalHolidaysBtn.textContent = "Importando...";

    const url = `${NON_WORKING_DAYS_API_URL}/import-national-holidays?year=${year}&jurisdiction=${selectedJurisdiction}`;


    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudieron importar los feriados nacionales.");
    } 

    filterYear.value = year;
    filterJurisdiction.value = selectedJurisdiction;
    filterSource.value = "argentina_datos";
    filterType.value = "";
    filterScope.value = "";
    filterVerified.value = "";
    filterActive.value = "";
    filterDepartment.value = "";

    updateFilterDepartmentVisibility();

    await loadNonWorkingDays();

    showMessage(
      `Importación finalizada. Importados: ${result.imported}. Ya existentes: ${result.skipped_existing}. Total recibido: ${result.total_received}.`,
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudieron importar los feriados nacionales.", true);
  } finally {
    importNationalHolidaysBtn.disabled = false;
    importNationalHolidaysBtn.textContent = "Importar feriados nacionales";
  }
} 

async function importScbaCalendar() {
  const year = Number(importYear.value);

  if (!year || year < 2016 || year > 2035) {
    showMessage("Ingresá un año válido entre 2016 y 2035.", true);
    return;
  }

  const confirmImport = confirm(
    `Vas a importar el calendario SCBA para el año ${year}. Los registros quedarán pendientes de verificación. ¿Querés continuar?`
  );

  if (!confirmImport) {
    return;
  }

  try {
    importScbaCalendarBtn.disabled = true;
    importScbaCalendarBtn.textContent = "Importando SCBA...";

    const url = `${NON_WORKING_DAYS_API_URL}/import-scba-calendar?year=${year}`;


    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo importar el calendario SCBA.");
    }

    filterYear.value = year;
    filterJurisdiction.value = "pba";
    filterSource.value = "scba";
    filterVerified.value = "";
    filterActive.value = "";
    filterType.value = "";
    filterScope.value = "";
    filterDepartment.value = "";

    updateFilterDepartmentVisibility();

    await loadNonWorkingDays();

    showMessage(
      `Importación SCBA finalizada. Importados: ${result.imported}. Ya existentes: ${result.skipped_existing}. Duplicados omitidos: ${result.skipped_duplicate_calendar ?? 0}. Total recibido: ${result.total_received}.`,
      true
    ); 
    
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo importar el calendario SCBA.", true);
  } finally {
    importScbaCalendarBtn.disabled = false;
    importScbaCalendarBtn.textContent = "Importar calendario SCBA";
  }
} 


async function importTribunalFiscalCalendar() {
  const year = Number(importYear.value);

  if (!year || year < 2016 || year > 2035) {
    showMessage("Ingresá un año válido entre 2016 y 2035.", true);
    return;
  }

  const confirmImport = confirm(
    `Vas a importar el calendario del Tribunal Fiscal de la Nación para el año ${year}. Los registros quedarán pendientes de verificación. ¿Querés continuar?`
  );

  if (!confirmImport) {
    return;
  }

  try {
    importTribunalFiscalCalendarBtn.disabled = true;
    importTribunalFiscalCalendarBtn.textContent = "Importando Tribunal Fiscal...";

    const url = `${NON_WORKING_DAYS_API_URL}/import-tribunal-fiscal-calendar?year=${year}`;

    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo importar el calendario Tribunal Fiscal.");
    } 

    filterYear.value = year;
    filterJurisdiction.value = "national_federal";
    filterSource.value = "tribunal_fiscal";
    filterScope.value = "court";
    filterVerified.value = "";
    filterActive.value = "";
    filterType.value = "";
    filterDepartment.value = "";

    updateFilterDepartmentVisibility();

    await loadNonWorkingDays();

    showMessage(
      `Importación Tribunal Fiscal finalizada. Importados: ${result.imported}. Ya existentes: ${result.skipped_existing}. Total recibido: ${result.total_received}.`,
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(
      error.message || "No se pudo importar el calendario Tribunal Fiscal.",
      true
    );
  } finally {
    importTribunalFiscalCalendarBtn.disabled = false;
    importTribunalFiscalCalendarBtn.textContent =
      "Importar calendario Tribunal Fiscal";
  }
} 


async function importCabaCalendar() {
  const year = Number(importYear.value);

  if (!year || year < 2016 || year > 2035) {
    showMessage("Ingresá un año válido entre 2016 y 2035.", true);
    return;
  }

  const confirmImport = confirm(
    `Vas a importar el calendario judicial propio de CABA para el año ${year}. Por ahora el importador está preparado, pero puede no traer registros hasta validar una fuente oficial. ¿Querés continuar?`
  );

  if (!confirmImport) {
    return;
  }

  try {
    importCabaCalendarBtn.disabled = true;
    importCabaCalendarBtn.textContent = "Importando CABA...";

    const url = `${NON_WORKING_DAYS_API_URL}/import-caba-calendar?year=${year}`;

    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo importar el calendario CABA.");
    }

    filterYear.value = year;
    filterJurisdiction.value = "caba";
    filterSource.value = "caba";
    filterType.value = "";
    filterScope.value = "";
    filterVerified.value = "";
    filterActive.value = "";
    filterDepartment.value = "";

    updateFilterDepartmentVisibility();

    await loadNonWorkingDays();

    showMessage(
      `Importación CABA finalizada. Importados: ${result.imported}. Ya existentes: ${result.skipped_existing}. Total recibido: ${result.total_received}.`,
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo importar el calendario CABA.", true);
  } finally {
    importCabaCalendarBtn.disabled = false;
    importCabaCalendarBtn.textContent = "Importar calendario CABA";
  }
}


async function importCsjnCalendar() {
  const year = Number(importYear.value);

  if (!year || year < 2016 || year > 2035) {
    showMessage("Ingresá un año válido entre 2016 y 2035.", true);
    return;
  }

  const confirmImport = confirm(
    `Vas a importar el calendario CSJN para el año ${year}. Los registros quedarán pendientes de verificación. ¿Querés continuar?`
  );

  if (!confirmImport) {
    return;
  }

  try {
    importCsjnCalendarBtn.disabled = true;
    importCsjnCalendarBtn.textContent = "Importando CSJN...";

    const url = `${NON_WORKING_DAYS_API_URL}/import-csjn-calendar?year=${year}`;

    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const result = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo importar el calendario CSJN.");
    } 
    
    filterYear.value = year;
    filterJurisdiction.value = "national_federal";
    filterSource.value = "csjn";
    filterVerified.value = "";
    filterActive.value = "";
    filterType.value = "";
    filterScope.value = "";
    filterDepartment.value = "";

    updateFilterDepartmentVisibility();

    await loadNonWorkingDays();

    showMessage(
      `Importación CSJN finalizada. Importados: ${result.imported}. Ya existentes: ${result.skipped_existing}. Total recibido: ${result.total_received}.`,
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo importar el calendario CSJN.", true);
  } finally {
    importCsjnCalendarBtn.disabled = false;
    importCsjnCalendarBtn.textContent = "Importar calendario CSJN";
  }
}

async function loadNonWorkingDays() {
  try {
    showMessage("", false);

    nonWorkingDaysTableBody.innerHTML = `
      <tr>
        <td colspan="11">Cargando días inhábiles...</td>
      </tr>
    `;

    const url = buildNonWorkingDaysUrl();

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    const nonWorkingDays = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(
        nonWorkingDays.detail || "No se pudieron cargar los días inhábiles."
      );
    }

    await loadSourceStatus();

    renderNonWorkingDays(nonWorkingDays);
  } catch (error) {
    console.error(error);

    nonWorkingDaysSummary.textContent = "No se pudieron cargar los días inhábiles.";

    nonWorkingDaysTableBody.innerHTML = `
      <tr>
        <td colspan="11">No se pudieron cargar los días inhábiles. Verificá que el backend esté levantado.</td>
      </tr>
    `;
  }
}

function buildNonWorkingDaysUrl() {
  const params = new URLSearchParams();

  const selectedYear = Number(filterYear.value || importYear.value) || 2026;
  const selectedJurisdiction = filterJurisdiction.value || importJurisdiction.value || "pba";

  params.append("jurisdiction", selectedJurisdiction);
  params.append("year", selectedYear);

  if (filterType.value) {
    params.append("day_type", filterType.value);
  } 
   
  if (filterScope.value) {
    params.append("scope", filterScope.value);
  }

  if (filterDepartment.value) {
    params.append("department", filterDepartment.value);
  } 
  
  if (filterSource.value) {
    params.append("source", filterSource.value);
  }

  if (filterVerified.value) {
    params.append("verified", filterVerified.value);
  }

  if (filterActive.value) {
    params.append("active", filterActive.value);
  }

  return `${NON_WORKING_DAYS_API_URL}?${params.toString()}`;
} 

function updateNonWorkingDaysSummary(nonWorkingDays) {
  const total = nonWorkingDays.length;

  const pendingVerification = nonWorkingDays.filter(
    (day) => day.verified === false
  ).length;

  const verified = nonWorkingDays.filter(
    (day) => day.verified === true
  ).length;

  const automatic = nonWorkingDays.filter(
    (day) => day.source && day.source !== "manual"
  ).length;

  totalNonWorkingDays.textContent = total;
  pendingVerificationDays.textContent = pendingVerification;
  verifiedNonWorkingDays.textContent = verified;
  automaticNonWorkingDays.textContent = automatic;
}

function renderNonWorkingDays(nonWorkingDays) { 

  currentNonWorkingDays = nonWorkingDays;  

  updateNonWorkingDaysSummary(nonWorkingDays);

  const selectedYear = Number(filterYear.value || importYear.value) || 2026;

  if (!nonWorkingDays.length) {
    nonWorkingDaysSummary.textContent = `No hay días inhábiles para los filtros seleccionados.`;

    nonWorkingDaysTableBody.innerHTML = `
      <tr>
        <td colspan="11">No hay días inhábiles para mostrar.</td>
      </tr>
    `;

    return;
  }

  nonWorkingDaysSummary.textContent = `${nonWorkingDays.length} día(s) inhábil(es) cargado(s) para ${selectedYear}.`;

  nonWorkingDaysTableBody.innerHTML = "";

  nonWorkingDays.forEach((item) => {
    const row = document.createElement("tr"); 

    const canModifyDay = canModifyNonWorkingDay(item);

    const editButton = canModifyDay
      ? `
        <button class="btn-small btn-edit btn-edit-day" data-id="${item.id}">
          Editar
        </button>
      `
      : "";

    const verifyButton = canModifyDay && !item.verified
      ? `<button class="btn-small btn-complete btn-verify-day" data-id="${item.id}">Verificar</button>`
      : "";

    const toggleButton = canModifyDay
      ? item.active
        ? `<button class="btn-small btn-pending btn-toggle-day" data-id="${item.id}" data-active="false">Desactivar</button>`
        : `<button class="btn-small btn-complete btn-toggle-day" data-id="${item.id}" data-active="true">Activar</button>`
      : "";

    const deleteButton = canModifyDay
      ? `<button class="btn-small btn-delete" data-id="${item.id}">Eliminar</button>`
      : "";

    row.innerHTML = `
      <td><strong>${formatDate(item.date)}</strong></td>
      <td>${escapeHTML(item.reason)}</td>
      <td>${getJurisdictionLabel(item.jurisdiction)}</td>
      <td>${getTypeLabel(item.type)}</td>
      <td>${getScopeLabel(item.scope)}</td>
      <td>${escapeHTML(item.department || "-")}</td>
      <td>${getSourceLabel(item.source)}</td>
      <td>${escapeHTML(item.source_reference || "-")}</td>
      <td>
        <span class="status-badge ${item.verified ? "status-completed" : "status-pending"}">
          ${item.verified ? "Verificado" : "Pendiente"}
        </span>
      </td>
      <td>
        <span class="status-badge ${item.active ? "status-completed" : "status-expired"}">
          ${item.active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td>
        <div class="table-actions">
          ${editButton}

          <button class="btn-small btn-detail btn-history-day" data-id="${item.id}">
            Historial
          </button>

          ${verifyButton}
          ${toggleButton}
          ${deleteButton}
        </div>
      </td>
    `;

    nonWorkingDaysTableBody.appendChild(row);
  });

  attachActionEvents(); 
  updateNonWorkingDaysTopScrollWidth();
}

function attachActionEvents() {
  const verifyButtons = document.querySelectorAll(".btn-verify-day");
  const toggleButtons = document.querySelectorAll(".btn-toggle-day");
  const deleteButtons = document.querySelectorAll(".btn-delete");
  const editButtons = document.querySelectorAll(".btn-edit-day");
  const historyButtons = document.querySelectorAll(".btn-history-day");

  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      startEditingNonWorkingDay(button.dataset.id);
    });
  }); 

  historyButtons.forEach((button) => {
    button.addEventListener("click", function () {
      showNonWorkingDayHistory(button.dataset.id);
    });
  });

  verifyButtons.forEach((button) => {
    button.addEventListener("click", function () {
      updateNonWorkingDay(button.dataset.id, { verified: true }, "Día inhábil marcado como verificado.");
    });
  });

  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const newActiveValue = button.dataset.active === "true";
      const message = newActiveValue
        ? "Día inhábil activado correctamente."
        : "Día inhábil desactivado correctamente.";

      updateNonWorkingDay(button.dataset.id, { active: newActiveValue }, message);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      deleteNonWorkingDay(button.dataset.id);
    });
  });
} 

async function verifyVisiblePendingDays() {
  const pendingVisibleDays = currentNonWorkingDays.filter(
    (day) => day.verified === false
  ); 

  if (!isCurrentUserAdmin()) {
    showMessage("Solo un administrador puede verificar días globales en bloque.", true);
    return;
  }

  if (!pendingVisibleDays.length) {
    showMessage("No hay días pendientes visibles para verificar.", true);
    return;
  }

  const confirmVerification = confirm(
    `Vas a marcar como verificados ${pendingVisibleDays.length} día(s) inhábil(es) visibles. ¿Confirmás que ya revisaste la fuente correspondiente?`
  );

  if (!confirmVerification) {
    return;
  }

  try {
    verifyVisiblePendingDaysBtn.disabled = true;
    verifyVisiblePendingDaysBtn.textContent = "Verificando...";

    for (const day of pendingVisibleDays) {
      const response = await fetch(`${NON_WORKING_DAYS_API_URL}/${day.id}`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ verified: true }),
      });

      if (handleUnauthorizedResponse(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(`No se pudo verificar el día ${formatDate(day.date)}.`);
      }
    }

    await loadNonWorkingDays();

    showMessage(
      `${pendingVisibleDays.length} día(s) inhábil(es) marcado(s) como verificados.`,
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudieron verificar los días visibles.", true);
  } finally {
    verifyVisiblePendingDaysBtn.disabled = false;
    verifyVisiblePendingDaysBtn.textContent = "Verificar pendientes visibles";
  }
}

async function updateNonWorkingDay(nonWorkingDayId, payload, successMessage) {
  const selectedDay = currentNonWorkingDays.find(
    (item) => item.id === nonWorkingDayId
  );

  if (selectedDay && !canModifyNonWorkingDay(selectedDay)) {
    showMessage("No tenés permisos para modificar este día inhábil global.", true);
    return;
  }

  try {
    const response = await fetch(`${NON_WORKING_DAYS_API_URL}/${nonWorkingDayId}`, {
      method: "PATCH",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "No se pudo actualizar el día inhábil.");
    }

    await loadNonWorkingDays();
    showMessage(successMessage, true);
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo actualizar el día inhábil.", true);
  }
}

async function deleteNonWorkingDay(nonWorkingDayId) {
  const selectedDay = currentNonWorkingDays.find(
    (item) => item.id === nonWorkingDayId
  );

  if (selectedDay && !canModifyNonWorkingDay(selectedDay)) {
    showMessage("No tenés permisos para eliminar este día inhábil global.", true);
    return;
  }

  const confirmDelete = confirm("¿Seguro que querés eliminar este día inhábil?");

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(`${NON_WORKING_DAYS_API_URL}/${nonWorkingDayId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "No se pudo eliminar el día inhábil.");
    }

    await loadNonWorkingDays();
    showMessage("Día inhábil eliminado correctamente.", true);
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo eliminar el día inhábil.", true);
  }
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

function getTypeLabel(type) {
  const labels = {
    national_holiday: "Feriado nacional",
    provincial_holiday: "Feriado provincial",
    judicial_recess: "Feria judicial",
    court_holiday: "Asueto judicial",
    term_suspension: "Suspensión de términos",
    special_non_working_day: "Inhábil especial",
    holiday: "Feriado",
  };

  return labels[type] || "Otro";
} 

function getScopeLabel(scope) {
  const labels = {
    national: "Nacional",
    provincial: "Provincial",
    department: "Departamento judicial",
    locality: "Localidad",
    court: "Organismo / juzgado",
    manual: "General / Manual",
  };

  return labels[scope] || "General / Manual";
}

function getSourceLabel(source) {
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

function showMessage(message, visible) {
  if (!visible || !message) {
    nonWorkingDayMessage.classList.add("hidden");
    nonWorkingDayMessage.textContent = "";
    return;
  }

  nonWorkingDayMessage.textContent = message;
  nonWorkingDayMessage.classList.remove("hidden");
} 


function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "-";

  const date = new Date(dateTimeString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getHistoryTypeLabel(changeType) {
  const labels = {
    full_update: "Edición completa",
    partial_update: "Actualización rápida",
  };

  return labels[changeType] || "Cambio";
}

function renderHistorySnapshot(snapshot) {
  if (!snapshot) return "<p>-</p>";

  return `
    <p><strong>Motivo:</strong> ${escapeHTML(snapshot.reason || "-")}</p>
    <p><strong>Tipo:</strong> ${getTypeLabel(snapshot.type)}</p>
    <p><strong>Alcance:</strong> ${getScopeLabel(snapshot.scope)}</p>
    <p><strong>Departamento:</strong> ${escapeHTML(snapshot.department || "-")}</p>
    <p><strong>Referencia:</strong> ${escapeHTML(snapshot.source_reference || "-")}</p>
    <p><strong>Notas:</strong> ${escapeHTML(snapshot.notes || "-")}</p>
    <p><strong>Verificado:</strong> ${snapshot.verified ? "Sí" : "No"}</p>
    <p><strong>Activo:</strong> ${snapshot.active ? "Sí" : "No"}</p>
  `;
} 



function renderChangedHistoryFields(previousData = {}, newData = {}) {
  const fieldsToCompare = [
    "date",
    "reason",
    "jurisdiction",
    "type",
    "scope",
    "department",
    "locality",
    "court",
    "source",
    "source_url",
    "source_reference",
    "notes",
    "verified",
    "active",
  ];

  const changedFields = fieldsToCompare.filter((field) => {
    const previousValue = previousData?.[field] ?? null;
    const newValue = newData?.[field] ?? null;

    return previousValue !== newValue;
  });

  if (!changedFields.length) {
    return `<p class="detail-notes">No se detectaron cambios relevantes.</p>`;
  }

  return changedFields
    .map((field) => {
      return `
        <div class="history-change-row">
          <strong>${getHistoryFieldLabel(field)}</strong>
          <div>
            <span class="history-before">${formatHistoryFieldValue(field, previousData?.[field])}</span>
            <span class="history-arrow">→</span>
            <span class="history-after">${formatHistoryFieldValue(field, newData?.[field])}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function getHistoryFieldLabel(field) {
  const labels = {
    date: "Fecha",
    reason: "Motivo",
    jurisdiction: "Jurisdicción",
    type: "Tipo",
    scope: "Alcance",
    department: "Departamento",
    locality: "Localidad",
    court: "Organismo / juzgado",
    source: "Fuente",
    source_url: "URL de fuente",
    source_reference: "Referencia",
    notes: "Notas",
    verified: "Verificado",
    active: "Activo",
  };

  return labels[field] || field;
}

function formatHistoryFieldValue(field, value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (field === "date") {
    return formatDate(value);
  }

  if (field === "jurisdiction") {
    return getJurisdictionLabel(value);
  }

  if (field === "type") {
    return getTypeLabel(value);
  }

  if (field === "scope") {
    return getScopeLabel(value);
  }

  if (field === "verified" || field === "active") {
    return value ? "Sí" : "No";
  }

  return escapeHTML(value);
} 


async function loadSourceStatus() {
  if (!sourceStatusTableBody) return;

  const year = Number(filterYear.value || importYear.value);

  if (!year) {
    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="9">Seleccioná un año válido para ver el estado de fuentes.</td>
      </tr>
    `;
    return;
  }

  try {
    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="9">Cargando estado de fuentes...</td>
      </tr>
    `;

    const url = `${NON_WORKING_DAYS_API_URL}/source-status?year=${year}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    const sourceStatus = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(sourceStatus.detail || "No se pudo cargar el estado de fuentes.");
    }

    renderSourceStatus(sourceStatus);
  } catch (error) {
    console.error(error);

    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="9">No se pudo cargar el estado de fuentes.</td>
      </tr>
    `;
  }
} 


function formatDate(dateString) {
  if (!dateString) return "-";

  const cleanDateString = String(dateString).split("T")[0];
  const [year, month, day] = cleanDateString.split("-").map(Number);

  if (!year || !month || !day) {
    return "-";
  }

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


function renderSourceStatus(sourceStatus) {
  if (!sourceStatus.length) {
    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="9">No hay fuentes cargadas para el año seleccionado.</td>
      </tr>
    `;
    return;
  }

  sourceStatusTableBody.innerHTML = sourceStatus
    .map((item) => {
      return `
        <tr>
          <td>
            <strong>${getSourceLabel(item.source)}</strong>
            ${
              item.automatic
                ? `<span class="source-status-chip automatic">Automática</span>`
                : `<span class="source-status-chip manual">Manual</span>`
            }
          </td>

          <td>${getJurisdictionLabel(item.jurisdiction)}</td>

          <td><strong>${item.total}</strong></td>

          <td>${item.verified}</td>

          <td>
            <span class="source-status-badge ${getPendingSourceStatusClass(item)}">
              ${item.pending_verification}
            </span>
          </td>

          <td>${item.active}</td>

          <td>${item.inactive}</td>

          <td>${getSourceStatusPeriod(item)}</td> 

          <td>
            <button
              class="btn-small btn-detail btn-filter-source-status"
              type="button"
              data-year="${item.year}"
              data-jurisdiction="${item.jurisdiction}"
              data-source="${item.source}"
            >
              Ver registros
            </button>
          </td>
          
        </tr>
      `;
    })
    .join("");

    attachSourceStatusFilterEvents();
} 


function attachSourceStatusFilterEvents() {
  const sourceFilterButtons = document.querySelectorAll(
    ".btn-filter-source-status"
  );

  sourceFilterButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      filterYear.value = button.dataset.year || filterYear.value || "2026";
      filterJurisdiction.value = button.dataset.jurisdiction || "";
      filterSource.value = button.dataset.source || "";

      filterType.value = "";
      filterVerified.value = "";
      filterActive.value = "";
      filterScope.value = "";
      filterDepartment.value = "";

      updateFilterDepartmentVisibility();

      await loadNonWorkingDays();

      showMessage(
        `Mostrando registros de ${getSourceLabel(button.dataset.source)} para ${getJurisdictionLabel(button.dataset.jurisdiction)}.`,
        true
      );

      nonWorkingDaysTableScroll.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
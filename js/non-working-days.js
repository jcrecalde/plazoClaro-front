const NON_WORKING_DAYS_API_URL = "http://127.0.0.1:8000/non-working-days";

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
 
const importYear = document.getElementById("importYear");
const importJurisdiction = document.getElementById("importJurisdiction");
const importNationalHolidaysBtn = document.getElementById("importNationalHolidaysBtn"); 
const importScbaCalendarBtn = document.getElementById("importScbaCalendarBtn"); 
const importCsjnCalendarBtn = document.getElementById("importCsjnCalendarBtn");

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

function updateDepartmentVisibilityForManualLoad() {
  const shouldShowDepartment =
    jurisdiction.value === "pba" && scope.value === "department";

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

document.addEventListener("DOMContentLoaded", loadNonWorkingDays);

refreshNonWorkingDaysBtn.addEventListener("click", loadNonWorkingDays);

importNationalHolidaysBtn.addEventListener("click", importNationalHolidays); 
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

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
  const shouldShowDepartment =
    filterJurisdiction.value === "pba" && filterScope.value === "department";

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
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "No se pudieron importar los feriados nacionales.");
    }

    filterYear.value = year;
    filterJurisdiction.value = selectedJurisdiction;

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
    });

    const result = await response.json();

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
    });

    const result = await response.json();

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

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("No se pudieron cargar los días inhábiles.");
    }

    const nonWorkingDays = await response.json(); 

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
          <button class="btn-small btn-edit btn-edit-day" data-id="${item.id}">
            Editar
          </button>  

          <button class="btn-small btn-detail btn-history-day" data-id="${item.id}">
            Historial
          </button>

          ${
            !item.verified
              ? `<button class="btn-small btn-complete btn-verify-day" data-id="${item.id}">Verificar</button>`
              : ""
          }

          ${
            item.active
              ? `<button class="btn-small btn-pending btn-toggle-day" data-id="${item.id}" data-active="false">Desactivar</button>`
              : `<button class="btn-small btn-complete btn-toggle-day" data-id="${item.id}" data-active="true">Activar</button>`
          }

          <button class="btn-small btn-delete" data-id="${item.id}">
            Eliminar
          </button>
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verified: true }),
      });

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
  try {
    const response = await fetch(`${NON_WORKING_DAYS_API_URL}/${nonWorkingDayId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

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
  const confirmDelete = confirm("¿Seguro que querés eliminar este día inhábil?");

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(`${NON_WORKING_DAYS_API_URL}/${nonWorkingDayId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("No se pudo eliminar el día inhábil.");
    }

    await loadNonWorkingDays();
    showMessage("Día inhábil eliminado correctamente.", true);
  } catch (error) {
    console.error(error);
    showMessage("No se pudo eliminar el día inhábil.", true);
  }
}

function formatDate(dateString) {
  if (!dateString) return "-";

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

function getJurisdictionLabel(jurisdiction) {
  if (jurisdiction === "pba") return "Provincia de Buenos Aires";
  if (jurisdiction === "national_federal") return "Nacional / Federal";

  return "Jurisdicción no especificada";
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
        <td colspan="8">Seleccioná un año válido para ver el estado de fuentes.</td>
      </tr>
    `;
    return;
  }

  try {
    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="8">Cargando estado de fuentes...</td>
      </tr>
    `;

    const url = `${NON_WORKING_DAYS_API_URL}/source-status?year=${year}`;

    const response = await fetch(url);
    const sourceStatus = await response.json();

    if (!response.ok) {
      throw new Error(sourceStatus.detail || "No se pudo cargar el estado de fuentes.");
    }

    renderSourceStatus(sourceStatus);
  } catch (error) {
    console.error(error);

    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="8">No se pudo cargar el estado de fuentes.</td>
      </tr>
    `;
  }
} 


function renderSourceStatus(sourceStatus) {
  if (!sourceStatus.length) {
    sourceStatusTableBody.innerHTML = `
      <tr>
        <td colspan="8">No hay fuentes cargadas para el año seleccionado.</td>
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
        </tr>
      `;
    })
    .join("");
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
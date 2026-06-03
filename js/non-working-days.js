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

updateDepartmentVisibilityForManualLoad(); 
updateFilterDepartmentVisibility();

document.addEventListener("DOMContentLoaded", loadNonWorkingDays);

refreshNonWorkingDaysBtn.addEventListener("click", loadNonWorkingDays);

importNationalHolidaysBtn.addEventListener("click", importNationalHolidays);

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

    editingNonWorkingDayId = null; 
    editingNonWorkingDayData = null;
    form.reset();
    updateDepartmentVisibilityForManualLoad();
    submitNonWorkingDayBtn.textContent = "Guardar día inhábil";

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
  showMessage("Editando día inhábil. Modificá los datos y guardá los cambios.", true);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
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

function renderNonWorkingDays(nonWorkingDays) { 

  currentNonWorkingDays = nonWorkingDays; 

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

  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      startEditingNonWorkingDay(button.dataset.id);
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

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
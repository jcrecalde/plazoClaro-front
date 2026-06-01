const NON_WORKING_DAYS_API_URL = "http://127.0.0.1:8000/non-working-days";

const form = document.getElementById("nonWorkingDayForm");
const nonWorkingDate = document.getElementById("nonWorkingDate");
const reason = document.getElementById("reason");
const jurisdiction = document.getElementById("jurisdiction");
const type = document.getElementById("type");

const importYear = document.getElementById("importYear");
const importJurisdiction = document.getElementById("importJurisdiction");
const importNationalHolidaysBtn = document.getElementById("importNationalHolidaysBtn");

const nonWorkingDaysTableBody = document.getElementById("nonWorkingDaysTableBody");
const nonWorkingDaysSummary = document.getElementById("nonWorkingDaysSummary");
const nonWorkingDayMessage = document.getElementById("nonWorkingDayMessage");
const refreshNonWorkingDaysBtn = document.getElementById("refreshNonWorkingDaysBtn");

document.addEventListener("DOMContentLoaded", loadNonWorkingDays);

refreshNonWorkingDaysBtn.addEventListener("click", loadNonWorkingDays);

importNationalHolidaysBtn.addEventListener("click", importNationalHolidays);

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const payload = {
    date: nonWorkingDate.value,
    reason: reason.value.trim(),
    jurisdiction: jurisdiction.value,
    type: type.value,
    scope: "manual",
    source: "manual",
    source_url: null,
    verified: true,
    active: true,
  };

  if (!payload.date || !payload.reason) {
    showMessage("Completá la fecha y el motivo.", true);
    return;
  }

  try {
    const response = await fetch(NON_WORKING_DAYS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(
        errorData.detail || "No se pudo guardar el día inhábil."
      );
    }

    form.reset();

    showMessage("Día inhábil guardado correctamente.", true);
    loadNonWorkingDays();
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo guardar el día inhábil.", true);
  }
});

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
        <td colspan="8">Cargando días inhábiles...</td>
      </tr>
    `;

    const selectedYear = Number(importYear.value) || 2026;
    const selectedJurisdiction = importJurisdiction.value || "pba";

    const response = await fetch(
      `${NON_WORKING_DAYS_API_URL}?jurisdiction=${selectedJurisdiction}&year=${selectedYear}`
    );

    if (!response.ok) {
      throw new Error("No se pudieron cargar los días inhábiles.");
    }

    const nonWorkingDays = await response.json();

    renderNonWorkingDays(nonWorkingDays, selectedYear);
  } catch (error) {
    console.error(error);

    nonWorkingDaysSummary.textContent = "No se pudieron cargar los días inhábiles.";

    nonWorkingDaysTableBody.innerHTML = `
      <tr>
        <td colspan="8">No se pudieron cargar los días inhábiles. Verificá que el backend esté levantado.</td>
      </tr>
    `;
  }
}

function renderNonWorkingDays(nonWorkingDays, year) {
  if (!nonWorkingDays.length) {
    nonWorkingDaysSummary.textContent = `No hay días inhábiles cargados para ${year}.`;

    nonWorkingDaysTableBody.innerHTML = `
      <tr>
        <td colspan="8">Todavía no hay días inhábiles cargados.</td>
      </tr>
    `;

    return;
  }

  nonWorkingDaysSummary.textContent = `${nonWorkingDays.length} día(s) inhábil(es) cargado(s) para ${year}.`;

  nonWorkingDaysTableBody.innerHTML = "";

  nonWorkingDays.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${formatDate(item.date)}</strong></td>
      <td>${escapeHTML(item.reason)}</td>
      <td>${getJurisdictionLabel(item.jurisdiction)}</td>
      <td>${getTypeLabel(item.type)}</td>
      <td>${getSourceLabel(item.source)}</td>
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
          <button class="btn-small btn-delete" data-id="${item.id}">
            Eliminar
          </button>
        </div>
      </td>
    `;

    nonWorkingDaysTableBody.appendChild(row);
  });

  attachDeleteEvents();
}

function attachDeleteEvents() {
  const deleteButtons = document.querySelectorAll(".btn-delete");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      deleteNonWorkingDay(button.dataset.id);
    });
  });
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

    showMessage("Día inhábil eliminado correctamente.", true);
    loadNonWorkingDays();
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
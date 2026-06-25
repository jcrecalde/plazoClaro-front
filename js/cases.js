const CASES_API_URL = "http://127.0.0.1:8000/cases"; 
const DEADLINES_API_URL = "http://127.0.0.1:8000/deadlines"; 


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

const caseForm = document.getElementById("caseForm");
const caseId = document.getElementById("caseId");
const caseTitle = document.getElementById("caseTitle");
const caseNumber = document.getElementById("caseNumber");
const caseJudicialLink = document.getElementById("caseJudicialLink");
const clientName = document.getElementById("clientName");
const matterType = document.getElementById("matterType");
const caseJurisdiction = document.getElementById("caseJurisdiction");
const caseDepartment = document.getElementById("caseDepartment");
const caseDepartmentGroup = document.getElementById("caseDepartmentGroup");
const caseCourt = document.getElementById("caseCourt");
const caseCourtGroup = document.getElementById("caseCourtGroup");
const caseStatus = document.getElementById("caseStatus");
const caseNotes = document.getElementById("caseNotes");

const caseFormBadge = document.getElementById("caseFormBadge");
const submitCaseBtn = document.getElementById("submitCaseBtn");
const cancelCaseEditBtn = document.getElementById("cancelCaseEditBtn");

const caseMessage = document.getElementById("caseMessage");
const casesCards = document.getElementById("casesCards");
const casesSummary = document.getElementById("casesSummary");
const refreshCasesBtn = document.getElementById("refreshCasesBtn");
const caseSearch = document.getElementById("caseSearch");

const totalCases = document.getElementById("totalCases");
const activeCases = document.getElementById("activeCases");
const archivedCases = document.getElementById("archivedCases"); 
const caseDeadlinesPanel = document.getElementById("caseDeadlinesPanel");
const caseDeadlinesTitle = document.getElementById("caseDeadlinesTitle");
const caseDeadlinesSummary = document.getElementById("caseDeadlinesSummary"); 
const caseArchivedNotice = document.getElementById("caseArchivedNotice");
const caseDeadlinesTableBody = document.getElementById("caseDeadlinesTableBody");
const closeCaseDeadlinesBtn = document.getElementById("closeCaseDeadlinesBtn");
const calculateDeadlineForCaseBtn = document.getElementById("calculateDeadlineForCaseBtn");

const caseDeadlinesTotal = document.getElementById("caseDeadlinesTotal");
const caseDeadlinesPending = document.getElementById("caseDeadlinesPending");
const caseDeadlinesExpired = document.getElementById("caseDeadlinesExpired");
const caseDeadlinesCompleted = document.getElementById("caseDeadlinesCompleted");
const caseDeadlinesUpcoming = document.getElementById("caseDeadlinesUpcoming");  

const caseConfirmModal = document.getElementById("caseConfirmModal");
const caseConfirmTitle = document.getElementById("caseConfirmTitle");
const caseConfirmMessage = document.getElementById("caseConfirmMessage");
const caseConfirmAcceptBtn = document.getElementById("caseConfirmAcceptBtn");
const caseConfirmCancelBtn = document.getElementById("caseConfirmCancelBtn");


const caseStatusFilterButtons = document.querySelectorAll(".case-status-filter");

let currentCaseStatusFilter = "active";

let allCases = [];
let allDeadlines = [];
let currentSearch = "";
let selectedCaseForDeadlines = null; 

populatePbaDepartmentSelect(caseDepartment, {
  includeEmpty: true,
  emptyLabel: "Sin departamento específico",
});

document.addEventListener("DOMContentLoaded", loadCases);
refreshCasesBtn.addEventListener("click", loadCases);
caseJurisdiction.addEventListener("change", updateJurisdictionDependentFields); 

closeCaseDeadlinesBtn.addEventListener("click", function () {
  caseDeadlinesPanel.classList.add("hidden");

  if (caseArchivedNotice) {
    caseArchivedNotice.classList.add("hidden");
  }

  updateCalculateDeadlineButton(null);
});


calculateDeadlineForCaseBtn.addEventListener("click", function () {
  if (!selectedCaseForDeadlines) {
    showMessage("Primero seleccioná una causa.", true);
    return;
  }

  if (selectedCaseForDeadlines.status === "archived") {
    showMessage(
      "Para cargar un nuevo plazo, primero reactivá la causa.",
      true
    );
    return;
  }

  localStorage.setItem("plazoclaro_selected_case_id", selectedCaseForDeadlines.id);

  window.location.href = "./calculator.html";
});

caseSearch.addEventListener("input", function () {
  currentSearch = caseSearch.value.trim().toLowerCase();
  renderCases(getFilteredCases());
});

cancelCaseEditBtn.addEventListener("click", function () {
  resetForm();
  showMessage("Edición cancelada.", true);
}); 

caseStatusFilterButtons.forEach((button) => {
  button.addEventListener("click", function () {
    currentCaseStatusFilter = button.dataset.statusFilter;

    caseStatusFilterButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    renderCases(getFilteredCases());
  });
});

caseForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const isEditing = Boolean(caseId.value);

  const payload = {
    title: caseTitle.value.trim(),
    case_number: caseNumber.value.trim() || null,
    judicial_link: caseJudicialLink.value.trim() || null,
    client_name: clientName.value.trim() || null,
    matter_type: matterType.value || null,
    jurisdiction: caseJurisdiction.value,
    department: caseJurisdiction.value === "pba" ? caseDepartment.value || null : null,
    locality: null,
    court: caseJurisdiction.value === "national_federal" ? caseCourt.value || null : null,
    notes: caseNotes.value.trim() || null,
  };

  if (isEditing) {
    payload.status = caseStatus.value;
  }

  if (!payload.title) {
    showMessage("Completá el nombre de la causa.", true);
    return;
  }

  try {
    submitCaseBtn.disabled = true;
    submitCaseBtn.textContent = isEditing ? "Guardando cambios..." : "Guardando...";

    const url = isEditing ? `${CASES_API_URL}/${caseId.value}` : CASES_API_URL;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: getJsonAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();  


    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo guardar la causa.");
    }

    resetForm();
    await loadCases();

    showMessage(
      isEditing ? "Causa actualizada correctamente." : "Causa creada correctamente.",
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo guardar la causa.", true);
  } finally {
    submitCaseBtn.disabled = false;
    submitCaseBtn.textContent = "Guardar causa";
  }
});

function updateJurisdictionDependentFields() {
  const isPba = caseJurisdiction.value === "pba";
  const isNationalFederal = caseJurisdiction.value === "national_federal";

  if (isPba) {
    caseDepartmentGroup.classList.remove("hidden");
    caseDepartmentGroup.style.display = "block";
  } else {
    caseDepartment.value = "";
    caseDepartmentGroup.classList.add("hidden");
    caseDepartmentGroup.style.display = "none";
  }

  if (isNationalFederal) {
    caseCourtGroup.classList.remove("hidden");
    caseCourtGroup.style.display = "block";
  } else {
    caseCourt.value = "";
    caseCourtGroup.classList.add("hidden");
    caseCourtGroup.style.display = "none";
  }
}

async function loadCases() {
  try {
    showMessage("", false);

    casesCards.innerHTML = `
      <div class="case-card-placeholder">
        Cargando causas...
      </div>
    `;

    const [casesResponse, deadlinesResponse] = await Promise.all([
      fetch(CASES_API_URL, {
        headers: getAuthHeaders(),
      }),
      fetch(DEADLINES_API_URL, {
        headers: getAuthHeaders(),
      }),
    ]);

    const cases = await casesResponse.json();
    const deadlines = await deadlinesResponse.json(); 

    if (handleUnauthorizedResponse(casesResponse)) {
      return;
    }

    if (handleUnauthorizedResponse(deadlinesResponse)) {
      return;
    }

    if (!casesResponse.ok) {
      throw new Error(cases.detail || "No se pudieron cargar las causas.");
    }

    if (!deadlinesResponse.ok) {
      throw new Error(deadlines.detail || "No se pudieron cargar los plazos.");
    }

    allCases = sortCases(cases);
    allDeadlines = deadlines;

    updateSummary(allCases);
    renderCases(getFilteredCases());
    openCaseFromStorage(); 

  } catch (error) {
    console.error(error);
    casesSummary.textContent = "No se pudieron cargar las causas.";

    casesCards.innerHTML = `
      <div class="case-card-placeholder">
        No se pudieron cargar las causas. Verificá que el backend esté levantado.
      </div>
    `;
  }
} 


function sortCases(cases) {
  return [...cases].sort((a, b) => {
    const statusOrder = {
      active: 1,
      archived: 2,
    };

    const statusA = statusOrder[a.status] || 99;
    const statusB = statusOrder[b.status] || 99;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function updateSummary(cases) {
  totalCases.textContent = cases.length;
  activeCases.textContent = cases.filter((item) => item.status === "active").length;
  archivedCases.textContent = cases.filter((item) => item.status === "archived").length;
}

function getFilteredCases() {
  let filteredCases = allCases;

  if (currentCaseStatusFilter === "active") {
    filteredCases = filteredCases.filter((caseItem) => caseItem.status !== "archived");
  }

  if (currentCaseStatusFilter === "archived") {
    filteredCases = filteredCases.filter((caseItem) => caseItem.status === "archived");
  }

  if (currentSearch) {
    filteredCases = filteredCases.filter((caseItem) => {
      const searchableText = [
        caseItem.title,
        caseItem.case_number,
        caseItem.judicial_link,
        caseItem.client_name,
        caseItem.matter_type,
        caseItem.jurisdiction,
        caseItem.department,
        caseItem.court,
        caseItem.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(currentSearch);
    });
  }

  return filteredCases;
}

function renderCases(cases) {
  updateCasesListSummary(cases.length);

  if (!cases.length) {
    casesCards.innerHTML = `
      <div class="case-card-placeholder">
        ${getCasesEmptyMessage()}
      </div>
    `;

    return;
  }

  updateCasesListSummary(cases.length);

  if (!cases.length) {
    casesCards.innerHTML = `
      <div class="case-card-placeholder">
        No hay causas que coincidan con la búsqueda.
      </div>
    `;

    return;
  }

  casesCards.innerHTML = "";

  cases.forEach((item) => {
    const caseDeadlineSummary = getCaseDeadlineSummary(item.id);
    const nextDeadline = getNextPendingDeadline(item.id);

    const card = document.createElement("article");
    const cardAlertClass =
      item.status === "archived"
        ? "case-card-finalized"
        : getCaseCardAlertClass(caseDeadlineSummary, nextDeadline);

    card.className = `case-card ${cardAlertClass}`;

    card.innerHTML = `
      <div class="case-card-header">
        <div>
          <span class="case-card-kicker">
            ${escapeHTML(item.matter_type || "Materia no especificada")}
          </span>

          <h3>${escapeHTML(item.title)}</h3>
        </div>

        <div class="case-card-status-group">
          ${
            item.status === "archived"
              ? getFinalizedCaseBadgeHtml()
              : getCaseAlertBadgeHtml(caseDeadlineSummary, nextDeadline)
          }

          <span class="status-badge ${getCaseStatusBadgeClass(item.status)}">
            ${getStatusLabel(item.status)}
          </span>
        </div>
      </div>

      <div class="case-card-meta-grid">
        <div>
          <span>Expediente</span>
          <strong>${escapeHTML(item.case_number || "-")}</strong>
        </div>

        <div>
          <span>Cliente</span>
          <strong>${escapeHTML(item.client_name || "-")}</strong>
        </div>

        <div>
          <span>Jurisdicción</span>
          <strong>${getJurisdictionLabel(item.jurisdiction)}</strong>
        </div>

        <div>
          <span>Ámbito</span>
          <strong>${escapeHTML(getCaseScopeLabel(item))}</strong>
        </div>
      </div>

      <div class="case-card-deadline-summary">
        <div>
          <span>Total de plazos</span>
          <strong>${caseDeadlineSummary.total}</strong>
        </div>

        <div>
          <span>Pendientes</span>
          <strong>${caseDeadlineSummary.pending}</strong>
        </div>

        <div>
          <span>Vencidos</span>
          <strong>${caseDeadlineSummary.expired}</strong>
        </div>

        <div>
          <span>Próximo vencimiento</span>
          <strong>${nextDeadline ? formatDate(nextDeadline.deadline_date) : "-"}</strong>
        </div>
      </div> 

      <div class="case-judicial-review ${getJudicialReviewClass(item)}">
        <div>
          <span>Revisión PJN/MEV</span>
          <strong>${getJudicialReviewLabel(item)}</strong>
          <small>${getJudicialReviewHint(item)}</small>
        </div>
      </div>

      <div class="case-card-actions">
        <button class="btn-small btn-detail btn-view-case-deadlines" data-id="${item.id}">
          Ver plazos
        </button> 

        ${
          item.judicial_link
            ? `<button class="btn-small btn-detail btn-open-judicial-link" data-id="${item.id}">
                Abrir PJN/MEV
              </button>`
            : `<button
                class="btn-small btn-detail"
                type="button"
                disabled
                title="Agregá un link judicial editando la causa."
              >
                Sin link PJN/MEV
              </button>`
        }

        <button class="btn-small btn-pending btn-review-case-today" data-id="${item.id}">
          Registrar revisión de hoy
        </button>

        ${
          item.status === "active"
            ? `<button class="btn-small btn-complete btn-new-deadline-case" data-id="${item.id}">
                Nuevo plazo
              </button>`
            : `<button
                class="btn-small btn-complete"
                type="button"
                disabled
                title="Esta causa está finalizada. Para cargar un nuevo plazo, primero reactivala."
              >
                Reactivar para nuevo plazo
              </button>`
        }

        <button class="btn-small btn-edit btn-edit-case" data-id="${item.id}">
          Editar
        </button>

        ${
          item.status === "active"
            ? `<button class="btn-small btn-pending btn-archive-case" data-id="${item.id}">Finalizar</button>`
            : `<button class="btn-small btn-complete btn-activate-case" data-id="${item.id}">Reactivar</button>`
        }

        <button class="btn-small btn-delete btn-delete-case" data-id="${item.id}">
          Eliminar
        </button>
      </div>
    `;

    casesCards.appendChild(card);
  });

  attachCaseActionEvents();
}
 

function updateCasesListSummary(displayedCount) {
  if (currentSearch && currentCaseStatusFilter === "active") {
    casesSummary.textContent =
      `${displayedCount} resultado(s) en causas activas de ${allCases.length} causa(s) cargada(s).`;
    return;
  }

  if (currentSearch && currentCaseStatusFilter === "archived") {
    casesSummary.textContent =
      `${displayedCount} resultado(s) en causas finalizadas de ${allCases.length} causa(s) cargada(s).`;
    return;
  }

  if (currentSearch) {
    casesSummary.textContent =
      `${displayedCount} resultado(s) de ${allCases.length} causa(s) cargada(s).`;
    return;
  }

  if (currentCaseStatusFilter === "active") {
    casesSummary.textContent =
      `${displayedCount} causa(s) activa(s) de ${allCases.length} causa(s) cargada(s).`;
    return;
  }

  if (currentCaseStatusFilter === "archived") {
    casesSummary.textContent =
      `${displayedCount} causa(s) finalizada(s) de ${allCases.length} causa(s) cargada(s).`;
    return;
  }

  if (currentCaseStatusFilter === "all") {
    casesSummary.textContent =
      `${displayedCount} causa(s) mostrada(s) de ${allCases.length} causa(s) cargada(s).`;
    return;
  }

  casesSummary.textContent =
    `${displayedCount} causa(s) mostrada(s) de ${allCases.length} causa(s) cargada(s).`;
} 


function getCasesEmptyMessage() {
  if (currentSearch && currentCaseStatusFilter === "active") {
    return "No hay causas activas que coincidan con la búsqueda.";
  }

  if (currentSearch && currentCaseStatusFilter === "archived") {
    return "No hay causas finalizadas que coincidan con la búsqueda.";
  }

  if (currentSearch) {
    return "No hay causas que coincidan con la búsqueda.";
  }

  if (currentCaseStatusFilter === "active") {
    return "No hay causas activas cargadas.";
  }

  if (currentCaseStatusFilter === "archived") {
    return "No hay causas finalizadas. Cuando finalices una causa, aparecerá en esta sección.";
  }

  return "No hay causas cargadas todavía.";
} 


function attachCaseActionEvents() {
  document.querySelectorAll(".btn-edit-case").forEach((button) => {
    button.addEventListener("click", function () {
      startEditingCase(button.dataset.id);
    });
  }); 

  document.querySelectorAll(".btn-open-judicial-link").forEach((button) => {
    button.addEventListener("click", function () {
      openJudicialLink(button.dataset.id);
    });
  });

  document.querySelectorAll(".btn-review-case-today").forEach((button) => {
    button.addEventListener("click", function () {
      registerCaseReviewToday(button.dataset.id);
    });
  });

  document.querySelectorAll(".btn-view-case-deadlines").forEach((button) => {
    button.addEventListener("click", function () {
      loadCaseDeadlines(button.dataset.id);
    });
  }); 


  document.querySelectorAll(".btn-new-deadline-case").forEach((button) => {
    button.addEventListener("click", function () {
      goToCalculatorForCase(button.dataset.id);
    });
  });

  document.querySelectorAll(".btn-archive-case").forEach((button) => {
    button.addEventListener("click", function () {
      updateCaseStatus(button.dataset.id, "archived");
    });
  });

  document.querySelectorAll(".btn-activate-case").forEach((button) => {
    button.addEventListener("click", function () {
      updateCaseStatus(button.dataset.id, "active");
    });
  });

  document.querySelectorAll(".btn-delete-case").forEach((button) => {
    button.addEventListener("click", function () {
      deleteCase(button.dataset.id);
    });
  });
}

function startEditingCase(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    showMessage("No se encontró la causa seleccionada.", true);
    return;
  }

  caseId.value = selectedCase.id;
  caseTitle.value = selectedCase.title || "";
  caseNumber.value = selectedCase.case_number || "";
  caseJudicialLink.value = selectedCase.judicial_link || "";
  clientName.value = selectedCase.client_name || "";
  matterType.value = selectedCase.matter_type || "";
  caseJurisdiction.value = selectedCase.jurisdiction || "pba";
  caseDepartment.value = selectedCase.department || "";
  caseCourt.value = selectedCase.court || "";
  caseStatus.value = selectedCase.status || "active";
  caseNotes.value = selectedCase.notes || "";

  updateJurisdictionDependentFields();

  caseFormBadge.textContent = "Editando causa";
  submitCaseBtn.textContent = "Guardar cambios";
  cancelCaseEditBtn.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

async function updateCaseStatus(selectedCaseId, status) {
  if (status === "archived") {
    const canArchive = await confirmArchiveCaseWithDeadlines(selectedCaseId);

    if (!canArchive) {
      return;
    }
  }

  try {
    const response = await fetch(`${CASES_API_URL}/${selectedCaseId}/status`, {
      method: "PATCH",
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    const result = await response.json();   

    if (handleUnauthorizedResponse(response)) {
      return;
    } 

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo actualizar el estado de la causa.");
    }

    await loadCases();

    showMessage(
      status === "archived"
        ? "Causa finalizada correctamente."
        : "Causa reactivada correctamente.",
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo actualizar el estado de la causa.", true);
  }
} 


async function confirmArchiveCaseWithDeadlines(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    return false;
  }

  const summary = getCaseDeadlineSummary(selectedCaseId);
  const activeDeadlinesCount = summary.pending + summary.expired;

  if (activeDeadlinesCount === 0) {
    return openCaseConfirmModal({
      title: "Finalizar causa",
      message:
        `Vas a finalizar la causa "${selectedCase.title}".\n\n` +
        "La causa dejará de aparecer en el circuito operativo, pero seguirá disponible en Finalizadas.\n\n" +
        "¿Querés finalizarla?",
      acceptText: "Finalizar",
      cancelText: "Cancelar",
    });
  }

  return openCaseConfirmModal({
    title: "Finalizar causa con plazos activos",
    message:
      `La causa "${selectedCase.title}" tiene ${activeDeadlinesCount} plazo(s) pendiente(s) o vencido(s).\n\n` +
      `Pendientes: ${summary.pending}\n` +
      `Vencidos: ${summary.expired}\n\n` +
      "Si la finalizás, esos plazos dejarán de aparecer en Inicio, Agenda y Dashboard operativo.\n\n" +
      "No se borrarán: seguirán visibles dentro de la causa finalizada.\n\n" +
      "¿Querés finalizarla igual?",
    acceptText: "Finalizar igual",
    cancelText: "Cancelar",
  });
} 

function openCaseConfirmModal({ title, message, acceptText, cancelText }) {
  return new Promise((resolve) => {
    if (
      !caseConfirmModal ||
      !caseConfirmTitle ||
      !caseConfirmMessage ||
      !caseConfirmAcceptBtn ||
      !caseConfirmCancelBtn
    ) {
      resolve(confirm(message));
      return;
    }

    caseConfirmTitle.textContent = title;
    caseConfirmMessage.textContent = message;
    caseConfirmAcceptBtn.textContent = acceptText || "Aceptar";
    caseConfirmCancelBtn.textContent = cancelText || "Cancelar";

    caseConfirmModal.classList.remove("hidden");

    const closeModal = (result) => {
      caseConfirmModal.classList.add("hidden");

      caseConfirmAcceptBtn.onclick = null;
      caseConfirmCancelBtn.onclick = null;
      caseConfirmModal.onclick = null;

      resolve(result);
    };

    caseConfirmAcceptBtn.onclick = function () {
      closeModal(true);
    };

    caseConfirmCancelBtn.onclick = function () {
      closeModal(false);
    };

    caseConfirmModal.onclick = function (event) {
      if (event.target === caseConfirmModal) {
        closeModal(false);
      }
    };

    caseConfirmCancelBtn.focus();
  });
}

async function deleteCase(selectedCaseId) {
  const canDelete = await confirmDeleteCase(selectedCaseId);

  if (!canDelete) {
    return;
  }

  try {
    const response = await fetch(`${CASES_API_URL}/${selectedCaseId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const result = await response.json();   

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo eliminar la causa.");
    }

    resetForm();
    await loadCases();

    showMessage("Causa eliminada correctamente.", true);
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo eliminar la causa.", true);
  }
} 

async function confirmDeleteCase(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    return false;
  }

  const summary = getCaseDeadlineSummary(selectedCaseId);

  if (summary.total === 0) {
    return openCaseConfirmModal({
      title: "Eliminar causa",
      message:
        `Vas a eliminar la causa "${selectedCase.title}".\n\n` +
        "Eliminar no es lo mismo que finalizar. Si solo querés sacarla del circuito operativo, usá Finalizar.\n\n" +
        "¿Querés eliminarla definitivamente?",
      acceptText: "Eliminar",
      cancelText: "Cancelar",
    });
  }

  return openCaseConfirmModal({
    title: "Eliminar causa con plazos vinculados",
    message:
      `La causa "${selectedCase.title}" tiene ${summary.total} plazo(s) vinculado(s).\n\n` +
      `Pendientes: ${summary.pending}\n` +
      `Vencidos: ${summary.expired}\n` +
      `Completados: ${summary.completed}\n\n` +
      "Eliminar no es lo mismo que finalizar. Si querés conservar la causa y sus plazos fuera del circuito operativo, usá Finalizar.\n\n" +
      "¿Querés eliminarla definitivamente?",
    acceptText: "Eliminar definitivamente",
    cancelText: "Cancelar",
  });
}


function resetForm() {
  caseForm.reset();
  caseId.value = "";
  caseStatus.value = "active";

  updateJurisdictionDependentFields();

  caseFormBadge.textContent = "Nueva causa";
  submitCaseBtn.textContent = "Guardar causa";
  cancelCaseEditBtn.classList.add("hidden");
}

function getCaseScopeLabel(item) {
  if (item.jurisdiction === "pba") {
    return item.department || "Sin departamento específico";
  }

  if (item.jurisdiction === "national_federal") {
    return item.court || "Nacional / Federal";
  }

  return getJurisdictionLabel(item.jurisdiction);
} 


function getFinalizedCaseBadgeHtml() {
  return `
    <span class="status-badge case-finalized-operational-badge">
      Fuera del circuito operativo
    </span>
  `;
}

function getCaseStatusBadgeClass(status) {
  if (status === "active") return "status-completed";
  if (status === "archived") return "case-finalized-status-badge";

  return "";
}

function getStatusLabel(status) {
  if (status === "active") return "Activa";
  if (status === "archived") return "Finalizada";

  return "Sin estado";
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

function showMessage(message, visible) {
  if (!visible || !message) {
    caseMessage.classList.add("hidden");
    caseMessage.textContent = "";
    return;
  }

  caseMessage.textContent = message;
  caseMessage.classList.remove("hidden");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

updateJurisdictionDependentFields();  


function getDeadlinesForCase(caseId) {
  return allDeadlines.filter((deadline) => deadline.case_id === caseId);
}

function getCaseDeadlineSummary(caseId) {
  const deadlines = getDeadlinesForCase(caseId);

  const summary = {
    total: deadlines.length,
    pending: 0,
    expired: 0,
    completed: 0,
    upcoming: 0,
  };

  deadlines.forEach((deadline) => {
    const status = getComputedDeadlineStatus(deadline);

    if (status === "pending") summary.pending++;
    if (status === "expired") summary.expired++;
    if (status === "completed") summary.completed++;
    if (isDeadlineUpcoming(deadline)) summary.upcoming++;
  });

  return summary;
}

function getNextPendingDeadline(caseId) {
  return getDeadlinesForCase(caseId)
    .filter((deadline) => getComputedDeadlineStatus(deadline) === "pending")
    .sort((a, b) => new Date(a.deadline_date) - new Date(b.deadline_date))[0];
} 



function getCaseCardAlertClass(summary, nextDeadline = null) {
  if (nextDeadline) {
    const daysUntilDeadline = getDaysUntilDate(nextDeadline.deadline_date);

    if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
      return "case-card-alert-upcoming";
    }
  }

  if (summary.expired > 0) {
    return "case-card-alert-expired";
  }

  if (summary.pending > 0) {
    return "case-card-alert-pending";
  }

  if (summary.completed > 0) {
    return "case-card-alert-completed";
  }

  return "";
}

function getDaysUntilDate(dateString) {
  if (!dateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const differenceInMs = targetDate - today;

  return Math.round(differenceInMs / (1000 * 60 * 60 * 24));
} 


function getCaseAlertBadgeHtml(summary, nextDeadline = null) {
  if (nextDeadline) {
    const daysUntilDeadline = getDaysUntilDate(nextDeadline.deadline_date);

    if (daysUntilDeadline === 0) {
      return `
        <span class="status-badge status-pending case-alert-badge">
          Vence hoy
        </span>
      `;
    }

    if (daysUntilDeadline === 1) {
      return `
        <span class="status-badge status-pending case-alert-badge">
          Vence mañana
        </span>
      `;
    }

    if (daysUntilDeadline > 1 && daysUntilDeadline <= 7) {
      return `
        <span class="status-badge status-pending case-alert-badge">
          Vence en ${daysUntilDeadline} días
        </span>
      `;
    }
  }

  if (summary.expired > 0 && summary.pending === 0) {
    return `
      <span class="status-badge status-expired">
        Con vencidos
      </span>
    `;
  }

  if (summary.expired > 0 && summary.pending > 0) {
    return `
      <span class="status-badge status-expired">
        Vencidos y pendientes
      </span>
    `;
  }

  if (summary.pending > 0) {
    return `
      <span class="status-badge status-pending">
        Plazos pendientes
      </span>
    `;
  }

  if (summary.completed > 0 && summary.pending === 0 && summary.expired === 0) {
    return `
      <span class="status-badge status-completed">
        Al día
      </span>
    `;
  }

  return `
    <span class="status-badge">
      Sin plazos
    </span>
  `;
}

function goToCalculatorForCase(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    showMessage("No se encontró la causa seleccionada.", true);
    return;
  }

  if (selectedCase.status === "archived") {
    showMessage(
      "Para cargar un nuevo plazo, primero reactivá la causa.",
      true
    );
    return;
  }

  localStorage.setItem("plazoclaro_selected_case_id", selectedCase.id);

  window.location.href = "./calculator.html";
}



function openCaseFromStorage() {
  const caseIdToOpen = localStorage.getItem("plazoclaro_open_case_id");

  if (!caseIdToOpen) {
    return;
  }

  const selectedCase = allCases.find((item) => item.id === caseIdToOpen);

  localStorage.removeItem("plazoclaro_open_case_id");

  if (!selectedCase) {
    return;
  }

  loadCaseDeadlines(selectedCase.id);
}


async function loadCaseDeadlines(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    showMessage("No se encontró la causa seleccionada.", true);
    return;
  } 

  selectedCaseForDeadlines = selectedCase; 
  updateCaseArchivedNotice(selectedCase); 
  updateCalculateDeadlineButton(selectedCase);

  try {
    caseDeadlinesTitle.textContent = selectedCase.title;
    caseDeadlinesSummary.textContent = "Cargando plazos vinculados...";

    caseDeadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">Cargando plazos vinculados...</td>
      </tr>
    `;

    caseDeadlinesPanel.classList.remove("hidden");

    const response = await fetch(`${DEADLINES_API_URL}?case_id=${selectedCaseId}`, {
      headers: getAuthHeaders(),
    });

    const deadlines = await response.json();

    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(deadlines.detail || "No se pudieron cargar los plazos de la causa.");
    }

    renderCaseDeadlines(deadlines);

    caseDeadlinesPanel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } catch (error) {
    console.error(error);

    caseDeadlinesSummary.textContent = "No se pudieron cargar los plazos vinculados.";

    caseDeadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">No se pudieron cargar los plazos vinculados.</td>
      </tr>
    `;
  }
} 

function updateCaseArchivedNotice(caseItem) {
  if (!caseArchivedNotice) return;

  if (caseItem && caseItem.status === "archived") {
    caseArchivedNotice.classList.remove("hidden");
    return;
  }

  caseArchivedNotice.classList.add("hidden");
} 


function updateCalculateDeadlineButton(caseItem) {
  if (!calculateDeadlineForCaseBtn) return;

  if (caseItem && caseItem.status === "archived") {
    calculateDeadlineForCaseBtn.disabled = true;
    calculateDeadlineForCaseBtn.textContent = "Reactivar causa para cargar nuevo plazo";
    calculateDeadlineForCaseBtn.title =
      "Esta causa está finalizada. Para cargar un nuevo plazo, primero reactivala.";
    return;
  }

  calculateDeadlineForCaseBtn.disabled = false;
  calculateDeadlineForCaseBtn.textContent = "Calcular nuevo plazo para esta causa";
  calculateDeadlineForCaseBtn.title = "";
}

function renderCaseDeadlines(deadlines) {
  updateCaseDeadlinesSummary(deadlines);

  if (!deadlines.length) {
    caseDeadlinesSummary.textContent = "Esta causa todavía no tiene plazos vinculados.";

    caseDeadlinesTableBody.innerHTML = `
      <tr>
        <td colspan="6">No hay plazos vinculados a esta causa.</td>
      </tr>
    `;

    return;
  } 

  const sortedDeadlines = [...deadlines].sort((a, b) => {
    return new Date(a.deadline_date) - new Date(b.deadline_date);
  });

  caseDeadlinesSummary.textContent = `${sortedDeadlines.length} plazo(s) vinculado(s) a esta causa.`;

  caseDeadlinesTableBody.innerHTML = "";

  sortedDeadlines.forEach((deadline) => {
    const computedStatus = getComputedDeadlineStatus(deadline);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHTML(deadline.action_type || "Sin actuación")}</td>
      <td>${formatDate(deadline.notification_date)}</td>
      <td>${getStartRuleLabel(deadline.start_rule)}</td>
      <td><strong>${formatDate(deadline.deadline_date)}</strong></td>
      <td>
        <span class="status-badge ${getDeadlineStatusClass(computedStatus)}">
          ${getDeadlineStatusLabel(computedStatus)}
        </span>
      </td>
      <td>${escapeHTML(deadline.notes || "-")}</td>
    `;

    caseDeadlinesTableBody.appendChild(row);
  });
} 


function updateCaseDeadlinesSummary(deadlines) {
  const counts = {
    total: deadlines.length,
    pending: 0,
    expired: 0,
    completed: 0,
    upcoming: 0,
  };

  deadlines.forEach((deadline) => {
    const status = getComputedDeadlineStatus(deadline);

    if (status === "pending") counts.pending++;
    if (status === "expired") counts.expired++;
    if (status === "completed") counts.completed++;
    if (isDeadlineUpcoming(deadline)) counts.upcoming++;
  });

  caseDeadlinesTotal.textContent = counts.total;
  caseDeadlinesPending.textContent = counts.pending;
  caseDeadlinesExpired.textContent = counts.expired;
  caseDeadlinesCompleted.textContent = counts.completed;
  caseDeadlinesUpcoming.textContent = counts.upcoming;
}

function isDeadlineUpcoming(deadline) {
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

function getComputedDeadlineStatus(deadline) {
  if (deadline.status === "completed") {
    return "completed";
  }

  if (isDeadlineExpired(deadline.deadline_date)) {
    return "expired";
  }

  return "pending";
}

function isDeadlineExpired(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate < today;
}

function getDeadlineStatusLabel(status) {
  if (status === "pending") return "Pendiente";
  if (status === "completed") return "Completado";
  if (status === "expired") return "Vencido";

  return "Sin estado";
}

function getDeadlineStatusClass(status) {
  if (status === "pending") return "status-pending";
  if (status === "completed") return "status-completed";
  if (status === "expired") return "status-expired";

  return "";
}

function getStartRuleLabel(startRule) {
  if (startRule === "same_day") return "Mismo día";
  return "Día siguiente";
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


function getJudicialReviewClass(caseItem) {
  if (!caseItem.last_reviewed_at) {
    return "judicial-review-alert";
  }

  const daysSinceReview = getDaysSinceDate(caseItem.last_reviewed_at);

  if (daysSinceReview === null) {
    return "judicial-review-alert";
  }

  if (daysSinceReview >= 7) {
    return "judicial-review-alert";
  }

  if (daysSinceReview >= 3) {
    return "judicial-review-warning";
  }

  return "judicial-review-ok";
}


function getJudicialReviewLabel(caseItem) {
  if (!caseItem.last_reviewed_at) {
    return "Sin revisión registrada";
  }

  const daysSinceReview = getDaysSinceDate(caseItem.last_reviewed_at);

  if (daysSinceReview === null) {
    return "Fecha de revisión inválida";
  }

  if (daysSinceReview === 0) {
    return "Revisada hoy";
  }

  if (daysSinceReview === 1) {
    return "Revisada ayer";
  }

  return `Última revisión hace ${daysSinceReview} días`;
}


function getJudicialReviewHint(caseItem) {
  if (!caseItem.judicial_link) {
    return "Agregá el link del expediente para abrirlo desde PlazoClaro.";
  }

  if (!caseItem.last_reviewed_at) {
    return "Conviene registrar la primera revisión del expediente.";
  }

  const daysSinceReview = getDaysSinceDate(caseItem.last_reviewed_at);

  if (daysSinceReview === null) {
    return "Revisá la fecha guardada para esta causa.";
  }

  if (daysSinceReview >= 7) {
    return "Recordatorio: revisar si hubo movimientos en el portal judicial.";
  }

  if (daysSinceReview >= 3) {
    return "Seguimiento recomendado. Ya pasaron varios días desde la última revisión.";
  }

  return `Última revisión: ${formatDate(caseItem.last_reviewed_at)}.`;
}


function getDaysSinceDate(dateString) {
  if (!dateString) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateString.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const differenceInMs = today - targetDate;

  return Math.max(
    0,
    Math.round(differenceInMs / (1000 * 60 * 60 * 24))
  );
}


function openJudicialLink(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    showMessage("No se encontró la causa seleccionada.", true);
    return;
  }

  const safeUrl = getSafeExternalUrl(selectedCase.judicial_link);

  if (!safeUrl) {
    showMessage("La causa no tiene un link judicial válido.", true);
    return;
  }

  window.open(safeUrl, "_blank", "noopener,noreferrer");
}


function getSafeExternalUrl(value) {
  if (!value) {
    return null;
  }

  let urlValue = value.trim();

  if (!urlValue.startsWith("http://") && !urlValue.startsWith("https://")) {
    urlValue = `https://${urlValue}`;
  }

  try {
    const url = new URL(urlValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch (error) {
    return null;
  }
}


async function registerCaseReviewToday(selectedCaseId) {
  const selectedCase = allCases.find((item) => item.id === selectedCaseId);

  if (!selectedCase) {
    showMessage("No se encontró la causa seleccionada.", true);
    return;
  }

  try {
    const response = await fetch(`${CASES_API_URL}/${selectedCaseId}/review-today`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    const result = await response.json();  


    if (handleUnauthorizedResponse(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "No se pudo registrar la revisión.");
    }

    await loadCases();

    showMessage(
      `Revisión registrada para "${selectedCase.title}".`,
      true
    );
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo registrar la revisión.", true);
  }
}
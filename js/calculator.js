const API_URL = "http://127.0.0.1:8000/calculator/deadline";
 
const form = document.getElementById("deadlineForm");

const emptyResult = document.getElementById("emptyResult");
const calculationResult = document.getElementById("calculationResult");

const deadlineDateElement = document.getElementById("deadlineDate");
const startDateDetail = document.getElementById("startDateDetail");
const daysDetail = document.getElementById("daysDetail");
const excludedDetail = document.getElementById("excludedDetail");
const jurisdictionDetail = document.getElementById("jurisdictionDetail"); 
const clearResultBtn = document.getElementById("clearResultBtn"); 


form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const notificationDateValue = document.getElementById("notificationDate").value;
  const daysCount = Number(document.getElementById("daysCount").value);
  const dayType = document.getElementById("dayType").value;
  const jurisdiction = document.getElementById("jurisdiction").value;

  if (!notificationDateValue || !daysCount || daysCount <= 0) {
    alert("Completá una fecha válida y una cantidad de días mayor a cero.");
    return;
  }

  const payload = {
    notification_date: notificationDateValue,
    days_count: daysCount,
    day_type: dayType,
    jurisdiction: jurisdiction,
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

    renderResult(result);
  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor. Verificá que el backend esté levantado.");
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
    excludedDays: apiResult.excluded_days.map((item) => ({
      date: createLocalDate(item.date),
      reason: item.reason,
    })),
    dayType: apiResult.day_type,
    jurisdiction: apiResult.jurisdiction,
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
  return "Jurisdicción no especificada";
}

function renderResult(result) {
  emptyResult.classList.add("hidden");
  emptyResult.style.display = "none";

  calculationResult.classList.remove("hidden");
  calculationResult.style.display = "block";

  deadlineDateElement.textContent = formatDate(result.deadlineDate);

  startDateDetail.textContent = `El cómputo comienza el día siguiente a la notificación: ${formatDate(result.startDate)}.`;

  daysDetail.textContent = `Se computaron ${result.countedDays} ${getDayTypeLabel(result.dayType)}.`;

  if (result.dayType === "business") {
    if (result.excludedDays.length === 0) {
      excludedDetail.textContent = "No se excluyeron sábados, domingos ni días inhábiles durante el período computado.";
    } else {
      const excludedText = result.excludedDays
        .map((item) => `${formatDate(item.date)} (${item.reason})`)
        .join(", ");

      excludedDetail.textContent = `Se excluyeron los siguientes días: ${excludedText}.`;
    }
  } else {
    excludedDetail.textContent = "Al tratarse de días corridos, no se excluyeron sábados, domingos ni días inhábiles.";
  }

  jurisdictionDetail.textContent = `Jurisdicción seleccionada: ${getJurisdictionLabel(result.jurisdiction)}.`;
} 


clearResultBtn.addEventListener("click", function () {
  form.reset();

  calculationResult.classList.add("hidden");
  calculationResult.style.display = "none";

  emptyResult.classList.remove("hidden");
  emptyResult.style.display = "block";

  deadlineDateElement.textContent = "";
  startDateDetail.textContent = "";
  daysDetail.textContent = "";
  excludedDetail.textContent = "";
  jurisdictionDetail.textContent = ""; 

});
const PBA_JUDICIAL_DEPARTMENTS = [
  { value: "Azul", label: "Azul" },
  { value: "Avellaneda-Lanús", label: "Avellaneda-Lanús" },
  { value: "Bahía Blanca", label: "Bahía Blanca" },
  { value: "Dolores", label: "Dolores" },
  { value: "Junín", label: "Junín" },
  { value: "La Matanza", label: "La Matanza" },
  { value: "La Plata", label: "La Plata" },
  { value: "Lomas de Zamora", label: "Lomas de Zamora" },
  { value: "Mar del Plata", label: "Mar del Plata" },
  { value: "Mercedes", label: "Mercedes" },
  { value: "Moreno-General Rodríguez", label: "Moreno-General Rodríguez" },
  { value: "Morón", label: "Morón" },
  { value: "Necochea", label: "Necochea" },
  { value: "Pergamino", label: "Pergamino" },
  { value: "Quilmes", label: "Quilmes" },
  { value: "San Isidro", label: "San Isidro" },
  { value: "San Martín", label: "San Martín" },
  { value: "San Nicolás", label: "San Nicolás" },
  { value: "Trenque Lauquen", label: "Trenque Lauquen" },
  { value: "Zárate-Campana", label: "Zárate-Campana" },
];

function populatePbaDepartmentSelect(
  selectElement,
  options = {
    includeEmpty: true,
    emptyLabel: "Sin departamento específico",
  }
) {
  if (!selectElement) return;

  selectElement.innerHTML = "";

  if (options.includeEmpty) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = options.emptyLabel || "Sin departamento específico";
    selectElement.appendChild(emptyOption);
  }

  PBA_JUDICIAL_DEPARTMENTS.forEach((department) => {
    const option = document.createElement("option");
    option.value = department.value;
    option.textContent = department.label;
    selectElement.appendChild(option);
  });
}
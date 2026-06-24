const ACTION_TYPE_GROUPS = [
  {
    label: "Traslados y contestaciones",
    items: [
      {
        value: "Contestación de demanda",
        label: "Contestación de demanda",
        suggestedDays: 15,
        defaultDayType: "business",
      },
      {
        value: "Contestación de traslado",
        label: "Contestación de traslado",
        suggestedDays: 5,
        defaultDayType: "business",
      },
      {
        value: "Traslado simple",
        label: "Traslado simple",
        suggestedDays: 5,
        defaultDayType: "business",
      },
      {
        value: "Vista",
        label: "Vista",
        suggestedDays: 5,
        defaultDayType: "business",
      },
    ],
  },
  {
    label: "Recursos",
    items: [
      {
        value: "Apelación",
        label: "Apelación",
        suggestedDays: 5,
        defaultDayType: "business",
      },
      {
        value: "Expresión de agravios",
        label: "Expresión de agravios",
        suggestedDays: 10,
        defaultDayType: "business",
      },
      {
        value: "Contestación de agravios",
        label: "Contestación de agravios",
        suggestedDays: 10,
        defaultDayType: "business",
      },
      {
        value: "Reposición / Revocatoria",
        label: "Reposición / Revocatoria",
        suggestedDays: 3,
        defaultDayType: "business",
      },
      {
        value: "Recurso extraordinario",
        label: "Recurso extraordinario",
        suggestedDays: 10,
        defaultDayType: "business",
      },
    ],
  },
  {
    label: "Presentaciones y documentación",
    items: [
      {
        value: "Presentación de documentación",
        label: "Presentación de documentación",
        suggestedDays: 5,
        defaultDayType: "business",
      },
      {
        value: "Impugnación",
        label: "Impugnación",
        suggestedDays: 5,
        defaultDayType: "business",
      },
      {
        value: "Subsanación",
        label: "Subsanación",
        suggestedDays: 3,
        defaultDayType: "business",
      },
      {
        value: "Acompañar copias / documentación",
        label: "Acompañar copias / documentación",
        suggestedDays: 5,
        defaultDayType: "business",
      },
    ],
  },
  {
    label: "Otros actos",
    items: [
      {
        value: "Audiencia",
        label: "Audiencia",
        suggestedDays: null,
        defaultDayType: "business",
      },
      {
        value: "Oficio",
        label: "Oficio",
        suggestedDays: null,
        defaultDayType: "business",
      },
      {
        value: "Cédula / Notificación",
        label: "Cédula / Notificación",
        suggestedDays: null,
        defaultDayType: "business",
      },
      {
        value: "Otro",
        label: "Otro",
        suggestedDays: null,
        defaultDayType: "business",
      },
    ],
  },
];

function populateActionTypeSelect(selectElement) {
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">Seleccionar opcionalmente</option>';

  ACTION_TYPE_GROUPS.forEach((group) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;

    group.items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;

      optgroup.appendChild(option);
    });

    selectElement.appendChild(optgroup);
  });
}

function getActionTypeRule(actionType) {
  if (!actionType) return null;

  for (const group of ACTION_TYPE_GROUPS) {
    const foundItem = group.items.find((item) => item.value === actionType);

    if (foundItem) {
      return foundItem;
    }
  }

  return null;
}
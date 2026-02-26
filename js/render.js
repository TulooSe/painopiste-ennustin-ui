/*Yksi keskitetty state */

const state = {
  osat: [],
  aktiivinenRyhma: null,
  suodataNollat: false,
  kokoonpanot: []
};


/*Yksi keskitetty state*/

function initRender(initialState) {
  Object.assign(state, initialState);
  bindEvents();
  render();
}

function setOsat(osat) {
  state.osat = osat;
  render();
}


/*Uusi render()*/

function render() {
  renderOsat();
}


/*Uusi renderOsat() (puhdas versio)*/

function renderOsat() {
  const container = document.getElementById("osatView");
  if (!container) return;

  const groups = ryhmitteleOsat(state.osat);

  if (!state.aktiivinenRyhma) {
    state.aktiivinenRyhma = Object.keys(groups)[0] || null;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Osa</th>
        <th>Massa</th>
        <th>Varsi</th>
        <th>Kokoonpano</th>
      </tr>
    </thead>
  `;

  Object.entries(groups).forEach(([ryhma, data]) => {
    table.appendChild(createGroupHeader(ryhma, data.massa));
    table.appendChild(createGroupBody(ryhma, data.items));
  });

  container.innerHTML = "";
  container.appendChild(table);
}


/*Header builder (EI inline-eventtiä)*/

function createGroupHeader(ryhma, massa) {
  const tbody = document.createElement("tbody");
  tbody.className = "osa-group-head";

  const tr = document.createElement("tr");
  tr.className = "osa-group-header";
  tr.dataset.ryhma = ryhma;

  tr.innerHTML = `
    <td colspan="5">
      <span class="group-arrow">
        ${state.aktiivinenRyhma === ryhma ? "▼" : "▶"}
      </span>
      <span class="group-name">${ryhma}</span>
      <span class="group-massa">${Math.round(massa)} g</span>
    </td>
  `;

  tbody.appendChild(tr);
  return tbody;
}


/*Body builder*/

function createGroupBody(ryhma, items) {
  const tbody = document.createElement("tbody");
  tbody.className = "osa-group-body";
  tbody.dataset.ryhma = ryhma;

  tbody.style.display =
    state.aktiivinenRyhma === ryhma
      ? "table-row-group"
      : "none";

  items.forEach((o, index) => {
    if (state.suodataNollat && Number(o.massa) === 0) return;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${o.osanro}</td>
      <td>${o.osa}</td>
      <td><input data-row="${index}" data-col="massa" value="${o.massa}"></td>
      <td><input data-row="${index}" data-col="varsi" value="${o.varsi}"></td>
      <td>
        <select data-row="${index}" data-col="kokoonpano">
          ${state.kokoonpanot.map(k =>
            `<option ${k===o.kokoonpano?'selected':''}>${k}</option>`
          ).join("")}
        </select>
      </td>
    `;

    tbody.appendChild(tr);
  });

  return tbody;
}


/*Event delegation (tärkein osa)*/

function bindEvents() {

  const container = document.getElementById("osatView");

  // Ryhmän avaus
  container.addEventListener("click", e => {
    const header = e.target.closest(".osa-group-header");
    if (!header) return;

    const ryhma = header.dataset.ryhma;

    state.aktiivinenRyhma =
      state.aktiivinenRyhma === ryhma ? null : ryhma;

    render();
  });

  // Input change
  container.addEventListener("change", e => {
    const input = e.target;
    const row = input.dataset.row;
    const col = input.dataset.col;
    if (row == null || !col) return;

    state.osat[row][col] = input.value;
  });
}

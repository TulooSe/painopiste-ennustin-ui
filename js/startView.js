console.log("STARTVIEW VERSION 1.50");

function renderStart() {

  const container = document.getElementById("startView");
  container.style.display = "block";

  container.innerHTML = `
    <h2>Lennokit</h2>
    <table>
      <tbody>
        ${state.lennokit.map(l => `
          <tr data-id="${l.id}">
            <td>${l.id}</td>
            <td>${l.massa ?? ""}</td>
            <td>${l.pp ?? ""}</td>
            <td>${l.pvm ?? ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <button id="openEditorBtn">Avaa</button>
  `;

  bindStartEvents();
}


function bindStartEvents() {

  const container = document.getElementById("startView");

  container.addEventListener("click", e => {

    const row = e.target.closest("tr");
    if (row) {
      state.valittuLennokkiId = row.dataset.id;

      container.querySelectorAll("tr")
        .forEach(r => r.classList.remove("selected"));

      row.classList.add("selected");
    }

    if (e.target.id === "openEditorBtn") {
      if (!state.valittuLennokkiId) return;

      setView("editor");
      renderApp();
    }
  });
}

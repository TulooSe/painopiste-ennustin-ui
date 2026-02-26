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

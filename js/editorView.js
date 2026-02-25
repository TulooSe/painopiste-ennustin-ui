import { state } from "./state.js";

export function renderEditor() {

  const container = document.getElementById("editorView");
  container.style.display = "block";

  container.innerHTML = `
    <h2>Editor</h2>
    <div id="osatView"></div>
    <button id="backBtn">Takaisin</button>
  `;

  bindEditorEvents();
}


/*Editor eventit*/

import { setView } from "./state.js";
import { renderApp } from "./router.js";

function bindEditorEvents() {

  document
    .getElementById("backBtn")
    .addEventListener("click", () => {
      setView("start");
      renderApp();
    });
}

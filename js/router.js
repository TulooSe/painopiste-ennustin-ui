import { state } from "./state.js";
import { renderStart } from "./startView.js";
import { renderEditor } from "./editorView.js";

export function renderApp() {
  hideAllViews();

  switch (state.view) {
    case "start":
      renderStart();
      break;

    case "editor":
      renderEditor();
      break;
  }
}

function hideAllViews() {
  document.getElementById("startView").style.display = "none";
  document.getElementById("editorView").style.display = "none";
}

function renderApp() {
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

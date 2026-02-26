function renderEditor() {

  const container = document.getElementById("editorView");
  container.style.display = "block";

  container.innerHTML = `
    <h2>Editor</h2>
    <div id="osatView"></div>
    <button id="backBtn">Takaisin</button>
  `;

  bindEditorEvents();
}

// views.gs
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  try {
    if (typeof this[action] === "function") {
      const result = this[action](data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("Tuntematon action: " + action);
    }
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

const { Notification } = require("electron");

function notify({ title = "Olorin Alert", body }) {
  if (!Notification.isSupported()) {
    return;
  }
  new Notification({ title, body: String(body) }).show();
}

module.exports = { notify };

DEBUG = process.env.DEBUG;
if (DEBUG === false) {
  serverOptions = {
    key: fs.readFileSync(process.env.KEY_DIR),
    cert: fs.readFileSync(process.env.KEY_CERT),
  };
} else {
  serverOptions = {};
}

const serverPort = 9090,
  http = require("https"),
  express = require("express"),
  app = express(),
  server = http.createServer(serverOptions, app),
  WebSocket = require("ws"),
  wss = new WebSocket.Server({ server });

// var webSocketServ = require("ws").Server;

// var wss = new webSocketServ({
//   port: 9090,
//   noServer: true,
// });

var users = {};
var otherUser;
wss.on("connection", function (conn) {
  console.log("User connected");

  conn.on("message", function (message) {
    var data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("Invalid JSON");
      data = {};
    }

    switch (data.type) {
      case "login":
        if (users[data.name]) {
          sendToOtherUser(conn, {
            type: "login",
            success: false,
          });
        } else {
          users[data.name] = conn;
          conn.name = data.name;

          sendToOtherUser(conn, {
            type: "login",
            success: true,
          });
        }

        break;
      case "offer":
        var connect = users[data.name];
        if (connect != null) {
          conn.otherUser = data.name;

          sendToOtherUser(connect, {
            type: "offer",
            offer: data.offer,
            name: conn.name,
          });
        }
        break;

      case "answer":
        var connect = users[data.name];

        if (connect != null) {
          conn.otherUser = data.name;
          sendToOtherUser(connect, {
            type: "answer",
            answer: data.answer,
          });
        }

        break;

      case "candidate":
        var connect = users[data.name];

        if (connect != null) {
          sendToOtherUser(connect, {
            type: "candidate",
            candidate: data.candidate,
          });
        }
        break;
      case "reject":
        var connect = users[data.name];

        if (connect != null) {
          sendToOtherUser(connect, {
            type: "reject",
            name: conn.name,
          });
        }
        break;
      case "accept":
        var connect = users[data.name];

        if (connect != null) {
          sendToOtherUser(connect, {
            type: "accept",
            name: conn.name,
          });
        }
        break;
      case "leave":
        var connect = users[data.name];
        connect.otherUser = null;

        if (connect != null) {
          sendToOtherUser(connect, {
            type: "leave",
          });
        }

        break;

      default:
        sendToOtherUser(conn, {
          type: "error",
          message: "Command not found: " + data.type,
        });
        break;
    }
  });
  conn.on("close", function () {
    console.log("Connection closed");
    if (conn.name) {
      delete users[conn.name];
      if (conn.otherUser) {
        var connect = users[conn.otherUser];
        conn.otherUser = null;

        if (conn != null) {
          sendToOtherUser(connect, {
            type: "leave",
          });
        }
      }
    }
  });

  conn.send("Hello World");
});

function sendToOtherUser(connection, message) {
  connection.send(JSON.stringify(message));
}

server.listen(serverPort, () => {
  console.log(`Websocket server started on port ` + serverPort);
});

const WebSocket = require("..");
const http = require("http");

//
// This script should terminate quickly. In 0.11.3, it hung for 30s due to
// a left over timer.
//

var server = http.createServer();
server.on("upgrade", function (request, socket, head) {
  var ws = new WebSocket(request, socket, head);
  ws.onclose = function (event) {
    ws.close(); // the double close
    server.close();
  };
});

// Listen on random port.
server.listen(0, () => {
  const url = "ws://localhost:" + server.address().port;
  const ws = new WebSocket.Client(url);

  ws.onopen = function () {
    ws.close();
  };
});

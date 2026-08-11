// websocket.js - Handles live website SSE event streams cleanly
let sseClients = [];

function addClient(res) {
    sseClients.push(res);
}

function removeClient(res) {
    sseClients = sseClients.filter(client => client !== res);
}

function broadcast(payloadData) {
    const payload = JSON.stringify(payloadData);
    sseClients.forEach(client => client.write(`data: ${payload}\n\n`));
}

module.exports = { addClient, removeClient, broadcast };

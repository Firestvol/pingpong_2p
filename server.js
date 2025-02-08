const { Server } = require("colyseus");
const WebSocketTransport = require("@colyseus/transport").WebSocketTransport;
const express = require("express");
const http = require("http");
const cors = require("cors");

// Создаем Express-приложение
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Для обслуживания статических файлов

// Коллекция комнат
let rooms = [];

// API для получения списка комнат
app.get("/api/rooms", (req, res) => {
    console.log("Request to /api/rooms");
    res.json(rooms.map(room => ({ id: room.roomId, players: room.clients.length })));
});

// API для создания новой комнаты
app.post("/api/create-room", (req, res) => {
    console.log("Request to /api/create-room");
    const newRoom = gameServer.createRoom("pong");
    rooms.push(newRoom);
    res.json({ roomId: newRoom.roomId });
});

// Создаем HTTP-сервер
const httpServer = http.createServer(app);

// Создаем WebSocketTransport
const transport = new WebSocketTransport({
    server: httpServer,
    pingInterval: 10000,
    pingMaxRetries: 2
});

// Создаем Colyseus-сервер
const gameServer = new Server({
    transport
});

// Определение комнаты
class PongRoom extends Room {
    onCreate(options) {
        console.log(`Room created: ${this.roomId}`);
        this.setState({
            ball: { x: 0, y: 0, dx: 0.01, dy: 0 },
            paddle1: { x: -0.45, y: 0 },
            paddle2: { x: 0.45, y: 0 },
            score: { player1: 0, player2: 0 }
        });

        this.setSimulationInterval(() => this.updateGame(), 16);
    }

    onJoin(client, options) {
        console.log(`Client joined room ${this.roomId}: ${client.sessionId}`);
        if (this.clients.length > 2) {
            client.send({ type: "error", message: "Room is full" });
            client.leave();
        }
    }

    onLeave(client) {
        console.log(`Client left room ${this.roomId}: ${client.sessionId}`);
    }

    onMessage(client, message) {
        if (message.type === "move") {
            if (client.sessionId === this.clients[0]?.sessionId) {
                this.state.paddle1.y = Math.max(-0.4, Math.min(0.4, message.y));
            } else if (client.sessionId === this.clients[1]?.sessionId) {
                this.state.paddle2.y = Math.max(-0.4, Math.min(0.4, message.y));
            }
        }
    }

    updateGame() {
        const speed = 0.01;
        this.state.ball.x += this.state.ball.dx;
        this.state.ball.y += this.state.ball.dy;

        // Отскок от верхней и нижней стенок
        if (this.state.ball.y < -1 || this.state.ball.y > 1) {
            this.state.ball.dy *= -1;
        }

        // Проверяем столкновение с ракетками
        if (
            this.state.ball.x - 0.02 < this.state.paddle1.x + 0.02 &&
            this.state.ball.y > this.state.paddle1.y - 0.2 &&
            this.state.ball.y < this.state.paddle1.y + 0.2
        ) {
            this.state.ball.dx = speed;
        }

        if (
            this.state.ball.x + 0.02 > this.state.paddle2.x - 0.02 &&
            this.state.ball.y > this.state.paddle2.y - 0.2 &&
            this.state.ball.y < this.state.paddle2.y + 0.2
        ) {
            this.state.ball.dx = -speed;
        }

        // Проверяем голы
        if (this.state.ball.x < -1) {
            this.state.score.player2++;
            this.state.ball.x = 0;
            this.state.ball.y = 0;
            this.state.ball.dx = speed;
            this.state.ball.dy = 0;
        }

        if (this.state.ball.x > 1) {
            this.state.score.player1++;
            this.state.ball.x = 0;
            this.state.ball.y = 0;
            this.state.ball.dx = -speed;
            this.state.ball.dy = 0;
        }
    }

    onDispose() {
        console.log(`Room disposed: ${this.roomId}`);
        rooms = rooms.filter(room => room.roomId !== this.roomId);
    }
}

gameServer.define("pong", PongRoom);

// Запускаем сервер
const PORT = process.env.PORT || 2567;
httpServer.listen(PORT, () => {
    console.log(`Colyseus server is running on port ${PORT}`);
});
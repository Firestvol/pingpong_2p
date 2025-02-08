const { Server, Room } from "colyseus";
const express = require("express");
const http = require("http");

// Создаем класс комнаты для игры
class PongRoom extends Room {
    onCreate(options) {
        this.setState({
            ball: { x: 0, y: 0 },
            paddle1: { x: -0.45, y: 0 }, // Ракетка игрока 1
            paddle2: { x: 0.45, y: 0 },  // Ракетка игрока 2
            score: { player1: 0, player2: 0 }
        });

        this.clock = 0; // Таймер для обновления игры
        this.setSimulationInterval(() => this.updateGame(), 16); // Обновление каждые 16 мс (~60 FPS)
    }

    onJoin(client, options) {
        console.log(`Client ${client.sessionId} joined.`);
    }

    onLeave(client) {
        console.log(`Client ${client.sessionId} left.`);
    }

    onMessage(client, message) {
        if (message.type === "move") {
            if (client.sessionId === this.clients[0]?.sessionId) {
                this.state.paddle1.y = Math.max(-0.4, Math.min(0.4, message.y)); // Ограничение движения ракетки
            } else if (client.sessionId === this.clients[1]?.sessionId) {
                this.state.paddle2.y = Math.max(-0.4, Math.min(0.4, message.y));
            }
        }
    }

    updateGame() {
        const speed = 0.01;
        const paddleWidth = 0.02;
        const paddleHeight = 0.2;

        // Обновляем позицию мячика
        this.state.ball.x += this.state.ball.dx || speed;
        this.state.ball.y += this.state.ball.dy || 0;

        // Отскок от верхней и нижней стенок
        if (this.state.ball.y < -1 || this.state.ball.y > 1) {
            this.state.ball.dy *= -1;
        }

        // Проверяем столкновение с ракетками
        if (
            this.state.ball.x - paddleWidth < this.state.paddle1.x + paddleWidth &&
            this.state.ball.y > this.state.paddle1.y - paddleHeight / 2 &&
            this.state.ball.y < this.state.paddle1.y + paddleHeight / 2
        ) {
            this.state.ball.dx = speed; // Отскок от ракетки игрока 1
        }

        if (
            this.state.ball.x + paddleWidth > this.state.paddle2.x - paddleWidth &&
            this.state.ball.y > this.state.paddle2.y - paddleHeight / 2 &&
            this.state.ball.y < this.state.paddle2.y + paddleHeight / 2
        ) {
            this.state.ball.dx = -speed; // Отскок от ракетки игрока 2
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
}

// Создаем сервер
const app = express();
const server = http.createServer(app);
const gameServer = new Server({
    server,
});

// Регистрируем комнату
gameServer.define("pong", PongRoom);

// Запускаем сервер
const PORT = process.env.PORT || 2567;
server.listen(PORT, () => {
    console.log(`Colyseus server running on port ${PORT}`);
});
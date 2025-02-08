const { Server, Room } = require("colyseus");
const express = require("express");
const http = require("http");

class PongRoom extends Room {
    onCreate(options) {
        this.setState({
            ball: { x: 0, y: 0 },
            paddle1: { x: -0.45, y: 0 },
            paddle2: { x: 0.45, y: 0 },
            score: { player1: 0, player2: 0 }
        });

        this.setSimulationInterval(() => this.updateGame(), 16);
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
                this.state.paddle1.y = Math.max(-0.4, Math.min(0.4, message.y));
            } else if (client.sessionId === this.clients[1]?.sessionId) {
                this.state.paddle2.y = Math.max(-0.4, Math.min(0.4, message.y));
            }
        }
    }

    updateGame() {
        const speed = 0.01;
        this.state.ball.x += this.state.ball.dx || speed;
        this.state.ball.y += this.state.ball.dy || 0;

        if (this.state.ball.y < -1 || this.state.ball.y > 1) {
            this.state.ball.dy *= -1;
        }

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

const app = express();
const server = http.createServer(app);
const gameServer = new Server({ server });

gameServer.define("pong", PongRoom);

const PORT = process.env.PORT || 2567;
server.listen(PORT, () => {
    console.log(`Colyseus server running on port ${PORT}`);
});
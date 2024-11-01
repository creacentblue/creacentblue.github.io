// Initialize WebGL context
const canvas = document.getElementById('gameCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported');
    throw new Error('WebGL not supported');
}

// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    
    varying lowp vec4 vColor;
    
    void main() {
        gl_Position = aVertexPosition;
        vColor = aVertexColor;
    }
`;

// Fragment shader program
const fsSource = `
    varying lowp vec4 vColor;
    
    void main() {
        gl_FragColor = vColor;
    }
`;

// Initialize shader program
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;

// Bird properties
let birdY = 0.0;
let birdVelocity = 0.0;
const gravity = 0.0008;
const flapStrength = -0.015;

// Add maximum velocity to prevent too fast movement
const maxUpwardVelocity = -0.03;
const maxDownwardVelocity = 0.08;
const terminalVelocity = 0.15;

// Pipe properties
const pipeWidth = 0.2;
const pipeGap = 0.6;
let pipes = [];
const pipeSpeed = 0.005;

function createPipe() {
    const gapPosition = Math.random() * 1.2 - 0.6;
    return {
        x: 1.2,
        gapY: gapPosition,
        passed: false
    };
}

function initPipes() {
    pipes = [createPipe()];
}

function updatePipes() {
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;
        if (pipes[i].x < -1.2) {
            pipes.splice(i, 1);
        } else if (!pipes[i].passed && pipes[i].x < 0) {
            score++;
            pipes[i].passed = true;
            console.log('Score:', score);
        }
    }

    if (pipes[pipes.length - 1].x < 0.5) {
        pipes.push(createPipe());
    }
}

function drawShape(positions, colors) {
    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    // Draw the shape
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function drawPipe(x, gapY) {
    // Upper pipe
    const upperPositions = [
        x - pipeWidth/2, 1.0,
        x + pipeWidth/2, 1.0,
        x + pipeWidth/2, gapY + pipeGap/2,
        x - pipeWidth/2, gapY + pipeGap/2,
    ];

    // Lower pipe
    const lowerPositions = [
        x - pipeWidth/2, -1.0,
        x + pipeWidth/2, -1.0,
        x + pipeWidth/2, gapY - pipeGap/2,
        x - pipeWidth/2, gapY - pipeGap/2,
    ];

    const colors = [
        0.0, 1.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
    ];

    drawShape(upperPositions, colors);
    drawShape(lowerPositions, colors);
}

// Add these new constants for the bird
const birdSize = 0.1;
const wingAmplitude = 0.03; // How much the wings move
let wingOffset = 0; // For wing animation

// Replace the drawBird function with this new version
function drawBird() {
    // Bird body (oval shape)
    const bodyPositions = [
        -birdSize, birdY,  // Center point
    ];
    
    // Create circular body with more vertices
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        bodyPositions.push(
            -birdSize + Math.cos(angle) * birdSize * 0.8,
            birdY + Math.sin(angle) * birdSize * 0.6
        );
    }

    // Wing position varies with time for animation
    wingOffset = Math.sin(Date.now() / 100) * wingAmplitude;
    
    // Wing (triangle shape)
    const wingPositions = [
        -birdSize * 0.5, birdY,
        -birdSize * 0.8, birdY + wingOffset,
        -birdSize * 0.2, birdY + wingOffset * 0.5
    ];

    // Colors
    const bodyColors = [];
    for (let i = 0; i <= segments + 1; i++) {
        bodyColors.push(1.0, 0.8, 0.0, 1.0); // Golden yellow
    }

    const wingColors = [
        0.9, 0.7, 0.0, 1.0,
        0.9, 0.7, 0.0, 1.0,
        0.9, 0.7, 0.0, 1.0
    ];

    // Draw body
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bodyPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bodyColors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, segments + 2);

    // Draw wing
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wingPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wingColors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function checkCollision() {
    const birdRadius = 0.1;
    for (const pipe of pipes) {
        if (Math.abs(pipe.x) < birdRadius + pipeWidth/2) {
            if (birdY < pipe.gapY - pipeGap/2 || birdY > pipe.gapY + pipeGap/2) {
                return true;
            }
        }
    }
    return false;
}

// Add background elements
let clouds = [];
const numClouds = 5;

function initClouds() {
    clouds = [];
    for (let i = 0; i < numClouds; i++) {
        clouds.push({
            x: Math.random() * 2 - 1,
            y: Math.random() * 1.6 - 0.8,
            size: Math.random() * 0.2 + 0.1,
            speed: Math.random() * 0.001 + 0.001
        });
    }
}

function drawCloud(x, y, size) {
    const positions = [];
    const segments = 32;
    const numCircles = 3;
    
    // Create multiple overlapping circles for cloud shape
    for (let c = 0; c < numCircles; c++) {
        const offsetX = (c - 1) * size * 0.5;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            positions.push(
                x + offsetX + Math.cos(angle) * size,
                y + Math.sin(angle) * size * 0.6
            );
        }
    }

    const colors = new Array((segments + 1) * numCircles * 4).fill(1.0);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, (segments + 1) * numCircles);
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x < -1.2) {
            cloud.x = 1.2;
            cloud.y = Math.random() * 1.6 - 0.8;
        }
    });
}

function drawScene() {
    // Sky gradient (light blue to darker blue)
    gl.clearColor(0.53, 0.81, 0.92, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw clouds
    clouds.forEach(cloud => {
        drawCloud(cloud.x, cloud.y, cloud.size);
    });

    // Draw pipes
    pipes.forEach(pipe => drawPipe(pipe.x, pipe.gapY));
    
    // Draw bird
    drawBird();
}

// Initialize shaders
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
};

// Initialize clouds when the game starts
initClouds();

function update() {
    if (!gameStarted || gameOver) {
        return;
    }

    // Apply gravity
    birdVelocity += gravity;
    
    // Limit velocities
    if (birdVelocity < maxUpwardVelocity) {
        birdVelocity = maxUpwardVelocity;
    }
    if (birdVelocity > maxDownwardVelocity) {
        birdVelocity = maxDownwardVelocity;
    }
    
    // Update position
    birdY += birdVelocity;

    // Ground collision
    if (birdY < -0.9) {
        birdY = -0.9;
        birdVelocity = 0;
        gameOver = true;
    }
    
    // Ceiling collision
    if (birdY > 0.9) {
        birdY = 0.9;
        birdVelocity = 0;
    }

    updatePipes();
    updateClouds();
    
    if (checkCollision()) {
        gameOver = true;
    }

    drawScore();
    drawScene();
    requestAnimationFrame(update);
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        
        if (!gameStarted) {
            gameStarted = true;
            initPipes();
            birdVelocity = 0;
            update();
        } else if (!gameOver) {
            birdVelocity = flapStrength;
        } else {
            // Reset game
            gameStarted = true;
            gameOver = false;
            score = 0;
            birdY = 0.0;
            birdVelocity = 0.0;
            pipes = [];
            initPipes();
            update();
        }
    }
});

// Add touch event handlers after your keyboard event handler
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent default touch behaviors
    
    if (!gameStarted) {
        gameStarted = true;
        initPipes();
        birdVelocity = 0;
        update();
    } else if (!gameOver) {
        birdVelocity = flapStrength;
    } else {
        // Reset game
        gameStarted = true;
        gameOver = false;
        score = 0;
        birdY = 0.0;
        birdVelocity = 0.0;
        pipes = [];
        initPipes();
        update();
    }
}, { passive: false });

// Add resize handler to make the canvas responsive
function resizeCanvas() {
    const displayWidth = Math.min(800, window.innerWidth - 40); // 40px for padding
    const scale = displayWidth / canvas.width;
    
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${canvas.height * scale}px`;
}

// Call resize on load and window resize
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// Optional: Add score display
function drawScore() {
    const scoreDiv = document.getElementById('score');
    scoreDiv.textContent = gameOver ? 
        `Game Over! Final Score: ${score}` : 
        `Score: ${score}`;
    
    if (gameOver) {
        document.getElementById('final-score').textContent = score;
        document.querySelector('.game-over').classList.add('visible');
    }
}

// Initial draw
gl.useProgram(shaderProgram);
drawScene();

// Add this at the end of your game.js file
window.addEventListener('load', () => {
    document.querySelector('.loading').style.display = 'none';
});

function restartGame() {
    document.querySelector('.game-over').classList.remove('visible');
    // Your existing reset game logic here
}
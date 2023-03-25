class Custom3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');

        if (!this.gl) {
            console.error('WebGL 2 not supported by your browser');
            return;
        }

        // Initialize the projection matrix
        this.projectionMatrix = mat4.create();

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.init();
        this.start();
    }

    init() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.createShaderProgram();
        this.createCube();
        this.setupCamera();
        this.animate();
    }

    start() {
        // アニメーションループの開始
        this.animate();
    }

    resizeCanvas() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = height;

        this.gl.viewport(0, 0, width, height);

        // Update projection matrix aspect ratio
        mat4.perspective(this.projectionMatrix, this.fieldOfView, width / height, this.zNear, this.zFar);
    }


    createShaderProgram() {
        // Vertex shader
        const vsSource = `#version 300 es
    in vec4 a_position;
    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_projectionMatrix;
    out vec3 v_position;
    void main() {
        gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
        v_position = a_position.xyz;
    }`;

        // Fragment shader
        const fsSource = `#version 300 es
        precision mediump float;
        in vec3 v_position;
        uniform float u_lineWidth;
        out vec4 fragColor;
        void main() {
            vec3 normal = normalize(cross(dFdx(v_position), dFdy(v_position)));
            float edgeFactor = abs(abs(dot(normal, vec3(0.0, 0.0, -1.0))) - 1.0);
            float lineWidth = u_lineWidth;
            float threshold = 1.0 - lineWidth;
            float line = smoothstep(threshold, 1.0, edgeFactor);
            fragColor = vec4(vec3(line), 0.5);
        }`;


        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram));
            return;
        }

        this.gl.useProgram(this.shaderProgram);
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createCube() {
        const positions = [
            // Front face
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
            1.0,  1.0,  1.0,
            1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0
        ];

        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ];

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
    }

    setupCamera() {
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

        this.projectionMatrix = projectionMatrix;
        this.modelViewMatrix = modelViewMatrix;
    }

    animate() {
        this.drawScene();

        requestAnimationFrame(() => {
            this.animate();
        });
    }

    drawScene() {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      const positionAttributeLocation = this.gl.getAttribLocation(this.shaderProgram, 'a_position');
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
      this.gl.vertexAttribPointer(positionAttributeLocation, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(positionAttributeLocation);

      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

      const uModelViewMatrixLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_modelViewMatrix');
      const uProjectionMatrixLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_projectionMatrix');
      const uLineWidthLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_lineWidth');

      // Set line width
      this.gl.uniform1f(uLineWidthLocation, 0.02);

      // Update the model view matrix for rotation
      const currentTime = Date.now() / 1000;
      const rotationAngle = currentTime * (2 * Math.PI) / 8;
      const modelViewMatrix = mat4.create();
      mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
      mat4.rotateX(modelViewMatrix, modelViewMatrix, rotationAngle);
      mat4.rotateY(modelViewMatrix, modelViewMatrix, rotationAngle);

      this.gl.uniformMatrix4fv(uModelViewMatrixLocation, false, modelViewMatrix);
      this.gl.uniformMatrix4fv(uProjectionMatrixLocation, false, this.projectionMatrix);

      const vertexCount = 36;
      this.gl.drawElements(this.gl.TRIANGLES, vertexCount, this.gl.UNSIGNED_SHORT, 0);
    }

}

// Initialize the Custom3D framework
const canvas = document.querySelector('#glCanvas');
const custom3D = new Custom3D(canvas);



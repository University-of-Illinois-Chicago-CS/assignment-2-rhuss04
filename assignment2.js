// Name: Ryyan Hussain
// UIN: 679554508
// This file contains the WebGL code for Project 2.
// It loads a heightmap image, processes it to create a terrain mesh,
// and renders it. The user can interact with this rendering

import vertexShaderSrc from './vertex.glsl.js';
import fragmentShaderSrc from './fragment.glsl.js'

var gl = null;
var vao = null;
var program = null;
var vertexCount = 0;
var uniformModelViewLoc = null;
var uniformProjectionLoc = null;
var heightmapData = null;

var zAngle = 0;


function processImage(img)
{
	// draw the image into an off-screen canvas
	var off = document.createElement('canvas');
	
	var sw = img.width, sh = img.height;
	off.width = sw; off.height = sh;
	
	var ctx = off.getContext('2d');
	ctx.drawImage(img, 0, 0, sw, sh);
	
	// read back the image pixel data
	var imgd = ctx.getImageData(0,0,sw,sh);
	var px = imgd.data;
	
	// create a an array will hold the height value
	var heightArray = new Float32Array(sw * sh);
	
	// loop through the image, rows then columns
	for (var y=0;y<sh;y++) 
	{
		for (var x=0;x<sw;x++) 
		{
			// offset in the image buffer
			var i = (y*sw + x)*4;
			
			// read the RGB pixel value
			var r = px[i+0], g = px[i+1], b = px[i+2];
			
			// convert to greyscale value between 0 and 1
			var lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255.0;

			// store in array
			heightArray[y*sw + x] = lum;
		}
	}

	return {
		data: heightArray,
		width: sw,
		height: sh
	};
}


// Create a terrain mesh from heightmap data
function createTerrainMesh(heightmapData, heightScale = 1.0) {
    const w = heightmapData.width;  // width
    const h = heightmapData.height;  // height
    const data = heightmapData.data;  // brightness data

    const positions = [];  // array to hold vertex positions
    const colors = [];  // array to hold vertex colors

    for (let z = 0; z < h - 1; z++) {
        for (let x = 0; x < w - 1; x++) {

            const i00 = z * w + x;  // (x, z) top-left
            const i10 = z * w + (x + 1);  // (x+1, z) top-right
            const i01 = (z + 1) * w + x;  // (x, z+1) bottom-left
            const i11 = (z + 1) * w + (x + 1);  // (x+1, z+1) bottom-right

            const y00 = data[i00] * heightScale;  // height at top-left (x, z)
            const y10 = data[i10] * heightScale;  // height at top-right (x+1, z)
            const y01 = data[i01] * heightScale;  // height at bottom-left (x, z+1)
            const y11 = data[i11] * heightScale;  // height at bottom-right (x+1, z+1)

			// normalized, this will center the terrain around (0,0)
            const nx = x / (w - 1) - 0.5;  // normalized x
            const nz = z / (h - 1) - 0.5;  // normalized z
            const nx1 = (x + 1) / (w - 1) - 0.5;  // normalized x+1
            const nz1 = (z + 1) / (h - 1) - 0.5;  // normalized z+1

            // Triangle 1
            positions.push(
                nx,  y00, nz,  // vertex at (x, z)
                nx1, y10, nz,  // vertex at (x+1, z)
                nx1, y11, nz1  // vertex at (x+1, z+1)
            );

            // Triangle 2
            positions.push(
                nx,  y00, nz,  // vertex at (x, z)
                nx1, y11, nz1,  // vertex at (x+1, z+1)
                nx,  y01, nz1   // vertex at (x, z+1)
            );

            // holds the 6 vertices of the two triangles
            const triangleVertices = [
                [nx,  y00, nz],  // vertex at (x, z)
                [nx1, y10, nz],  // vertex at (x+1, z)
                [nx1, y11, nz1],  // vertex at (x+1, z+1)
                [nx,  y00, nz],  // vertex at (x, z) since reused for second triangle
                [nx1, y11, nz1],  // vertex at (x+1, z+1)
                [nx,  y01, nz1]   // vertex at (x, z+1)
            ];

			// Compute colors for vertices based on position	
            for (const v of triangleVertices) {
				const r = v[0] + 0.5;  // red based on x
				const g = Math.min(1, v[1] * 2.0);  // green based on y
				const b = v[2] + 0.5;  // blue based on z
				colors.push(r, g, b, 1.0);
            }
        }
    }

    return {positions, colors};  // return the mesh data
}


window.loadImageFile = function(event)
{

	var f = event.target.files && event.target.files[0];
	if (!f) return;
	
	// create a FileReader to read the image file
	var reader = new FileReader();
	reader.onload = function() 
	{
		// create an internal Image object to hold the image into memory
		var img = new Image();
		img.onload = function() 
		{
			// heightmapData is globally defined
			heightmapData = processImage(img);
			
			/*
				TODO: using the data in heightmapData, create a triangle mesh
					heightmapData.data: array holding the actual data, note that 
					this is a single dimensional array the stores 2D data in row-major order

					heightmapData.width: width of map (number of columns)
					heightmapData.height: height of the map (number of rows)
			*/
			console.log('loaded image: ' + heightmapData.width + ' x ' + heightmapData.height);

            const mesh = createTerrainMesh(heightmapData, 1.0);  // build the terrain mesh
            vertexCount = mesh.positions.length / 3;  // count of vertices, used by draw()

            const posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(mesh.positions));  // position buffer
            const colBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(mesh.colors));  // color buffer

            const posAttribLoc = gl.getAttribLocation(program, "position");  // attribute location for position
            const colAttribLoc = gl.getAttribLocation(program, "color");  // attribute location for color

            vao = createVAO(gl, posAttribLoc, posBuffer, null, null, colAttribLoc, colBuffer);  // create the VAO with position and color attributes

		};
		img.onerror = function() 
		{
			console.error("Invalid image file.");
			alert("The selected file could not be loaded as an image.");
		};

		// the source of the image is the data load from the file
		img.src = reader.result;
	};
	reader.readAsDataURL(f);
}


function setupViewMatrix(eye, target)
{
    var forward = normalize(subtract(target, eye));
    var upHint  = [0, 1, 0];

    var right = normalize(cross(forward, upHint));
    var up    = cross(right, forward);

    var view = lookAt(eye, target, up);
    return view;

}


function draw()
{
	var fovRadians = 70 * Math.PI / 180;
	var aspectRatio = +gl.canvas.width / +gl.canvas.height;
	var nearClip = 0.001;
	var farClip = 20.0;

	var projectionType = document.querySelector("#projection").value;  // perspective or orthographic

	if (projectionType === "orthographic") {  // orthographic
		const orthoSize = 2.5;   // adjust view window
		projectionMatrix = orthographicMatrix(  //calculate orthographic projection matrix
			-orthoSize * aspectRatio,
			orthoSize * aspectRatio,
			-orthoSize,
			orthoSize,
			nearClip,
			farClip
		);
	}
	else {  // perspective
		var projectionMatrix = perspectiveMatrix(
			fovRadians,
			aspectRatio,
			nearClip,
			farClip,
		);
	}

	// eye and target
	var eye = [0, 2.5, 2.5];
	var target = [0, 0, 0];

	var modelMatrix = identityMatrix();

	// TODO: set up transformations to the model
	var yAngleDegrees = parseFloat(document.querySelector("#rotation").value);  // reads Y rotation
	var zoomValue = parseFloat(document.querySelector("#scale").value);  // reads zoom scale
	var heightValue = parseFloat(document.querySelector("#height").value);  // reads height scale
	var wireframe = document.querySelector("#wireframe").checked;  // reads wireframe mode

	var yAngleRadians = yAngleDegrees * Math.PI / 180.0;  // degrees to radians
	var zAngleRadians = zAngle * Math.PI / 180.0;  // takes zAngle and converts to radians

	var rotationY = rotateYMatrix(yAngleRadians);  // rotation matrix around Y axis
	var rotationZ = rotateZMatrix(zAngleRadians);  // rotation matrix around Z axis

	var scaleFactor = 0.5 + (zoomValue / 200) * 8.5;  // scale factor based on zoom slider
	var zoomScale = scaleMatrix(scaleFactor, scaleFactor, scaleFactor);  // calculate zoom scale matrix

	var heightFactor = 0.0 + (heightValue / 200) * 2.8;  // height factor based on height slider
	var heightScale = scaleMatrix(1.0, heightFactor, 1.0);  // calculate height scale matrix

	var panning = translateMatrix(panX, 0, panZ);  // translation matrix based on panX and panZ for panning

	modelMatrix = multiplyArrayOfMatrices([panning, rotationY, rotationZ, zoomScale, heightScale]);  // model = rotation * scale

	// setup viewing matrix
	var viewMatrix = setupViewMatrix(eye, target);

	// model-view Matrix = view * model
	var modelviewMatrix = multiplyMatrices(viewMatrix, modelMatrix);


	// enable depth testing
	gl.enable(gl.DEPTH_TEST);

	// disable face culling to render both sides of the triangles
	gl.disable(gl.CULL_FACE);

	gl.clearColor(0.2, 0.2, 0.2, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.useProgram(program);
	
	// update modelview and projection matrices to GPU as uniforms
	gl.uniformMatrix4fv(uniformModelViewLoc, false, new Float32Array(modelviewMatrix));
	gl.uniformMatrix4fv(uniformProjectionLoc, false, new Float32Array(projectionMatrix));

	gl.bindVertexArray(vao);

	var primitiveType = gl.TRIANGLES; 

	if (wireframe) {  // draw in wireframe mode if checked
		for (let i = 0; i < vertexCount; i += 3) {  // draw each triangle using LINE_LOOP, which connects the vertices with lines
			gl.drawArrays(gl.LINE_LOOP, i, 3);
		}
	} 
	else {  // draw filled triangles
		gl.drawArrays(primitiveType, 0, vertexCount);
	}

	requestAnimationFrame(draw);

}


function createBox()
{
	function transformTriangle(triangle, matrix) {
		var v1 = [triangle[0], triangle[1], triangle[2], 1];
		var v2 = [triangle[3], triangle[4], triangle[5], 1];
		var v3 = [triangle[6], triangle[7], triangle[8], 1];

		var newV1 = multiplyMatrixVector(matrix, v1);
		var newV2 = multiplyMatrixVector(matrix, v2);
		var newV3 = multiplyMatrixVector(matrix, v3);

		return [
			newV1[0], newV1[1], newV1[2],
			newV2[0], newV2[1], newV2[2],
			newV3[0], newV3[1], newV3[2]
		];
	}

	var box = [];

	var triangle1 = [
		-1, -1, +1,
		-1, +1, +1,
		+1, -1, +1,
	];
	box.push(...triangle1)

	var triangle2 = [
		+1, -1, +1,
		-1, +1, +1,
		+1, +1, +1
	];
	box.push(...triangle2);

	// 3 rotations of the above face
	for (var i=1; i<=3; i++) 
	{
		var yAngle = i* (90 * Math.PI / 180);
		var yRotMat = rotateYMatrix(yAngle);

		var newT1 = transformTriangle(triangle1, yRotMat);
		var newT2 = transformTriangle(triangle2, yRotMat);

		box.push(...newT1);
		box.push(...newT2);
	}

	// a rotation to provide the base of the box
	var xRotMat = rotateXMatrix(90 * Math.PI / 180);
	box.push(...transformTriangle(triangle1, xRotMat));
	box.push(...transformTriangle(triangle2, xRotMat));


	return {
		positions: box
	};

}


var isDragging = false;
var startX, startY;
var leftMouse = false;

var panX = 0, panZ = 0;  // panning offsets for the model

function addMouseCallback(canvas)
{
	isDragging = false;

	canvas.addEventListener("mousedown", function (e) 
	{
		if (e.button === 0) {
			console.log("Left button pressed");
			leftMouse = true;
		} else if (e.button === 2) {
			console.log("Right button pressed");
			leftMouse = false;
		}

		isDragging = true;
		startX = e.offsetX;
		startY = e.offsetY;
	});

	canvas.addEventListener("contextmenu", function(e)  {
		e.preventDefault(); // disables the default right-click menu
	});


	canvas.addEventListener("wheel", function(e)  {
		e.preventDefault(); // prevents page scroll

		const zoomSlider = document.querySelector("#scale");  // get zoom slider
		if (!zoomSlider) return;

		const zoomSpeed = 5;  // how fast to zoom in/out
		let newZoom = parseFloat(zoomSlider.value);  // current zoom value

		if (e.deltaY < 0) 
		{
			console.log("Scrolled up");
			newZoom += zoomSpeed;  // scrolled up, so zoom in
		} else {
			console.log("Scrolled down");
			newZoom -= zoomSpeed;  // scrolled down, so zoom out
		}
		newZoom = Math.min(200, Math.max(0, newZoom));  // keeps zoom value consistent with slider limits
		zoomSlider.value = newZoom;  // update slider to new zoom value
	});

	document.addEventListener("mousemove", function (e) {
		if (!isDragging) return;
		var currentX = e.offsetX;
		var currentY = e.offsetY;

		var deltaX = currentX - startX;
		var deltaY = currentY - startY;

		startX = currentX;  // this is used to compute delta next time
		startY = currentY;

		if (!leftMouse) {  // If the right mouse button is being dragged, then pan
			var panSpeed = 0.01;
			panX += deltaX * panSpeed;  // update panX based on horizontal dragging
			panZ += deltaY * panSpeed;  // update panZ based on vertical dragging
		} 
		else { // Left mouse button is dragged, so rotate
			var rotationSpeed = 0.35; // rotation speed

			var rotationSlider = document.querySelector("#rotation");  // gets rotation slider
			if (rotationSlider) {  
				var newY = parseFloat(rotationSlider.value) + deltaX * rotationSpeed;  // updates Y rotation if horizontally dragged
				newY = (newY + 360) % 360;  //  keeps degrees bounded between 0 and 360
				rotationSlider.value = newY;  //  updates slider value
			}
			zAngle += deltaY * rotationSpeed;  // vertical dragging updates zAngle
			zAngle = (zAngle + 360) % 360;  // keeps degrees bounded between 0 and 360
		}

		console.log('mouse drag by: ' + deltaX + ', ' + deltaY);

		// implement dragging logic
	});

	document.addEventListener("mouseup", function () {
		isDragging = false;
	});

	document.addEventListener("mouseleave", () => {
		isDragging = false;
	});
}


function initialize() 
{
	var canvas = document.querySelector("#glcanvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	gl = canvas.getContext("webgl2");

	// add mouse callbacks
	addMouseCallback(canvas);

	var box = createBox();
	vertexCount = box.positions.length / 3;		// vertexCount is global variable used by draw()
	console.log(box);

	// create buffers to put in box
	var boxVertices = new Float32Array(box['positions']);
	var posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, boxVertices);

	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
	program = createProgram(gl, vertexShader, fragmentShader);

	// attributes (per vertex)
	var posAttribLoc = gl.getAttribLocation(program, "position");

	// uniforms
	uniformModelViewLoc = gl.getUniformLocation(program, 'modelview');
	uniformProjectionLoc = gl.getUniformLocation(program, 'projection');

	vao = createVAO(gl, 
		// positions
		posAttribLoc, posBuffer, 

		// normals (unused in this assignments)
		null, null, 

		// colors (not needed--computed by shader)
		null, null
	);

	window.requestAnimationFrame(draw);
}


window.onload = initialize();
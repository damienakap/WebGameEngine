

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ENGINE = {}));
}(this, (function (exports) { 'use strict';




// Input Manager Vars

let canvas;

let pointerLocked = false;

let downKeys = new Int8Array(256);
let upKeys = new Int8Array(256);
let heldKeys = new Int8Array(256);


let mousePos      = [-2.0,-2.0];
let mousePosLast  = [-2.0,-2.0];

let mouseDownButtons = new Int8Array(3);
let mouseUpButtons = new Int8Array(3);
let mouseHeldButtons = new Int8Array(3);


var Utility = {
  MakeQuerablePromise : function MakeQuerablePromise(promise) {
    if (promise.isResolved) return promise;
    
    var isPending = true;
    var isRejected = false;
    var isFulfilled = false;
  
    var result = promise.then(
        function(v) {
            isFulfilled = true;
            isPending = false;
            return v; 
        }, 
        function(e) {
            isRejected = true;
            isPending = false;
            throw e; 
        }
    );
  
    result.isFulfilled = function() { return isFulfilled; };
    result.isPending = function() { return isPending; };
    result.isRejected = function() { return isRejected; };
    return result;
  }
}







var GltfModel = function GltfModel()
{
  THREE.Group.call(this);

  this.type = 'GltfModel';

  //Object.defineProperty( this, 'isGltfModel', { value: true } );
  

  this.scene;
  
  this.material
  this.animations;
  this.mixer;
  this.actions;

  this.castShadow = false;
  this.recieveShadow = false;

  //console.log(this.scene.setParent);
  //console.log(this.scene); 

}

GltfModel.prototype = new THREE.Group();

GltfModel.prototype.setShadows = function( cast=false, recieve=false )
{
  this.castShadow = cast;
  this.recieveShadow = recieve;

  this.scene.traverse(function(o) {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = recieve;
    }
  });

}


var loadGltf = function loadGltf(e, file)
{
  return Utility.MakeQuerablePromise(new Promise((resolve, reject) => { e.gltfLoader.load(
    file,

    function ( gltf ) {


      var model = new GltfModel();
      model.scene = gltf.scene;

      e.scene.add(model);
      e.scene.add(model.scene);
      
      model.scene.parent = model;

      //model.scene = gltf.scene;
      model.animations = gltf.animations

      model.mixer = new THREE.AnimationMixer( gltf.scene );
      model.animations = new Array(gltf.animations.length);
      model.actions = new Array(gltf.animations.length);
      
      gltf.animations.forEach((v, i) => {
        model.animations[i] = v;
        model.actions[i] = model.mixer.clipAction( v );
        //console.log(v)
      });
      
      

      model.materials = [];

      
      model.scene.traverse((o) => {
        if (o.isMesh)
        {
          //o.castShadow = true;
          //o.recieveShadow = true;
          //o.material.shadowSide = THREE.FrontSide;
          model.materials[model.materials.length] = o.material;
        }
      });
      

      //console.log(gltf);
      //console.log(model.scene);
      //console.log(model.materials)

      resolve(model);

    },
    function ( xhr ) {
  
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
  
    },
    function ( error ) {
  
      //console.log( 'An error happened: ' + error);
      reject( error );
    }

  ); }));
}

/**
 * 
 * @param {ENGINE.engine} e - the engine to load image with
 * @param {string} file - the path/url to file
 */
var loadImage = function loadImage(e, file)
{
  return Utility.MakeQuerablePromise(new Promise((resolve, reject) => { e.imageLoader.load(
    file,

    function ( image ) {
      resolve(image)
    },
  
    // onProgress callback currently not supported
    undefined,
    // onError callback
    function (error) {
      //console.error( 'An error happened.' );
      reject( error );
    }
    
  ); }));
}

/**
 * 
 * @param {string} url - the path/url to file
 * @param {string} responseType - 'text','blob','arraybuffer','document','json','ms-stream',etc..
 */
var loadXHR = function loadXHR(url,responseType = "text") {

  return Utility.MakeQuerablePromise(new Promise(function(resolve, reject) {
      try {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url);
          xhr.responseType = responseType;
          xhr.onerror = function() {reject("Network error.")};
          xhr.onload = function() {
              if (xhr.status === 200) {resolve(xhr.response)}
              else {reject("Loading error:" + xhr.statusText)}
          };
          xhr.send();
      }
      catch(err) {reject(err.message)}
  }));
}

/**
 * 
 * @param {THREE.Geometry} geometry - geometry to create height matrix from
 * @param {Int} columnAxis - (0,1,2) axis of columns (default=0)
 * @param {Int} rowAxis - (0,1,2) axis of rows (default=2)
 * @returns matrix - a 2D array of height values
 */
var geometryToHeightMatrix = function geometryToHeightMatrix( geometry, columnAxis=2, rowAxis=0 )
{
  let verts = geometry.attributes.position.array;

  let vertArr = new Array(verts.length/3);
  let temp = 1;
  for( let i=0; i<vertArr.length; i++ )
  {
    temp = i*3;
    vertArr[i] = [ verts[ temp ]+0, verts[ temp + 1 ]+0, verts[ temp + 2 ]+0 ];
  }
  vertArr.sort( (a, b) => (a[columnAxis] > b[columnAxis]) ? 1 : -1 );


  let size = Math.pow(vertArr.length,0.5);
  let vertMatrix = new Array(size);

  let heightMatrix = new Array(size);

  for( let i=0; i<size; i++ )
  {
    vertMatrix[i] = new Array(size);
    temp = i*size;
    for( let j=0; j<size; j++ )
      vertMatrix[i][j] = vertArr[ temp + j ];

    vertMatrix[i].sort( (a, b) => (a[rowAxis] > b[rowAxis]) ? 1 : -1 );

    heightMatrix[i] = new Float32Array(size);
    for( let j=0; j<size; j++ )
      heightMatrix[i][j] = vertMatrix[i][j][1];
  }

  console.log(heightMatrix);
  return heightMatrix;

}

/**
 * 
 * @param {2D Array} matrix - a 2d array of height values
 * @param {int} sideVertCount - number of verticies on one side of the terrain mesh (assumes a square terrain mesh)
 * @param {Number} sideLength - the total length of one side of the terrain mesh
 */
var heightMatrixToPhysBody = function heightMatrixToPhysBody( matrix, sideVertCount, sideLength, offset=1.625 )
{
  var q = sideLength/sideVertCount;
  var hfShape = new CANNON.Heightfield(matrix, {
    elementSize: ~~q + (q - ~~q)*offset
  });

  var hfBody = new CANNON.Body({
    mass: 0,
    shape: hfShape
  });
  //hfBody.addShape(hfShape);
  //hfBody.updateMassProperties();
  return hfBody;
}


/**
 * 
 * @param {CANNON.SHAPE} hfShape - Shape of the height field 
 * @param {THREE.Material} material - render material
 * @returns THREE.Mesh - mesh Object
 */
var heightFieldShapeToMesh = function heightFieldShapeToMesh( hfShape, material = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  emissive: 0x0F0F0F,
  flatShading: false,
  roughness:1.0,
  metalness:0.0
}))
{
  var geometry = new THREE.Geometry();

  var v0 = new CANNON.Vec3();
  var v1 = new CANNON.Vec3();
  var v2 = new CANNON.Vec3();
  for (var xi = 0; xi < hfShape.data.length - 1; xi++) {
    for (var yi = 0; yi < hfShape.data[xi].length - 1; yi++) {
      for (var k = 0; k < 2; k++) {
        hfShape.getConvexTrianglePillar(xi, yi, k===0);
        v0.copy(hfShape.pillarConvex.vertices[0]);
        v1.copy(hfShape.pillarConvex.vertices[1]);
        v2.copy(hfShape.pillarConvex.vertices[2]);
        v0.vadd(hfShape.pillarOffset, v0);
        v1.vadd(hfShape.pillarOffset, v1);
        v2.vadd(hfShape.pillarOffset, v2);
        geometry.vertices.push(
          new THREE.Vector3(v0.x, v0.y, v0.z),
          new THREE.Vector3(v1.x, v1.y, v1.z),
          new THREE.Vector3(v2.x, v2.y, v2.z)
        );
        var i = geometry.vertices.length - 3;
        geometry.faces.push(new THREE.Face3(i+0, i+1, i+2));
      }
    }
  }
  geometry.computeBoundingSphere();
  geometry.computeFaceNormals();

  return new THREE.Mesh(geometry, material);
}


/**
 * 
 * @param {*} geometry 
 * @param {*} sideVertCount 
 * @param {*} sideLength 
 * @param {*} columnAxis 
 * @param {*} rowAxis 
 */
var geometryToHeightFieldBody = function geometryToHeightFieldBody( geometry, sideVertCount, sideLength, offset=1.625, columnAxis=2, rowAxis=0 )
{
  var g = geometryToHeightMatrix(geometry, columnAxis, rowAxis);
  return heightMatrixToPhysBody( g, sideVertCount, sideLength, offset );
}




// Input Manager

var InputManager = function InputManager( c ) {
  Object.defineProperty( this, 'isInputManager', { value: true } );

  canvas = c;

  this.mousePos           = [0.0,0.0];
  this.mousePosDelta      = [0.0,0.0];
  this.mouseDrag          = [0.0,0.0];
  this.mouseDragDelta     = [0.0,0.0];

  this.mouseDownPos       = [0.0,0.0];
  this.mouseDownTime      = 0.0;
  this.bindInputEvents();
    
  return true;

};

InputManager.prototype.update = function( dt )
{

  // update mouse pose

  if(pointerLocked)
  {
    mousePosLast[0] = 0;
    mousePosLast[1] = 0;

    this.mousePosDelta[0] = mousePos[0];
    this.mousePosDelta[1] = mousePos[1];
    
    this.mousePos[0] = 0;
    this.mousePos[1] = 0;
  }
  else{
    mousePosLast[0] = this.mousePos[0];
    mousePosLast[1] = this.mousePos[1];

    this.mousePosDelta[0] = mousePos[0] - this.mousePos[0];
    this.mousePosDelta[1] = mousePos[1] - this.mousePos[1];

    this.mousePos[0] = mousePos[0];
    this.mousePos[1] = mousePos[1];
  }
  

  


  // handle left mouse button events
  if(mouseHeldButtons[0])
  {

    this.mouseDrag[0] = this.mousePos[0] - this.mouseDownPos[0];
    this.mouseDrag[1] = this.mousePos[1] - this.mouseDownPos[1];
    
    this.mouseDragDelta[0] = this.mousePos[0] - mousePosLast[0];
    this.mouseDragDelta[1] = this.mousePos[1] - mousePosLast[1];
    
    this.mouseDownTime += dt;
  }
  if(mouseDownButtons[0])
  {
    this.mouseDownPos[0] = this.mousePos[0];
    this.mouseDownPos[1] = this.mousePos[1];

    this.mouseDownTime = 0.0;
  }
  if(mouseUpButtons[0])
  {
    this.mouseDownTime = 0.0;
  }

  //console.log(Math.fround(this.mouseDownTime/1000));
  //console.log(this.mouseDownPos)
  //console.log(this.mouseDragDelta)
  //console.log(this.mouseDownTime/1000);

}

InputManager.prototype.refresh = function()
{

  downKeys.fill(0);
  upKeys.fill(0);

  mousePos.fill(0);

  mouseDownButtons.fill(0);
  mouseUpButtons.fill(0);

  this.mousePosDelta.fill(0);
  this.mouseDragDelta.fill(0);
  this.mouseDrag.fill(0);

}

InputManager.prototype.getDownKey = function(code){ return downKeys[code] }
InputManager.prototype.getUpKey = function(code){ return upKeys[code] }
InputManager.prototype.getHeldKey = function(code){ return heldKeys[code] }

InputManager.prototype.getMouseDown = function(code){ return mouseDownButtons[code] }
InputManager.prototype.getMouseUp   = function(code){ return mouseUpButtons[code] }
InputManager.prototype.getMouseHeld = function(code){ return mouseHeldButtons[code] }

InputManager.prototype.requestPointerLock = function(){ canvas.requestPointerLock(); }
InputManager.prototype.exitPointerLock = function(){document.exitPointerLock();}


////// Key Event Functions /////



InputManager.prototype.bindInputEvents = function()
{

  canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;
  
  document.exitPointerLock = document.exitPointerLock ||
        document.mozExitPointerLock ||
        document.webkitExitPointerLock;

  document.addEventListener('pointerlockchange', pointerChangeCallback.bind(this), false);
  document.addEventListener('mozpointerlockchange', pointerChangeCallback.bind(this), false);
  document.addEventListener('webkitpointerlockchange', pointerChangeCallback.bind(this), false);

  document.addEventListener('pointerlockerror', pointerErrorCallback.bind(this), false);
  document.addEventListener('mozpointerlockerror', pointerErrorCallback.bind(this), false);
  document.addEventListener('webkitpointerlockerror', pointerErrorCallback.bind(this), false);

  window.addEventListener('mousemove',  handleMousePos.bind(this), true);
  window.addEventListener('mousedown',  handelMouseDown.bind(this),true);
  window.addEventListener('mouseup',    handelMouseUp.bind(this),  true);
  window.addEventListener('keydown',    handleKeyDown.bind(this),  true);
  window.addEventListener('keyup',      handleKeyUp.bind(this),    true);
  /* 
  window.onbeforeunload = function (e) {
    // Cancel the event
    e.preventDefault();
    // Chrome requires returnValue to be set
    e.returnValue = 'Really want to quit the game?';
  };
  */
}

function handleKeyDown(e)
{
  if( heldKeys[e.keyCode] != 0) return;
  downKeys[e.keyCode] = 1;
  heldKeys[e.keyCode] = 1;
  //console.log(e.keyCode);

  if (!e.ctrlKey) return;

    var code = e.which || e.keyCode;//Get key code

    switch (code) {
      case 83://Block Ctrl+S
      case 68://Block Ctrl+D
      case 87://Block Ctrl+W -- Not work in Chrome and new Firefox
          e.preventDefault();
          e.stopPropagation();
          break;
    }
}

function handleKeyUp(e)
{
  //canvas.requestPointerLock();
  upKeys[e.keyCode]   = 1;
  heldKeys[e.keyCode] = 0;
  //console.log(e.keyCode);
}

///// Mouse Event Functions /////

function handelMouseDown(e)
{
  if( mouseHeldButtons[e.button] == 1) return;
  mouseDownButtons[e.button] = 1;
  mouseHeldButtons[e.button] = 1;
  //console.log(e.button);
}

function handelMouseUp(e)
{
  this.mouseDownTime
  mouseUpButtons[e.button]    = 1;
  mouseHeldButtons[e.button]  = 0;
}



function pointerErrorCallback(e)
{
  console.error(e);
}

function pointerChangeCallback(e)
{
  console.log(e);
  if (document.pointerLockElement === canvas ||
    document.mozPointerLockElement === canvas ||
    document.webkitPointerLockElement === canvas) {
    document.addEventListener("mousemove", handlePointerLockPos, false);
    pointerLocked = true;
  } else {
    document.removeEventListener("mousemove", handlePointerLockPos, false);
    pointerLocked = false;
  }
}

function handleMousePos(e)
{
    const pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, canvas);
    mousePos[0] = pos.x / canvas.width  *  2 - 1;
    mousePos[1] = pos.y / canvas.height * -2 + 1;
    //console.log(mousePos)
}

function handlePointerLockPos(e)
{
  mousePos[0] = e.movementX ||
      e.mozMovementX          ||
      e.webkitMovementX       ||
      0,
  mousePos[1] = e.movementY ||
      e.mozMovementY      ||
      e.webkitMovementY   ||
      0;
}

function getRelativeMousePosition(event, target) {
  //target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  var pos = getRelativeMousePosition(event, target);

  pos.x = pos.x * target.width  / target.clientWidth;
  pos.y = pos.y * target.height / target.clientHeight;

  return pos;  
}




// Game Object Manager

var GameObjectManager = function GameObjectManager()
{
  Object.defineProperty( this, 'isGameObjectManager', { value: true } );

}







// Engine

var Engine = function Engine()
{
  Object.defineProperty( this, 'isEngine', { value: true } );

  this.renderer;
  this.clock;
  this.gltfLoader;

  this.inputManager;

  this.scene;
  this.camera;
  this.sun; 
  this.ambientLight;
  this.physWorld;

  this.physTimeStep = 1.0/60.0;
  this.physMaxSubSteps = 3;
  this.physClock;

}

Engine.prototype.init =  function()
{

  this.clock = new THREE.Clock();
  this.renderer = new THREE.WebGLRenderer();
  this.gltfLoader = new THREE.GLTFLoader();
  this.imageLoader = new THREE.ImageLoader();

  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  this.physWorld = new CANNON.World();
  this.physWorld.gravity.set(0,-9.81,0);
  this.physClock = new THREE.Clock();

  this.physWorld.broadphase = new CANNON.NaiveBroadphase();

  
  this.renderer.setSize( window.innerWidth, window.innerHeight );
  this.renderer.setPixelRatio( window.devicePixelRatio );

  this.renderer.antialias = true;

  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.planesCastShadows = true
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap, PCFSoftShadowMap, VSMShadowMap

  this.renderer.outputEncoding = THREE.sRGBEncoding;
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;  // NoToneMapping, LinearToneMapping, ReinhardToneMapping, CineonToneMapping, ACESFilmicToneMapping
  this.renderer.toneMappingExposure = 3;
  this.renderer.physicallyCorrectLights = true;

  document.body.appendChild( this.renderer.domElement );
  

  console.log(this.renderer.domElement);
  this.inputManager = new ENGINE.InputManager(this.renderer.domElement);
  this.inputManager.canvas = this.renderer.domElement;
  

  this.ambientLight = new THREE.AmbientLight( 0xffffff, 0.7 );
  this.scene.add( this.ambientLight );

  this.sun = new THREE.DirectionalLight( 0xffffff, 0.7 );
  this.sun.castShadow = true;
  this.sun.position.set(50,100,50);

  this.sun.shadow.mapSize.width = 512*4;  // default
  this.sun.shadow.mapSize.height = 512*4; // default
  this.sun.shadow.camera.near = 0.5;    // default
  this.sun.shadow.camera.far = 500;     // default
  this.sun.shadow.bias = -0.0005;
  let d = 100;
  this.sun.shadow.camera.right     =  d;
  this.sun.shadow.camera.left      = -d;
  this.sun.shadow.camera.top       =  d;
  this.sun.shadow.camera.bottom    = -d;
  //sun.camera



  //this.camera.add( this.sun );
  this.scene.add( this.camera );
  this.scene.add( this.sun )

  window.addEventListener( 'resize', onWindowResize.bind(this), false );
  window.addEventListener( 'beforeunload', beforeUnload.bind(this), false );

}

Engine.prototype.run = function(callbacks)
{
  let dt = this.clock.getDelta();

  this.inputManager.update(dt);
  this.update(dt);
  if(callbacks.update)callbacks.update(dt);

  //this.physWorld.step(this.physTimeStep,this.clock.getDelta(),this.physMaxSubSteps);
  if( this.physClock.getElapsedTime() >= this.physTimeStep-0.001)
  {
    this.physClock.start();

    this.fixedUpdate(dt);
    if(callbacks.fixedUpdate)callbacks.fixedUpdate(dt);
    //physWorld.step(physTimeStep, physTimeStep, physMaxSubSteps);
    this.physWorld.step(this.physTimeStep,this.physTimeStep,this.physMaxSubSteps);
    this.lateFixedUpdate(dt)
    if(callbacks.lateFixedUpdate)callbacks.lateFixedUpdate(dt);
  }

  this.lateUpdate(dt);
  if(callbacks.lateUpdate)callbacks.lateUpdate(dt)
  this.inputManager.refresh();
  

  this.render();
  if(callbacks.render)callbacks.render(dt);
}


Engine.prototype.update = function(dt)
{
  this.physWorld.bodies.forEach(o=>{
    o.Object3D.position.copy(o.position);
    o.Object3D.quaternion.copy(o.quaternion);
  });

  this.scene.children.forEach(o=>{ o.updateWorldMatrix(true) });
}

Engine.prototype.lateUpdate = function(dt)
{
  
}

Engine.prototype.fixedUpdate = function(dt)
{
}

Engine.prototype.lateFixedUpdate = function(dt)
{
}

Engine.prototype.render = function(dt)
{
  this.renderer.render( this.scene, this.camera );
}

Engine.prototype.addBody = function(body)
{
  this.physWorld.addBody(body);
  body.Object3D = new THREE.Object3D();
  this.scene.add(body.Object3D);
}

function onWindowResize() {

  this.renderer.setSize( window.innerWidth, window.innerHeight );

  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();

}

function beforeUnload()
{
  this.renderer.dispose();
}







exports.Utility = Utility;

exports.GltfModel = GltfModel;
exports.loadGltf = loadGltf;
exports.loadImage = loadImage;
exports.loadXHR = loadXHR;
exports.geometryToHeightMatrix = geometryToHeightMatrix;
exports.heightMatrixToPhysBody = heightMatrixToPhysBody;
exports.heightFieldShapeToMesh = heightFieldShapeToMesh;
exports.geometryToHeightFieldBody = geometryToHeightFieldBody;

exports.InputManager = InputManager;
exports.Engine = Engine;



Object.defineProperty(exports, '__esModule', { value: true });

})));








let engine, inputManager, renderer;

let yaw=0.0;
let pitch=0.0;



/**
 * Runs at the beginning of the frame
 * @param {float} dt - Frame time delta
 */
function update(dt)
{

  if ( model.mixer )
  {
    model.mixer.update( dt );
  }

  var moveSpeed = 10;

  if(Math.abs(engine.inputManager.mousePosDelta[0])>1)
  yaw -= engine.inputManager.mousePosDelta[0]*0.01;
  if(Math.abs(engine.inputManager.mousePosDelta[1])>1)
  pitch += engine.inputManager.mousePosDelta[1]*0.01;
  let d=5;

  pitch = THREE.MathUtils.clamp(pitch,-Math.PI/2,Math.PI/2);
  var y = yaw/(2*Math.PI);
  y = y- ~~y;
  yaw = y*2*Math.PI;

  var f = inputManager.getHeldKey(83) - inputManager.getHeldKey(87);
  var s = inputManager.getHeldKey(68) - inputManager.getHeldKey(65);
  
  sphereBody.velocity.z = (Math.cos(yaw)*f - Math.sin(yaw)*s)*moveSpeed;
  sphereBody.velocity.x = (Math.sin(yaw)*f + Math.cos(yaw)*s)*moveSpeed;
  sphereBody.velocity.y += inputManager.getDownKey(32)*20 ;
  
  
  if( inputManager.getMouseDown(0) )
  {
      
    if(inputManager.mousePos[0] >= -1 && inputManager.mousePos[0] <= 1 &&
        inputManager.mousePos[1] >= -1 && inputManager.mousePos[1] <= 1 && !ENGINE.pointerLocked
    )
      inputManager.requestPointerLock();
  }


  

  engine.camera.position.copy(sphereBody.position);


  engine.camera.position.x += d*Math.cos(pitch)*Math.sin(yaw);
  engine.camera.position.z += d*Math.cos(pitch)*Math.cos(yaw);
  engine.camera.position.y += d*Math.sin(pitch);
  engine.camera.lookAt(sphereBody.position.x,sphereBody.position.y + 2,sphereBody.position.z);

  engine.sun.position.copy(sphereBody.position);
  engine.sun.position.x += 50;
  engine.sun.position.y += 100;
  engine.sun.position.z += 50;
  engine.sun.lookAt(sphereBody.position.x,sphereBody.position.y,sphereBody.position.z);

  

  //engine.camera.quaternion.setFromEuler( 0.0, pitch, yaw, 'ZXY');


}


let tree1;

/**
 * Runs just before rendering
 * @param {float} dt - Frame time delta
 */
function lateUpdate(dt)
{
  tree1.updateMatrix();

}

/**
 * Runs just before physics calculations
 * @param {float} dt - Frame time delta
 */
function fixedUpdate(dt)
{
  
}

/**
 * Runs just after physics calculations
 * @param {float} dt - Frame time delta
 */
function lateFixedUpdate(dt)
{
  //console.log(sphereBody.position.x, sphereBody.position.y, sphereBody.position.z);
  //console.log(sphereBody.velocity)
  //sphereBody.position.z = 0;
  //sphereBody.velocity.z = 0
  //sphereBody.quaternion.set(0,1,0,0);
  //sphereBody.inertia.set(0,0,0);
  //sphereBody.invInertia.set(0,0,0);
  
}

/**
 * Runs after main rendering
 */
function render()
{
  
}


/**
 * The main game loop. Modification is not recommended.
 */
function loop()
{
  requestAnimationFrame( loop );

  engine.run( {
    update:           update.bind(this),
    lateUpdate:       lateUpdate.bind(this),
    fixedUpdate:      fixedUpdate.bind(this),
    lateFixedUpdate:  lateFixedUpdate.bind(this),
    render:           render.bind(this)
  } );

  
}



/**
 * Game entry point
 */
async function main()
{

  engine = new ENGINE.Engine();
  engine.init();
  
  inputManager = engine.inputManager;
  engine.physWorld.gravity.set(0,-50,0);



  var groundMaterial = new CANNON.Material("groundMaterial");
  var ground_ground_cm = new CANNON.ContactMaterial(groundMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRegularizationTime: 3,
  });
  engine.physWorld.addContactMaterial(ground_ground_cm);


  var slipperyMaterial = new CANNON.Material("slipperyMaterial");
  var slippery_ground_cm = new CANNON.ContactMaterial(groundMaterial, slipperyMaterial, {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  });
  engine.physWorld.addContactMaterial(slippery_ground_cm);






  sphereBody = new CANNON.Body({
    mass: 1, // kg
    position: new CANNON.Vec3(0, 8, 0), // m
    velocity: new CANNON.Vec3(0, 0, 0),
    fixedRotation: true,
    material: slipperyMaterial
  });
  
  sphereBody.addShape( new CANNON.Cylinder(0.5,0.5,1,8),new CANNON.Vec3( 0, 0, 0), (new CANNON.Quaternion()).setFromEuler(-Math.PI/2,0,0) );
  sphereBody.addShape( new CANNON.Sphere(0.5), new CANNON.Vec3( 0, -0.5, 0),new CANNON.Quaternion(1,0,0,0) );
  sphereBody.addShape( new CANNON.Sphere(0.5), new CANNON.Vec3( 0, 0.5, 0),new CANNON.Quaternion(1,0,0,0) );
  
  sphereBody.updateMassProperties();
  engine.addBody(sphereBody);

  console.log(sphereBody)

  let cubeBody = new CANNON.Body({
    mass : 0,
    shape: new CANNON.Box(new CANNON.Vec3( 1,2,1))
  });
  cubeBody.position.y = 2;
  //cubeBody.position.x = 1;
  engine.addBody(cubeBody);

  var cube = new THREE.Mesh( new THREE.BoxGeometry( 2, 4, 2 ), new THREE.MeshStandardMaterial( {color: 0x0000ff} ) );
  cube.position.y = 2;
  cube.castShadow = true;
  cube.receiveShadow = true;
  engine.scene.add( cube );

  /*
  let groundBody = new CANNON.Body({
    mass:     0, // mass == 0 makes the body static
    material: groundMaterial
  });
  let groundShape = new CANNON.Plane();
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler( -Math.PI/2, 0, 0, 'ZXY' );
  engine.physWorld.addBody(groundBody);
  */

  


  model = await ENGINE.loadGltf(engine,'models/boxChar1.gltf');
  model.setShadows(true,true);
  model.position.y = -1;
  

  tree1 = await ENGINE.loadGltf(engine,'models/tree1.gltf');
  tree1.setShadows(true,true);
  tree1.position.set(-10,0,0)
  

  let car1 = await ENGINE.loadGltf(engine,'models/car1.gltf');
  car1.setShadows(true,true);
  car1.position.set(10,0,0);
  

  let terrain = await ENGINE.loadGltf(engine,'models/terrain1.gltf');
  terrain.setShadows(true,true);

  var hfBody, material;

  terrain.scene.traverse( o =>{
    if(o.type == 'Mesh')
    {
      hfBody = ENGINE.geometryToHeightFieldBody(o.geometry, 65, 200);
      material = o.material;
      return;
    }
  });
  

  tree1.parent = car1
  car1.parent = model
  model.parent = sphereBody.Object3D;

  //model.matrixAutoUpdate = false;
  //car1.matrixAutoUpdate = false;
  //tree1.matrixAutoUpdate  = false;
  //terrain.matrixAutoUpdate = false;
  //cube.matrixAutoUpdate = false;

  //model.matrixWorldNeedsUpdate = false

  console.log(tree1);
  

  
  engine.addBody(hfBody);
  hfBody.material = groundMaterial;
  console.log(hfBody);
  let quat = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -Math.PI / 2 );
  quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ));

  let k = -100;

  hfBody.quaternion.copy(quat);
  hfBody.position.x = k;
  hfBody.position.z = k;
  


  loop();
}













window.addEventListener( "load" , main );


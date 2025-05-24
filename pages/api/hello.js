<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>3D Stack Game</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
    body { margin: 0; overflow: hidden; background: radial-gradient(circle at bottom, #111, #000); font-family: 'Poppins', sans-serif; }
    canvas { display: block; }
    .menu, .overlay {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.7);
      color: #fff; z-index: 10;
      flex-direction: column; opacity: 1;
      transition: opacity 0.5s ease;
    }
    .menu.hidden, .overlay.hidden { opacity: 0; pointer-events: none; }
    #startMenu h1 {
      font-size: 3rem; margin-bottom: 1rem;
      text-shadow: 0 0 10px #44aaff;
    }
    button {
      padding: 12px 24px; font-size: 1.1rem;
      background: linear-gradient(45deg, #44aaff, #88ddff);
      border: none; border-radius: 8px;
      cursor: pointer; color: #000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transition: transform 0.2s;
      font-weight: 600;
    }
    button:hover { transform: scale(1.05); }
    #score, #highScore {
      position: absolute; left: 20px;
      background: rgba(0,0,0,0.5);
      padding: 8px 12px; border-radius: 6px;
      color: #fff; font-size: 1rem;
      z-index: 5; text-shadow: 0 0 5px #000;
    }
    #score { top: 20px; }
    #highScore { top: 60px; }
    #gameOverText {
      font-size: 2.5rem; margin-bottom: 1rem;
      color: #ff5555; text-shadow: 0 0 10px #ff0000;
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
  </style>
</head>
<body>
  <div class="menu" id="startMenu">
    <h1>3D Stack</h1>
    <button id="startBtn">Play</button>
  </div>
  <div class="overlay hidden" id="gameOverMenu">
    <div id="gameOverText">Game Over</div>
    <button id="restartBtn">Restart</button>
  </div>
  <div id="score"></div>
  <div id="highScore"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
let scene, camera, renderer;
let stack = [];
const fallingChunks = [];
// block thickness
const boxHeight = 0.5;
const originalSize = 3;
// slow base speed
const baseSpeed = 0.02;
let currentSpeed = baseSpeed;
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let targetCamY;
let gameStarted = false;
// physics
const gravity = -0.001;
const boundary = 6;
const orbitRadius = 8;
let orbitAngle = 0;

// UI elements
const startMenu = document.getElementById('startMenu');
const gameOverMenu = document.getElementById('gameOverMenu');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

startBtn.addEventListener('click', () => { startMenu.classList.add('hidden'); gameStarted = true; init(); });
restartBtn.addEventListener('click', () => location.reload());

function init() {
  // scene & camera
  scene = new THREE.Scene();
  const w = window.innerWidth, h = window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 200);
  camera.position.set(Math.cos(orbitAngle)*orbitRadius, 6, Math.sin(orbitAngle)*orbitRadius);
  targetCamY = camera.position.y;

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 20, 10);
  dir.castShadow = true;
  dir.shadow.camera.top = dir.shadow.camera.right = 10;
  scene.add(dir);

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100,100),
    new THREE.MeshPhongMaterial({ color: 0x111111 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);
  // grid
  const grid = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
  scene.add(grid);

  // reset
  stack = [];
  fallingChunks.length = 0;
  score = 0;
  currentSpeed = baseSpeed;

  // initial layers
  addLayer(0, 0, originalSize, originalSize);
  addLayer(0, 0, originalSize, originalSize, stack.length % 2 ? 'z' : 'x');

  updateScore();
  window.addEventListener('click', place);
  renderer.setAnimationLoop(animate);
}

function addLayer(x, z, width, depth, dir) {
  const y = boxHeight * stack.length;
  const geom = new THREE.BoxGeometry(width, boxHeight, depth);
  const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(`hsl(${(stack.length*25)%360},60%,55%)`) });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(x,y,z);
  mesh.castShadow = true;
  scene.add(mesh);
  stack.push({ mesh, x, z, width, depth, dir });

  currentSpeed = baseSpeed + score * 0.002;
  targetCamY = y + 6;
}

function createChunk(over, top, prev) {
  const geom = new THREE.BoxGeometry(
    top.dir==='x'?over:top.width,
    boxHeight,
    top.dir==='z'?over:top.depth
  );
  const chunk = new THREE.Mesh(geom, top.mesh.material.clone());
  chunk.castShadow = true;
  let xPos=top.x, zPos=top.z;
  if(top.dir==='x'){
    const sign=(top.x-prev.x)>0?1:-1;
    xPos=top.x+sign*((top.width-over)/2+over/2);
  } else {
    const sign=(top.z-prev.z)>0?1:-1;
    zPos=top.z+sign*((top.depth-over)/2+over/2);
  }
  chunk.position.set(xPos, top.mesh.position.y, zPos);
  scene.add(chunk);
  fallingChunks.push({ mesh:chunk, velocity:new THREE.Vector3(0,0,0), birth:performance.now() });
}

function animate() {
  if(!gameStarted) return;

  // moving block
  const top = stack[stack.length-1];
  if(top.dir){
    if(top.dir==='x') top.x += currentSpeed;
    else top.z += currentSpeed;
    top.mesh.position.set(top.x, top.mesh.position.y, top.z);
    if(Math.abs(top.x)>boundary||Math.abs(top.z)>boundary) currentSpeed=-currentSpeed;
  }

  // falling chunks
  const now=performance.now();
  for(let i=fallingChunks.length-1;i>=0;i--){
    const obj=fallingChunks[i];
    obj.velocity.y+=gravity;
    obj.mesh.position.add(obj.velocity);
    if(now-obj.birth>3000){ scene.remove(obj.mesh); fallingChunks.splice(i,1); }
  }

  // camera orbit & follow
  orbitAngle+=0.002;
  camera.position.x=Math.cos(orbitAngle)*orbitRadius;
  camera.position.z=Math.sin(orbitAngle)*orbitRadius;
  camera.position.y+=(targetCamY-camera.position.y)*0.05;
  camera.lookAt(0, stack.length*boxHeight/2, 0);

  renderer.render(scene, camera);
}

function place(){
  if(!gameStarted) return;
  const top=stack[stack.length-1], prev=stack[stack.length-2];
  let delta=top.dir==='x'?top.x-prev.x:top.z-prev.z;
  let over=Math.abs(delta);
  const dim=top.dir==='x'?top.width:top.depth;
  // aim assist
  const threshold=dim*0.1;
  if(over<threshold){ over=0; if(top.dir==='x'){ top.x=prev.x; top.mesh.position.x=top.x; } else { top.z=prev.z; top.mesh.position.z=top.z; } delta=0; }
  if(over>=dim) return endGame();
  if(over>0) createChunk(over, top, prev);

  const size=dim-over;
  const newW=top.dir==='x'?size:top.width;
  const newD=top.dir==='z'?size:top.depth;
  const newX=top.dir==='x'?top.x-delta/2:top.x;
  const newZ=top.dir==='z'?top.z-delta/2:top.z;

  top.mesh.scale[top.dir]=size/dim;
  top.mesh.position.set(newX, top.mesh.position.y, newZ);

  score++; updateScore();
  addLayer(newX,newZ,newW,newD, top.dir==='x'?'z':'x');
}

function updateScore(){
  document.getElementById('score').innerText=`Score: ${score}`;
  document.getElementById('highScore').innerText=`High Score: ${highScore}`;
}

function endGame(){
  gameStarted=false;
  window.removeEventListener('click',place);
  renderer.setAnimationLoop(null);
  if(score>highScore){ highScore=score; localStorage.setItem('highScore', highScore);} updateScore();
  gameOverMenu.classList.remove('hidden');
}
</script>
</body>
</html>

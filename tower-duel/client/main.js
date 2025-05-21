import { computeWobble, applyWobble } from './physics.js';
import { joinRoom, sendSlice, onWobble } from './network.js';

let scene1, scene2, cam1, cam2, rend;
let stack1=[], stack2=[], gameStarted=false;

function init() {
  rend = new THREE.WebGLRenderer({ antialias:true });
  rend.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(rend.domElement);
  // set up two scenes/cameras...
  // build towers, input handlers, UI, etc.
  onWobble(p => applyWobble(scene2, computeWobble(p)));
  animate();
}

function place(sliceScene, stack, room) {
  // calculate precision...
  sendSlice(room, precision);
  // update your own tower...
}

function animate() {
  if(gameStarted) {
    // rotate cams, update falling chunks...
    rend.clear();
    rend.render(scene1, cam1);
    rend.clearDepth();
    rend.render(scene2, cam2);
  }
  requestAnimationFrame(animate);
}

window.onload = () => {
  joinRoom('room1');
  init();
  // bind click to place(...) per side
};

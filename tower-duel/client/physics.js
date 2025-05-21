// calculate wobble impulse based on cut precision
export function computeWobble(precision) {
  // precision ∈ [0,1], 1=perfect
  const maxAngle = 0.2; // radians
  return (1 - precision) * maxAngle;
}

// apply oscillation to a tower object
export function applyWobble(tower, impulse) {
  tower.children.forEach(block => {
    block.rotation.z += impulse;
    // TODO: add damped oscillation over time
  });
}

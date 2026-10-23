/**
 * Plays every move back to back with cross-fades: /dev/reel.html?c=hero. Real time by default;
 * scripts/record.mjs drives it frame by frame through window.__step to make a video.
 */
import '@fontsource/fredoka/700.css';
import { heroClips } from '../puppet/clips/hero';
import { Animator2D } from '../puppet/animator';
import { loadPuppet } from '../puppet/loader';
import { Puppet } from '../puppet/puppet';
import { Shadow } from '../stage/shadow';
import { createStage2D } from '../stage/stage2d';

const REEL: [string, string, number][] = [
  ['idle', 'Idle', 2.6],
  ['walk', 'Walk', 1.8],
  ['run', 'Run', 1.5],
  ['shoot', 'Shoot', 1.1],
  ['shoot', 'Shoot', 1.1],
  ['rapid', 'Rapid fire', 1.5],
  ['dodge', 'Dodge', 0.7],
  ['hit', 'Hit', 0.7],
  ['cast', 'Call a friend', 1.1],
  ['cheer', 'Cheer', 1.5],
  ['ko', 'Knocked out', 2.0],
  ['idle', 'Idle', 1.0],
];

const host = document.getElementById('stage')!;
const label = document.getElementById('label')!;
const stage = createStage2D(host);
const puppet = new Puppet(await loadPuppet('hero', stage.renderer));
const size = (stage.height * 0.74) / 1450;
const ground = -stage.height * 0.42;
puppet.size = size;
puppet.root.position.set(-stage.width * 0.08, ground, 0);
const shadow = new Shadow(520 * size);
stage.scene.add(shadow.mesh, puppet.root);

const animator = new Animator2D(heroClips);
let step = -1;
let left = 0;
let time = 0;

function advance(dt: number) {
  time += dt;
  left -= dt;
  if (left <= 0) {
    step = (step + 1) % REEL.length;
    const [name, title, seconds] = REEL[step];
    const loop = heroClips.find((c) => c.name === name)!.loop;
    animator.play(name, { fade: 0.18, once: !loop });
    label.textContent = title;
    left += seconds;
  }
  puppet.setPose(animator.update(dt));
  puppet.update(dt);
  const lift = Math.max(0, puppet.skeleton.joint('hips')[1] - 550) * size;
  shadow.place(puppet.root.position.x, ground, lift);
  stage.render();
}

const length = REEL.reduce((s, [, , seconds]) => s + seconds, 0);
let last = performance.now();
let manual = false;
function frame(now: number) {
  if (!manual) advance(Math.min(0.05, (now - last) / 1000));
  last = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
Object.assign(window, {
  __ready: true,
  __length: length,
  __step: (dt: number) => {
    if (!manual) {
      manual = true;
      step = -1;
      left = 0;
      time = 0;
    }
    advance(dt);
  },
});

/**
 * Renderiza o Cavaleiro (knight.glb + espada + escudo, do peito para cima) em 1024×1024
 * com fundo transparente. Usado por scripts/render-icon.mjs → assets/knight-render.png.
 * Abrir via servidor do Vite: /tools/render-icon.html
 */
import * as THREE from 'three';
import { Assets } from '../src/scene/Assets';
import { Actor } from '../src/scene/Actor';

const SIZE = 1024;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff', '#6a7aa0', 1.9));
const key = new THREE.DirectionalLight('#ffffff', 2.2);
key.position.set(2, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight('#9fd0ff', 1.6);
rim.position.set(-3, 3, -3);
scene.add(rim);

const assets = new Assets();
await assets.loadAll(() => {});
const knight = new Actor(assets, 'knight', 1.7);
knight.attachWeapon('knightSword', 'right');
knight.attachWeapon('knightShield', 'left');
knight.root.rotation.y = 0.35;
scene.add(knight.root);
knight.idle();
// Pose do idle ~0,4 s, com a espada erguida pelo braço (mesma rotação do ataque).
knight.update(0.4);
const arm = knight.getBone(['upperarm.r', 'upperarmr']);
if (arm) arm.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.5));
knight.root.updateMatrixWorld(true);

// Enquadramento do peito para cima.
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0.25, 1.42, 3.9);
camera.lookAt(0, 1.12, 0);
renderer.render(scene, camera);
(window as unknown as { __done: boolean }).__done = true;

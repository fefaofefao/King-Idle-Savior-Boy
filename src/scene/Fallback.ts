import * as THREE from 'three';
import type { ModelKey, WeaponKey } from '../config/visual';

/**
 * Bonecos low-poly feitos com formas primitivas, no mesmo estilo chibi do KayKit.
 * Usados quando um GLB não carrega. Têm "ossos" falsos (grupos nomeados) para as armas
 * (handslot.r / handslot.l) e para o ataque procedural (upperarm.r).
 */

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, flatShading: true, ...extra });

interface Palette {
  body: string;
  head: string;
  limbs: string;
  accent: string;
  eyes: string;
  skull?: boolean;
  hat?: 'wizard' | 'helmet' | 'hood' | 'horns' | null;
}

const PALETTES: Partial<Record<ModelKey, Palette>> = {
  knight: { body: '#3f6fd8', head: '#f2c9a0', limbs: '#b9c3d1', accent: '#ffd54a', eyes: '#222', hat: 'helmet' },
  mage: { body: '#7b4fd6', head: '#f2c9a0', limbs: '#5a3aa8', accent: '#ffd54a', eyes: '#222', hat: 'wizard' },
  skeletonMinion: { body: '#e8e4d6', head: '#f2efe4', limbs: '#e0dccd', accent: '#7a6a55', eyes: '#1a1a1a', skull: true, hat: null },
  skeletonRogue: { body: '#4b4b5a', head: '#f2efe4', limbs: '#e0dccd', accent: '#2c2c38', eyes: '#1a1a1a', skull: true, hat: 'hood' },
  skeletonMage: { body: '#3b5f7a', head: '#f2efe4', limbs: '#e0dccd', accent: '#62d0ff', eyes: '#1a1a1a', skull: true, hat: 'wizard' },
  skeletonWarrior: { body: '#5b4636', head: '#f2efe4', limbs: '#e0dccd', accent: '#9aa3ad', eyes: '#1a1a1a', skull: true, hat: 'horns' },
};

export function buildFallbackCharacter(key: ModelKey): THREE.Object3D {
  const p = PALETTES[key] ?? PALETTES.skeletonMinion!;
  const root = new THREE.Group();
  root.name = `fallback_${key}`;
  root.userData.fallback = true;

  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);

  // Pernas
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.36, 6), mat(p.limbs));
    leg.position.set(side * 0.12, 0.18, 0);
    body.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.22), mat(p.accent));
    foot.position.set(side * 0.12, 0.04, 0.03);
    body.add(foot);
  }
  // Tronco
  const torso = new THREE.Mesh(
    p.skull ? new THREE.CylinderGeometry(0.2, 0.17, 0.42, 7) : new THREE.CylinderGeometry(0.25, 0.28, 0.46, 8),
    mat(p.body),
  );
  torso.position.y = 0.58;
  body.add(torso);
  if (p.skull) {
    // Costelas
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 10), mat(p.head));
      rib.rotation.x = Math.PI / 2;
      rib.position.y = 0.5 + i * 0.1;
      body.add(rib);
    }
  }
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 8), mat(p.accent));
  belt.position.y = 0.4;
  if (!p.skull) body.add(belt);

  // Cabeça (grande, estilo chibi)
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 1.08;
  body.add(head);
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 1), mat(p.head));
  head.add(skull);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      p.skull ? new THREE.SphereGeometry(0.075, 6, 5) : new THREE.SphereGeometry(0.045, 6, 5),
      mat(p.eyes, { roughness: 0.3 }),
    );
    eye.position.set(side * 0.12, 0.02, 0.28);
    head.add(eye);
  }
  if (p.skull) {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.18), mat(p.head));
    jaw.position.set(0, -0.26, 0.1);
    head.add(jaw);
  }
  if (p.hat === 'helmet') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#c9d2de', { metalness: 0.5, roughness: 0.4 }));
    helm.position.y = 0.02;
    head.add(helm);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 5), mat('#e04848'));
    plume.position.set(0, 0.42, -0.05);
    head.add(plume);
  } else if (p.hat === 'wizard') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 10), mat(p.body));
    brim.position.y = 0.2;
    head.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), mat(p.body));
    cone.position.set(0, 0.5, -0.04);
    cone.rotation.x = -0.15;
    head.add(cone);
  } else if (p.hat === 'hood') {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(p.body));
    hood.position.set(0, 0.02, -0.04);
    head.add(hood);
  } else if (p.hat === 'horns') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(p.accent, { metalness: 0.6, roughness: 0.35 }));
    head.add(helm);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), mat('#f4ead2'));
      horn.position.set(side * 0.34, 0.2, 0);
      horn.rotation.z = -side * 0.9;
      head.add(horn);
    }
  }

  // Braços com pivô no ombro (ossos falsos)
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.name = side > 0 ? 'upperarm.r' : 'upperarm.l';
    // O lado "direito" do personagem fica em -x quando ele olha para +z.
    shoulder.position.set(-side * 0.3, 0.76, 0);
    body.add(shoulder);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.36, 6), mat(p.skull ? p.limbs : p.body));
    arm.position.y = -0.17;
    shoulder.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(p.skull ? p.head : p.head));
    hand.position.y = -0.37;
    shoulder.add(hand);
    const slot = new THREE.Group();
    slot.name = side > 0 ? 'handslot.r' : 'handslot.l';
    slot.position.set(0, -0.38, 0.04);
    slot.rotation.x = Math.PI / 2;
    shoulder.add(slot);
    shoulder.rotation.z = -side * -0.12;
  }

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  return root;
}

export function buildFallbackWeapon(key: WeaponKey): THREE.Object3D {
  const g = new THREE.Group();
  g.name = `fallback_${key}`;
  const metal = mat('#d5dde6', { metalness: 0.6, roughness: 0.3 });
  const wood = mat('#8a5a35');
  const gold = mat('#f2c14e', { metalness: 0.5, roughness: 0.35 });
  const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  switch (key) {
    case 'knightSword':
    case 'skeletonBlade':
    case 'skeletonDagger': {
      const len = key === 'skeletonDagger' ? 0.32 : 0.62;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.07, len, 0.025), key === 'skeletonBlade' ? mat('#9aa0a6', { metalness: 0.4 }) : metal), 0, len / 2 + 0.1, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), gold), 0, 0.1, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 5), wood), 0, 0.02, 0);
      break;
    }
    case 'knightShield':
    case 'skeletonShield': {
      const s = add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10), key === 'knightShield' ? mat('#3f6fd8') : wood), 0, 0, 0);
      s.rotation.x = Math.PI / 2;
      const boss = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), gold), 0, 0, 0.04);
      boss.scale.z = 0.6;
      g.rotation.y = Math.PI / 2;
      break;
    }
    case 'mageStaff':
    case 'skeletonStaff': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.95, 5), wood), 0, 0.3, 0);
      add(
        new THREE.Mesh(
          new THREE.OctahedronGeometry(0.1),
          mat(key === 'mageStaff' ? '#b98bff' : '#62d0ff', { emissive: key === 'mageStaff' ? '#6a2cff' : '#1a8fff', emissiveIntensity: 0.8 }),
        ),
        0,
        0.85,
        0,
      );
      break;
    }
    case 'skeletonAxe': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 5), wood), 0, 0.35, 0);
      const head = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 3, 1, false, 0, Math.PI), metal), 0.02, 0.72, 0);
      head.rotation.x = Math.PI / 2;
      break;
    }
  }
  return g;
}

/** Sombra circular falsa (sem shadow maps). */
let shadowTex: THREE.Texture | null = null;
export function fakeShadow(radius: number): THREE.Mesh {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  m.renderOrder = 1;
  return m;
}

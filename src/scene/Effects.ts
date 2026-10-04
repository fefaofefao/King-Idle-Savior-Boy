import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: number;
  gravity: number;
}

/** Partículas simples com pool (sem alocação durante o jogo). */
export class Particles {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

  constructor(scene: THREE.Scene, size = 120) {
    for (let i = 0; i < size; i++) {
      const mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true }));
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 1, spin: 0, gravity: 0 });
    }
  }

  burst(at: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed = 2.5, gravity = 6, scale = 1): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool.pop();
      if (!p) return;
      p.mesh.visible = true;
      p.mesh.position.copy(at);
      p.mesh.scale.setScalar(scale * (0.6 + Math.random() * 0.8));
      (p.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      p.vel.set((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.3, (Math.random() - 0.5) * 2).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.5;
      p.spin = (Math.random() - 0.5) * 12;
      p.gravity = gravity;
      this.active.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.03) {
        p.mesh.position.y = 0.03;
        p.vel.multiplyScalar(0.5);
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.y += p.spin * dt;
      const k = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k * k;
      if (k >= 1) {
        p.mesh.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }
  }
}

/** Projétil mágico em arco do Mago até o inimigo. */
export class Projectiles {
  private items: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number }[] = [];
  private geo = new THREE.IcosahedronGeometry(0.11, 1);

  constructor(
    private scene: THREE.Scene,
    private particles: Particles,
  ) {}

  fire(from: THREE.Vector3, to: THREE.Vector3, dur = 0.35): void {
    const mesh = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({ color: '#c89bff', transparent: true, opacity: 0.95 }),
    );
    const glow = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({ color: '#7a3cff', transparent: true, opacity: 0.35, depthWrite: false }),
    );
    glow.scale.setScalar(2);
    mesh.add(glow);
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.items.push({ mesh, from: from.clone(), to: to.clone(), t: 0, dur });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = Math.min(1, it.t / it.dur);
      it.mesh.position.lerpVectors(it.from, it.to, k);
      it.mesh.position.y += Math.sin(k * Math.PI) * 0.6;
      it.mesh.rotation.y += dt * 10;
      if (Math.random() < 0.6) this.particles.burst(it.mesh.position, '#b48cff', 1, 0.3, 0, 0.6);
      if (k >= 1) {
        this.particles.burst(it.to, '#c9a4ff', 8, 2, 3, 0.8);
        it.mesh.removeFromParent();
        (it.mesh.material as THREE.Material).dispose();
        this.items.splice(i, 1);
      }
    }
  }
}

/** Aura pulsante do chefe. */
export function bossAura(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 32),
    new THREE.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.name = 'ring';
  g.add(ring);
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.85, 1.9, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  column.position.y = 0.95;
  column.name = 'column';
  g.add(column);
  return g;
}

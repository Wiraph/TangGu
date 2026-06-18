import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ConcreteScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.2, 8);

    const grid = new THREE.GridHelper(10, 10, 0x8f8f89, 0xd8d6cf);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(2.2, -0.4, -3.4);
    scene.add(grid);

    const group = new THREE.Group();
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x5f5f5a,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const accentMaterial = new THREE.MeshBasicMaterial({
      color: 0xf05a28,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });

    for (let index = 0; index < 4; index += 1) {
      const geometry = new THREE.TorusGeometry(0.58 + index * 0.06, 0.025, 8, 42);
      const mesh = new THREE.Mesh(geometry, index === 2 ? accentMaterial : lineMaterial);
      mesh.position.set(index * 0.72 + 0.2, Math.sin(index) * 0.24 - 0.22, -index * 0.22);
      mesh.rotation.set(Math.PI / 2.5, index * 0.16, index * 0.08);
      group.add(mesh);
    }

    const barMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      wireframe: true,
      transparent: true,
      opacity: 0.07,
    });

    for (let index = 0; index < 5; index += 1) {
      const geometry = new THREE.BoxGeometry(0.32, 0.55 + index * 0.22, 0.32);
      const mesh = new THREE.Mesh(geometry, barMaterial);
      mesh.position.set(index * 0.48 + 0.2, -1.45 + index * 0.12, -1.2);
      group.add(mesh);
    }

    group.position.set(1.8, 0.1, 0);

    scene.add(group);

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resize);
    let animationId = 0;

    const animate = () => {
      group.rotation.x += prefersReducedMotion ? 0 : 0.00025;
      group.rotation.y += prefersReducedMotion ? 0 : 0.00045;
      grid.position.x = 2.2 + Math.sin(Date.now() * 0.00016) * 0.06;
      renderer.render(scene, camera);
      if (!document.hidden && !prefersReducedMotion) {
        animationId = requestAnimationFrame(animate);
      } else {
        animationId = 0;
      }
    };

    animate();

    const handleVisibility = () => {
      if (!document.hidden && !animationId && !prefersReducedMotion) {
        animate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      renderer.dispose();
      lineMaterial.dispose();
      accentMaterial.dispose();
      barMaterial.dispose();
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 z-0 opacity-30 mix-blend-multiply" />;
}

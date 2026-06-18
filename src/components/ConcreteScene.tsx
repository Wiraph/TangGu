import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ConcreteScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.2, 8);

    const grid = new THREE.GridHelper(13, 13, 0x8f8f89, 0xb6b4ad);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -2.9;
    scene.add(grid);

    const group = new THREE.Group();
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x5f5f5a,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const accentMaterial = new THREE.MeshBasicMaterial({
      color: 0xf05a28,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });

    for (let index = 0; index < 7; index += 1) {
      const geometry = new THREE.TorusGeometry(0.58 + index * 0.06, 0.025, 8, 42);
      const mesh = new THREE.Mesh(geometry, index === 2 ? accentMaterial : lineMaterial);
      mesh.position.set(index * 0.82 - 2.45, Math.sin(index) * 0.35 - 0.2, -index * 0.22);
      mesh.rotation.set(Math.PI / 2.5, index * 0.16, index * 0.08);
      group.add(mesh);
    }

    const barMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      wireframe: true,
      transparent: true,
      opacity: 0.11,
    });

    for (let index = 0; index < 6; index += 1) {
      const geometry = new THREE.BoxGeometry(0.32, 0.55 + index * 0.22, 0.32);
      const mesh = new THREE.Mesh(geometry, barMaterial);
      mesh.position.set(index * 0.48 - 1.2, -1.45 + index * 0.12, -1.2);
      group.add(mesh);
    }

    scene.add(group);

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resize);
    let animationId = 0;

    const animate = () => {
      group.rotation.x += 0.0006;
      group.rotation.y += 0.001;
      grid.position.x = Math.sin(Date.now() * 0.00025) * 0.12;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
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

  return <div ref={mountRef} className="pointer-events-none fixed inset-0 z-0 opacity-55 mix-blend-multiply" />;
}

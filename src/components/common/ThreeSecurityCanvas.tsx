/**
 * ThreeSecurityCanvas.tsx
 *
 * High-end interactive 3D WebGL security shield visualization using Three.js.
 * Renders an animated faceted icosahedron / shield core with glowing wireframe
 * orbit rings and orbiting ambient particle nodes.
 *
 * Visual Aesthetics:
 *   - Skeuomorphic glass/emerald material with specular highlights.
 *   - Smooth dynamic rotational inertia.
 *   - High-performance requestAnimationFrame loop with resource disposal on unmount.
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface ThreeSecurityCanvasProps {
  readonly size?: number;
  readonly className?: string;
  readonly active?: boolean;
}

/**
 * ThreeSecurityCanvas
 *
 * Renders an interactive 3D security node via WebGL.
 *
 * @param  size       - Width and height in pixels (default 80).
 * @param  className  - Optional container CSS classes.
 * @param  active     - If true, particle pulse is accelerated.
 */
export function ThreeSecurityCanvas({
  size = 84,
  className = '',
  active = true,
}: ThreeSecurityCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    /* === Scene Setup === */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4.2;

    /* WebGL Renderer with alpha transparency and antialiasing */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    /* === Lighting === */
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0x00A884, 2.5);
    directionalLight1.position.set(3, 4, 3);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x25D366, 1.8);
    directionalLight2.position.set(-3, -2, -2);
    scene.add(directionalLight2);

    /* === Central Faceted Icosahedron (Security Core) === */
    const coreGeometry = new THREE.IcosahedronGeometry(1.1, 0);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x008069,
      emissive: 0x004D40,
      specular: 0x6EE7B7,
      shininess: 90,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    /* === Outer Wireframe Halo === */
    const wireframeGeometry = new THREE.IcosahedronGeometry(1.35, 1);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00A884,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframeMesh);

    /* === Orbiting Ring === */
    const torusGeometry = new THREE.TorusGeometry(1.6, 0.03, 8, 36);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0x10B981,
      transparent: true,
      opacity: 0.45,
    });
    const ringMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    scene.add(ringMesh);

    /* === Orbiting Particles === */
    const particleCount = 24;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const radius = 1.6 + Math.sin(i * 3) * 0.2;
      particlePositions[i * 3]     = Math.cos(theta) * radius;
      particlePositions[i * 3 + 1] = Math.sin(theta) * radius * 0.4;
      particlePositions[i * 3 + 2] = Math.sin(theta) * radius * 0.8;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x008069,
      size: 0.09,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    /* === Animation Loop === */
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const speedMultiplier = active ? 1.0 : 0.4;

      /* Smooth continuous rotation */
      coreMesh.rotation.x = elapsedTime * 0.4 * speedMultiplier;
      coreMesh.rotation.y = elapsedTime * 0.6 * speedMultiplier;

      wireframeMesh.rotation.x = -elapsedTime * 0.25 * speedMultiplier;
      wireframeMesh.rotation.y = -elapsedTime * 0.35 * speedMultiplier;

      ringMesh.rotation.z = elapsedTime * 0.5 * speedMultiplier;
      particles.rotation.y = elapsedTime * 0.3 * speedMultiplier;

      /* Gentle floating breathing scale */
      const scale = 1 + Math.sin(elapsedTime * 2) * 0.04;
      coreMesh.scale.set(scale, scale, scale);

      renderer.render(scene, camera);
    };

    animate();

    /* === Cleanup on Unmount === */
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      coreGeometry.dispose();
      coreMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      torusGeometry.dispose();
      torusMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [size, active]);

  return (
    <div
      ref={mountRef}
      className={`inline-flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

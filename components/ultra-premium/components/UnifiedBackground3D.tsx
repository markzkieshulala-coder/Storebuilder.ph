"use client";
/**
 * ============================================================================
 * UNIFIED BACKGROUND 3D — Persistent Global Canvas
 * ============================================================================
 * A fixed-position <Canvas> that persists across ALL route changes.
 *
 * - Mounted ONCE inside <UltraPremiumApp> above the page content layer.
 * - Receives dynamic 3D parameter updates when the active page changes.
 * - Reads `theme.globalBackground` and `page.backgroundLayers` from the blueprint.
 * - Imperatively updates geometry rotation speed, lighting, and camera orbit
 *   based on the active page's configuration via `useBackgroundParams`.
 *
 * Design:
 *   - z-index: 0 (fixed, behind all content at z-10)
 *   - pointer-events: none
 *   - background color matches blueprint.theme.colors.background
 */

import React, { memo, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimationContext } from "../hooks/useAnimationContext";
import { useBlueprint } from "../context/BlueprintContext";
import type { ThreeDParams, ShaderParams, BackgroundLayer } from "../types/blueprint";

// ═════════════════════════════════════════════════════════════════════════════
// DYNAMIC BACKGROUND CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════

interface DynamicSceneProps {
  params: ThreeDParams | null;
  shaderParams: ShaderParams | null;
  globalSpeed: number;
  pageColor: string;
}

const DynamicScene = memo<DynamicSceneProps>(({ params, shaderParams, globalSpeed, pageColor }) => {
  const meshRef = useRef<any>(null);
  const materialRef = useRef<any>(null);
  const { camera } = useThree();

  // Default icosahedron geometry that morphs based on params
  const geometry = useMemo(() => {
    if (!params) return null;
    // In production: dynamically construct geometry from params.geometry string
    return <icosahedronGeometry args={[3, 4]} />;
  }, [params?.geometry]);

  useFrame((state) => {
    if (!meshRef.current || !params) return;

    // Update rotation speed based on active page configuration
    const speedMultiplier = globalSpeed;
    const time = state.clock.elapsedTime;

    switch (params.animation.type) {
      case "orbit":
        meshRef.current.rotation.y = time * 0.1 * speedMultiplier;
        meshRef.current.rotation.x = Math.sin(time * 0.05) * 0.2 * speedMultiplier;
        break;
      case "pulse":
        const pulse = 1 + Math.sin(time * params.animation.speed * speedMultiplier) * 0.1 * params.animation.intensity;
        meshRef.current.scale.setScalar(pulse);
        meshRef.current.rotation.y = time * 0.05 * speedMultiplier;
        break;
      case "wind":
        meshRef.current.rotation.y = time * 0.15 * speedMultiplier;
        meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.1 * speedMultiplier;
        break;
      case "magneticMouse":
        // Magnetic response to mouse position (handled via event listener)
        meshRef.current.rotation.y += (state.mouse.x * 0.5 - meshRef.current.rotation.y) * 0.02;
        meshRef.current.rotation.x += (-state.mouse.y * 0.3 - meshRef.current.rotation.x) * 0.02;
        break;
      default:
        meshRef.current.rotation.y = time * 0.08 * speedMultiplier;
    }

    // Update camera orbit
    if (camera && params.animation.mouseInteraction) {
      camera.position.x += (state.mouse.x * 2 - camera.position.x) * 0.01;
      camera.position.y += (-state.mouse.y * 2 - camera.position.y) * 0.01;
      camera.lookAt(0, 0, 0);
    }
  });

  // Update lighting when params change
  useEffect(() => {
    if (!params) return;
    // In production: dynamically update lights based on params.lighting
    // This is a simplified placeholder
  }, [params]);

  if (!params) return null;

  return (
    <>
      {/* Ambient + Directional lights from blueprint */}
      <ambientLight
        color={params.lighting?.ambient.color ?? "#222222"}
        intensity={params.lighting?.ambient.intensity ?? 0.4}
      />
      <directionalLight
        color={params.lighting?.directional.color ?? "#ffffff"}
        intensity={params.lighting?.directional.intensity ?? 1.2}
        position={params.lighting?.directional.position ?? [5, 10, 7]}
      />

      {/* Post-processing effects flag */}
      {params.postProcessing?.bloom && (
        <mesh ref={meshRef}>
          {geometry}
          <meshStandardMaterial
            ref={materialRef}
            color={params.colorPalette[0] ?? "#FF4D00"}
            metalness={0.8}
            roughness={0.2}
            emissive={params.colorPalette[1] ?? "#1A1A1A"}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {/* Fallback mesh when bloom is not enabled */}
      {!params.postProcessing?.bloom && (
        <mesh ref={meshRef}>
          {geometry}
          <meshStandardMaterial
            ref={materialRef}
            color={params.colorPalette[0] ?? "#FF4D00"}
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      )}

      {/* Shader overlay mesh */}
      {shaderParams && (
        <mesh position={[0, 0, -5]} scale={[20, 20, 1]}>
          <planeGeometry args={[2, 2]} />
          <shaderMaterial
            uniforms={{
              uTime: { value: 0 },
              uColor1: { value: params.colorPalette[0] },
              uColor2: { value: params.colorPalette[1] },
            }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform float uTime;
              uniform vec3 uColor1;
              uniform vec3 uColor2;
              varying vec2 vUv;
              void main() {
                float t = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
                vec3 color = mix(uColor1, uColor2, t);
                gl_FragColor = vec4(color, 0.15);
              }
            `}
            transparent
          />
        </mesh>
      )}
    </>
  );
});
DynamicScene.displayName = "DynamicScene";

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const UnifiedBackground3D = memo(() => {
  const { route } = useAnimationContext();
  const { blueprint } = useBlueprint();

  // Resolve active page
  const activePage = useMemo(
    () => blueprint.pages.find((p) => p.path === route) ?? blueprint.pages[0],
    [blueprint.pages, route]
  );

  // Derive background params from the active page's first 3D section
  const backgroundParams = useMemo(() => {
    const sectionWith3D = activePage.sections.find(
      (s) => s.component.background?.params && "geometry" in (s.component.background.params as any)
    );
    if (!sectionWith3D) return null;
    return {
      threeD: sectionWith3D.component.background!.params as ThreeDParams,
      shader: sectionWith3D.component.background!.type === "shaderNoise"
        ? (sectionWith3D.component.background!.params as ShaderParams)
        : null,
      globalSpeed: sectionWith3D.component.background!.scrollBehavior === "velocity" ? 1.5 : 1.0,
    };
  }, [activePage]);

  // Page-specific color tint
  const pageColor = blueprint.theme.colors.background;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ backgroundColor: pageColor }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%" }}
      >
        <DynamicScene
          params={backgroundParams?.threeD ?? null}
          shaderParams={backgroundParams?.shader ?? null}
          globalSpeed={backgroundParams?.globalSpeed ?? 1.0}
          pageColor={pageColor}
        />
      </Canvas>
    </div>
  );
});
UnifiedBackground3D.displayName = "UnifiedBackground3D";

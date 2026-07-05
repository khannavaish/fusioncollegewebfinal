import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

/**
 * FusionCore — legacy component kept for compatibility.
 * The main 3D scene is now handled directly inside App.jsx (FusionCanvas).
 * This component renders nothing to avoid duplicating the scene.
 */
const FusionCore = () => null;

export default FusionCore;

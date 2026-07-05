import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ─── LOGO (inline SVG path to actual logo image) ──────────────────────────────
const LOGO_SRC = '/logo.png'; // place logo.png in /public

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const Icon = {
  // Heroicons outline
  Microscope: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611L15 21l-3-.375L9 21l-3.165-.375c-1.717-.293-2.3-2.379-1.067-3.61L5 15.5"/>
    </svg>
  ),
  Gear: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  ),
  Computer: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 7.409A2.25 2.25 0 012.25 5.493V5.25"/>
    </svg>
  ),
  Calendar: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
    </svg>
  ),
  Clock: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  BadgeCheck: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.503 3.754 3.745 3.745 0 01-3.754.503A3.736 3.736 0 0112 21a3.736 3.736 0 01-3.15-1.675 3.745 3.745 0 01-3.754-.503 3.745 3.745 0 01-.503-3.754A3.736 3.736 0 013 12a3.736 3.736 0 011.675-3.15 3.745 3.745 0 01.503-3.754 3.745 3.745 0 013.754-.503A3.736 3.736 0 0112 3a3.736 3.736 0 013.15 1.675 3.745 3.745 0 013.754.503 3.745 3.745 0 01.503 3.754A3.736 3.736 0 0121 12z"/>
    </svg>
  ),
  Sparkles: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
    </svg>
  ),
  News: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"/>
    </svg>
  ),
  Book: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
    </svg>
  ),
  Chart: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
  Bell: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
    </svg>
  ),
  Chat: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
    </svg>
  ),
  MapPin: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
    </svg>
  ),
  Phone: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
    </svg>
  ),
  GlobalAlt: () => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3.284 14.253A8.959 8.959 0 013 12c0-1.596.412-3.097 1.157-4.418"/>
    </svg>
  ),
};

// ─── 3D HERO LOGO ───────────────────────────────────────────────────────────
const FusionLogo3D = () => {
  const logoGroup = useRef();
  const haloRef = useRef();
  const rimLightRef = useRef();
  const smooth = useRef({ x: 0, y: 0, scale: 1 });
  const pulse = useRef(0);
  const hovered = useRef(false);
  const logoTexture = useTexture('/logo.png');

  logoTexture.colorSpace = THREE.SRGBColorSpace;
  logoTexture.anisotropy = 16;

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    const targetX = pointer.x * (hovered.current ? 1.15 : 0.75);
    const targetY = pointer.y * (hovered.current ? 1.15 : 0.75);

    smooth.current.x += (targetX - smooth.current.x) * (hovered.current ? 0.07 : 0.045);
    smooth.current.y += (targetY - smooth.current.y) * (hovered.current ? 0.07 : 0.045);

    const hoverScale = hovered.current ? 1.045 : 1;
    const idleScale = 1 + Math.sin(t * 0.7) * 0.012;
    let clickScale = 1;
    if (pulse.current > 0) {
      pulse.current = Math.max(0, pulse.current - delta * 2.8);
      clickScale = 1 + Math.sin(pulse.current * Math.PI) * 0.05;
    }
    smooth.current.scale += (hoverScale * idleScale * clickScale - smooth.current.scale) * 0.1;

    if (logoGroup.current) {
      logoGroup.current.rotation.y = smooth.current.x * (hovered.current ? 0.14 : 0.09);
      logoGroup.current.rotation.x = -smooth.current.y * (hovered.current ? 0.08 : 0.05);
      logoGroup.current.rotation.z = Math.sin(t * 0.35) * 0.018;
      logoGroup.current.position.y = Math.sin(t * 0.55) * 0.055;
      logoGroup.current.position.x = smooth.current.x * 0.06;
      logoGroup.current.scale.setScalar(smooth.current.scale);
    }

    if (haloRef.current) {
      haloRef.current.rotation.z = t * (hovered.current ? 0.09 : 0.05);
      haloRef.current.material.opacity = hovered.current ? 0.55 : 0.35;
    }

    if (rimLightRef.current) {
      rimLightRef.current.position.x = smooth.current.x * 1.8;
      rimLightRef.current.position.y = smooth.current.y * 1.2 + 0.4;
      rimLightRef.current.intensity = hovered.current ? 1.1 : 0.65;
    }
  });

  const handlePointerOver = () => { hovered.current = true; };
  const handlePointerOut = () => { hovered.current = false; };
  const handleClick = () => { pulse.current = 1; };

  return (
    <group>
      <pointLight
        ref={rimLightRef}
        color="#00B4D8"
        intensity={0.65}
        distance={8}
        position={[0, 0.4, 2]}
      />

      <group ref={logoGroup}>
        {/* Soft depth shadow */}
        <mesh position={[0.04, -0.06, -0.22]}>
          <circleGeometry args={[1.72, 64]} />
          <meshStandardMaterial
            color="#1A1C4E"
            transparent
            opacity={0.14}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>

        {/* Elevated backplate */}
        <mesh position={[0, 0, -0.14]}>
          <circleGeometry args={[1.76, 64]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#3D4193"
            emissiveIntensity={0.08}
            metalness={0.15}
            roughness={0.55}
          />
        </mesh>

        {/* Accent ring */}
        <mesh ref={haloRef} position={[0, 0, -0.08]}>
          <torusGeometry args={[1.68, 0.014, 16, 100]} />
          <meshStandardMaterial
            color="#3D4193"
            transparent
            opacity={0.35}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>

        {/* Interactive logo */}
        <mesh
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <circleGeometry args={[1.65, 64]} />
          <meshStandardMaterial
            map={logoTexture}
            transparent
            alphaTest={0.04}
            metalness={0.18}
            roughness={0.38}
            emissive="#3D4193"
            emissiveIntensity={0.04}
          />
        </mesh>
      </group>
    </group>
  );
};

const FusionCanvas = () => (
  <Canvas
    camera={{ position: [0, 0, 5.2], fov: 48 }}
    dpr={[1, 2]}
    gl={{ antialias: true, alpha: true }}
  >
    <ambientLight intensity={0.85} />
    <directionalLight position={[3, 5, 6]} intensity={1.1} color="#ffffff" />
    <pointLight position={[4, 3, 4]} color="#ffffff" intensity={1.4} />
    <pointLight position={[-3, -2, 3]} color="#ECEEFF" intensity={0.5} />
    <Suspense fallback={null}>
      <FusionLogo3D />
    </Suspense>
  </Canvas>
);

// ─── SECTION BEADS (ambient particles per section) ────────────────────────────
const BEAD_COLORS = ['navy', 'cyan', 'red'];

const SectionBeads = ({ count = 14, tone = 'light', seed = 0 }) => {
  const beads = useMemo(() => {
    let s = seed + 1;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${8 + rand() * 84}%`,
      top: `${6 + rand() * 88}%`,
      size: 3 + rand() * 4,
      delay: rand() * 10,
      duration: 14 + rand() * 12,
      dx: `${(rand() - 0.5) * 36}px`,
      dy: `${-18 - rand() * 28}px`,
      color: BEAD_COLORS[Math.floor(rand() * BEAD_COLORS.length)],
    }));
  }, [count, seed]);

  return (
    <div className={`section-beads section-beads--${tone}`} aria-hidden="true">
      {beads.map((b) => (
        <span
          key={b.id}
          className={`bead bead--${b.color}`}
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            '--delay': `${b.delay}s`,
            '--dur': `${b.duration}s`,
            '--dx': b.dx,
            '--dy': b.dy,
          }}
        />
      ))}
    </div>
  );
};

// ─── CURSOR ───────────────────────────────────────────────────────────────────
const Cursor = () => {
  const dot  = useRef();
  const ring = useRef();
  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0;
    const move = e => { mx = e.clientX; my = e.clientY; };
    const tick = () => {
      if (!dot.current || !ring.current) return;
      dot.current.style.left  = mx + 'px';
      dot.current.style.top   = my + 'px';
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.current.style.left = rx + 'px';
      ring.current.style.top  = ry + 'px';
      requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move);
    tick();
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return (
    <>
      <div ref={dot}  id="cursor-dot" />
      <div ref={ring} id="cursor-ring" />
    </>
  );
};

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
const Navbar = ({ theme, toggleTheme, lmsUrl }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = [
    ['#about','About'],['#programs','Programs'],
    ['#admissions','Admissions'],['#academics','Academics'],
    ['#faculty','Faculty'],['#contact','Contact'],
  ];
  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <a href="#" className="nav-logo">
        <img
          src="/logo.png"
          alt="Fusion College of Sciences Narowal Logo"
          style={{
            width: 48, height: 48,
            borderRadius: '50%',
            objectFit: 'contain',
            background: 'transparent',
            filter: 'drop-shadow(0 3px 8px rgba(61,65,147,0.25))',
            flexShrink: 0,
          }}
        />
        <div className="nav-logo-text">
          <span>FUSION COLLEGE</span>
          <span>of Sciences · Narowal</span>
        </div>
      </a>
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
        ))}
        <a
          href={lmsUrl}
          target="_blank"
          rel="noreferrer"
          className="nav-lms"
        >LMS Portal ↗</a>
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle dark mode"
        >
          {theme === 'light' ? (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 12.83A9.75 9.75 0 0 1 11.17 2.25 9 9 0 1 0 21.75 12.83Z" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M17.72 17.72l1.06 1.06M9.75 9.75l-4.25-4.25M18.25 18.25l-4.25-4.25M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M17.72 6.28l1.06-1.06M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
            </svg>
          )}
        </button>
      </div>
      <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>
    </nav>
  );
};

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io  = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
};

// ─── SECTION SHELL (full-width container) ─────────────────────────────────────
const SectionShell = ({
  id,
  className = '',
  beadSeed,
  beadTone = 'light',
  beadCount = 14,
  innerClassName = '',
  children,
}) => (
  <section id={id} className={`section-shell ${className}`.trim()}>
    {beadSeed != null && (
      <SectionBeads seed={beadSeed} tone={beadTone} count={beadCount} />
    )}
    <div className={`section-inner ${innerClassName}`.trim()}>
      {children}
    </div>
  </section>
);

// ─── SECTION HEAD (consistent red ribbon) ───────────────────────────────────
const SectionHead = ({ children }) => (
  <div className="section-head">
    <div className="section-ribbon" aria-hidden="true" />
    <div className="section-head-content">{children}</div>
  </div>
);

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────
const SectionDivider = () => (
  <div className="divider" aria-hidden="true">
    <span className="divider-mark" />
  </div>
);

// ─── ACTIVE SECTION DETECTOR ──────────────────────────────────────────────────
const useActiveSection = () => {
  useEffect(() => {
    const els = document.querySelectorAll('.section-shell');
    const io  = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('section-active');
          } else {
            e.target.classList.remove('section-active');
          }
        });
      },
      { threshold: 0.2, rootMargin: "-10% 0px -25% 0px" }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  useReveal();
  useActiveSection();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const lmsUrl = isLocal 
    ? 'http://localhost:3000' 
    : 'https://fusioncollegewebfinal.vercel.app/login';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const programs = [
    {
      num: '01', colorClass: 'navy', IconComp: Icon.Microscope,
      title: 'F.Sc Pre-Medical', tag: '2-Year Program',
      desc: 'MDCAT-focused. Build a path to medicine.',
      subjects: ['Biology','Chemistry','Physics','English','Urdu','Pak Studies'],
    },
    {
      num: '02', colorClass: 'red', IconComp: Icon.Gear,
      title: 'F.Sc Pre-Engineering', tag: '2-Year Program',
      desc: 'ECAT excellence. Engineer your future.',
      subjects: ['Mathematics','Physics','Chemistry','English','Urdu','Pak Studies'],
    },
    {
      num: '03', colorClass: 'cyan', IconComp: Icon.Computer,
      title: 'ICS — Computer Science', tag: '2-Year Program',
      desc: 'Tech-forward. Code your ambition.',
      subjects: ['Computer Science','Mathematics','Physics','English','Urdu','Pak Studies'],
    },
  ];

  const academics = [
    { IconComp: Icon.Calendar, title: 'Annual Calendar',  desc: 'Structured academic year with planned exams, events, and breaks.'},
    { IconComp: Icon.Clock,    title: 'Timetable',        desc: 'Optimized daily schedule balancing theory, practicals and revisions.'},
    { IconComp: Icon.BadgeCheck,title: 'Uniform Policy', desc: 'Professional uniform policy instilling discipline and institutional pride.'},
    { IconComp: Icon.Sparkles,  title: 'Achievements',   desc: 'Consistent top results in BISE Punjab. Multiple position-holders every year.'},
    { IconComp: Icon.Sparkles,  title: 'Life at Fusion',  desc: 'Science exhibitions, debates, sports and extracurriculars on campus.'},
    { IconComp: Icon.News,      title: 'Latest News',    desc: 'Stay updated with college announcements, results, and important circulars.'},
  ];

  const lmsFeatures = [
    { IconComp: Icon.Book,  title: 'Course Materials',   desc: 'All lecture notes, slides, and past papers — accessible 24/7.' },
    { IconComp: Icon.Chart, title: 'Progress Tracking',  desc: 'Monitor attendance, assignments, and test results in real time.' },
    { IconComp: Icon.Bell,  title: 'Announcements',      desc: 'Instant updates about schedule changes, results, and events.' },
    { IconComp: Icon.Chat,  title: 'Faculty Chat',       desc: 'Direct messaging between students and faculty for academic queries.' },
  ];

  const faculty = [
    { name:'Physics HOD',      sub:'Physics',           init:'P'  },
    { name:'Chemistry HOD',    sub:'Chemistry',         init:'C'  },
    { name:'Biology HOD',      sub:'Biology',           init:'B'  },
    { name:'Sir Mathematics',  sub:'Mathematics',       init:'M'  },
    { name:"Ma'am Computer",   sub:'Computer Science',  init:'CS' },
    { name:'Sir English',      sub:'English',           init:'E'  },
    { name:'Sir Urdu',         sub:'Urdu',              init:'U'  },
    { name:'Sir Islamic Std.', sub:'Islamic Studies',   init:'IS' },
  ];

  const contactItems = [
    {
      IconComp: Icon.MapPin, field: 'Address',
      value: 'Circular Road, Narowal',
      sub: 'Opposite Kashmir Town, Narowal, 51600, Pakistan',
    },
    {
      IconComp: Icon.Phone, field: 'Phone / WhatsApp',
      value: '+92 304 3113555',
      sub: 'Admissions & General Enquiries',
    },
    {
      IconComp: Icon.Clock, field: 'Office Hours',
      value: 'Mon – Sat, 8:00 AM – 2:00 PM',
      sub: 'Sunday: Closed',
    },
    {
      IconComp: Icon.GlobalAlt, field: 'Google Plus Code',
      value: '3VVC+93 Narowal',
      sub: 'Find us on Google Maps',
    },
  ];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.fullName.value;
    const phone = form.phone.value;
    const email = form.email.value;
    const program = form.program.value;
    const messageText = form.message.value;

    const fullMessage = program ? `[Program: ${program}] ${messageText}` : messageText;

    const payload = {
      name,
      phone,
      email: email || null,
      message: fullMessage,
    };

    try {
      const response = await fetch(`${lmsUrl}/api/enquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Thank you! Your enquiry has been submitted. We will contact you soon.');
        form.reset();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to send enquiry: ${errorData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Enquiry error:', err);
      alert('An error occurred. Please try again or call us directly at +92 304 3113555.');
    }
  };

  return (
    <>
      <div className="site-atmosphere" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <Cursor />
      <Navbar theme={theme} toggleTheme={toggleTheme} lmsUrl={lmsUrl} />

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="hero section-shell section-shell--hero">
        <SectionBeads seed={1} count={16} />
        <div className="hero-content">
          <div className="hero-tag">
            <span /> Admissions Open · Session 2026
          </div>
          <h1 className="hero-h1">
            Where <span className="accent">Excellence</span><br />
            Meets <span className="cyan">Purpose.</span>
          </h1>
          <p className="hero-sub">
            Fusion College of Sciences Narowal — where elite academics, holistic development, and cutting-edge digital tools converge to ignite the leaders of tomorrow.
          </p>
          <div className="hero-ctas">
            <a href="#admissions" className="btn btn-solid">Apply Now 2026</a>
            <a href={lmsUrl} target="_blank" rel="noreferrer" className="btn btn-red">Student LMS ↗</a>
            <a href="#programs" className="btn btn-outline">View Programs</a>
          </div>
        </div>
        <div className="hero-3d-canvas">
          <FusionCanvas />
        </div>
        <div className="hero-scroll-hint">
          <div className="scroll-line" /> Scroll to explore
        </div>
      </section>

      {/* ══════════════════ STATS ══════════════════ */}
      <div className="section-shell section-shell--stats">
        <div className="section-inner section-inner--compact">
          <div className="stats-bar reveal">
            <div className="stat-item"><span className="stat-num">5.0★</span><div className="stat-label">Google Rating</div></div>
            <div className="stat-item"><span className="stat-num">3+</span><div className="stat-label">Programs Offered</div></div>
            <div className="stat-item"><span className="stat-num">8+</span><div className="stat-label">Departments</div></div>
            <div className="stat-item"><span className="stat-num">24/7</span><div className="stat-label">LMS Access</div></div>
          </div>
        </div>
      </div>

      {/* ══════════════════ ABOUT ══════════════════ */}
      <SectionShell id="about" beadSeed={2}>
        <div className="about-grid">
          <div>
            <SectionHead>
              <div className="section-label reveal">Our Identity</div>
              <h2 className="section-title reveal">The <span>Fusion</span><br />Advantage.</h2>
              <p className="section-desc reveal">
                At Fusion College Narowal, we merge precision academics, holistic character development, and cutting-edge digital tools into a singular, unstoppable force for student success.
              </p>
            </SectionHead>
            <div className="about-cards">
              {[
                { num:'01', title:'Academic Excellence',   desc:'Renowned for MDCAT and ECAT results. Our experienced HODs ensure every student reaches their full potential through guided instruction.' },
                { num:'02', title:'Holistic Development',  desc:'Education beyond the classroom. Sports, debate, labs, and counselling create well-rounded citizens ready for the real world.' },
                { num:'03', title:'Strong Community',      desc:'Small class sizes, personalized attention, and a tight-knit community where every student is seen, heard, and supported.' },
              ].map((c, i) => (
                <div key={i} className={`about-card reveal reveal-delay-${i+1}`}>
                  <div className="about-card-num">{c.num}</div>
                  <div>
                    <div className="about-card-title">{c.title}</div>
                    <div className="about-card-desc">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="about-visual-block reveal">
            <div className="about-visual-inner">
              <div className="clay-blob clay-blob-1" />
              <div className="clay-blob clay-blob-2" />
              <div className="clay-blob clay-blob-3" />
              {/* Logo watermark in the about visual */}
              <img
                src="/logo.png"
                alt="Fusion College Logo"
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: 180,
                  height: 180,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 24px rgba(61,65,147,0.28))',
                  animation: 'float-blob 6s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionDivider />

      {/* ══════════════════ PROGRAMS ══════════════════ */}
      <SectionShell id="programs" className="section-shell--programs" beadSeed={3} beadCount={18}>
          <SectionHead>
            <div className="section-label reveal">Academic Programs</div>
            <h2 className="section-title reveal">Choose Your<br /><span>Trajectory.</span></h2>
            <p className="section-desc reveal">Three world-class programs designed for ambitious students aiming at top universities across Pakistan.</p>
          </SectionHead>
          <div className="programs-grid">
            {programs.map((p, i) => (
              <div key={i} className={`program-card reveal reveal-delay-${i+1}`}>
                <div className="program-num">{p.num}</div>
                <div className={`program-icon-wrap ${p.colorClass}`}>
                  <p.IconComp />
                </div>
                <div className="program-title">{p.title}</div>
                <div className="program-subtitle">{p.desc}</div>
                <ul className="program-subjects">
                  {p.subjects.map(s => <li key={s}>{s}</li>)}
                </ul>
                <div className="program-tag">{p.tag}</div>
              </div>
            ))}
          </div>
      </SectionShell>

      <SectionDivider />

      {/* ══════════════════ ADMISSIONS ══════════════════ */}
      <SectionShell id="admissions" beadSeed={4}>
        <SectionHead>
          <div className="section-label reveal">Admissions 2026</div>
          <h2 className="section-title reveal">Join the<br /><span>Fusion Era.</span></h2>
        </SectionHead>
        <div className="admissions-layout">
          <div>
            <p style={{color:'var(--text-body)', marginBottom:'2rem', lineHeight:'1.75', fontSize:'0.95rem'}}>
              The application process is straightforward. Bring the following documents to our campus at Circular Road, Narowal — or call us at{' '}
              <strong style={{color:'var(--navy)'}}>+92 304 3113555</strong>.
            </p>
            {[
              { title:'Passport Photo',       desc:'One recent passport-sized photograph' },
              { title:'9th Class Result Card', desc:'Original or photocopy with marks detail' },
              { title:'10th Class Roll Number',desc:'Official roll number slip' },
              { title:"Father's CNIC",         desc:"Photocopy of father's national identity card" },
              { title:"Student's B-Form",      desc:'Original or photocopy of B-Form' },
              { title:'Contact Numbers',       desc:'Phone and WhatsApp numbers for candidate and parent' },
            ].map((s, i) => (
              <div key={i} className={`admission-step reveal reveal-delay-${(i%4)+1}`}>
                <div className="step-num">0{i+1}</div>
                <div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="scholarship-box reveal">
            <div className="scholarship-header">Scholarship Merit Criteria</div>
            <p style={{fontSize:'.85rem', color:'var(--text-body)', marginBottom:'0.5rem', lineHeight:'1.65'}}>
              Fusion College rewards academic excellence. Maintain <strong style={{color:'var(--red)'}}>85%+</strong> marks to continue receiving your scholarship.
            </p>
            <table className="scholarship-table">
              <thead><tr><th>Marks %</th><th>Scholarship</th></tr></thead>
              <tbody>
                {[['90%+','50%'],['85% – 90%','30%'],['80% – 85%','20%'],['Entry Test Score','Based on Test']].map(([m,s]) => (
                  <tr key={m}><td>{m}</td><td>{s}</td></tr>
                ))}
              </tbody>
            </table>
            <a href="#contact" className="btn btn-solid w-full">Register Enquiry</a>
          </div>
        </div>
      </SectionShell>

      <SectionDivider />

      {/* ══════════════════ ACADEMICS ══════════════════ */}
      <SectionShell id="academics" beadSeed={5}>
        <SectionHead>
          <div className="section-label reveal">Academic Life</div>
          <h2 className="section-title reveal">Structure &amp;<br /><span>Discipline.</span></h2>
        </SectionHead>
        <div className="academics-grid" style={{marginTop:'1rem'}}>
          {academics.map((a, i) => (
            <div key={i} className={`acad-card reveal reveal-delay-${(i%4)+1}`}>
              <div className="acad-icon-wrap">
                <a.IconComp />
              </div>
              <div className="acad-title">{a.title}</div>
              <div className="acad-desc">{a.desc}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:'4.5rem'}}>
          <div className="section-label reveal">Opening Hours</div>
          <div className="hours-grid">
            {['Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="hour-day reveal">
                <div className="hour-day-name">{d}</div>
                <div className="hour-day-time">8:00 – 14:00</div>
              </div>
            ))}
          </div>
          <p style={{fontSize:'.75rem', color:'var(--muted)', marginTop:'1rem'}}>Sunday: Closed</p>
        </div>
      </SectionShell>

      <SectionDivider />

      {/* ══════════════════ LMS ══════════════════ */}
      <SectionShell id="lms" className="section-shell--lms" beadSeed={6} beadTone="dark" beadCount={16}>
          <SectionHead>
            <div className="section-label reveal">Digital Learning</div>
            <h2 className="section-title reveal">Student Portal<br />&amp; LMS.</h2>
            <p className="section-desc reveal">Your complete learning hub — available anywhere, anytime.</p>
          </SectionHead>
          <div className="lms-inner">
            <div className="lms-features">
              {lmsFeatures.map((f, i) => (
                <div key={i} className={`lms-feature reveal reveal-delay-${i+1}`}>
                  <div className="lms-feature-icon"><f.IconComp /></div>
                  <div>
                    <div className="lms-feature-title">{f.title}</div>
                    <div className="lms-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lms-cta-box reveal">
              <div className="lms-cta-circle">LMS</div>
              <a
                href={lmsUrl}
                target="_blank" rel="noreferrer"
                className="btn btn-cyan"
                style={{marginBottom:'1.2rem'}}
              >Login to Portal ↗</a>
              <div className="lms-domain">fusioncollegewebfinal.vercel.app</div>
            </div>
          </div>
      </SectionShell>

      <SectionDivider />

      {/* ══════════════════ FACULTY ══════════════════ */}
      <SectionShell id="faculty" beadSeed={7}>
        <SectionHead>
          <div className="section-label reveal">Expert Faculty</div>
          <h2 className="section-title reveal">Meet the<br /><span>Minds.</span></h2>
          <p className="section-desc reveal">Our department heads are highly experienced subject specialists committed to student success.</p>
        </SectionHead>
        <div className="faculty-grid">
          {faculty.map((f, i) => (
            <div key={i} className={`faculty-card reveal reveal-delay-${(i%4)+1}`}>
              <div className="faculty-avatar">{f.init}</div>
              <div className="faculty-name">{f.name}</div>
              <div className="faculty-subject">{f.sub}</div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionDivider />

      {/* ══════════════════ CONTACT ══════════════════ */}
      <SectionShell id="contact" beadSeed={8}>
        <SectionHead>
          <div className="section-label reveal">Get In Touch</div>
          <h2 className="section-title reveal">Visit <span>Narowal</span><br />Campus.</h2>
        </SectionHead>
        <div className="contact-layout" style={{marginTop:'3rem'}}>
          <div className="contact-info">
            {contactItems.map((c, i) => (
              <div key={i} className={`contact-item reveal reveal-delay-${i+1}`}>
                <div className="contact-icon"><c.IconComp /></div>
                <div>
                  <div className="contact-field">{c.field}</div>
                  <div className="contact-value">{c.value}</div>
                  {c.sub && <div className="contact-sub">{c.sub}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="reveal">
            <form className="contact-form" onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label>Full Name</label>
                  <input type="text" name="fullName" placeholder="Your full name" required />
                </div>
                <div className="form-field">
                  <label>Phone / WhatsApp</label>
                  <input type="tel" name="phone" placeholder="+92 300 0000000" required />
                </div>
              </div>
              <div className="form-field">
                <label>Email Address</label>
                <input type="email" name="email" placeholder="your@email.com" />
              </div>
              <div className="form-field">
                <label>Program of Interest</label>
                <select name="program">
                  <option value="">Select a program</option>
                  <option>F.Sc Pre-Medical</option>
                  <option>F.Sc Pre-Engineering</option>
                  <option>ICS (Computer Science)</option>
                  <option>General Enquiry</option>
                </select>
              </div>
              <div className="form-field">
                <label>Message</label>
                <textarea name="message" rows="4" placeholder="Your question or message..." required />
              </div>
              <button type="submit" className="btn btn-solid w-full">Send Message</button>
            </form>
          </div>
        </div>
      </SectionShell>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="nav-logo" style={{marginBottom:'1rem'}}>
              <img
                src="/logo.png"
                alt="Fusion College Logo"
                style={{
                  width: 44, height: 44,
                  objectFit: 'contain',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.95)',
                  padding: 3,
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                  flexShrink: 0,
                }}
              />
              <span style={{fontFamily:'Poppins,sans-serif', fontWeight:800, color:'#fff', fontSize:'1rem'}}>FUSION COLLEGE</span>
            </div>
            <p>Fusion College of Sciences Narowal. Circular Road, opposite Kashmir Town, Narowal, 51600, Pakistan. Igniting Minds, Shaping Futures.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              {[['#about','About'],['#programs','Programs'],['#admissions','Admissions'],['#academics','Academics'],['#faculty','Faculty']].map(([h,l]) => (
                <li key={h}><a href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-links">
            <h4>Resources</h4>
            <ul>
              <li><a href={lmsUrl} target="_blank" rel="noreferrer">Student LMS ↗</a></li>
              <li><a href="https://www.fusioncollege.edu.pk" target="_blank" rel="noreferrer">Main Website ↗</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Contact</h4>
            <ul>
              <li><a href="tel:+923043113555">+92 304 3113555</a></li>
              <li><a href="#">Circular Road, Narowal</a></li>
              <li><a href="#">51600, Pakistan</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Fusion College of Sciences Narowal. All Rights Reserved.</span>
          <span>★★★★★ 5.0 on Google Maps</span>
        </div>
      </footer>
    </>
  );
}

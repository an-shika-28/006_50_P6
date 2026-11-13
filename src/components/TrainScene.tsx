import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DoorOpen, FilePlus2, Search, TrainFront } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TrainSceneProps {
  doorsOpen: boolean;
  onToggleDoors: () => void;
  onTrainSettled?: () => void;
  selectedCorridor: 'East' | 'West' | 'Central';
  onSelectCorridor: (zone: 'East' | 'West' | 'Central') => void;
}

function createSignTexture(title: string, subtitle: string, bgHex: string, fgHex: string, accentHex: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 14, canvas.height);
    ctx.fillRect(0, canvas.height - 6, canvas.width, 6);
    ctx.fillStyle = fgHex;
    ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(title, 34, 62);
    ctx.fillStyle = accentHex;
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText(subtitle, 34, 100);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTactileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#C8792C';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#F4D9A0';
    for (let x = 8; x < 256; x += 24) {
      for (let y = 10; y < 56; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 1);
  return tex;
}

export function TrainScene({
  doorsOpen,
  onToggleDoors,
  onTrainSettled,
  selectedCorridor,
}: TrainSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const doorsOpenRef = useRef(doorsOpen);
  const onToggleDoorsRef = useRef(onToggleDoors);
  const onTrainSettledRef = useRef(onTrainSettled);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const [fallbackMode, setFallbackMode] = useState<'none' | 'reduced-motion' | 'webgl-unavailable'>('none');
  const [hoveredDoor, setHoveredDoor] = useState(false);

  doorsOpenRef.current = doorsOpen;
  onToggleDoorsRef.current = onToggleDoors;
  onTrainSettledRef.current = onTrainSettled;

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setFallbackMode('reduced-motion');
      onTrainSettledRef.current?.();
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    // Probe software WebGL (SwiftShader / llvmpipe / WARP) cleanly
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setFallbackMode('webgl-unavailable');
      onTrainSettledRef.current?.();
      return;
    }

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 560;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#231A12');
    scene.fog = new THREE.FogExp2('#231A12', 0.022);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 160);
    camera.position.set(11.5, 4.1, 14.5);
    camera.lookAt(0, 1.85, 0);

    // 3-Point Architectural Metro Lighting
    const hemiLight = new THREE.HemisphereLight('#F4D9A0', '#231A12', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF0D4', 1.7);
    keyLight.position.set(10, 14, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -22;
      keyLight.shadow.camera.right = 22;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#C8792C', 1.1);
    rimLight.position.set(-14, 6, -8);
    scene.add(rimLight);

    const platformWarmLight = new THREE.PointLight('#F4D9A0', 4.5, 24, 1.5);
    platformWarmLight.position.set(0, 5.2, 4.2);
    scene.add(platformWarmLight);

    const trackAmberLight = new THREE.PointLight('#C8792C', 2.8, 20, 1.6);
    trackAmberLight.position.set(7.5, 2.2, 2.8);
    scene.add(trackAmberLight);

    // Materials Palette (Mocha Brown, Champagne Gold, Burnt Amber, Warm Ivory)
    const mochaMat = new THREE.MeshStandardMaterial({ color: '#5B4632', roughness: 0.52, metalness: 0.25 });
    const darkMochaMat = new THREE.MeshStandardMaterial({ color: '#2D2217', roughness: 0.72, metalness: 0.15 });
    const goldBodyMat = new THREE.MeshStandardMaterial({ color: '#E8C98E', roughness: 0.28, metalness: 0.62 });
    const amberMat = new THREE.MeshStandardMaterial({ color: '#C8792C', roughness: 0.35, metalness: 0.35 });
    const steelMat = new THREE.MeshStandardMaterial({ color: '#B4ABA0', roughness: 0.22, metalness: 0.88 });
    const platformDeckMat = new THREE.MeshStandardMaterial({ color: '#DFD4C2', roughness: 0.82, metalness: 0.05 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#1C1611',
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.72,
    });
    const interiorGlowMat = new THREE.MeshStandardMaterial({
      color: '#F4D9A0',
      emissive: '#F4D9A0',
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: '#FFF6DE',
      emissive: '#F4D9A0',
      emissiveIntensity: 2.2,
    });
    const tailLightMat = new THREE.MeshStandardMaterial({
      color: '#C83D3D',
      emissive: '#C83D3D',
      emissiveIntensity: 1.5,
    });

    const disposables: Array<{ dispose: () => void }> = [
      envTex,
      mochaMat,
      darkMochaMat,
      goldBodyMat,
      amberMat,
      steelMat,
      platformDeckMat,
      glassMat,
      interiorGlowMat,
      headlightMat,
      tailLightMat,
    ];

    // 1. Track Bed, Sleepers (InstancedMesh) & Steel Rails
    const ballastGeo = new THREE.BoxGeometry(90, 0.3, 6.5);
    const ballast = new THREE.Mesh(ballastGeo, darkMochaMat);
    ballast.position.set(0, -0.15, 0);
    ballast.receiveShadow = true;
    scene.add(ballast);
    disposables.push(ballastGeo);

    const sleeperGeo = new THREE.BoxGeometry(0.28, 0.14, 2.8);
    const sleeperCount = 60;
    const sleepers = new THREE.InstancedMesh(sleeperGeo, mochaMat, sleeperCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < sleeperCount; i++) {
      dummy.position.set(-42 + i * 1.4, 0.05, 0);
      dummy.updateMatrix();
      sleepers.setMatrixAt(i, dummy.matrix);
    }
    sleepers.computeBoundingSphere();
    scene.add(sleepers);
    disposables.push(sleeperGeo);

    const railGeo = new THREE.BoxGeometry(90, 0.14, 0.1);
    disposables.push(railGeo);
    [-0.85, 0.85].forEach((zPos) => {
      const rail = new THREE.Mesh(railGeo, steelMat);
      rail.position.set(0, 0.18, zPos);
      scene.add(rail);
    });

    // 2. Station Platform Architecture (background + foreground edge)
    const platformGeo = new THREE.BoxGeometry(70, 1.0, 7.5);
    const platform = new THREE.Mesh(platformGeo, platformDeckMat);
    platform.position.set(0, 0.5, -5.1);
    platform.receiveShadow = true;
    scene.add(platform);
    disposables.push(platformGeo);

    const tactileTex = createTactileTexture();
    tactileTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const tactileMat = new THREE.MeshStandardMaterial({ map: tactileTex, color: 0xffffff, roughness: 0.65 });
    const tactileGeo = new THREE.BoxGeometry(70, 0.04, 0.42);
    const tactileStrip = new THREE.Mesh(tactileGeo, tactileMat);
    tactileStrip.position.set(0, 1.02, -1.62);
    scene.add(tactileStrip);
    disposables.push(tactileTex, tactileMat, tactileGeo);

    // Back Concourse Wall & Architectural Pillars
    const backWallGeo = new THREE.BoxGeometry(70, 6.2, 0.5);
    const backWall = new THREE.Mesh(backWallGeo, darkMochaMat);
    backWall.position.set(0, 3.6, -8.6);
    scene.add(backWall);
    disposables.push(backWallGeo);

    const canopyGeo = new THREE.BoxGeometry(68, 0.35, 8.8);
    const canopy = new THREE.Mesh(canopyGeo, mochaMat);
    canopy.position.set(0, 6.4, -4.4);
    scene.add(canopy);
    disposables.push(canopyGeo);

    const pillarGeo = new THREE.BoxGeometry(0.55, 5.4, 0.55);
    const lightStripGeo = new THREE.BoxGeometry(3.2, 0.08, 0.25);
    const lightStripMat = new THREE.MeshStandardMaterial({
      color: '#F4D9A0',
      emissive: '#F4D9A0',
      emissiveIntensity: 1.5,
    });
    disposables.push(pillarGeo, lightStripGeo, lightStripMat);

    [-16, -8, 0, 8, 16].forEach((px) => {
      const pillar = new THREE.Mesh(pillarGeo, mochaMat);
      pillar.position.set(px, 3.7, -6.2);
      pillar.castShadow = true;
      scene.add(pillar);

      const soffitLight = new THREE.Mesh(lightStripGeo, lightStripMat);
      soffitLight.position.set(px, 6.18, -3.2);
      scene.add(soffitLight);
    });

    // Illuminated Station Signage Board
    const signTex = createSignTexture(
      'METROPULSE',
      'STATION OPERATIONS · PLATFORM 01',
      '#2D2217',
      '#F4D9A0',
      '#C8792C'
    );
    signTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.35 });
    const signFrameGeo = new THREE.BoxGeometry(6.4, 1.45, 0.22);
    const signFaceGeo = new THREE.PlaneGeometry(6.1, 1.25);
    const signGroup = new THREE.Group();
    const signFrame = new THREE.Mesh(signFrameGeo, mochaMat);
    const signFace = new THREE.Mesh(signFaceGeo, signMat);
    signFace.position.z = 0.12;
    signGroup.add(signFrame, signFace);
    signGroup.position.set(-2.2, 4.85, -4.8);
    scene.add(signGroup);
    disposables.push(signTex, signMat, signFrameGeo, signFaceGeo);

    // 3. Composite Procedural 3-Car Metro Train (12+ parts per car)
    const trainGroup = new THREE.Group();
    const doorPairs: Array<{ left: THREE.Mesh; right: THREE.Mesh; baseX: number }> = [];
    const doorHitProxies: THREE.Mesh[] = [];
    const wheels: THREE.Mesh[] = [];

    const carLength = 9.4;
    const carGap = 0.45;
    const carPositions = [-carLength - carGap, 0, carLength + carGap]; // Rear, Center, Lead (at +X)

    const bodyLowerGeo = new THREE.BoxGeometry(carLength, 0.72, 2.38);
    const bodyUpperGeo = new THREE.BoxGeometry(carLength, 1.95, 2.32);
    const roofGeo = new THREE.BoxGeometry(carLength - 0.15, 0.28, 2.02);
    const stripeGeo = new THREE.BoxGeometry(carLength + 0.02, 0.14, 2.36);
    const winGeo = new THREE.BoxGeometry(1.45, 0.85, 2.35);
    const interiorBoxGeo = new THREE.BoxGeometry(carLength - 0.8, 1.15, 1.65);
    const doorLeafGeo = new THREE.BoxGeometry(0.62, 1.68, 0.08);
    const doorWinGeo = new THREE.BoxGeometry(0.42, 0.75, 0.1);
    const bogieGeo = new THREE.BoxGeometry(2.0, 0.32, 1.85);
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 18);
    const hitProxyGeo = new THREE.BoxGeometry(1.5, 2.0, 0.5);
    const hitProxyMat = new THREE.MeshBasicMaterial({ visible: false });

    disposables.push(
      bodyLowerGeo,
      bodyUpperGeo,
      roofGeo,
      stripeGeo,
      winGeo,
      interiorBoxGeo,
      doorLeafGeo,
      doorWinGeo,
      bogieGeo,
      wheelGeo,
      hitProxyGeo,
      hitProxyMat
    );

    // Destination LED sign texture on train side & nose
    const destTex = createSignTexture('CENTRAL LINE', 'ANOMALY RESPONSE UNIT', '#231A12', '#F4D9A0', '#C8792C');
    const destMat = new THREE.MeshStandardMaterial({ map: destTex, color: 0xffffff, emissive: '#3B2512', emissiveIntensity: 0.4 });
    const destGeo = new THREE.PlaneGeometry(2.2, 0.44);
    disposables.push(destTex, destMat, destGeo);

    carPositions.forEach((cx, carIdx) => {
      const car = new THREE.Group();
      car.position.set(cx, 0, 0);

      // Lower mocha structural skirt
      const skirt = new THREE.Mesh(bodyLowerGeo, mochaMat);
      skirt.position.y = 0.88;
      skirt.castShadow = true;
      car.add(skirt);

      // Champagne gold upper cabin body
      const upper = new THREE.Mesh(bodyUpperGeo, goldBodyMat);
      upper.position.y = 2.18;
      upper.castShadow = true;
      car.add(upper);

      // Curved mocha roof housing + HVAC pods
      const roof = new THREE.Mesh(roofGeo, darkMochaMat);
      roof.position.y = 3.26;
      car.add(roof);

      // Burnt Amber transit beltline stripe
      const stripe = new THREE.Mesh(stripeGeo, amberMat);
      stripe.position.y = 1.32;
      car.add(stripe);

      // Warm illuminated interior cabin visible through recessed windows
      const interior = new THREE.Mesh(interiorBoxGeo, interiorGlowMat);
      interior.position.y = 2.15;
      car.add(interior);

      // Passenger Windows along the car
      [-3.15, 0, 3.15].forEach((wx) => {
        const win = new THREE.Mesh(winGeo, glassMat);
        win.position.set(wx, 2.28, 0);
        car.add(win);
      });

      // Two interactive double sliding doors per car (on camera-facing Z = +1.17 & platform Z = -1.17)
      [-1.58, 1.58].forEach((dx) => {
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.78, 2.38), darkMochaMat);
        doorFrame.position.set(dx, 1.9, 0);
        car.add(doorFrame);
        disposables.push(doorFrame.geometry);

        const leftLeaf = new THREE.Mesh(doorLeafGeo, amberMat);
        leftLeaf.position.set(dx - 0.32, 1.88, 1.18);
        const leftWin = new THREE.Mesh(doorWinGeo, glassMat);
        leftWin.position.set(0, 0.25, 0.01);
        leftLeaf.add(leftWin);
        car.add(leftLeaf);

        const rightLeaf = new THREE.Mesh(doorLeafGeo, amberMat);
        rightLeaf.position.set(dx + 0.32, 1.88, 1.18);
        const rightWin = new THREE.Mesh(doorWinGeo, glassMat);
        rightWin.position.set(0, 0.25, 0.01);
        rightLeaf.add(rightWin);
        car.add(rightLeaf);

        doorPairs.push({ left: leftLeaf, right: rightLeaf, baseX: dx });

        const hitBox = new THREE.Mesh(hitProxyGeo, hitProxyMat);
        hitBox.position.set(dx, 1.9, 1.25);
        hitBox.userData = { isDoorTrigger: true };
        car.add(hitBox);
        doorHitProxies.push(hitBox);
      });

      // Side destination board on center & lead cars
      if (carIdx >= 1) {
        const destBoard = new THREE.Mesh(destGeo, destMat);
        destBoard.position.set(0, 2.9, 1.18);
        car.add(destBoard);
      }

      // Bogies & spinning steel wheels flush with rails (y = 0.32 radius + 0.16 rail top ~ 0.48)
      [-2.9, 2.9].forEach((bx) => {
        const bogie = new THREE.Mesh(bogieGeo, darkMochaMat);
        bogie.position.set(bx, 0.5, 0);
        car.add(bogie);

        [-0.62, 0.62].forEach((wx) => {
          [-0.85, 0.85].forEach((wz) => {
            const w = new THREE.Mesh(wheelGeo, steelMat);
            w.rotation.x = Math.PI / 2;
            w.position.set(bx + wx, 0.48, wz);
            car.add(w);
            wheels.push(w);
          });
        });
      });

      // Aerodynamic beveled cab nose on Lead Car (+X end)
      if (carIdx === 2) {
        const noseShape = new THREE.Shape();
        noseShape.moveTo(0, 0.55);
        noseShape.lineTo(1.25, 0.62);
        noseShape.quadraticCurveTo(1.65, 1.45, 0.9, 3.15);
        noseShape.lineTo(0, 3.35);
        noseShape.closePath();

        const noseGeo = new THREE.ExtrudeGeometry(noseShape, {
          depth: 2.24,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.08,
          bevelThickness: 0.08,
        });
        noseGeo.translate(carLength / 2 - 0.05, 0, -1.12);
        const noseMesh = new THREE.Mesh(noseGeo, mochaMat);
        noseMesh.castShadow = true;
        car.add(noseMesh);
        disposables.push(noseGeo);

        const cabGlassGeo = new THREE.BoxGeometry(0.45, 0.95, 1.9);
        const cabGlass = new THREE.Mesh(cabGlassGeo, glassMat);
        cabGlass.position.set(carLength / 2 + 0.88, 2.25, 0);
        cabGlass.rotation.z = -0.35;
        car.add(cabGlass);
        disposables.push(cabGlassGeo);

        const headGeo = new THREE.BoxGeometry(0.18, 0.22, 0.36);
        disposables.push(headGeo);
        [-0.72, 0.72].forEach((hz) => {
          const hl = new THREE.Mesh(headGeo, headlightMat);
          hl.position.set(carLength / 2 + 1.32, 1.05, hz);
          car.add(hl);
        });
      }

      // Rear tail lights
      if (carIdx === 0) {
        const tailGeo = new THREE.BoxGeometry(0.12, 0.22, 0.34);
        disposables.push(tailGeo);
        [-0.72, 0.72].forEach((tz) => {
          const tl = new THREE.Mesh(tailGeo, tailLightMat);
          tl.position.set(-carLength / 2 - 0.02, 1.1, tz);
          car.add(tl);
        });
      }

      trainGroup.add(car);
    });

    // Contact shadow plane directly under train
    const shadowPlaneGeo = new THREE.PlaneGeometry(32, 3.6);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      color: '#120C07',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.03, 0);
    trainGroup.add(contactShadow);
    disposables.push(shadowPlaneGeo, shadowPlaneMat);

    // Start train off-screen to the left (-28) and glide smoothly to platform stop (x = -1.2)
    const startX = isSoftwareGl ? -14.0 : -26.0;
    const targetStopX = -1.2;
    trainGroup.position.x = startX;
    scene.add(trainGroup);

    // Raycaster for door interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastMoveCheck = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveCheck < 50) return;
      lastMoveCheck = now;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(doorHitProxies, false);
      const isHit = hits.length > 0;
      setHoveredDoor(isHit);
      renderer.domElement.style.cursor = isHit ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(doorHitProxies, false);
      if (hits.length > 0) {
        onToggleDoorsRef.current();
        requestRenderRef.current?.();
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setFallbackMode('webgl-unavailable');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRenderRef.current?.();
    };
    window.addEventListener('resize', handleResize);

    // Animation state: Entry travel -> Stop -> Door open -> Idle on-demand
    let frameId = 0;
    let disposed = false;
    let arrivalElapsed = 0;
    const arrivalDuration = isSoftwareGl ? 1.4 : 2.6;
    let settled = false;
    let currentDoorOpenAmt = 0;
    let lastTime = performance.now();
    let renderScheduled = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const stepAndRender = () => {
      if (disposed) return;
      renderScheduled = false;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      let needsMoreFrames = false;

      if (!settled) {
        arrivalElapsed += dt;
        const t = Math.min(1, arrivalElapsed / arrivalDuration);
        // Smooth cubic ease-out deceleration into platform
        const ease = 1 - Math.pow(1 - t, 3);
        const prevX = trainGroup.position.x;
        trainGroup.position.x = THREE.MathUtils.lerp(startX, targetStopX, ease);
        const dx = trainGroup.position.x - prevX;
        wheels.forEach((w) => {
          w.rotation.z -= dx / 0.32;
        });

        // Subtle cinematic camera pan following train entry
        camera.position.x = THREE.MathUtils.lerp(4.0, 10.8, ease);
        camera.lookAt(THREE.MathUtils.lerp(-3.5, 0.5, ease), 1.85, 0);

        if (t >= 1) {
          settled = true;
          onTrainSettledRef.current?.();
        } else {
          needsMoreFrames = true;
        }
      }

      const targetDoorAmt = doorsOpenRef.current ? 0.56 : 0;
      if (Math.abs(currentDoorOpenAmt - targetDoorAmt) > 0.004) {
        currentDoorOpenAmt = THREE.MathUtils.damp(currentDoorOpenAmt, targetDoorAmt, 6.5, dt);
        doorPairs.forEach((pair) => {
          pair.left.position.x = pair.baseX - 0.32 - currentDoorOpenAmt;
          pair.right.position.x = pair.baseX + 0.32 + currentDoorOpenAmt;
        });
        needsMoreFrames = true;
      }

      renderer.render(scene, camera);

      if (needsMoreFrames) {
        if (isSoftwareGl) {
          afterDraw(stepAndRender);
        } else {
          frameId = requestAnimationFrame(stepAndRender);
        }
      }
    };

    const requestRender = () => {
      if (disposed || renderScheduled) return;
      renderScheduled = true;
      lastTime = performance.now();
      frameId = requestAnimationFrame(stepAndRender);
    };
    requestRenderRef.current = requestRender;

    // Initial render kick
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Re-trigger on-demand render whenever door state changes
  useEffect(() => {
    requestRenderRef.current?.();
  }, [doorsOpen, selectedCorridor]);

  if (fallbackMode !== 'none') {
    return (
      <div
        data-testid="train-fallback-scene"
        className="w-full h-full bg-gradient-to-b from-[#231A12] via-[#3D2E20] to-[#231A12] flex flex-col justify-end relative overflow-hidden"
      >
        {/* Accessible Architectural 2.5D Metro Station Elevation Fallback */}
        <svg
          viewBox="0 0 1200 420"
          className="w-full h-full object-cover opacity-90"
          role="img"
          aria-label="MetroPulse architectural station platform and train illustration"
        >
          <rect x="0" y="0" width="1200" height="420" fill="#231A12" />
          <rect x="0" y="60" width="1200" height="20" fill="#5B4632" />
          <rect x="140" y="95" width="320" height="58" fill="#2D2217" stroke="#C8792C" strokeWidth="2" />
          <text x="165" y="132" fill="#F4D9A0" fontSize="22" fontWeight="bold" fontFamily="Plus Jakarta Sans, sans-serif">
            METROPULSE · PLATFORM 01
          </text>
          {/* Platform */}
          <rect x="0" y="310" width="1200" height="110" fill="#3D2E20" />
          <rect x="0" y="308" width="1200" height="8" fill="#C8792C" />
          {/* Architectural Metro Train */}
          <g transform="translate(180, 170)">
            <rect x="0" y="0" width="760" height="130" rx="14" fill="#E8C98E" stroke="#5B4632" strokeWidth="4" />
            <rect x="0" y="92" width="760" height="38" rx="6" fill="#5B4632" />
            <rect x="0" y="84" width="760" height="8" fill="#C8792C" />
            {[45, 220, 420, 595].map((wx) => (
              <rect key={wx} x={wx} y="24" width="90" height="48" rx="4" fill="#231A12" stroke="#5B4632" strokeWidth="2" />
            ))}
            {/* Interactive Train Door Pair */}
            <rect x="150" y="18" width="52" height="110" fill={doorsOpen ? '#F4D9A0' : '#C8792C'} stroke="#231A12" strokeWidth="2" />
            <rect x="520" y="18" width="52" height="110" fill={doorsOpen ? '#F4D9A0' : '#C8792C'} stroke="#231A12" strokeWidth="2" />
            <circle cx="746" cy="108" r="7" fill="#F4D9A0" />
          </g>
        </svg>

        <div className="absolute bottom-5 right-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleDoors}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B4632] text-[#F4D9A0] border border-[#F4D9A0]/35 rounded-sm text-xs font-semibold hover:bg-[#6E563F]"
          >
            <DoorOpen className="w-4 h-4 text-[#C8792C]" aria-hidden="true" />
            <span>{doorsOpen ? 'Close Train Doors' : 'Open Train Doors'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        data-testid="train-webgl-canvas"
        className="w-full h-full"
        aria-label="Interactive 3D MetroPulse station and metro train"
      />
      {hoveredDoor && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#231A12] border border-[#F4D9A0]/40 text-[#F4D9A0] text-xs font-medium rounded-sm">
          Click train door area to {doorsOpen ? 'close' : 'open'} boarding doors
        </div>
      )}
    </div>
  );
}

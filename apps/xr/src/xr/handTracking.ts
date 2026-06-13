import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { HandFrame, Joint } from "@pinch/protocol";

const JOINT_COUNT = 26;

// Offset from head origin to nose bridge (metres, in local head space)
const GLASSES_OFFSET = new THREE.Vector3(0, -0.045, -0.09);
// The model is in centimetre scale and needs an additional flip to face forward
const GLASSES_SCALE = 0.001;

export function startHandTracking(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.xr.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const jointMeshes: { left: THREE.Mesh[]; right: THREE.Mesh[] } = {
    left: makeDots(scene),
    right: makeDots(scene),
  };

  let glasses: THREE.Group | null = null;

  new GLTFLoader().load("/assets/glasses/scene.gltf", (gltf) => {
    glasses = gltf.scene;
    glasses.scale.setScalar(GLASSES_SCALE);
    glasses.visible = false;
    scene.add(glasses);
  });

  let xrSession: XRSession | null = null;

  navigator.xr
    ?.requestSession("immersive-ar", { requiredFeatures: ["hand-tracking"] })
    .then((session) => {
      xrSession = session;
      renderer.xr.setSession(session as any);
      renderer.setAnimationLoop((_time, frame) => onFrame(frame));
    })
    .catch(console.error);

  const _offsetWorld = new THREE.Vector3();
  const _headQuat = new THREE.Quaternion();

  function onFrame(frame: XRFrame | undefined) {
    if (!frame || !xrSession) return;

    const refSpace = renderer.xr.getReferenceSpace();
    if (!refSpace) return;

    // --- Glasses: follow head pose ---
    if (glasses) {
      const viewerPose = frame.getViewerPose(refSpace);
      if (viewerPose) {
        const p = viewerPose.transform.position;
        const r = viewerPose.transform.orientation;
        _headQuat.set(r.x, r.y, r.z, r.w);
        _offsetWorld.copy(GLASSES_OFFSET).applyQuaternion(_headQuat);
        glasses.position.set(p.x + _offsetWorld.x, p.y + _offsetWorld.y, p.z + _offsetWorld.z);
        glasses.quaternion.copy(_headQuat);
        glasses.visible = true;
      } else {
        glasses.visible = false;
      }
    }

    // --- Hand joints ---
    const hands: Record<"left" | "right", XRHand | undefined> = {
      left: undefined,
      right: undefined,
    };

    for (const inputSource of xrSession.inputSources) {
      if (inputSource.hand && (inputSource.handedness === "left" || inputSource.handedness === "right")) {
        hands[inputSource.handedness] = inputSource.hand;
      }
    }

    const frameData: HandFrame = { frame: frame.predictedDisplayTime, ts: performance.now(), left: null, right: null };

    for (const side of ["left", "right"] as const) {
      const hand = hands[side];
      const meshes = jointMeshes[side];

      if (!hand) {
        meshes.forEach((m) => (m.visible = false));
        continue;
      }

      const joints: (Joint | null)[] = [];
      let tracked = 0;
      let i = 0;

      for (const [, jointSpace] of hand.entries()) {
        const pose = frame.getJointPose?.(jointSpace, refSpace!);
        if (pose && i < JOINT_COUNT) {
          const p = pose.transform.position;
          const r = pose.transform.orientation;
          joints.push({ pos: [p.x, p.y, p.z], rot: [r.x, r.y, r.z, r.w] });
          meshes[i].position.set(p.x, p.y, p.z);
          meshes[i].visible = true;
          tracked++;
        } else {
          joints.push(null);
          if (i < JOINT_COUNT) meshes[i].visible = false;
        }
        i++;
      }

      frameData[side] = { n: tracked, joints };
    }

    renderer.render(scene, camera);
    broadcast(frameData);
  }

  function broadcast(_frame: HandFrame) {
    // TODO: wire to relay transport
  }

  return () => {
    renderer.setAnimationLoop(null);
    xrSession?.end().catch(() => {});
    renderer.dispose();
  };
}

function makeDots(scene: THREE.Scene): THREE.Mesh[] {
  const geo = new THREE.SphereGeometry(0.006, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  return Array.from({ length: JOINT_COUNT }, () => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });
}

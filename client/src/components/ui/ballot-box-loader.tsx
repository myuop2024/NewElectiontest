import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BallotBoxLoaderProps {
  message?: string;
}

export default function BallotBoxLoader({ message = "Loading CAFFE Electoral Platform..." }: BallotBoxLoaderProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ballotBox: THREE.Group;
    ballot: THREE.Mesh;
    hand: THREE.Group;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 300);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ballot Box
    const ballotBoxGroup = new THREE.Group();
    
    // Box body
    const boxGeometry = new THREE.BoxGeometry(3, 2, 2);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.castShadow = true;
    box.receiveShadow = true;
    ballotBoxGroup.add(box);

    // Box lid
    const lidGeometry = new THREE.BoxGeometry(3.2, 0.2, 2.2);
    const lidMaterial = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = 1.1;
    lid.castShadow = true;
    ballotBoxGroup.add(lid);

    // Slot on lid
    const slotGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.1);
    const slotMaterial = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const slot = new THREE.Mesh(slotGeometry, slotMaterial);
    slot.position.y = 1.15;
    ballotBoxGroup.add(slot);

    // CAFFE logo on box
    const logoGeometry = new THREE.PlaneGeometry(1, 0.5);
    const logoMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.set(0, 0, 1.01);
    ballotBoxGroup.add(logo);

    ballotBoxGroup.position.y = -0.5;
    scene.add(ballotBoxGroup);

    // Ballot paper
    const ballotGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const ballotMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide 
    });
    const ballot = new THREE.Mesh(ballotGeometry, ballotMaterial);
    ballot.castShadow = true;
    ballot.position.set(0, 2, 0);
    ballot.rotation.x = Math.PI / 6;
    scene.add(ballot);

    // Hand (simplified)
    const handGroup = new THREE.Group();
    
    // Palm
    const palmGeometry = new THREE.SphereGeometry(0.3, 8, 6);
    const handMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
    const palm = new THREE.Mesh(palmGeometry, handMaterial);
    palm.scale.set(1, 0.6, 0.8);
    handGroup.add(palm);

    // Fingers
    for (let i = 0; i < 4; i++) {
      const fingerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4);
      const finger = new THREE.Mesh(fingerGeometry, handMaterial);
      finger.position.set(-0.15 + i * 0.1, 0.2, 0.2);
      finger.rotation.x = Math.PI / 4;
      handGroup.add(finger);
    }

    // Thumb
    const thumbGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3);
    const thumb = new THREE.Mesh(thumbGeometry, handMaterial);
    thumb.position.set(0.25, 0, 0.1);
    thumb.rotation.z = Math.PI / 3;
    handGroup.add(thumb);

    handGroup.position.set(0, 2.5, 0);
    scene.add(handGroup);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xe5e7eb });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);

    // Animation
    let time = 0;
    let ballotDropped = false;
    
    const animate = () => {
      time += 0.02;
      
      // Floating ballot animation
      if (!ballotDropped) {
        ballot.position.y = 2 + Math.sin(time * 2) * 0.1;
        ballot.rotation.z = Math.sin(time) * 0.1;
        
        // Hand holding ballot
        handGroup.position.y = 2.5 + Math.sin(time * 2) * 0.1;
        handGroup.rotation.z = Math.sin(time * 0.5) * 0.05;
        
        // Drop ballot after some time
        if (time > 3) {
          ballotDropped = true;
        }
      } else {
        // Ballot dropping animation
        ballot.position.y -= 0.05;
        ballot.rotation.x += 0.02;
        
        // Hand moving away
        handGroup.position.y += 0.03;
        handGroup.position.x += 0.02;
        
        // Reset animation when ballot reaches box
        if (ballot.position.y < 0.5) {
          ballot.position.set(0, 2, 0);
          ballot.rotation.set(Math.PI / 6, 0, 0);
          handGroup.position.set(0, 2.5, 0);
          handGroup.rotation.set(0, 0, 0);
          ballotDropped = false;
          time = 0;
        }
      }
      
      // Gentle box rotation
      ballotBoxGroup.rotation.y = Math.sin(time * 0.3) * 0.05;
      
      renderer.render(scene, camera);
      sceneRef.current!.animationId = requestAnimationFrame(animate);
    };

    sceneRef.current = {
      scene,
      camera,
      renderer,
      ballotBox: ballotBoxGroup,
      ballot,
      hand: handGroup,
      animationId: 0
    };

    animate();

    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        if (mountRef.current && sceneRef.current.renderer.domElement) {
          mountRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current.renderer.dispose();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="text-center">
        {/* 3D Scene */}
        <div ref={mountRef} className="mx-auto mb-8 rounded-lg shadow-2xl bg-white p-4" />
        
        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">
            CAFFE Electoral Observer
          </h2>
          <p className="text-lg text-gray-600">{message}</p>
          
          {/* Loading Animation */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          {/* Subtitle */}
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Securing Democracy Through Technology
          </p>
        </div>
      </div>
    </div>
  );
}
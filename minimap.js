// minimap.js
// Minimappa stile GTA per Three.js
import * as THREE from 'three';

export class Minimap {
    constructor(mainScene, playerObject, modelBoundingBox) {
        this.size = 180; // px
        this.scene = mainScene;
        this.player = playerObject;
        this.modelBoundingBox = modelBoundingBox;
        this.baseZoom = 18; // più basso = più zoom
        this.minimapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        this.minimapCamera.up.set(0, 0, -1); // Z verso l'alto
        this.minimapCamera.lookAt(new THREE.Vector3(0, 0, 0));
        this.renderer = null;
        this.domElement = null;
        // Luce ambientale forte solo per la minimappa
        this.minimapLight = new THREE.AmbientLight(0xffffff, 2.2);
        this.scene.add(this.minimapLight);
        // Indicatore 3D (pallino) per il player, solo layer minimappa
        this.playerIndicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00fff7 })
        );
        this.playerIndicator.layers.set(1); // layer 1 solo minimappa
        this.scene.add(this.playerIndicator);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.size, this.size);
        this.renderer.setClearColor(0xf0f0f0, 1.0); // sfondo chiaro
        this.domElement = this.renderer.domElement;
        this.domElement.style.position = 'absolute';
        this.domElement.style.right = '24px';
        this.domElement.style.bottom = '24px';
        this.domElement.style.border = '3px solid #00fff7';
        this.domElement.style.borderRadius = '16px';
        this.domElement.style.boxShadow = '0 0 24px #00fff799';
        this.domElement.style.background = 'rgba(240,240,240,0.92)';
        this.domElement.style.zIndex = '1001';
        document.body.appendChild(this.domElement);
    }

    // Utility: forza i materiali a bianco brillante e wireframe per la sola minimappa
    setModelWhiteWire(model) {
        model.traverse(child => {
            if (child.isMesh) {
                if (!child.userData._originalMaterial) {
                    child.userData._originalMaterial = child.material;
                }
                child.material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
            }
        });
    }
    // Utility: ripristina i materiali originali
    restoreModelMaterials(model) {
        model.traverse(child => {
            if (child.isMesh && child.userData._originalMaterial) {
                child.material = child.userData._originalMaterial;
                delete child.userData._originalMaterial;
            }
        });
    }

    update() {
        if (!this.renderer || !this.player) return;
        // Forza modello bianco wireframe
        this.setModelWhiteWire(this.scene);
        // Aggiorna posizione indicatore player
        this.playerIndicator.position.copy(this.player.position);
        this.playerIndicator.position.y += 1.5; // leggermente sopra il player
        // Centra la camera sulla posizione del player
        const pos = this.player.position.clone();
        const zoom = this.baseZoom;
        this.minimapCamera.left = -zoom;
        this.minimapCamera.right = zoom;
        this.minimapCamera.top = zoom;
        this.minimapCamera.bottom = -zoom;
        // Camera più bassa per visibilità
        this.minimapCamera.position.set(pos.x, 10, pos.z);
        this.minimapCamera.lookAt(pos.x, pos.y, pos.z);
        // Ruota la camera di 180° per non avere la mappa capovolta
        this.minimapCamera.rotation.z = Math.PI;
        this.minimapCamera.updateProjectionMatrix();
        // Layers: solo layer 1 (minimappa)
        this.minimapCamera.layers.set(1);
        this.minimapLight.intensity = 2.2;
        // Render solo layer minimappa
        this.scene.traverse(obj => {
            if (obj.isMesh) obj.layers.enable(1);
        });
        this.renderer.render(this.scene, this.minimapCamera);
        // Ripristina materiali
        this.restoreModelMaterials(this.scene);
        // Overlay 2D: bordo
        const ctx = this.domElement.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, this.size, this.size);
            ctx.save();
            ctx.strokeStyle = '#00fff7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.size/2, this.size/2, this.size/2-2, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// Questo file serve per caricare una environment map HDRI in Three.js
// Usa questo modulo nel tuo game-viewer.html
import * as THREE from 'three';
import { RGBELoader } from 'three-stdlib';

export function loadEnvironmentMap(renderer, scene, callback) {
    // Percorso HDRI (deve essere presente nella cartella 'textures/')
    const hdriPath = 'textures/studio_small_09_1k.hdr';
    new RGBELoader().load(hdriPath, function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        if (renderer) renderer.toneMappingExposure = 1.1;
        if (callback) callback(texture);
    });
}

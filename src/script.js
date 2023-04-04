import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'
import * as dat from 'lil-gui'
import { gsap } from 'gsap'


console.clear()

/**
 * Base
 */
// Debug Panel
const gui = new dat.GUI()
gui.close()

const debugObject = {
    firefliesCount: 30,
    portalColorStart: '#fff',
    portalColorEnd: '#aacd2d',
}

// DOM Nodes
const canvas = document.querySelector('canvas.webgl')
const loadingBarP = document.querySelector('.loading-bar-wrapper p span')
const loadingBar = document.querySelector('.loading-bar')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Loading Manager
const loadingManager = new THREE.LoadingManager(
    () => 
    {
        gsap.delayedCall(0.5, () => {
            gsap.to(overlay.material.uniforms.uAlpha, { duration: 2.5, value: 0 })
            gsap.to('.loading-bar-p', {duration: 1, opacity: 0})

            loadingBar.classList.add('ended')
            loadingBar.style.transform = ''
        })
    },
    (path, loaded, total) => 
    {
        const progressRatio = loaded / total
        const percentage = Math.ceil(progressRatio * 100)
        loadingBarP.textContent = percentage

        loadingBar.style.transform = `scaleX(${ progressRatio })`
    }
)

// Texture loader
const textureLoader = new THREE.TextureLoader(loadingManager)

// GLTF loader
const gltfLoader = new GLTFLoader(loadingManager)

/**
 * Textures
 */
const bakedTexture = textureLoader.load('/my_r/Baked.jpg')
bakedTexture.flipY = false
bakedTexture.encoding = THREE.sRGBEncoding

/**
 * Materials
 */
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xFF9080 })
const portalLightMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        uTime: { value: 0 },
        uStartColor: { value: new THREE.Color(debugObject.portalColorStart) },
        uEndColor: { value: new THREE.Color(debugObject.portalColorEnd) },
    },
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
})

gui.addColor(debugObject, 'portalColorStart')
    .onChange(() => portalLightMaterial.uniforms.uStartColor.value.set(debugObject.portalColorStart))

gui.addColor(debugObject, 'portalColorEnd')
    .onChange(() => portalLightMaterial.uniforms.uEndColor.value.set(debugObject.portalColorEnd))

/**
 * Objects
 */
// GLTF Model
gltfLoader.load(
    '/my_r/Portal.glb',
    (gltf) => 
    {
        const bakedMesh = gltf.scene.children.find((child) => child.name === 'Cube051')
        const portalLight = gltf.scene.children.find((child) => child.name === 'Circle')
        const poleLightA = gltf.scene.children.find((child) => child.name === 'Cube011')
        const poleLightB = gltf.scene.children.find((child) => child.name === 'Cube014')

        bakedMesh.material = bakedMaterial
        portalLight.material = portalLightMaterial
        poleLightA.material = poleLightMaterial
        poleLightB.material = poleLightMaterial

        scene.add(gltf.scene)
    } 
)

// Fireflies
const firefliesGeometry = new THREE.BufferGeometry()

const positions = new Float32Array(debugObject.firefliesCount * 3)
const aScale = new Float32Array(debugObject.firefliesCount)

for(let i=0; i<debugObject.firefliesCount; i++)
{
    const i3 = i * 3

    positions[i3 + 0] = (Math.random() - 0.5) * 7
    positions[i3 + 1] = Math.random() * 1.5
    positions[i3 + 2] = (Math.random() - 0.5) * 7

    aScale[i] = (Math.random() * 0.5) + 1
}

firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1))

const firefliesMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 100 },
        uTime: { value: 0 }
    },
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
})

const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
scene.add(fireflies)

// Black Screen Overlay
const overlayGeometry = new THREE.PlaneGeometry(2, 2)
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;
        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `
})

const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Update Uniform
    firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 7   
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding

debugObject.clearColor = '#201919'
renderer.setClearColor(debugObject.clearColor)

gui.addColor(debugObject, 'clearColor')
    .onChange(() => renderer.setClearColor(debugObject.clearColor))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update uniforms
    portalLightMaterial.uniforms.uTime.value = firefliesMaterial.uniforms.uTime.value = elapsedTime

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
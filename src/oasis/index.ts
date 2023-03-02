import {
  Camera,
  MeshRenderer,
  Vector3,
  WebGLEngine,
  GLTFResource,
  Script,
  Logger,
  Color,
  Texture2D,
  Vector4,
  Vector2,
  ColorSpace,
  PBRMaterial,
  RenderQueueType,
  RenderTarget,
  TextureWrapMode,
  Entity,
  CameraClearFlags,
  TextureFormat,
  TextureDepthCompareFunction,
  WebGLMode,
  DirectLight,
  AmbientLight,
  AssetType,
  SkyBoxMaterial,
  BackgroundMode,
  PrimitiveMesh,
  TextureFilterMode,
  RenderFace,
} from 'oasis-engine'
import { OrbitControl } from '@oasis-engine-toolkit/controls'
import { ToonWaterMat } from './mats'
import { Stats } from 'oasis-engine-toolkit'

let waterMat: ToonWaterMat
let waterMeshRenderer: MeshRenderer
let waterEntity: Entity

export async function initScene() {
  Logger.enable()

  // 引擎和场景
  const engine = new WebGLEngine('canvas', {
    webGLMode: WebGLMode.WebGL2,
  })
  engine.canvas.resizeByClientSize()
  engine.settings.colorSpace = ColorSpace.Gamma

  const scene = engine.sceneManager.activeScene
  scene.background.solidColor.set(0, 0, 0, 1)
  const rootEntity = scene.createRootEntity()

  // 相机
  const cameraEntity = rootEntity.createChild('camera')
  const c = cameraEntity.addComponent(Camera)
  cameraEntity.transform.setPosition(66.8, 12.6, -40.65)
  // cameraEntity.transform.setRotation(0, -57, 0)
  c.fieldOfView = 30
  c.nearClipPlane = 10
  c.farClipPlane = 1000
  cameraEntity.addComponent(OrbitControl).target = new Vector3(-10, 12, 30)
  cameraEntity.addComponent(CameraScript)
  // cameraEntity.addComponent(Stats)

  // 光照
  const lightEntity = rootEntity.createChild('light')
  const directLight = lightEntity.addComponent(DirectLight)
  directLight.color.set(1, 0.95, 0.78, 1)
  lightEntity.transform.setRotation(-19, 231, 0)
  const sky = scene.background.sky
  const skyMaterial = new SkyBoxMaterial(engine)
  scene.background.mode = BackgroundMode.Sky
  sky.material = skyMaterial
  sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1)
  engine.resourceManager
    .load<AmbientLight>({
      type: AssetType.Env,
      url: 'https://mdn.alipayobjects.com/afts/file/A*3-WITovzlAwAAAAAAAAAAAAADrd2AQ/syferfontein_1d_clear_puresky_2k.hdr.env',
    })
    .then((ambientLight) => {
      scene.ambientLight = ambientLight
      ambientLight.diffuseIntensity = 0.5
      ambientLight.specularIntensity = 0.5
      skyMaterial.textureCubeMap = ambientLight.specularTexture
      skyMaterial.textureDecodeRGBM = true
      engine.run()
    })

  // 资源
  const [SceneGltf, RocksAtlasTex, IslandAtlasTex, WaterNormal, WaterCaustics, FoamNoiseMap] = (await engine.resourceManager.load([
    'https://mdn.alipayobjects.com/afts/file/A*r6lAT5X4Kd0AAAAAAAAAAAAADrd2AQ/island.gltf',
    'https://mdn.alipayobjects.com/afts/img/A*gDOIRbCGrBsAAAAAAAAAAAAADrd2AQ/Rocks_Albedo_Atlas.png',
    'https://mdn.alipayobjects.com/afts/img/A*J8oXQ7NNghkAAAAAAAAAAAAADrd2AQ/Island_Albedo_Atlas.png',
    'https://mdn.alipayobjects.com/afts/img/A*BOtGT6OR2g0AAAAAAAAAAAAADrd2AQ/T_Normals.png',
    'https://mdn.alipayobjects.com/afts/img/A*iJwKTKXhxR0AAAAAAAAAAAAADrd2AQ/T_Caustics02.png',
    'https://mdn.alipayobjects.com/afts/img/A*WEUtQLWiR5MAAAAAAAAAAAAADrd2AQ/Noise_6.png',
  ])) as [GLTFResource, Texture2D, Texture2D, Texture2D, Texture2D, Texture2D]

  const model = SceneGltf.defaultSceneRoot
  rootEntity.addChild(model)
  model.transform.setRotation(0, 90, 0)
  model.addComponent(UpdateTimeScript)

  const meshRenderers = model.getComponentsIncludeChildren(MeshRenderer, [])

  meshRenderers.forEach((meshRenderer) => {
    const entityName = meshRenderer.entity.name
    console.log(entityName)

    // 石头
    if (
      [
        'Stonehenge_06',
        'Stonehenge_05',
        'Stonehenge_03',
        'Stonehenge_02',
        'Rocks_Round_m_05',
        'Rocks_Round_m_01',
        'Rocks_Round_l_03',
        'Rock_Round_m_09',
        'Rock_Round_m_07',
        'Rock_Round_m_04',
        'Rock_Round_m_03',
        'Rock_Arch_04 (1)',
      ].indexOf(entityName) !== -1
    ) {
      const mat = meshRenderer.getMaterial() as PBRMaterial
      mat.baseTexture = RocksAtlasTex
      mat.roughness = 1
      mat.metallic = 0
      mat.renderFace = RenderFace.Front
      return
    }

    // 岛
    if (entityName === 'Island') {
      const mat = meshRenderer.getMaterial() as PBRMaterial
      mat.baseTexture = IslandAtlasTex
      mat.roughness = 1
      mat.metallic = 0
      mat.renderFace = RenderFace.Front
      return
    }

    // 海水
    if (entityName === 'Water') {
      const mat = new ToonWaterMat(engine, {
        // _WaveA: new Vector4(0, -1, 1.6, 50),
        // _WaveB: new Vector4(-0.5, -0.5, 1.6, 30),
        // _WaveC: new Vector4(1, 0.5, 1, 20),
        _WaveA: new Vector4(0, -2, 3.2, 50),
        _WaveB: new Vector4(-1, -1, 3.2, 30),
        _WaveC: new Vector4(2, 1, 2, 20),
        _WaveColor: new Color(0.3098039, 0.5333334, 0.7921569, 1),

        _ShallowColor: new Color(0.3215686, 0.5490196, 0.8933333, 0.3588235),

        _DeepColor: new Color(0.19803922, 0.3882353, 0.7254902, 0.2),
        _DeepRange: 5,

        _FresnelColor: new Color(0.01176471, 0.3411765, 0.9843137, 1),
        _FresnelPower: 10,

        _NormalMap: WaterNormal,
        _NormalScale: 5,
        _NormalSpeed: new Vector2(-4, 0),

        _ReflectIntensity: 0.8,
        _ReflectPower: 5,
        _ReflectDistort: 1,

        _UnderWaterDistort: 1,

        _CausticsTex: WaterCaustics,
        _CausticsScale: 8,
        _CausticsSpeed: new Vector2(-8, 0),
        _CausticsIntensity: 2.5,
        _CausticsRange: 0.6,

        _ShoreRange: 0.62,
        _ShoreColor: new Color(1, 1, 1),
        _ShoreEdgeWidth: 0.216,
        _ShoreEdgeIntensity: 0.36,

        _FoamNoiseMap: FoamNoiseMap,
        _FoamColor: new Color(1, 1, 1),
        _FoamRange: 0.8,
        _FoamSpeed: -1,
        _FoamFrequency: 10,
        _FoamWidth: 0.15,
        _FoamDissolve: 1.6,
        _FoamNoiseSize: new Vector2(5, 5),
        _FoamBlend: 0,
      })
      meshRenderer.setMaterial(mat)
      waterMat = mat
      waterMeshRenderer = meshRenderer
      waterEntity = meshRenderer.entity
    }
  })

  engine.run()
}

class UpdateTimeScript extends Script {
  time = 0
  onUpdate(deltaTime: number): void {
    this.time += deltaTime / 1000
    const renderers = this.entity.getComponentsIncludeChildren(MeshRenderer, [])
    renderers.forEach((meshRenderer) => {
      meshRenderer.getMaterial().shaderData.setFloat('u_Time', this.time)

      if (meshRenderer.entity.name === 'water') {
        meshRenderer.getMaterial().shaderData.setFloat('u_Time', this.time)
      }
    })
  }
}

// 要是可以自定义管线就好了
class CameraScript extends Script {
  width: number
  height: number

  screenRT: RenderTarget
  depthRT: RenderTarget

  private _camera: Camera

  onAwake() {
    const engine = this.engine
    const { width, height } = engine.canvas
    this.width = width
    this.height = height

    // 创建 RT
    const screenTex = new Texture2D(engine, width, height)
    screenTex.wrapModeU = screenTex.wrapModeV = TextureWrapMode.Clamp
    const depthTex = new Texture2D(engine, width, height, TextureFormat.Depth16, false)
    // bug：webgl2 要加这句才能渲染深度图
    depthTex.filterMode = TextureFilterMode.Point
    depthTex.wrapModeU = depthTex.wrapModeV = TextureWrapMode.Clamp
    // depthTex.depthCompareFunction = TextureDepthCompareFunction.Less
    this.screenRT = new RenderTarget(engine, width, height, screenTex, depthTex)

    this._camera = this.entity.getComponent(Camera)
  }

  onDisable() {
    this._camera.renderTarget = null
  }

  onBeginRender(camera: Camera): void {
    // src
    waterMeshRenderer.enabled = false
    camera.renderTarget = this.screenRT
    camera.clearFlags = CameraClearFlags.ColorDepth
    camera.render()

    // @ts-ignore
    waterMat.shaderData.setTexture('_UnderWaterTex', this.screenRT.getColorTexture())
    // @ts-ignore
    waterMat.shaderData.setTexture('_DepthTex', this.screenRT.depthTexture)
    waterMeshRenderer.enabled = true
    camera.renderTarget = null
    camera.render()
  }
}

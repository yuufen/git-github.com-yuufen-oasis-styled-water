import { Shader, Engine, Color, Vector3, Texture2D, RenderQueueType, CullMode, BaseMaterial, Vector4, Vector2, Camera } from 'oasis-engine'

interface Config {
  // 脚本给的
  // _ReflectionTex: Texture2D
  // _UnderWaterTex: Texture2D
  // _DepthTex: Texture2D

  // 波浪
  // 顶点动画
  _WaveA: Vector4 // (SpeedX, SpeedY, Steepness, wavelength)
  _WaveB: Vector4
  _WaveC: Vector4

  _WaveColor: Color // 用来模拟波浪顶上阳光的投射

  // 水的颜色
  _ShallowColor: Color
  _DeepColor: Color
  _DeepRange: number
  _FresnelColor: Color
  _FresnelPower: number

  // 法线
  _NormalMap: Texture2D
  _NormalScale: number
  _NormalSpeed: Vector2

  // 反射
  _ReflectIntensity: number
  _ReflectPower: number

  _ReflectDistort: number // 被法线扰动强度

  // 水底
  _UnderWaterDistort: number // 模拟折射

  // 焦散
  _CausticsTex: Texture2D
  _CausticsScale: number
  _CausticsSpeed: Vector2
  _CausticsIntensity: number
  _CausticsRange: number

  // 浅滩颜色手工精修
  _ShoreRange: number
  _ShoreColor: Color // 让浅滩更亮，显得水更通透
  _ShoreEdgeWidth: number
  _ShoreEdgeIntensity: number // 让边缘更亮，显得水更通透

  // 物体交界处的白色涟漪
  _FoamNoiseMap: Texture2D
  _FoamColor: Color
  _FoamRange: number
  _FoamSpeed: number
  _FoamFrequency: number
  _FoamWidth: number
  _FoamDissolve: number
  _FoamNoiseSize: Vector2
  _FoamBlend: number
}

Shader.create(
  'ToonWater',
  `
  #include <common>
  #include <common_vert>
  uniform mat4 u_VPMat;
  uniform float u_Time;
  
  uniform vec4 _WaveA;
  uniform vec4 _WaveB;
  uniform vec4 _WaveC;
  uniform vec4 _WaveColor;

  varying mat4 v_ProjectionInvMat; 

  varying vec2 v_UV; 
  varying vec4 v_PosCS;

  varying vec4 v_WaveColor; 
  varying vec3 v_PosWS; 
  varying vec3 v_NormalWS; 

  vec3 GerstnerWave(vec3 position, vec4 wave, inout vec3 tangent, inout vec3 binormal){

    float steepness = wave.z * 0.01;
    float wavelength = wave.w;
    float k = 2. * PI / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(wave.xy);
    float f = k * (dot(d, position.xz) - c * u_Time);
    float a = steepness / k;

    tangent += vec3(
    -d.x * d.x * (steepness * sin(f)),
    d.x * (steepness * cos(f)),
    -d.x * d.y * (steepness * sin(f))
    );

    binormal += vec3(
    -d.x * d.y * (steepness * sin(f)),
    d.y * (steepness * cos(f)),
    -d.y * d.y * (steepness * sin(f))
    );

    return vec3(
    d.x * (a * cos(f)),
    a * sin(f),
    d.y * (a * cos(f))
    );
  }
  
  void main(){
    v_UV=TEXCOORD_0;
    v_ProjectionInvMat = inverse(u_projMat);

    vec3 positionWS = (u_modelMat * vec4(POSITION,1.)).xyz;

    vec3 tangent = vec3(1.,0.,0.);
    vec3 binormal = vec3(0.,0.,1.);

    vec3 wave = GerstnerWave(positionWS, _WaveA, tangent, binormal);
    wave += GerstnerWave(positionWS, _WaveB, tangent, binormal);
    wave += GerstnerWave(positionWS, _WaveC, tangent, binormal);
    positionWS += wave;
    
    v_PosWS = positionWS;
    v_NormalWS = normalize(cross(binormal, tangent));
    v_WaveColor = clamp(wave.y, 0., 1.) * _WaveColor;

    gl_Position = u_VPMat*vec4(positionWS,1.);
    v_PosCS = gl_Position; // 用来计算 Screen UV
  }
  `,
  `
  uniform mat4 u_viewInvMat;
  uniform vec3 u_cameraPos;
  uniform float u_Time;
  
  uniform sampler2D _ReflectionTex;
  uniform sampler2D _UnderWaterTex;
  uniform sampler2D _DepthTex;
  
  // 水的颜色
  uniform vec4 _ShallowColor;
  uniform vec4 _DeepColor;
  uniform float _DeepRange;
  uniform vec4 _FresnelColor;
  uniform float _FresnelPower;
  
  // 法线
  uniform sampler2D _NormalMap;
  uniform float _NormalScale;
  uniform vec2 _NormalSpeed;
  
  // 反射
  uniform float _ReflectIntensity;
  uniform float _ReflectPower;
  
  uniform float _ReflectDistort;// 被法线扰动强度
  
  // 水底
  uniform float _UnderWaterDistort;// 模拟折射
  
  // 焦散
  uniform sampler2D _CausticsTex;
  uniform float _CausticsScale;
  uniform vec2 _CausticsSpeed;
  uniform float _CausticsIntensity;
  uniform float _CausticsRange;
  
  // 浅滩颜色手工精修
  uniform float _ShoreRange;
  uniform vec4 _ShoreColor;// 让浅滩更亮，显得水更通透
  uniform float _ShoreEdgeWidth;
  uniform float _ShoreEdgeIntensity;// 让边缘更亮，显得水更通透
  
  // 物体交界处的白色涟漪
  uniform sampler2D _FoamNoiseMap;
  uniform vec4 _FoamColor;
  uniform float _FoamRange;
  uniform float _FoamSpeed;
  uniform float _FoamFrequency;
  uniform float _FoamWidth;
  uniform float _FoamDissolve;
  uniform vec2 _FoamNoiseSize;
  uniform float _FoamBlend;
  
  varying vec2 v_UV;
  varying vec4 v_PosCS;
  varying mat4 v_ProjectionInvMat;
  
  varying vec4 v_WaveColor;
  varying vec3 v_PosWS;
  varying vec3 v_NormalWS;
  
  vec3 unpackNormal(vec4 packednormal){
    return packednormal.xyz*2.-1.;
  }
  
  vec3 blendedNormal(vec3 A,vec3 B){
    return normalize(vec3(A.xy+B.xy,A.z*B.z));
  }
  
  void main(){
    vec2 screenUV=v_PosCS.xy/v_PosCS.w;
    screenUV=(screenUV+1.)/2.;
    
    // ------- 深度重建 -------
    float depth=texture2D(_DepthTex,screenUV).r;
    // 使用逆矩阵重建世界坐标
    // 设: M为VP矩阵, M^-1即为其逆矩阵, Clip为裁剪空间, ndc为标准设备空间, world为世界空间
    // 已知条件:
    // ndc = Clip.xyzw / Clip.w = Clip / Clip.w
    // world = M^-1 * Clip
    // world.w = 1
    // 得:
    // world = M ^-1 * ndc * Clip.w
    // world.w = (M^-1 * ndc).w * Clip.w = 1
    // 进而得: Clip.w = 1 / (M^ -1 * ndc).w
    // 代入得到: world = (M ^ - 1 * ndc) / (M ^ - 1 * ndc).w
    // 详见 http://feepingcreature.github.io/math.html
    vec3 posNDC=vec3(screenUV,depth)*2.-1.;
    vec4 posWSFromDepth=u_viewInvMat*v_ProjectionInvMat*vec4(posNDC,1.);
    posWSFromDepth/=posWSFromDepth.w;
    
    // 水深
    float waterDepth=v_PosWS.y-posWSFromDepth.y;
    // 因为没有海底，限制一下最大值，
    waterDepth=min(waterDepth,4.7);
    
    // ------- WaterColor -------
    float deepTerm=clamp(exp(-waterDepth/_DeepRange),0.,1.);
    vec4 waterColor=mix(_DeepColor,_ShallowColor,deepTerm);
    
    vec3 viewDir=normalize(u_cameraPos-v_PosWS);
    float fresnel=1.-dot(v_NormalWS,viewDir);
    fresnel=pow(fresnel,_FresnelPower);
    waterColor=mix(waterColor,_FresnelColor,fresnel);
    float waterOpacity=waterColor.a;
    
    // ------- SurfaceNormal -------
    vec3 surfaceNormal=vec3(0.,0.,0.);
    {
      vec2 tiling=v_PosWS.xz*-.1/_NormalScale;
      vec2 offset=_NormalSpeed*u_Time*.01;
      vec2 uv1=tiling+offset;
      vec2 uv2=tiling*2.2+offset*.5;
      vec3 normal1=unpackNormal(texture2D(_NormalMap,uv1));
      vec3 normal2=unpackNormal(texture2D(_NormalMap,uv2));
      surfaceNormal=blendedNormal(normal1,normal2);
    }
    
    // ------- CausticsColor -------
    vec3 causticsColor=vec3(0.,0.,0.);
    {
      vec2 tiling=posWSFromDepth.xz/_CausticsScale;// 从上往下投射纹理
      vec2 offset=_CausticsSpeed*u_Time*.01;
      vec2 uv1=tiling+offset;
      vec2 uv2=tiling*-1.+offset;
      vec3 caustic1=texture2D(_CausticsTex,uv1).rgb;
      vec3 caustic2=texture2D(_CausticsTex,uv2).rgb;
      vec3 caustic=min(caustic1,caustic2);// 让维诺图在原地移动
      float mask=clamp(exp(-waterDepth/_CausticsRange),0.,1.);
      causticsColor=caustic*mask*_CausticsIntensity;
    }
    
    // ------- UnderWaterColor -------
    vec2 normalDistort=surfaceNormal.xy*_UnderWaterDistort*.01;
    vec3 screenColor=texture2D(_UnderWaterTex,screenUV+normalDistort).rgb;
    vec3 underWaterColor=screenColor+causticsColor;
    
    // ------- WaterShore 岸边颜色精修 -------
    float waterShoreMask=clamp(exp(-waterDepth/_ShoreRange),0.,1.);
    vec3 shoreColor=(screenColor*_ShoreColor.rgb).rgb;// 岸边水底颜色调整（比较透亮）
    float shoreEdge=smoothstep(1.-_ShoreEdgeWidth,1.1,waterShoreMask);
    shoreEdge*=_ShoreEdgeIntensity;// 波浪结束的地方，水会有一个弧度，产生凸透镜的作用，导致那块异常的亮
    
    // ------- FoamColor 白色泡沫 -------
    float range=clamp(waterDepth/_FoamRange,0.,1.);
    float foamMask=1.-smoothstep(_FoamBlend,1.,range);// 越靠近岸边越大，和 foamGradient 双重控制
    float foamGradient=1.-range;// 越靠近岸边越大
    float foamSin=sin(foamGradient*_FoamFrequency+_FoamSpeed*u_Time);
    float noise=texture2D(_FoamNoiseMap,v_UV*_FoamNoiseSize).r;
    float foamControler=foamSin+noise;
    foamControler+=foamGradient;// 越靠近岸边，越粗
    foamControler-=_FoamDissolve;// 控制粗细
    foamControler=step(foamGradient-_FoamWidth,foamControler);// 让它一条一条。使用 foamGradient 是为了越靠近岸边越稀疏。
    vec4 foamColor=_FoamColor*foamControler*foamMask;// 乘 foamMask，让它淡入
    
    // ------- Final -------
    vec3 final=vec3(0.,0.,0.);
    final=waterColor.rgb+v_WaveColor.rgb;
    final=mix(final,underWaterColor,waterOpacity);
    final=mix(final,shoreColor,waterShoreMask);
    final=mix(final,final+foamColor.rgb,foamColor.a);
    final+=shoreEdge;
    
    gl_FragColor=vec4(final,1.);
  }
  
  
`,
)

export class ToonWaterMat extends BaseMaterial {
  constructor(engine: Engine, config: Config) {
    super(engine, Shader.find('ToonWater'))

    this.shaderData.setFloat('u_Time', 0)
    this.shaderData.setTexture('_ReflectionTex', new Texture2D(engine, 1, 1))
    this.shaderData.setTexture('_UnderWaterTex', new Texture2D(engine, 1, 1))
    this.shaderData.setTexture('_DepthTex', new Texture2D(engine, 1, 1))

    this.shaderData.setVector4('_WaveA', config._WaveA)
    this.shaderData.setVector4('_WaveB', config._WaveB)
    this.shaderData.setVector4('_WaveC', config._WaveC)
    this.shaderData.setColor('_WaveColor', config._WaveColor)
    this.shaderData.setColor('_ShallowColor', config._ShallowColor)
    this.shaderData.setColor('_DeepColor', config._DeepColor)
    this.shaderData.setFloat('_DeepRange', config._DeepRange)
    this.shaderData.setColor('_FresnelColor', config._FresnelColor)
    this.shaderData.setFloat('_FresnelPower', config._FresnelPower)
    this.shaderData.setTexture('_NormalMap', config._NormalMap)
    this.shaderData.setFloat('_NormalScale', config._NormalScale)
    this.shaderData.setVector2('_NormalSpeed', config._NormalSpeed)
    this.shaderData.setFloat('_ReflectIntensity', config._ReflectIntensity)
    this.shaderData.setFloat('_ReflectPower', config._ReflectPower)
    this.shaderData.setFloat('_ReflectDistort', config._ReflectDistort)
    this.shaderData.setFloat('_UnderWaterDistort', config._UnderWaterDistort)
    this.shaderData.setTexture('_CausticsTex', config._CausticsTex)
    this.shaderData.setFloat('_CausticsScale', config._CausticsScale)
    this.shaderData.setVector2('_CausticsSpeed', config._CausticsSpeed)
    this.shaderData.setFloat('_CausticsIntensity', config._CausticsIntensity)
    this.shaderData.setFloat('_CausticsRange', config._CausticsRange)
    this.shaderData.setFloat('_ShoreRange', config._ShoreRange)
    this.shaderData.setColor('_ShoreColor', config._ShoreColor)
    this.shaderData.setFloat('_ShoreEdgeWidth', config._ShoreEdgeWidth)
    this.shaderData.setFloat('_ShoreEdgeIntensity', config._ShoreEdgeIntensity)
    this.shaderData.setTexture('_FoamNoiseMap', config._FoamNoiseMap)
    this.shaderData.setColor('_FoamColor', config._FoamColor)
    this.shaderData.setFloat('_FoamRange', config._FoamRange)
    this.shaderData.setFloat('_FoamSpeed', config._FoamSpeed)
    this.shaderData.setFloat('_FoamFrequency', config._FoamFrequency)
    this.shaderData.setFloat('_FoamWidth', config._FoamWidth)
    this.shaderData.setFloat('_FoamDissolve', config._FoamDissolve)
    this.shaderData.setVector2('_FoamNoiseSize', config._FoamNoiseSize)
    this.shaderData.setFloat('_FoamBlend', config._FoamBlend)

    this.setState()
  }

  setState() {
    const renderState = this.renderState
    // 深度写入
    // renderState.depthState.writeEnabled = false;
    // 渲染队列
    renderState.renderQueueType = RenderQueueType.AlphaTest
    // 背面剔除
    renderState.rasterState.cullMode = CullMode.Off
  }
}

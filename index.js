import * as THREE from 'three';

import metaversefile from 'metaversefile';
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const {useApp, useFrame, useInternals, useLocalPlayer,useLoaders,useCameraManager} = metaversefile;



export default () => {
    const app = useApp();
    const {renderer, camera} = useInternals();
    const cameraManager = useCameraManager();
    const localPlayer = useLocalPlayer();
    const textureLoader = new THREE.TextureLoader();
    const wave2 = textureLoader.load(`${baseUrl}/textures/wave2.jpeg`)
    const textureGas = textureLoader.load(`${baseUrl}/textures/gas8.jpeg`)
    const sparkleTexture = new THREE.TextureLoader().load(`${baseUrl}/textures/sparkle4.png`);
    const noiseMap = textureLoader.load(`${baseUrl}/textures/noise.jpg`);
    
    let narutoRunTime=0;
    //################################################ trace narutoRun Time ########################################
    {
        useFrame(() => {
            
            //console.log(camera.rotation.y-localPlayer.rotation.y);
            //console.log(localPlayer.actionInterpolants.jump)
            if (localPlayer.hasAction('narutoRun') ){
                    narutoRunTime++;
                    
                }
                else{
                    narutoRunTime=0;
                    
                }
                
            
        });
    }
    //###################################### front wave ###########################################
    {
        const geometry = new THREE.SphereBufferGeometry(1.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.5);
        const material2 = new THREE.ShaderMaterial({
          uniforms: {
            uTime: {
              type: "f",
              value: 0.0
            },
            strength: {
                value: 0.01
            },
            color: {
                value: new THREE.Vector3(0.95,0.45,.25)
            },
            
          },
          vertexShader: `\
              
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
           
          
            varying vec2 vUv;
            varying vec3 vPos;
    
            void main() {
                vUv = uv;
                vPos=position;
                vec3 pos = vec3(position.x,position.y,position.z);
                if(pos.y >= 1.87){
                    pos = vec3(position.x*(sin((position.y - 0.6)*1.27)-0.16),position.y,position.z*(sin((position.y - 0.6)*1.27)-0.16));
                } else{
                    pos = vec3(position.x*(sin((position.y/2. -  .01)*.11)+0.75),position.y,position.z*(sin((position.y/2. -  .01)*.11)+0.75));
                }
                gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 ); 
                ${THREE.ShaderChunk.logdepthbuf_vertex}
            }`,
          fragmentShader: `\
            
            ${THREE.ShaderChunk.emissivemap_pars_fragment}
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            varying vec2 vUv;
            varying vec3 vPos;
            uniform vec3 color;
            uniform float uTime;
            uniform float strength;
            
                  #define PI 3.1415926
    
                  float pat(vec2 uv,float p,float q,float s,float glow)
                  {
                      float z =  cos(p * uv.y/0.5) + cos(q  * uv.y/2.2) ;
    
                      z += mod((uTime*300.0 + uv.x+uv.y * s*10.)*0.5,5.0);	// +wobble
                      float dist=abs(z)*(.1/glow);
                      return dist;
                  }
    
           
            void main() {
                vec2 uv = vPos.zy;
                float d = pat(uv, 1.0, 2.0, 5.0, 0.15);		
                vec3 col = color*0.5/d;
                vec4 fragColor = vec4(col,1.0);
                gl_FragColor = fragColor;
               
                
                gl_FragColor *= vec4(sin(vUv.y) - strength);
                gl_FragColor *= vec4(smoothstep(0.01,0.928,vUv.y));
                gl_FragColor.xyz /=4.;
                gl_FragColor.b*=2.;
                gl_FragColor.a*=50.;
    
                
                ${THREE.ShaderChunk.logdepthbuf_fragment}
                ${THREE.ShaderChunk.emissivemap_fragment}
            }`,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
      
    
        
        let frontwave2=new THREE.Mesh(geometry,material2);
        frontwave2.position.y=0;
        frontwave2.setRotationFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -90 * Math.PI / 180 );
        
        const group = new THREE.Group();
        group.add(frontwave2);
        app.add(group);
        let dum = new THREE.Vector3();
        useFrame(({timestamp}) => {
            group.position.copy(localPlayer.position);
            if (localPlayer.avatar) {
                group.position.y -= localPlayer.avatar.height;
                group.position.y += 0.65;
            }
            group.rotation.copy(localPlayer.rotation);
            
            
            localPlayer.getWorldDirection(dum)
            dum = dum.normalize();
            group.position.x+=0.6*dum.x;
            group.position.z+=0.6*dum.z;
        
            if(narutoRunTime>10){
                group.scale.set(1,1,1);
            
            }
            else{
                group.scale.set(0,0,0);
            }
            material2.uniforms.uTime.value = timestamp/10000;
           
            app.updateMatrixWorld();
            
        
        });
    }
    //############################ dust #############################################
    {
        const particleCount = 100;
        const group=new THREE.Group();
        let info = {
            velocity: [particleCount]
        }
        let acc = new THREE.Vector3(-0.005, 0, -0.0095);
    
        //##################################################### get Dust geometry #####################################################
        const identityQuaternion = new THREE.Quaternion();
        const _getDustGeometry = geometry => {
            //console.log(geometry)
            const geometry2 = new THREE.BufferGeometry();
            ['position', 'normal', 'uv'].forEach(k => {
              geometry2.setAttribute(k, geometry.attributes[k]);
            });
            geometry2.setIndex(geometry.index);
            
            const positions = new Float32Array(particleCount * 3);
            const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
            geometry2.setAttribute('positions', positionsAttribute);
            const quaternions = new Float32Array(particleCount * 4);
            for (let i = 0; i < particleCount; i++) {
              identityQuaternion.toArray(quaternions, i * 4);
            }
            const quaternionsAttribute = new THREE.InstancedBufferAttribute(quaternions, 4);
            geometry2.setAttribute('quaternions', quaternionsAttribute);
    
            const startTimes = new Float32Array(particleCount);
            const startTimesAttribute = new THREE.InstancedBufferAttribute(startTimes, 1);
            geometry2.setAttribute('startTimes', startTimesAttribute);
    
            const opacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(particleCount), 1);
            opacityAttribute.setUsage(THREE.DynamicDrawUsage);
            geometry2.setAttribute('opacity', opacityAttribute);
    
            const brokenAttribute = new THREE.InstancedBufferAttribute(new Float32Array(particleCount), 1);
            brokenAttribute.setUsage(THREE.DynamicDrawUsage);
            geometry2.setAttribute('broken', brokenAttribute);
        
            return geometry2;
        };
    
        //##################################################### material #####################################################
        let dustMaterial= new THREE.MeshToonMaterial();
        dustMaterial.transparent=true; 
        dustMaterial.depthWrite=false;
        dustMaterial.alphaMap=noiseMap;
        //dustMaterial.blending= THREE.AdditiveBlending;
        //dustMaterial.side=THREE.DoubleSide;
        //dustMaterial.opacity=0.2;
    
        const uniforms = {
            uTime: {
                value: 0
            },
        }
        dustMaterial.onBeforeCompile = shader => {
            shader.uniforms.uTime = uniforms.uTime;
            shader.vertexShader = 'attribute float opacity;attribute float broken;\n varying float vOpacity; varying float vBroken; varying vec3 vPos; \n ' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              ['vec3 transformed = vec3( position );', 'vOpacity = opacity; vBroken = broken; vPos = position;'].join('\n')
            );
            shader.fragmentShader = 'uniform float uTime; varying float vBroken; varying float vOpacity; varying vec3 vPos;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader
            .replace(
                `vec4 diffuseColor = vec4( diffuse, opacity );`,
                `
                  vec4 diffuseColor = vec4( diffuse, vOpacity);
      
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <alphamap_fragment>',
                [
                  'float broken = abs( sin( 1.0 - vBroken ) ) - texture2D( alphaMap, vUv ).g;',
                  'if ( broken < 0.0001 ) discard;'
                ].join('\n')
            );
        };
        
        //##################################################### load glb #####################################################
        //let dustGeometry;
        let dustApp;
        (async () => {
            const u = `${baseUrl}/assets/smoke.glb`;
            dustApp = await new Promise((accept, reject) => {
                const {gltfLoader} = useLoaders();
                gltfLoader.load(u, accept, function onprogress() {}, reject);
                
            });
            dustApp.scene.traverse(o => {
              if (o.isMesh) {
                addInstancedMesh(o.geometry);
              }
            });
            
    
        })();
    
        
    
        //##################################################### object #####################################################
        let mesh = null;
        let dummy = new THREE.Object3D();
    
    
        function addInstancedMesh(dustGeometry) {
            const geometry = _getDustGeometry(dustGeometry);
            mesh = new THREE.InstancedMesh(geometry, dustMaterial, particleCount);
            group.add(mesh);
            app.add(group);
            setInstancedMeshPositions(mesh);
            
        }
        let matrix = new THREE.Matrix4();
        function setInstancedMeshPositions(mesh1) {
            for (let i = 0; i < mesh1.count; i++) {
                mesh.getMatrixAt(i, matrix);
                dummy.scale.x = .00001;
                dummy.scale.y = .00001;
                dummy.scale.z = .00001;
                dummy.position.x = (Math.random())*0.2;
                dummy.position.y = -0.2;
                dummy.position.z = Math.random()*5;
                dummy.rotation.x=Math.random()*i;
                dummy.rotation.y=Math.random()*i;
                dummy.rotation.z=Math.random()*i;
                info.velocity[i] = (new THREE.Vector3(
                    0,
                    0,
                    1));
                info.velocity[i].divideScalar(20);
                dummy.updateMatrix();
                mesh1.setMatrixAt(i, dummy.matrix);
            }
            mesh1.instanceMatrix.needsUpdate = true;
        }
       
    
        
        let dum = new THREE.Vector3();
        let originPoint = new THREE.Vector3(0,0,0);
        useFrame(({timestamp}) => {
    
            
    
            group.position.copy(localPlayer.position);
            group.rotation.copy(localPlayer.rotation);
            if (localPlayer.avatar) {
              group.position.y -= localPlayer.avatar.height;
              group.position.y += 0.2;
            }
            localPlayer.getWorldDirection(dum)
            dum = dum.normalize();
        
            if (mesh) {
                const opacityAttribute = mesh.geometry.getAttribute('opacity');
                const brokenAttribute = mesh.geometry.getAttribute('broken');
                const startTimesAttribute = mesh.geometry.getAttribute('startTimes');
                for (let i = 0; i < particleCount; i++) {
                    mesh.getMatrixAt(i, matrix);
                    matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                    
                    if (dummy.position.distanceTo(originPoint)>4) {
                       
                        opacityAttribute.setX(i, 1);
                        brokenAttribute.setX(i, Math.random()-0.8);
                        if( narutoRunTime>0 && !localPlayer.hasAction('fly') && !localPlayer.hasAction('jump')){
                            dummy.scale.x = 0.08;
                            dummy.scale.y = 0.08;
                            dummy.scale.z = 0.08;
                        }
                        else{
                            dummy.scale.x = .00001;
                            dummy.scale.y = .00001;
                            dummy.scale.z = .00001;
                            //opacityAttribute.setX(i, 0.01);
                        }
                        
                        
                        dummy.position.x = 0;
                        dummy.position.y = -0.1;
                        dummy.position.z = 0.25;
                        
                        info.velocity[i].x=0;
                        info.velocity[i].y=0;
                        info.velocity[i].z=1+Math.random();
                        
                            
                        info.velocity[i].divideScalar(20);
                        
                    }
                    if (dummy.position.distanceTo(originPoint)>3.2)
                        opacityAttribute.setX(i, opacityAttribute.getX(i)-0.04);
                    brokenAttribute.setX(i, brokenAttribute.getX(i)+0.02);
                        
                    dummy.rotation.x+=0.1*(Math.random()-0.5);
                    dummy.rotation.y+=0.1*(Math.random()-0.5);
                    dummy.rotation.z+=0.1*(Math.random()-0.5);
                    
                    dummy.scale.x*=1.03;
                    dummy.scale.y*=1.03;
                    dummy.scale.z*=1.03;
                    
                    
                    if(narutoRunTime==0){
                        // dummy.scale.x = .00001;
                        // dummy.scale.y = .00001;
                        // dummy.scale.z = .00001;
                        opacityAttribute.setX(i, opacityAttribute.getX(i)-0.04);
                    }
                    //acc.x=0.005*(Math.random()-0.5);
                    // if(dummy.position.distanceTo(originPoint)>3.5 && ( narutoRunTime==0))
                    //     info.velocity[i].add(acc);
                    dummy.position.add(info.velocity[i]);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);
    
                }
                mesh.instanceMatrix.needsUpdate = true;
                opacityAttribute.needsUpdate = true;
                brokenAttribute.needsUpdate = true;
                startTimesAttribute.needsUpdate = true;
    
            }
            group.updateMatrixWorld();
        });
      }
    // {

    //     const group=new THREE.Group();
    //     const particleCount = 65;
    //     let info = {
    //         velocity: [particleCount],
    //         rotate: [particleCount]
    //     }
    //     const acc = new THREE.Vector3(0, -0, 0);
    
    //     //######## object #########
    //     let mesh = null;
    //     let dummy = new THREE.Object3D();
    
    
    //     function addInstancedMesh() {
    //         mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 32,32), new THREE.MeshToonMaterial({color: 0xaaaaaa, transparent:true, depthWrite:false, opacity:0.7}), particleCount);
    //         group.add(mesh);
    //         app.add(group);
    //         setInstancedMeshPositions(mesh);
    //     }
    //     let matrix = new THREE.Matrix4();
    //     let position = new THREE.Vector3();
    //     function setInstancedMeshPositions(mesh1) {
    //         for (let i = 0; i < mesh1.count; i++) {
    //             mesh.getMatrixAt(i, matrix);
    //             dummy.scale.x = .00001;
    //             dummy.scale.y = .00001;
    //             dummy.scale.z = .00001;
    //             dummy.position.x = (Math.random())*0.2;
    //             dummy.position.y = -0.2;
    //             dummy.position.z = Math.random()*5;
    //             info.velocity[i] = (new THREE.Vector3(
    //                 0,
    //                 0,
    //                 1));
    //             info.velocity[i].divideScalar(20);
    //             info.rotate[i] = new THREE.Vector3(
    //                 Math.random() - 0.5,
    //                 Math.random() - 0.5,
    //                 Math.random() - 0.5);
    //             dummy.updateMatrix();
    //             mesh1.setMatrixAt(i, dummy.matrix);
    //         }
    //         mesh1.instanceMatrix.needsUpdate = true;
    //     }
    //     addInstancedMesh();
    
        
    //     let dum = new THREE.Vector3();
    //     let originPoint = new THREE.Vector3(0,0,0);
    //     useFrame(({timestamp}) => {
    //         group.position.copy(localPlayer.position);
    //         group.rotation.copy(localPlayer.rotation);
    //         if (localPlayer.avatar) {
    //           group.position.y -= localPlayer.avatar.height;
    //           group.position.y += 0.2;
    //         }
    //         localPlayer.getWorldDirection(dum)
    //         dum = dum.normalize();
        
    //         if (mesh) {
    //             for (let i = 0; i < particleCount; i++) {
    //                 mesh.getMatrixAt(i, matrix);
                    
                    
    //                 position.setFromMatrixPosition(matrix); // extract position form transformationmatrix
        
                
    //                 matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    //                 //dummy.rotation.y = timestamp/1000 * i ;
                
        
    //                 if (dummy.position.distanceTo(originPoint)>3) {
    //                     // mesh.setMatrixAt(i, matrix);
    //                     // mesh.setColorAt(i, new THREE.Color( 1.0,1.0,1.0 ));
    //                     let temp=0.5+Math.random()*0.3;
    //                     if(narutoRunTime>0 && !localPlayer.hasAction('jump')&& !localPlayer.hasAction('fly')){
    //                         dummy.scale.x = .3;
    //                         dummy.scale.y = .3;
    //                         dummy.scale.z = .3;
    //                     }
    //                     else{
    //                         dummy.scale.x = .00001;
    //                         dummy.scale.y = .00001;
    //                         dummy.scale.z = .00001;
    //                     }
                            
                        
    //                     dummy.position.x = (Math.random()-0.5)*0.2;
    //                     dummy.position.y = -0.1+ (Math.random()-0.5)*0.2;
    //                     dummy.position.z = 0;
    //                     info.velocity[i].x=0;
    //                     info.velocity[i].y=0;
    //                     info.velocity[i].z=0.5+Math.random();
    //                     info.velocity[i].divideScalar(20);
    //                 }
    //                 if(dummy.position.distanceTo(originPoint)<2.3){
    //                     dummy.scale.x*=1.01;
    //                     dummy.scale.y*=1.01;
    //                     dummy.scale.z*=1.01;
    //                 }
    //                 else{
    //                     dummy.scale.x/=1.04;
    //                     dummy.scale.y/=1.04;
    //                     dummy.scale.z/=1.04;
    //                 }
    //                 if(narutoRunTime==0 ||  localPlayer.hasAction('jump') ||  localPlayer.hasAction('fly')){
    //                     dummy.scale.x /= 1.1;
    //                     dummy.scale.y /= 1.1;
    //                     dummy.scale.z /= 1.1;
    //                 }
    //                 info.velocity[i].add(acc);
    //                 dummy.position.add(info.velocity[i]);
    //                 dummy.updateMatrix();
                    
    //                 mesh.setMatrixAt(i, dummy.matrix);
    //                 mesh.instanceMatrix.needsUpdate = true;
        
    //             }
        
        
    //         }
    //     group.updateMatrixWorld();
        
    //     });
    // }
    
    //########################################## fire front wave ##############################
    {
        const vert = `
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
            varying vec3 vNormal;
            void main() {
                    vNormal = normal;
                    vec3 pos=position;
                    if(pos.y >= 1.87){
                        pos = vec3(position.x*(sin((position.y - 0.6)*1.27)-0.16),position.y,position.z*(sin((position.y - 0.6)*1.27)-0.16));
                    } else{
                        pos = vec3(position.x*(sin((position.y/2. -  .01)*.11)+0.75),position.y,position.z*(sin((position.y/2. -  .01)*.11)+0.75));
                    }
                gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
                ${THREE.ShaderChunk.logdepthbuf_vertex}
            }

        `;

        const frag = `
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            #define NUM_OCTAVES 5
            uniform vec4 resolution;
            uniform vec3 color1;
            uniform vec3 color0;
            uniform float time;
            varying vec3 vNormal;

            float rand(vec2 n) {
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float noise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(3.0-2.0*u);

                float res = mix(
                mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
                mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
                return res*res;
            }

            float fbm(vec2 x) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100);
                // Rotate to reduce axial bias
                mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
                for (int i = 0; i < NUM_OCTAVES; ++i) {
                v += a * noise(x);
                x = rot * x * 2.0 + shift;
                a *= 0.5;
                }
                return v;
            }

            vec3 rgbcol(float r, float g, float b) {
                return vec3(r/255.0,g/255.0,b/255.0);
            }

            float setOpacity(float r, float g, float b) {
                float tone = (r + g + b) / 3.0;
                float alpha = 1.0;
                if(tone<0.95) {
                    alpha = 0.0;
                }
                return alpha;
            }

            void main()   {
                //this is for plane geometry
                //vec2 uv = gl_FragCoord.xy/resolution.xy ;

                vec2 uv = normalize( vNormal ).xy * 0.5 + 0.5; 
                vec2 newUv = uv + vec2(0.0, -time*0.001);
                float scale = 12.;
                vec2 p = newUv*scale;
                float noise = fbm( p + fbm( p ) );

                vec4 backColor = vec4(1.0 - uv.y) + vec4(vec3(noise*(1.0 - uv.y)),1.0);
                float aback = setOpacity(backColor.r,backColor.g,backColor.b);
                backColor.a = aback;
                backColor.rgb = rgbcol(color1.r,color1.g,color1.b);

                vec4 frontColor = vec4(1.08 - uv.y) + vec4(vec3(noise*(1.0 - uv.y)),1.0);
                float afront = setOpacity(frontColor.r,frontColor.g,frontColor.b);
                frontColor.a = afront ;
                frontColor.rgb = rgbcol(color0.r,color0.g,color0.b);

                // create edge
                frontColor.a = frontColor.a - backColor.a;

                if(frontColor.a>0.0){
                    // show first color
                    gl_FragColor = frontColor;
                } else {
                    // show 2nd color
                    gl_FragColor = backColor;
                }
            ${THREE.ShaderChunk.logdepthbuf_fragment}
            }

        `;
        const uniforms = {
            time: {
                type: "f",
                value: 10.0,
            },
            resolution: {
                value: new THREE.Vector2(window.innerWidth, window.innerHeight),
            },
            color1: {
                value: new THREE.Vector3(174, 30, 200),
            },
            color0: {
                value: new THREE.Vector3(200, 58, 72),
            },
        };
        const spheregeometry = new THREE.SphereGeometry(1.4, 32, 32, 0, Math.PI * 2, 0, Math.PI);
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vert,
            fragmentShader: frag,
            side:THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,

        });
        const plane = new THREE.Mesh(spheregeometry, material);
        
        //plane.position.y=1.;
        plane.rotation.y=Math.PI/1.5;
        plane.rotation.x=Math.PI/2;
        const group = new THREE.Group();
        group.add(plane);
        app.add(group)
        app.updateMatrixWorld();
        let dum = new THREE.Vector3();
        useFrame(({timestamp}) => {
            group.position.copy(localPlayer.position);
            if(localPlayer.avatar){
                group.position.y -= localPlayer.avatar.height;
                group.position.y += 0.65;
            }
            group.rotation.copy(localPlayer.rotation);
            
            localPlayer.getWorldDirection(dum)
            dum = dum.normalize();
            group.position.x+=0.6*dum.x;
            group.position.z+=0.6*dum.z;
            if(narutoRunTime>10){
                group.scale.set(1,1,1);
            }
            else{
                group.scale.set(0,0,0);
            }
            material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight, 1);
            material.uniforms.time.value = timestamp *1.;
            
            app.updateMatrixWorld();

        });
    }
    //########################################## vertical trail ######################################
    {
        const planeGeometry = new THREE.BufferGeometry();
        let planeNumber=50;
        let position= new Float32Array(18*planeNumber);
        planeGeometry.setAttribute('position', new THREE.BufferAttribute(position, 3));

        let uv = new Float32Array(12*planeNumber);
        let fraction = 1;
        let ratio = 1 / planeNumber;
        for (let i = 0; i < planeNumber; i++) {
            uv[i * 12 + 0] = 0;
            uv[i * 12 + 1] = fraction;
    
            uv[i * 12 + 2] = 1;
            uv[i * 12 + 3] = fraction;
    
            uv[i * 12 + 4] = 0;
            uv[i * 12 + 5] = fraction - ratio;
    
            uv[i * 12 + 6] = 1;
            uv[i * 12 + 7] = fraction - ratio;
    
            uv[i * 12 + 8] = 0;
            uv[i * 12 + 9] = fraction - ratio;
    
            uv[i * 12 + 10] = 1;
            uv[i * 12 + 11] = fraction;
    
            fraction -= ratio;
    
        }
        planeGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                opacity: {
                    value: 1,
                },
                textureGas: { type: 't', value: textureGas },
                // textureG: { type: 't', value: textureG },
                // textureB: { type: 't', value: textureB },
            },
            vertexShader: `\
                 
                ${THREE.ShaderChunk.common}
                ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
               
             
                uniform float uTime;
                uniform sampler2D textureGas;
                varying vec2 vUv;
               
                void main() {
                  vUv=uv;
                  //vUv.y*=1.0;
                  //vUv.x=1.-vUv.x;
                  vec3 pos=position;
                  if(vUv.y<0.99){
                    pos.x += sin(vUv.y * 20.+ uTime*10.) * 0.1;
                    pos.z += sin(vUv.y * 25.+ uTime*10.) * 0.1;
                  }
                  
                //   pos.y += sin(pos.z * 0.5+ uTime/10.) * 0.08*((1.-vUv.y)*3.);
                //   pos.y += sin(pos.x * 0.5+ uTime/10.) * 0.08*((1.-vUv.y)*3.);
                  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
                  
                  vec4 viewPosition = viewMatrix * modelPosition;
                  vec4 projectionPosition = projectionMatrix * viewPosition;
        
                  gl_Position = projectionPosition;
                  ${THREE.ShaderChunk.logdepthbuf_vertex}
                }
              `,
              fragmentShader: `\
              ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
              precision mediump float;
            //   uniform sampler2D textureR;
              uniform sampler2D textureGas;
            //   uniform sampler2D textureB;
              uniform float uTime;
              uniform float opacity;
              varying vec2 vUv;
              void main() {
                  
                vec3 texColorGas = texture2D(
                    textureGas,
                    vec2(
                        vUv.x,
                        (1.-vUv.y)*0.5
                        
                    )
                ).rgb; 
                gl_FragColor = vec4(texColorGas, 1.0);
                if(vUv.x<0.35)
                    gl_FragColor = vec4(255.,101.,195., 255.0)/255.;
                else if(vUv.x<0.7)
                    gl_FragColor = vec4(255.,229.,82.,255.)/255.;
                else
                    gl_FragColor = vec4(53.,226.,195.,255.)/255.;
                if(texColorGas.b<0.1){
                    gl_FragColor.a=0.;
                }
                gl_FragColor.a*=opacity;
                ${THREE.ShaderChunk.logdepthbuf_fragment}
              }
            `,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        //   blending: THREE.AdditiveBlending,
      });
      
      let plane=new THREE.Mesh(planeGeometry,material);
      app.add(plane);
      plane.position.y=1;
      plane.frustumCulled = false;
      let temp=[];
      let temp2=[];
      useFrame(({timestamp}) => {
        
        for(let i=0;i<18;i++){
            temp[i]=position[i];
        }
        for (let i = 0; i < planeNumber; i++){
            if(i===0){
                position[0] = localPlayer.position.x;
                position[1] = localPlayer.position.y-1.3;
                position[2] = localPlayer.position.z;
                if (localPlayer.avatar) {
                    position[1] -= localPlayer.avatar.height;
                    position[1] += 1.18;
                }
                position[3] = localPlayer.position.x;
                position[4] = localPlayer.position.y-1.7;
                position[5] = localPlayer.position.z;
                if (localPlayer.avatar) {
                    position[4] -= localPlayer.avatar.height;
                    position[4] += 1.18;
                }
            
                position[6] = temp[0];
                position[7] = temp[1];
                position[8] = temp[2];
            
                position[9] = temp[3];
                position[10] = temp[4];
                position[11] = temp[5];
            
                position[12] = temp[0];
                position[13] = temp[1];
                position[14] = temp[2];
            
                position[15] = localPlayer.position.x;
                position[16] = localPlayer.position.y-1.7;
                position[17] = localPlayer.position.z;
                if (localPlayer.avatar) {
                    position[16] -= localPlayer.avatar.height;
                    position[16] += 1.18;
                }
            }
            else{
                
                for(let j=0;j<18;j++){
                    temp2[j]=position[i*18+j];
                    position[i*18+j]=temp[j];
                    temp[j]=temp2[j];
                }
                

            }
        }
        
        plane.geometry.verticesNeedUpdate = true;
        plane.geometry.dynamic = true;
        plane.geometry.attributes.position.needsUpdate = true;
        
        material.uniforms.uTime.value = timestamp/1000;
        if(narutoRunTime>=10){
            material.uniforms.opacity.value = 1;
        }
        else{
            material.uniforms.opacity.value -= 0.05;
        }
        if(narutoRunTime>0 && narutoRunTime<10){
            material.uniforms.opacity.value = 0;
        }
       
        
        app.updateMatrixWorld();
          
      
      });
    }
//#################################### shockwave2 ########################################
  {
        const localVector = new THREE.Vector3();
        const _shake = () => {
            if (narutoRunTime >= 1 && narutoRunTime <= 5) {
                localVector.setFromMatrixPosition(localPlayer.matrixWorld);
                cameraManager.addShake( localVector, 0.2, 30, 500);
            }
        };
        let wave;
        let group = new THREE.Group();
        (async () => {
            const u = `${baseUrl}/assets/wave3.glb`;
            wave = await new Promise((accept, reject) => {
                const {gltfLoader} = useLoaders();
                gltfLoader.load(u, accept, function onprogress() {}, reject);
                
            });
            wave.scene.position.y=-5000;

            wave.scene.rotation.x=Math.PI/2;
            group.add(wave.scene);
            app.add(group);
        
        wave.scene.children[0].material= new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                opacity: {
                    value: 0,
                },
                avatarPos:{
                    value: new THREE.Vector3(0,0,0)
                },
                iResolution: { value: new THREE.Vector3() },
            },
            vertexShader: `\
                 
                ${THREE.ShaderChunk.common}
                ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
               
             
                uniform float uTime;
        
                varying vec2 vUv;
                varying vec3 vPos;

               
                void main() {
                  vUv=uv;
                  vPos=position;
                  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                  vec4 viewPosition = viewMatrix * modelPosition;
                  vec4 projectionPosition = projectionMatrix * viewPosition;
        
                  gl_Position = projectionPosition;
                  ${THREE.ShaderChunk.logdepthbuf_vertex}
                }
              `,
            fragmentShader: `\
                ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
                uniform float uTime;
                uniform float opacity;
                uniform vec3 iResolution;
                uniform vec3 avatarPos;
                varying vec2 vUv;
                varying vec3 vPos;

                float noise(vec3 point) { 
                    float r = 0.; 
                    for (int i=0;i<16;i++) {
                        vec3 D, p = point + mod(vec3(i,i/4,i/8) , vec3(4.0,2.0,2.0)) +
                        1.7*sin(vec3(i,5*i,8*i)), C=floor(p), P=p-C-.5, A=abs(P);
                        C += mod(C.x+C.y+C.z,2.) * step(max(A.yzx,A.zxy),A) * sign(P);
                        D=34.*sin(987.*float(i)+876.*C+76.*C.yzx+765.*C.zxy);P=p-C-.5;
                        r+=sin(6.3*dot(P,fract(D)-.5))*pow(max(0.,1.-2.*dot(P,P)),4.);
                    } 
                    return .5 * sin(r); 
                }

                #define TWO_PI 6.28318530718

               

                
                vec3 hsb2rgb( in vec3 c ){
                    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
                    rgb = rgb*rgb*(3.0-2.0*rgb);
                    return c.z * mix( vec3(1.0), rgb, c.y);
                }
                
                void mainImage( out vec4 fragColor, in vec2 fragCoord ){
                    
                    fragColor = vec4(
                        vPos.xy,1.0
                        , distance(avatarPos,vPos)-.95);
                        //pow(distance(avatarPos,vPos)-.95,1.)

                        // vec2 u = vPos.xz*10.;
    
                        // vec2 s = vec2(1.,1.732);
                        // vec2 a = mod(u     ,s)*2.-s;
                        // vec2 b = mod(u+s*.5,s)*2.-s;
                        
                        // fragColor = vec4(.2*min(dot(a,a),dot(b,b)));


                        
                    
                }
                
                void main() {
                    
                    vec2 st = (vUv * iResolution.xy)/iResolution.xy;
                    vec3 color = vec3(0.0);
                
                    
                    vec2 toCenter = vec2(0.5)-st;
                
                    float angle = atan(toCenter.y,toCenter.x);
                    float radius = length(toCenter)*2.0;
                
                    angle = angle + uTime;
                
                    float outsideMask = 1.0 - step(distance(st, vec2(0.5)), 0.3);
                    float insideMask = 1.0 - step(0.2, distance(st, vec2(0.5)));
                    float visibleArea = 1.0 - insideMask - outsideMask;
                
                    
                    color = hsb2rgb(vec3((angle/TWO_PI)+0.5,radius, distance(avatarPos,vPos)-.95));
                
                    gl_FragColor = vec4(color, 1.0);
                    gl_FragColor.a-=opacity;
                  ${THREE.ShaderChunk.logdepthbuf_fragment}
                }
              `,
            //side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });


    })();


    
    app.updateMatrixWorld();
    let dum = new THREE.Vector3();
    useFrame(({timestamp}) => {
        
        localPlayer.getWorldDirection(dum)
        dum = dum.normalize();

        if (wave) {
            wave.scene.scale.set(wave.scene.scale.x+.15,wave.scene.scale.y+0.001,wave.scene.scale.z+.15);
            wave.scene.children[0].material.uniforms.opacity.value+=0.005;
            if (narutoRunTime > 0) {
                // if(wave.scene.scale.x>5){
                //     // wave.scene.scale.set(10,10,10);
                //     // wave.scene.position.y=-5000;
                // }
                // else{
                    //wave.scene.scale.set(wave.scene.scale.x+.15,wave.scene.scale.y+0.00075,wave.scene.scale.z+.15);
                    if(narutoRunTime ===1){
                        group.position.copy(localPlayer.position);
                        localPlayer.getWorldDirection(localVector);
                        localVector.normalize();
                        group.position.x-=4.*localVector.x;
                        group.position.z-=4.*localVector.z;
                        group.rotation.copy(localPlayer.rotation);
                        wave.scene.position.y=0;
                        if (localPlayer.avatar) {
                            group.position.y -= localPlayer.avatar.height;
                            group.position.y += 0.65;
                        }
                        wave.scene.scale.set(1,1,1);
                        wave.scene.children[0].material.uniforms.opacity.value=0;
                    }
                    
                    if(wave.scene.scale.x<=5){
                        _shake();
                        
                    }
                    
                    
                //}
                
                
            }
            

            wave.scene.children[0].material.uniforms.uTime.value=timestamp/1000;
            wave.scene.children[0].material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
            wave.scene.children[0].material.uniforms.avatarPos.x=localPlayer.position.x;
            wave.scene.children[0].material.uniforms.avatarPos.y=localPlayer.position.y;
            wave.scene.children[0].material.uniforms.avatarPos.z=localPlayer.position.z;
        }
        
        
        app.updateMatrixWorld();
    });
  }
  //##################################### mainBall ####################################################
  {
    const particlesGeometry = new THREE.BufferGeometry()
    const count = 50;

    const positions = new Float32Array(count * 3)

    for(let i = 0; i < count; i++) 
    {
        var theta = THREE.Math.randFloatSpread(360); 
        var phi = THREE.Math.randFloatSpread(360); 

        positions[i * 3 + 0] = 0.1*Math.sin(theta) * Math.cos(phi);
        positions[i * 3 + 1] = 0.1*Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = 0.1*Math.cos(theta);

    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            opacity: {
                value: 0,
            },
            uPixelRatio: { 
                value: Math.min(window.devicePixelRatio, 2) 
            },
            uSize: { 
                value: 1 
            },
            uAvatarPos:{
                value: new THREE.Vector3(0,0,0)
            },
            uCameraFov:{
                value: 1
            }

        },
        vertexShader: `\
            
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
            
            uniform float uPixelRatio;
            uniform float uSize;
            uniform float uCameraFov;
            
            varying vec2 vUv;
            varying vec3 vPos;
            
            void main() { 
            gl_PointSize = (1000.)*uSize;
            gl_PointSize *= (uCameraFov);
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            vPos=modelPosition.xyz;
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectionPosition = projectionMatrix * viewPosition;
            gl_Position = projectionPosition;

            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            bool isPerspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 );
                if ( isPerspective ) gl_PointSize *= (1.0 / - viewPosition.z);

            ${THREE.ShaderChunk.logdepthbuf_vertex}
            }
        `,
        fragmentShader: `\
            
            
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            
            varying vec3 vPos;
            uniform vec3 uAvatarPos;
            uniform float opacity;
            
            void main() {
            
                float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                float light = 0.05 / distanceToCenter - 0.1;
                if(opacity<=0.)
                    gl_FragColor = vec4(0.9984,.4921,0.7656, light);
                else
                    gl_FragColor = vec4(0.415625,0.3984,0.3921, light);
                if(opacity<=0.)
                    gl_FragColor.a*=1.-(distance(uAvatarPos,vPos)+.5);
                gl_FragColor.a-=opacity*0.5*distanceToCenter;
                gl_FragColor.xyz-=opacity*.8;
            
                ${THREE.ShaderChunk.logdepthbuf_fragment}
            }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    

    const mainBall = new THREE.Points(particlesGeometry, particlesMaterial);
    app.add(mainBall);
    app.updateMatrixWorld();
    
    
    useFrame(({timestamp}) => {
        //console.log(camera.fov)
        mainBall.position.copy(localPlayer.position);
        //mainBall.rotation.copy(localPlayer.rotation);
        if (localPlayer.avatar) {
            mainBall.position.y -= localPlayer.avatar.height;
            mainBall.position.y += 0.65;
        }
        if(narutoRunTime>0){
            if(narutoRunTime===1){
                mainBall.material.uniforms.uSize.value=4.5;
            }
            else{
                if(mainBall.material.uniforms.uSize.value>1){
                    mainBall.material.uniforms.uSize.value/=1.1;
                }
                else{
                    mainBall.material.uniforms.uSize.value=1;
                }
            }
            mainBall.scale.x=1;
            mainBall.scale.y=1;
            mainBall.scale.z=1;
            mainBall.material.uniforms.opacity.value=0;
        }
        else{
            mainBall.scale.x-=0.1;
            mainBall.scale.y-=0.1;
            mainBall.scale.z-=0.1;
            mainBall.material.uniforms.opacity.value+=0.02;
        }
        

       
        mainBall.material.uniforms.uAvatarPos.value=mainBall.position;
        mainBall.material.uniforms.uCameraFov.value=Math.pow(60/camera.fov,1.45);
        app.updateMatrixWorld();
       
    });
}
  //##################################### main ball ##################################################
//   {
        
//     const mainBallGeometry = new THREE.SphereBufferGeometry(1.8, 32,32);
//     const instGeom = new THREE.InstancedBufferGeometry().copy(mainBallGeometry);

//     const num = 60;
//     let instPos = []; 
//     let instId = []; 
//     let instAngle = []; 
//     for (let i = 0; i < num; i++) {
//         instPos.push(0, 0, 0);
//         instId.push(i);
//         instAngle.push(0, 0, 0);
//     }
//     instGeom.setAttribute("instPos", new THREE.InstancedBufferAttribute(new Float32Array(instPos), 3));
//     instGeom.setAttribute("instId", new THREE.InstancedBufferAttribute(new Float32Array(instId), 1));
//     instGeom.setAttribute("instAngle", new THREE.InstancedBufferAttribute(new Float32Array(instAngle), 3));
//     instGeom.instanceCount = num;


//     const mainballMaterial = new THREE.ShaderMaterial({
//         uniforms: {
//             sphereNum: { value: num },
//             uTime: { value: 0 },
//             random: { value: 0 },
//             opacity: { value: 0 },
//             size: { value: 1 }
//         },
//         vertexShader: `
//             ${THREE.ShaderChunk.common}
//             ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
//             uniform float uTime;
//             uniform float size;
//             uniform float sphereNum;

//             attribute vec3 instPos;
//             attribute vec3 instAngle;
//             attribute float instId;
        
//             varying vec2 vUv;
//             varying float vId;
            
            
//             void main() {
//                 vUv=uv;
//                 vId=instId;
//                 vec3 pos = vec3(position);
//                 pos += instPos;
//                 if(vId<=32.){
//                     pos*=(instId*instId*instId*instId)/(sphereNum*sphereNum*sphereNum*sphereNum)+0.18;
//                 }
//                 else
//                     pos*=(instId*instId)/(sphereNum*sphereNum);
//                 pos*=size;
//                 gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
//                 ${THREE.ShaderChunk.logdepthbuf_vertex}
//             }
//         `,
//         fragmentShader: `
//             ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
//             uniform float uTime;
//             uniform float opacity;
//             uniform float random;
//             uniform float sphereNum;
            
//             varying vec2 vUv;
//             varying float vId;
            
//             void main() {
//                 if(vId<=52.){
//                     gl_FragColor=vec4(0.9984,.4921,0.7656,(0.9-((vId*vId)/(sphereNum*sphereNum))));
//                     if(vId>=33.99)
//                         gl_FragColor.a/=10.5;
//                     else{
//                         gl_FragColor.a/=1.2;
//                     }
                        
//                 }   
//                 else{
//                     gl_FragColor=vec4(0.9984,.4921,0.7656, 0.003*(vId/sphereNum));
//                     gl_FragColor.a/=50.;
//                 }
//                 if(vId>=23.99){
//                     gl_FragColor.a*=((vId*vId)/(sphereNum*sphereNum))*0.9;
//                 }
//                 if(vId<23.99){
//                     gl_FragColor.a*=0.05*((vId*vId)/(sphereNum*sphereNum));
//                 }
//                 if(vId>=43.99){
//                     gl_FragColor.a*=((vId*vId)/(sphereNum*sphereNum))*0.6;
//                 }
//                 gl_FragColor.a*=opacity;
//                 ${THREE.ShaderChunk.logdepthbuf_fragment}
                
//             }
//         `,
//         side: THREE.DoubleSide,
//         transparent: true,
//         depthWrite: false,
//         blending: THREE.AdditiveBlending,
//     });

//     const mainBall = new THREE.Mesh(instGeom, mainballMaterial);
//     const group = new THREE.Group();
//     group.add(mainBall)
//     app.add(group);
//     const localVector = new THREE.Vector3();
//     useFrame(({timestamp}) => {

//         group.rotation.copy(localPlayer.rotation);
//         group.position.copy(localPlayer.position);
//         localPlayer.getWorldDirection(localVector)
//         localVector.normalize();
//         group.position.x-=.1*localVector.x;
//         group.position.z-=.1*localVector.z;

        
//         if (localPlayer.avatar) {
//             group.position.y -= localPlayer.avatar.height;
//             group.position.y += 0.65;
//         }
       
//         if(narutoRunTime==0){
//             mainballMaterial.uniforms.opacity.value/=1.05;
//             mainballMaterial.uniforms.size.value/=1.01;
//         }
//         else if(narutoRunTime==1){
//             mainballMaterial.uniforms.opacity.value=1;
//             mainballMaterial.uniforms.size.value=4.5;
            
//         }
//         else if(narutoRunTime>1 ){
//             if(mainballMaterial.uniforms.size.value>1){
//                 mainballMaterial.uniforms.size.value/=1.05;
//             }
//             else{
//                 mainballMaterial.uniforms.size.value=1;
//             }
            
//         }
//         // else if(narutoRunTime>=10){
//         //     electronicball.update(timeDiff, Electronicball.UPDATES.LATE);
            
//         // }
        
//         mainballMaterial.uniforms.uTime.value=timestamp/100000;
//         app.updateMatrixWorld();
    
//     });
// }
//#################################### particle behind avatar 1 ###############################
{

    const group=new THREE.Group();
    const particleCount = 5;
    let info = {
        velocity: [particleCount],
        rotate: [particleCount]
    }
    const acc = new THREE.Vector3(0, -0, 0);

    //######## object #########
    let mesh = null;
    let dummy = new THREE.Object3D();


    function addInstancedMesh() {
        mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({map:sparkleTexture, transparent:true, depthWrite:false, opacity:1, blending:THREE.AdditiveBlending, side:THREE.DoubleSide}), particleCount);
        group.add(mesh);
        app.add(group);
        setInstancedMeshPositions(mesh);
    }
    
    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    function setInstancedMeshPositions(mesh1) {
        for (let i = 0; i < mesh1.count; i++) {
            
            mesh.getMatrixAt(i, matrix);
            dummy.scale.x = .00001;
            dummy.scale.y = .00001;
            dummy.scale.z = .00001;
            dummy.position.x = (Math.random())*0.2;
            dummy.position.y = -0.2;
            dummy.position.z = Math.random()*10;
            info.velocity[i] = (new THREE.Vector3(
                0,
                0,
                1));
            info.velocity[i].divideScalar(20);
            info.rotate[i] = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5);
            dummy.updateMatrix();
            mesh1.setMatrixAt(i, dummy.matrix);
        }
        mesh1.instanceMatrix.needsUpdate = true;
    }
    addInstancedMesh();

    
    let dum = new THREE.Vector3();
    let originPoint = new THREE.Vector3(0,0,0);
    useFrame(({timestamp}) => {
        group.position.copy(localPlayer.position);
        group.rotation.copy(localPlayer.rotation);
        if (localPlayer.avatar) {
          group.position.y -= localPlayer.avatar.height;
          group.position.y += 0.65;
        }
        localPlayer.getWorldDirection(dum)
        dum = dum.normalize();
    
        if (mesh) {
            for (let i = 0; i < particleCount; i++) {
                mesh.getMatrixAt(i, matrix);
                position.setFromMatrixPosition(matrix); 
                matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                
            
    
                if (dummy.position.distanceTo(originPoint)>5) {
                
                    if(narutoRunTime>0){
                        dummy.scale.x = .5;
                        dummy.scale.y = .5;
                        dummy.scale.z = .5;
                    }
                    else{
                        dummy.scale.x = .00001;
                        dummy.scale.y = .00001;
                        dummy.scale.z = .00001;
                    }
                        
                    
                    dummy.position.x = (Math.random()-0.5)*0.2;
                    dummy.position.y = (Math.random()-0.5)*0.5;
                    dummy.position.z = 0;
                    info.velocity[i].x=(Math.random()-0.5)*4;
                    info.velocity[i].y=(Math.random()-0.5)*4;
                    info.velocity[i].z=10+Math.random();
                    info.velocity[i].divideScalar(20);
                }
                
                dummy.scale.x/=1.04;
                dummy.scale.y/=1.04;
                dummy.scale.z/=1.04;
                
                if(narutoRunTime==0){
                    dummy.scale.x /= 1.1;
                    dummy.scale.y /= 1.1;
                    dummy.scale.z /= 1.1;
                }
                dummy.rotation.copy(camera.rotation);
                if(localPlayer.rotation.x==0){
                    dummy.rotation.y-=localPlayer.rotation.y;
                }
                else{
                    dummy.rotation.y+=localPlayer.rotation.y;
                }
                
                info.velocity[i].add(acc);
                dummy.position.add(info.velocity[i]);
                dummy.updateMatrix();
                
                mesh.setMatrixAt(i, dummy.matrix);
                mesh.instanceMatrix.needsUpdate = true;
    
            }
        }
    group.updateMatrixWorld();
    
    });
  }
  //#################################### particle behind avatar 2 ###############################
{

    const group=new THREE.Group();
    const particleCount = 5;
    let info = {
        velocity: [particleCount],
        rotate: [particleCount]
    }
    const acc = new THREE.Vector3(0, -0, 0);

    //######## object #########
    let mesh = null;
    let dummy = new THREE.Object3D();


    function addInstancedMesh() {
        mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10,10), new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false, opacity:1, blending:THREE.AdditiveBlending, side:THREE.DoubleSide}), particleCount);
        group.add(mesh);
        app.add(group);
        setInstancedMeshPositions(mesh);
    }
    
    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    function setInstancedMeshPositions(mesh1) {
        for (let i = 0; i < mesh1.count; i++) {
            
            mesh.getMatrixAt(i, matrix);
            dummy.scale.x = .00001;
            dummy.scale.y = .00001;
            dummy.scale.z = .00001;
            dummy.position.x = (Math.random())*0.2;
            dummy.position.y = -0.2;
            dummy.position.z = Math.random()*10;
            info.velocity[i] = (new THREE.Vector3(
                0,
                0,
                1));
            info.velocity[i].divideScalar(20);
            info.rotate[i] = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5);
            dummy.updateMatrix();
            mesh1.setMatrixAt(i, dummy.matrix);
        }
        mesh1.instanceMatrix.needsUpdate = true;
    }
    addInstancedMesh();

    
    let dum = new THREE.Vector3();
    let originPoint = new THREE.Vector3(0,0,0);
    let color=new THREE.Color(1.0,1.0,1.0);
    useFrame(({timestamp}) => {
        group.position.copy(localPlayer.position);
        group.rotation.copy(localPlayer.rotation);
        if (localPlayer.avatar) {
          group.position.y -= localPlayer.avatar.height;
          group.position.y += 0.65;
        }
        localPlayer.getWorldDirection(dum)
        dum = dum.normalize();
    
        if (mesh) {
            for (let i = 0; i < particleCount; i++) {
                mesh.getMatrixAt(i, matrix);
                position.setFromMatrixPosition(matrix); 
                matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                
            
    
                if (dummy.position.distanceTo(originPoint)>5) {
                    mesh.setMatrixAt(i, matrix);
                    mesh.setColorAt(i, color.set(0xffffff * Math.random()));
                    mesh.instanceMatrix.needsUpdate = true;
                    mesh.instanceColor.needsUpdate = true;
                    if(narutoRunTime>0){
                        dummy.scale.x = .5;
                        dummy.scale.y = .5;
                        dummy.scale.z = .5;
                    }
                    else{
                        dummy.scale.x = .00001;
                        dummy.scale.y = .00001;
                        dummy.scale.z = .00001;
                    }
                        
                    
                    dummy.position.x = (Math.random()-0.5)*0.2;
                    dummy.position.y = (Math.random()-0.5)*0.2;
                    dummy.position.z = 0;
                    info.velocity[i].x=(Math.random()-0.5)*2;
                    info.velocity[i].y=(Math.random()-0.5)*2;
                    info.velocity[i].z=5+Math.random();
                    info.velocity[i].divideScalar(20);
                }
                
                dummy.scale.x/=1.01;
                dummy.scale.y/=1.01;
                dummy.scale.z/=1.01;
                
                if(narutoRunTime==0){
                    dummy.scale.x /= 1.1;
                    dummy.scale.y /= 1.1;
                    dummy.scale.z /= 1.1;
                }
                dummy.rotation.copy(camera.rotation);
                if(localPlayer.rotation.x==0){
                    dummy.rotation.y-=localPlayer.rotation.y;
                }
                else{
                    dummy.rotation.y+=localPlayer.rotation.y;
                }
                
                info.velocity[i].add(acc);
                dummy.position.add(info.velocity[i]);
                dummy.updateMatrix();
                
                mesh.setMatrixAt(i, dummy.matrix);
                mesh.instanceMatrix.needsUpdate = true;
    
            }
        }
    group.updateMatrixWorld();
    
    });
  }
    
    //################################ particle #########################################
    {
        // let rainbowball;
        // rainbowball = new Rainbowball();
        // app.add(rainbowball);
        // app.add(rainbowball.batchRenderer);
        // app.updateMatrixWorld();

        // const startTime = Date.now();
        // let lastTimestamp = startTime;
        // rainbowball.update(0,-1);
        // useFrame(({timestamp}) => {
            
        //     const now = Date.now();
        //     const timeDiff = (now - lastTimestamp) / 1000.0;
        //     lastTimestamp = now;


            
        //     rainbowball.position.copy(localPlayer.position);
        //     let dum = new THREE.Vector3();
        //     localPlayer.getWorldDirection(dum)
        //     dum = dum.normalize();
        //     //console.log(dum);
        //     rainbowball.position.x-=1.2*dum.x;
        //     rainbowball.position.z-=1.2*dum.z;
            
            
            
        //     if(!localPlayer.hasAction('fly') && !localPlayer.hasAction('jump')){
        //         //rainbowball.position.y-=0.6;
        //         if (localPlayer.avatar) {
        //             rainbowball.position.y -= localPlayer.avatar.height;
        //             rainbowball.position.y += 0.65;
        //         }
        //     }
        //     else{
        //         rainbowball.position.y-=50000;
        //     }
        //     if(narutoRunTime==0){
        //         rainbowball.update(timeDiff,0);
                
        //         rainbowball.position.x+=1.2*dum.x;
        //         rainbowball.position.z+=1.2*dum.z;
        //     }
        //     else if(narutoRunTime==1){
        //         rainbowball.update(timeDiff,10);
                
        //     }
        //     // else if(narutoRunTime>0 && narutoRunTime<80){
                
        //     //     rainbowball.update(timeDiff,1);
                
        //     // }
        //     else if(narutoRunTime>0 && narutoRunTime<10){
        //         rainbowball.update(timeDiff,2);
                
        //     }
        //     else if(narutoRunTime>=10){
        //         rainbowball.update(timeDiff,3);
                
        //     }
            

        //     app.updateMatrixWorld();
           
        
        // });
    }
    
    //########################################## wind #############################################
    {
        const group = new THREE.Group();
        const vertrun = `
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec3 pos = vec3(position.x,position.y,position.z);
                gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
                ${THREE.ShaderChunk.logdepthbuf_vertex}
            }
        `;

        const fragrun = `
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            varying vec2 vUv;
            uniform sampler2D perlinnoise;
            uniform vec3 color4;
            uniform float uTime;
            varying vec3 vNormal;
            vec3 rgbcol(vec3 col) {
                return vec3(col.r/255.,col.g/255.,col.b/255.);
            }
            void main() {
                vec3 noisetex = texture2D(
                    perlinnoise,
                    vec2(
                        mod(1.*vUv.x+(2.),1.),
                        mod(.5*vUv.y+(40.*uTime),1.)
                        
                    )
                ).rgb;      
                gl_FragColor = vec4(noisetex.rgb,1.0);
                if(gl_FragColor.r >= 0.8){
                    gl_FragColor = vec4(vec3(1.,1.,1.),(0.9-vUv.y)/2.);
                }else{
                    gl_FragColor = vec4(0.,0.,1.,0.);
                }
                gl_FragColor *= vec4(smoothstep(0.2,0.628,vUv.y));
                ${THREE.ShaderChunk.logdepthbuf_fragment}
            
                
            }
        `;
        let windMaterial;
        function windEffect() {
            const geometry = new THREE.CylinderBufferGeometry(0.5, 0.9, 5.3, 50, 50, true);
            windMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    perlinnoise: {
                        type: "t",
                        value:wave2
                    },
                    color4: {
                        value: new THREE.Vector3(200, 200, 200)
                    },
                    uTime: {
                        type: "f",
                        value: 0.0
                    },
                },
                // wireframe:true,
                vertexShader: vertrun,
                fragmentShader: fragrun,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
            const mesh = new THREE.Mesh(geometry, windMaterial);
            mesh.setRotationFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -90 * Math.PI / 180 );
            
            group.add(mesh);
           
            // mesh.scale.set(1.5, 1.7, 1.5);
            app.add(group);
        }
        windEffect();
        
        
        let dum = new THREE.Vector3();
        useFrame(({timestamp}) => {
            group.position.copy(localPlayer.position);
            if (localPlayer.avatar) {
                group.position.y -= localPlayer.avatar.height;
                group.position.y += 0.65;
            }
            group.rotation.copy(localPlayer.rotation);

            
            localPlayer.getWorldDirection(dum)
            dum = dum.normalize();
            group.position.x+=2.2*dum.x;
            group.position.z+=2.2*dum.z;
            if(narutoRunTime>10){
                group.scale.set(1,1,1);
                
            }
            else{
                group.scale.set(0,0,0);
            }
            
            windMaterial.uniforms.uTime.value=timestamp/10000;
            
            app.updateMatrixWorld();

        });
    }
    //############################ rainbow tube #############################################
    {
        // const material = new THREE.ShaderMaterial({
        //     uniforms: {
        //         uTime: {
        //             value: 0,
        //         },
        //         perlinnoise: {
        //             type: "t",
        //             value: wave9
        //         },
        //         t: { value: 0.9 },
        //         iResolution: {
        //             value: new THREE.Vector3() 
        //         },
        //         waveFreq: {
        //             value: 0 
        //         },
        //         opacity: {
        //             value: 0 
        //         },
        //     },
        //     vertexShader: `\
                 
        //         ${THREE.ShaderChunk.common}
        //         ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
               
             
        //         uniform float uTime;
        //         uniform float waveFreq;
        //         uniform sampler2D perlinnoise;
        //         varying vec2 vUv;
               
        //         void main() {
        //           vUv=uv;
        //           vec3 noisetex = texture2D(perlinnoise,mod(1.*vec2(vUv.x *.001,0.5*vUv.x+uTime/100.),1.)).rgb;
        //           vec4 modelPosition = modelMatrix * vec4(position, 1.0);

        //           float elevation = sin(modelPosition.x * 0.5 - uTime/10000.) * 0.1*(vUv.x*2.*waveFreq);
        //           elevation += sin(modelPosition.z * 0.5 - uTime/10000.) * 0.1*(vUv.x*2.*waveFreq);

        //           modelPosition.y += elevation;


        //           //modelPosition.xz += noisetex.r/2.5;
        //           //modelPosition.y+=mod(vUv.x*uTime/10.,0.1);
        //           vec4 viewPosition = viewMatrix * modelPosition;
        //           vec4 projectionPosition = projectionMatrix * viewPosition;
        
        //           gl_Position = projectionPosition;
        //           ${THREE.ShaderChunk.logdepthbuf_vertex}
        //         }
        //       `,
        //     fragmentShader: `\
        //         ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
        //         uniform float uTime;
        //         uniform float opacity;
        //         varying vec2 vUv;
        //         uniform vec3 iResolution;

        //         const float tau = radians(360.);

        //         vec3 linearToSRGB(vec3 linear){
        //             return mix(
        //                 linear * 12.92,
        //                 pow(linear, vec3(1./2.4) ) * 1.055 - .055,
        //                 step( .0031308, linear )
        //             );
        //         }

        //         void mainImage( out vec4 fragColor, in vec2 fragCoord )
        //         {
        //             vec2 uv = vUv*2.5;
        //             uv.x-=mod(uTime/100.,2.);
                    
        //             vec3 rainbow = linearToSRGB(
        //                 sin( (uv.x+vec3(0,2,1)/3.)*tau ) * .5 + .5
        //             );
                    
                    
                   
                    
        //             fragColor = vec4(rainbow,(1.-vUv.x));
        //             if(vUv.x<0.002){
        //                 fragColor = vec4(rainbow,(vUv.x)*200.);
        //             }
        //             fragColor.xyz/=1.7;
        //             fragColor.a/=1.2;
        //             fragColor.a*=opacity;
        //         }

        //         void main() {
        //             mainImage(gl_FragColor, vUv * iResolution.xy);
        //           ${THREE.ShaderChunk.logdepthbuf_fragment}
        //         }
        //       `,
        //     side: THREE.DoubleSide,
        //     transparent: true,
        //     depthWrite: false,
        //     blending: THREE.AdditiveBlending,
        // });
        // const pathLength = 50;
        // let path = new THREE.CatmullRomCurve3([]);
        // let playerPath = [];
        // for (let i = 0; i < pathLength; i++) {
        //     path.points.push(new THREE.Vector3(i, i, i));
        //     playerPath.push(new THREE.Vector3(i, i, i));
        // }
        
        // path.verticesNeedUpdate = true;
        // const geometry = new THREE.TubeBufferGeometry(path, 200, .25, 20, false);
        // geometry.dynamic = true;
        
        // const mesh = new THREE.Mesh(geometry, material)
        // //app.add(mesh)

        // app.updateMatrixWorld();

        // useFrame(({timestamp}) => {
        //     if(narutoRunTime>10 
        //         || (
        //                 playerPath[pathLength-1].x!=playerPath[0].x 
        //                 || playerPath[pathLength-1].y!=playerPath[0].y 
        //                 || playerPath[pathLength-1].z!=playerPath[0].z
        //             )
        //         ){
        //         let temp = [];
        //         for (let i = 0; i < pathLength; i++) {
        //             temp.push(new THREE.Vector3(playerPath[i].x, playerPath[i].y, playerPath[i].z));
        //         }
                
        //         playerPath[0] = new THREE.Vector3(localPlayer.position.x, localPlayer.position.y, localPlayer.position.z);
        //         if(localPlayer.avatar){
        //             playerPath[0].y -= localPlayer.avatar.height;
        //             playerPath[0].y += 0.65;
        //         }
                
        //         for (let i = 1; i < pathLength; i++) {
        //             playerPath[i] = new THREE.Vector3(temp[i - 1].x, temp[i - 1].y, temp[i - 1].z);
        //         }
        //         for (let i = 0; i < pathLength; i++) {
        //             geometry.parameters.path.points[i] = new THREE.Vector3(
        //                 playerPath[i].x,
        //                 playerPath[i].y,
        //                 playerPath[i].z
        //             )
        //         }
        //         geometry.copy(new THREE.TubeBufferGeometry(geometry.parameters.path, 50, .2, 20, false));
        //         mesh.geometry.verticesNeedUpdate = true;
        //         geometry.dynamic = true;
        //     }
            
        //     // uniforms.uTime.value = timestamp * .01;
        //     // uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
            
        //     material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
        //     material.uniforms.uTime.value = timestamp /10;
        //     if(narutoRunTime>=10){
        //         material.uniforms.opacity.value = 1;
        //         material.uniforms.waveFreq.value=1;
        //     }
        //     else{ 
        //         material.uniforms.waveFreq.value=0;
        //         material.uniforms.opacity.value -= 0.02;
        //     }
        //     if(narutoRunTime>0 && narutoRunTime<10){
        //         material.uniforms.opacity.value = 0;
        //     }
        //     app.updateMatrixWorld();

        // });
    }
    

    app.setComponent('renderPriority', 'low');

    return app;
};

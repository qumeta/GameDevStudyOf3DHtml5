/// <reference path="./Math.ts" />

module SoftEngine {

    export class Camera {
        constructor(public Position = Qumeta.Vector3.Zero(), public Target = Qumeta.Vector3.Zero()) {
        }
    }

    export class Vertices {
        constructor(public Coordinates: Qumeta.Vector3, public Normal: Qumeta.Vector3, public WorldCoordinates: Qumeta.Vector3 | null) {

        }
    }

    export class Mesh {
        public Vertices: Array<Vertices> = [];
        public Faces: Array<Qumeta.Vector3> = [];
        public Rotation: Qumeta.Vector3;
        public Position: Qumeta.Vector3;

        constructor(public name: string, verticesCount: number, facesCount: number) {
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
            this.Rotation = Qumeta.Vector3.Zero();
            this.Position = Qumeta.Vector3.Zero();
        }
    }

    export class Device {
        private workingWidth: number;
        private workingHeight: number;
        private workingContext: CanvasRenderingContext2D;
        private backbuffer: ImageData | undefined;
        private backbufferdata: Uint8ClampedArray | undefined;
        private depthbuffer: Array<number>;

        constructor(private workingCanvas: HTMLCanvasElement) {
            this.workingWidth = this.workingCanvas.width;
            this.workingHeight = this.workingCanvas.height;
            this.workingContext = this.workingCanvas.getContext("2d")!;
            this.depthbuffer = new Array(this.workingWidth * this.workingHeight);
        }

        clear() {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
            for(var i = 0; i < this.depthbuffer.length; i++) {
                this.depthbuffer[i] = 10000000;
            }
        }

        present() {
            this.workingContext.putImageData(this.backbuffer!, 0, 0);
        }

        private putPixel(x: number, y: number, z: number, color: Qumeta.Color4) {
            this.backbufferdata = this.backbuffer!.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth);
            var index4 = index * 4;// pixel 
            if (this.depthbuffer[index] < z) {
                return;
            }
            this.depthbuffer[index] = z;
            this.backbufferdata[index4] = color.r * 255;
            this.backbufferdata[index4 + 1] = color.g * 255;
            this.backbufferdata[index4 + 2] = color.b * 255;
            this.backbufferdata[index4 + 3] = color.a * 255;
        }

        private project(vertex:Vertices, transMat: Qumeta.Matrix, world: Qumeta.Matrix){
            var point2d = Qumeta.Vector3.TransformCoordinates(vertex.Coordinates, transMat);

            var point3DWorld = Qumeta.Vector3.TransformCoordinates(vertex.Coordinates, world);
            var normal3DWorld = Qumeta.Vector3.TransformCoordinates(vertex.Normal, world);

            var x = point2d.x * this.workingWidth + this.workingWidth / 2.0;
            var y = -point2d.y * this.workingHeight + this.workingHeight / 2.0;

            return ({
                Coordinates: new Qumeta.Vector3(x, y, point2d.z),
                Normal: normal3DWorld,
                WorldCoordinates: point3DWorld
            });
        }

        private drawPoint(point: Qumeta.Vector3, color: Qumeta.Color4) {
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, point.z, color);
            }
        }

        private clamp(value: number, min: number | undefined, max: number | undefined) {
            if (typeof min === "undefined") { min = 0; }
            if (typeof max === "undefined") { max = 1; }
            return Math.max(min, Math.min(value, max));
        }

        private interpolate(min: number, max: number, gradient: number) {
            return min + (max - min) * this.clamp(gradient, undefined, undefined);
        }

        private processScanLine(data: { ndotla: number, currentY:number }, va: Vertices, vb: Vertices, vc: Vertices, vd: Vertices, color: Qumeta.Color4) {
            var pa = va.Coordinates;
            var pb = vb.Coordinates;
            var pc = vc.Coordinates;
            var pd = vd.Coordinates;

            var gradient1 = pa.y != pb.y ? (data.currentY - pa.y) / (pb.y - pa.y) : 1;
            var gradient2 = pc.y != pd.y ? (data.currentY - pc.y) / (pd.y - pc.y) : 1;

            var sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
            var ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;

            var z1 = this.interpolate(pa.z, pb.z, gradient1);
            var z2 = this.interpolate(pc.z, pd.z, gradient2);

            for (var x = sx; x < ex; x++) {
                var gradient = (x - sx) / (ex - sx);

                var z = this.interpolate(z1, z2, gradient);
                var ndotl = data.ndotla;

                this.drawPoint(new Qumeta.Vector3(x, data.currentY, z), new Qumeta.Color4(color.r * ndotl, color.g * ndotl, color.b * ndotl, 1));
            }
        }

        computeNDotL(vertex: Qumeta.Vector3, normal: Qumeta.Vector3, lightPosition: Qumeta.Vector3) {
            var lightDirection = lightPosition.subtract(vertex);

            normal.normalize();
            lightDirection.normalize();

            return Math.max(0, Qumeta.Vector3.Dot(normal, lightDirection));
        }

        private drawTriangle(v1: Vertices, v2: Vertices, v3: Vertices, color: Qumeta.Color4) {
            if (v1.Coordinates.y > v2.Coordinates.y) {
                var temp = v2;
                v2 = v1;
                v1 = temp;
            }

            if (v2.Coordinates.y > v3.Coordinates.y) {
                var temp = v2;
                v2 = v3;
                v3 = temp;
            }

            if (v1.Coordinates.y > v2.Coordinates.y) {
                var temp = v2;
                v2 = v1;
                v1 = temp;
            }

            var p1 = v1.Coordinates;
            var p2 = v2.Coordinates;
            var p3 = v3.Coordinates;

            var vnFace = (v1.Normal.add(v2.Normal.add(v3.Normal))).scale(1 / 3);
            var centerPoint = (v1.WorldCoordinates!.add(v2.WorldCoordinates!.add(v3.WorldCoordinates!))).scale(1 / 3);

            var lightPos = new Qumeta.Vector3(0, 10, 10);

            var ndotl = this.computeNDotL(centerPoint, vnFace, lightPos);

            var data = { ndotla: ndotl, currentY:0 };

            var dP1P2;
            var dP1P3;

            if (p2.y - p1.y > 0)
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y); else
                dP1P2 = 0;

            if (p3.y - p1.y > 0)
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y); else
                dP1P3 = 0;

            if (dP1P2 > dP1P3) {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;

                    if (y < p2.y) {
                        this.processScanLine(data, v1, v3, v1, v2, color);
                    } else {
                        this.processScanLine(data, v1, v3, v2, v3, color);
                    }
                }
            } else {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;

                    if (y < p2.y) {
                        this.processScanLine(data, v1, v2, v1, v3, color);
                    } else {
                        this.processScanLine(data, v2, v3, v1, v3, color);
                    }
                }
            }
        }

        render(camera: Camera, meshes: Array<Mesh>) {
            // 视图矩阵
            var viewMatrix = Qumeta.Matrix.LookAtLH(camera.Position, camera.Target, Qumeta.Vector3.Up());
            // 投影矩阵
            var projectionMatrix = Qumeta.Matrix.PerspectiveFovLH(45 * Math.PI / 180, this.workingWidth / this.workingHeight, 0.01, 1.0);
            for (var index = 0; index < meshes.length; index++) {
                var cMesh = meshes[index];
                // 世界矩阵
                var worldMatrix = Qumeta.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(Qumeta.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
                // 变换矩阵
                var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);
                for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                    var currentFace = cMesh.Faces[indexFaces];
                    var vertexA = cMesh.Vertices[currentFace.x];
                    var vertexB = cMesh.Vertices[currentFace.y];
                    var vertexC = cMesh.Vertices[currentFace.z];

                    var pixelA = this.project(vertexA, transformMatrix, worldMatrix);
                    var pixelB = this.project(vertexB, transformMatrix, worldMatrix);
                    var pixelC = this.project(vertexC, transformMatrix, worldMatrix);

                    var color = 1.0;
                    this.drawTriangle(pixelA, pixelB, pixelC, new Qumeta.Color4(color, color, color, 1));
                }
            }
        }

        LoadJSONFileAsync(fileName: string, callback: Function) {
            var jsonObject = {
            };
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", fileName, true);
            var that = this;
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    jsonObject = JSON.parse(xmlhttp.responseText);
                    callback(that.createMeshesFromJSON(jsonObject));
                }
            };
            xmlhttp.send(null);
        }

        createMeshesFromJSON(jsonObject: any): Array<Mesh> {
            var meshes = [];
            for (var meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                var verticesArray = jsonObject.meshes[meshIndex].vertices;
                var indicesArray = jsonObject.meshes[meshIndex].indices;
                var uvCount = jsonObject.meshes[meshIndex].uvCount;
                var verticesStep = 1;
                switch (uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }
                var verticesCount = verticesArray.length / verticesStep;
                var facesCount = indicesArray.length / 3;
                var mesh = new SoftEngine.Mesh(jsonObject.meshes[meshIndex].name, verticesCount, facesCount);
                for (var index = 0; index < verticesCount; index++) {
                    var x = verticesArray[index * verticesStep];
                    var y = verticesArray[index * verticesStep + 1];
                    var z = verticesArray[index * verticesStep + 2];

                    var nx = verticesArray[index * verticesStep + 3];
                    var ny = verticesArray[index * verticesStep + 4];
                    var nz = verticesArray[index * verticesStep + 5];
                    mesh.Vertices[index] = {
                        Coordinates: new Qumeta.Vector3(x, y, z),
                        Normal: new Qumeta.Vector3(nx, ny, nz),
                        WorldCoordinates: null
                    };
                }
                for (var index = 0; index < facesCount; index++) {
                    var a = indicesArray[index * 3];
                    var b = indicesArray[index * 3 + 1];
                    var c = indicesArray[index * 3 + 2];
                    mesh.Faces[index] = new Qumeta.Vector3(a, b, c);
                }
                var position = jsonObject.meshes[meshIndex].position;
                mesh.Position = new Qumeta.Vector3(position[0], position[1], position[2]);
                meshes.push(mesh);
            }
            return meshes;
        }
    }
}
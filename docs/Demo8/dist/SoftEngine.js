"use strict";
/// <reference path="./Math.ts" />
var SoftEngine;
(function (SoftEngine) {
    class Camera {
        constructor(Position = Qumeta.Vector3.Zero(), Target = Qumeta.Vector3.Zero()) {
            this.Position = Position;
            this.Target = Target;
        }
    }
    SoftEngine.Camera = Camera;
    class Vertices {
        constructor(Coordinates, Normal, WorldCoordinates = null, TextureCoordinates = null) {
            this.Coordinates = Coordinates;
            this.Normal = Normal;
            this.WorldCoordinates = WorldCoordinates;
            this.TextureCoordinates = TextureCoordinates;
        }
    }
    SoftEngine.Vertices = Vertices;
    class Mesh {
        constructor(name, verticesCount, facesCount) {
            this.name = name;
            this.Vertices = [];
            this.Faces = [];
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
            this.Rotation = Qumeta.Vector3.Zero();
            this.Position = Qumeta.Vector3.Zero();
        }
    }
    SoftEngine.Mesh = Mesh;
    class Texture {
        constructor(filename, width, height) {
            this.width = width;
            this.height = height;
            this.width = width;
            this.height = height;
            this.load(filename);
        }
        load(filename) {
            var _this = this;
            var imageTexture = new Image();
            imageTexture.height = this.height;
            imageTexture.width = this.width;
            imageTexture.onload = function () {
                var internalCanvas = document.createElement("canvas");
                internalCanvas.width = _this.width;
                internalCanvas.height = _this.height;
                var internalContext = internalCanvas.getContext("2d");
                internalContext.drawImage(imageTexture, 0, 0);
                _this.internalBuffer = internalContext.getImageData(0, 0, _this.width, _this.height);
            };
            imageTexture.src = filename;
        }
        ;
        map(tu, tv) {
            if (this.internalBuffer) {
                var u = Math.abs(((tu * this.width) % this.width)) >> 0;
                var v = Math.abs(((tv * this.height) % this.height)) >> 0;
                var pos = (u + v * this.width) * 4;
                var r = this.internalBuffer.data[pos];
                var g = this.internalBuffer.data[pos + 1];
                var b = this.internalBuffer.data[pos + 2];
                var a = this.internalBuffer.data[pos + 3];
                return new Qumeta.Color4(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
            }
            else {
                return new Qumeta.Color4(1, 1, 1, 1);
            }
        }
    }
    SoftEngine.Texture = Texture;
    class Device {
        constructor(workingCanvas) {
            this.workingCanvas = workingCanvas;
            this.workingWidth = this.workingCanvas.width;
            this.workingHeight = this.workingCanvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
            this.depthbuffer = new Array(this.workingWidth * this.workingHeight);
        }
        clear() {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
            for (var i = 0; i < this.depthbuffer.length; i++) {
                this.depthbuffer[i] = 10000000;
            }
        }
        present() {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        }
        putPixel(x, y, z, color) {
            this.backbufferdata = this.backbuffer.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth);
            var index4 = index * 4; // pixel 
            if (this.depthbuffer[index] < z) {
                return;
            }
            this.depthbuffer[index] = z;
            this.backbufferdata[index4] = color.r * 255;
            this.backbufferdata[index4 + 1] = color.g * 255;
            this.backbufferdata[index4 + 2] = color.b * 255;
            this.backbufferdata[index4 + 3] = color.a * 255;
        }
        project(vertex, transMat, world) {
            var point2d = Qumeta.Vector3.TransformCoordinates(vertex.Coordinates, transMat);
            var point3DWorld = Qumeta.Vector3.TransformCoordinates(vertex.Coordinates, world);
            var normal3DWorld = Qumeta.Vector3.TransformCoordinates(vertex.Normal, world);
            var x = point2d.x * this.workingWidth + this.workingWidth / 2.0;
            var y = -point2d.y * this.workingHeight + this.workingHeight / 2.0;
            return ({
                Coordinates: new Qumeta.Vector3(x, y, point2d.z),
                Normal: normal3DWorld,
                WorldCoordinates: point3DWorld,
                TextureCoordinates: vertex.TextureCoordinates
            });
        }
        drawPoint(point, color) {
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, point.z, color);
            }
        }
        clamp(value, min, max) {
            if (typeof min === "undefined") {
                min = 0;
            }
            if (typeof max === "undefined") {
                max = 1;
            }
            return Math.max(min, Math.min(value, max));
        }
        interpolate(min, max, gradient) {
            return min + (max - min) * this.clamp(gradient, undefined, undefined);
        }
        processScanLine(data, va, vb, vc, vd, color, texture) {
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
            var snl = this.interpolate(data.ndotla, data.ndotlb, gradient1);
            var enl = this.interpolate(data.ndotlc, data.ndotld, gradient2);
            var su = this.interpolate(data.ua, data.ub, gradient1);
            var eu = this.interpolate(data.uc, data.ud, gradient2);
            var sv = this.interpolate(data.va, data.vb, gradient1);
            var ev = this.interpolate(data.vc, data.vd, gradient2);
            for (var x = sx; x < ex; x++) {
                var gradient = (x - sx) / (ex - sx);
                var z = this.interpolate(z1, z2, gradient);
                var ndotl = this.interpolate(snl, enl, gradient);
                var u = this.interpolate(su, eu, gradient);
                var v = this.interpolate(sv, ev, gradient);
                var textureColor;
                if (texture)
                    textureColor = texture.map(u, v);
                else
                    textureColor = new Qumeta.Color4(1, 1, 1, 1);
                this.drawPoint(new Qumeta.Vector3(x, data.currentY, z), new Qumeta.Color4(color.r * ndotl * textureColor.r, color.g * ndotl * textureColor.g, color.b * ndotl * textureColor.b, 1));
            }
        }
        computeNDotL(vertex, normal, lightPosition) {
            var lightDirection = lightPosition.subtract(vertex);
            normal.normalize();
            lightDirection.normalize();
            return Math.max(0, Qumeta.Vector3.Dot(normal, lightDirection));
        }
        drawTriangle(v1, v2, v3, color, texture) {
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
            var lightPos = new Qumeta.Vector3(0, 10, 10);
            var nl1 = this.computeNDotL(v1.WorldCoordinates, v1.Normal, lightPos);
            var nl2 = this.computeNDotL(v2.WorldCoordinates, v2.Normal, lightPos);
            var nl3 = this.computeNDotL(v3.WorldCoordinates, v3.Normal, lightPos);
            var data = { currentY: 0, ndotla: 0, ndotlb: 0, ndotlc: 0, ndotld: 0, ua: 0, ub: 0, uc: 0, ud: 0, va: 0, vb: 0, vc: 0, vd: 0 };
            var dP1P2;
            var dP1P3;
            if (p2.y - p1.y > 0)
                dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
            else
                dP1P2 = 0;
            if (p3.y - p1.y > 0)
                dP1P3 = (p3.x - p1.x) / (p3.y - p1.y);
            else
                dP1P3 = 0;
            if (dP1P2 > dP1P3) {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;
                    if (y < p2.y) {
                        data.ndotla = nl1;
                        data.ndotlb = nl3;
                        data.ndotlc = nl1;
                        data.ndotld = nl2;
                        data.ua = v1.TextureCoordinates.x;
                        data.ub = v3.TextureCoordinates.x;
                        data.uc = v1.TextureCoordinates.x;
                        data.ud = v2.TextureCoordinates.x;
                        data.va = v1.TextureCoordinates.y;
                        data.vb = v3.TextureCoordinates.y;
                        data.vc = v1.TextureCoordinates.y;
                        data.vd = v2.TextureCoordinates.y;
                        this.processScanLine(data, v1, v3, v1, v2, color, texture);
                    }
                    else {
                        data.ndotla = nl1;
                        data.ndotlb = nl3;
                        data.ndotlc = nl2;
                        data.ndotld = nl3;
                        data.ua = v1.TextureCoordinates.x;
                        data.ub = v3.TextureCoordinates.x;
                        data.uc = v2.TextureCoordinates.x;
                        data.ud = v3.TextureCoordinates.x;
                        data.va = v1.TextureCoordinates.y;
                        data.vb = v3.TextureCoordinates.y;
                        data.vc = v2.TextureCoordinates.y;
                        data.vd = v3.TextureCoordinates.y;
                        this.processScanLine(data, v1, v3, v2, v3, color, texture);
                    }
                }
            }
            else {
                for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                    data.currentY = y;
                    if (y < p2.y) {
                        data.ndotla = nl1;
                        data.ndotlb = nl2;
                        data.ndotlc = nl1;
                        data.ndotld = nl3;
                        data.ua = v1.TextureCoordinates.x;
                        data.ub = v2.TextureCoordinates.x;
                        data.uc = v1.TextureCoordinates.x;
                        data.ud = v3.TextureCoordinates.x;
                        data.va = v1.TextureCoordinates.y;
                        data.vb = v2.TextureCoordinates.y;
                        data.vc = v1.TextureCoordinates.y;
                        data.vd = v3.TextureCoordinates.y;
                        this.processScanLine(data, v1, v2, v1, v3, color, texture);
                    }
                    else {
                        data.ndotla = nl2;
                        data.ndotlb = nl3;
                        data.ndotlc = nl1;
                        data.ndotld = nl3;
                        data.ua = v2.TextureCoordinates.x;
                        data.ub = v3.TextureCoordinates.x;
                        data.uc = v1.TextureCoordinates.x;
                        data.ud = v3.TextureCoordinates.x;
                        data.va = v2.TextureCoordinates.y;
                        data.vb = v3.TextureCoordinates.y;
                        data.vc = v1.TextureCoordinates.y;
                        data.vd = v3.TextureCoordinates.y;
                        this.processScanLine(data, v2, v3, v1, v3, color, texture);
                    }
                }
            }
        }
        render(camera, meshes) {
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
                    this.drawTriangle(pixelA, pixelB, pixelC, new Qumeta.Color4(color, color, color, 1), cMesh.Texture);
                }
            }
        }
        LoadJSONFileAsync(fileName, callback) {
            var jsonObject = {};
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
        createMeshesFromJSON(jsonObject) {
            var meshes = [];
            var materials = [];
            for (var materialIndex = 0; materialIndex < jsonObject.materials.length; materialIndex++) {
                var material = { Name: "", ID: 0, DiffuseTextureName: "" };
                material.Name = jsonObject.materials[materialIndex].name;
                material.ID = jsonObject.materials[materialIndex].id;
                if (jsonObject.materials[materialIndex].diffuseTexture)
                    material.DiffuseTextureName = jsonObject.materials[materialIndex].diffuseTexture.name;
                materials[material.ID] = material;
            }
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
                        WorldCoordinates: null,
                        TextureCoordinates: null
                    };
                    if (uvCount > 0) {
                        var u = verticesArray[index * verticesStep + 6];
                        var v = verticesArray[index * verticesStep + 7];
                        mesh.Vertices[index].TextureCoordinates = new Qumeta.Vector2(u, v);
                    }
                    else {
                        mesh.Vertices[index].TextureCoordinates = new Qumeta.Vector2(0, 0);
                    }
                }
                for (var index = 0; index < facesCount; index++) {
                    var a = indicesArray[index * 3];
                    var b = indicesArray[index * 3 + 1];
                    var c = indicesArray[index * 3 + 2];
                    mesh.Faces[index] = new Qumeta.Vector3(a, b, c);
                }
                var position = jsonObject.meshes[meshIndex].position;
                mesh.Position = new Qumeta.Vector3(position[0], position[1], position[2]);
                if (uvCount > 0) {
                    var meshTextureID = jsonObject.meshes[meshIndex].materialId;
                    var meshTextureName = materials[meshTextureID].DiffuseTextureName;
                    mesh.Texture = new Texture(meshTextureName, 512, 512);
                }
                meshes.push(mesh);
            }
            return meshes;
        }
    }
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));

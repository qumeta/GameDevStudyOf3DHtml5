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
    class Device {
        constructor(workingCanvas) {
            this.workingCanvas = workingCanvas;
            this.workingWidth = this.workingCanvas.width;
            this.workingHeight = this.workingCanvas.height;
            this.workingContext = this.workingCanvas.getContext("2d");
        }
        clear() {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        }
        present() {
            this.workingContext.putImageData(this.backbuffer, 0, 0);
        }
        putPixel(x, y, color) {
            this.backbufferdata = this.backbuffer.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4; // pixel 
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        }
        project(coord, transMat) {
            var point = Qumeta.Vector3.TransformCoordinates(coord, transMat);
            var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
            var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
            return (new Qumeta.Vector2(x, y));
        }
        drawPoint(point) {
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, new Qumeta.Color4(1, 0, 0, 1));
            }
        }
        drawLine(point0, point1) {
            var dist = point1.subtract(point0).length();
            if (dist < 2) {
                return;
            }
            var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
            this.drawPoint(middlePoint);
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
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
                    var pixelA = this.project(vertexA, transformMatrix);
                    var pixelB = this.project(vertexB, transformMatrix);
                    var pixelC = this.project(vertexC, transformMatrix);
                    this.drawLine(pixelA, pixelB);
                    this.drawLine(pixelB, pixelC);
                    this.drawLine(pixelC, pixelA);
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
                    mesh.Vertices[index] = new Qumeta.Vector3(x, y, z);
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
    SoftEngine.Device = Device;
})(SoftEngine || (SoftEngine = {}));

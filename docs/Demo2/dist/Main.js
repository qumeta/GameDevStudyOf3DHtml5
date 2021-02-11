"use strict";
window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        //window.mozRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();
var canvas;
var device;
var mesh;
var meshes = [];
var camera;
document.addEventListener("DOMContentLoaded", init, false);
function init() {
    canvas = document.getElementById("frontBuffer");
    mesh = new SoftEngine.Mesh("Cube", 4, 2);
    meshes.push(mesh);
    device = new SoftEngine.Device(canvas);
    mesh.Vertices[0] = new Qumeta.Vector3(-1, 1, 1);
    mesh.Vertices[1] = new Qumeta.Vector3(1, 1, 1);
    mesh.Vertices[2] = new Qumeta.Vector3(-1, -1, 1);
    mesh.Vertices[3] = new Qumeta.Vector3(1, -1, 1);
    mesh.Vertices[4] = new Qumeta.Vector3(-1, 1, -1);
    mesh.Vertices[5] = new Qumeta.Vector3(1, 1, -1);
    mesh.Vertices[6] = new Qumeta.Vector3(1, -1, -1);
    mesh.Vertices[7] = new Qumeta.Vector3(-1, -1, -1);
    mesh.Faces[0] = new Qumeta.Vector3(0, 1, 2);
    mesh.Faces[1] = new Qumeta.Vector3(1, 2, 3);
    mesh.Faces[2] = new Qumeta.Vector3(1, 3, 6);
    mesh.Faces[3] = new Qumeta.Vector3(1, 5, 6);
    mesh.Faces[4] = new Qumeta.Vector3(0, 1, 4);
    mesh.Faces[5] = new Qumeta.Vector3(1, 4, 5);
    mesh.Faces[6] = new Qumeta.Vector3(2, 3, 7);
    mesh.Faces[7] = new Qumeta.Vector3(3, 6, 7);
    mesh.Faces[8] = new Qumeta.Vector3(0, 2, 7);
    mesh.Faces[9] = new Qumeta.Vector3(0, 4, 7);
    mesh.Faces[10] = new Qumeta.Vector3(4, 5, 6);
    mesh.Faces[11] = new Qumeta.Vector3(4, 6, 7);
    camera = new SoftEngine.Camera();
    camera.Position = new Qumeta.Vector3(0, 0, 10);
    camera.Target = new Qumeta.Vector3(0, 0, 0);
    requestAnimationFrame(drawingLoop);
}
function update() {
    //mesh.Rotation.x += 0.01;
    mesh.Rotation.y += 0.01;
}
function drawingLoop() {
    // 清屏
    device.clear();
    // 计算
    update();
    // 渲染
    device.render(camera, meshes);
    // 内存到屏幕
    device.present();
    requestAnimationFrame(drawingLoop);
}

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
    mesh = new SoftEngine.Mesh("Cube", 8);
    meshes.push(mesh);
    device = new SoftEngine.Device(canvas);
    mesh.Vertices[0] = new Qumeta.Vector3(-1, 1, 1);
    mesh.Vertices[1] = new Qumeta.Vector3(1, 1, 1);
    mesh.Vertices[2] = new Qumeta.Vector3(-1, -1, 1);
    mesh.Vertices[3] = new Qumeta.Vector3(-1, -1, -1);
    mesh.Vertices[4] = new Qumeta.Vector3(-1, 1, -1);
    mesh.Vertices[5] = new Qumeta.Vector3(1, 1, -1);
    mesh.Vertices[6] = new Qumeta.Vector3(1, -1, 1);
    mesh.Vertices[7] = new Qumeta.Vector3(1, -1, -1);
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

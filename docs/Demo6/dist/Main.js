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
//document.addEventListener("DOMContentLoaded", init, false);
function init(demo = null) {
    canvas = document.getElementById("frontBuffer");
    mesh = new SoftEngine.Mesh("Cube", 4, 2);
    meshes.push(mesh);
    device = new SoftEngine.Device(canvas);
    camera = new SoftEngine.Camera();
    camera.Position = new Qumeta.Vector3(0, 0, 10);
    camera.Target = new Qumeta.Vector3(0, 0, 0);
    device.LoadJSONFileAsync(`${demo ? demo + '/' : ''}monkey.babylon`, loadJSONCompleted);
}
function loadJSONCompleted(meshesLoaded) {
    meshes = meshesLoaded;
    // Calling the HTML5 rendering loop
    requestAnimationFrame(drawingLoop);
}
function update() {
    for (var i = 0; i < meshes.length; i++) {
        // rotating slightly the mesh during each frame rendered
        //meshes[i].Rotation.x += 0.01;
        meshes[i].Rotation.y += 0.01;
    }
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

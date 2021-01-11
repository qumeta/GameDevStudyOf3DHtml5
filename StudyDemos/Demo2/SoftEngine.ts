/// <reference path="./Math.ts" />

module SoftEngine {

    export class Camera {
        constructor(public Position = Qumeta.Vector3.Zero(), public Target = Qumeta.Vector3.Zero()) {
        }
    }

    export class Mesh {
        public Vertices: Array<Qumeta.Vector3> = [];
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

        constructor(private workingCanvas: HTMLCanvasElement) {
            this.workingWidth = this.workingCanvas.width;
            this.workingHeight = this.workingCanvas.height;
            this.workingContext = this.workingCanvas.getContext("2d")!;
        }

        clear() {
            this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
            this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        }

        present() {
            this.workingContext.putImageData(this.backbuffer!, 0, 0);
        }

        private putPixel(x: number, y: number, color: Qumeta.Color4) {
            this.backbufferdata = this.backbuffer!.data;
            var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4; // pixel 
            this.backbufferdata[index] = color.r * 255;
            this.backbufferdata[index + 1] = color.g * 255;
            this.backbufferdata[index + 2] = color.b * 255;
            this.backbufferdata[index + 3] = color.a * 255;
        }

        private project(coord: Qumeta.Vector3, transMat: Qumeta.Matrix) {
            var point = Qumeta.Vector3.TransformCoordinates(coord, transMat);
            var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
            var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
            return (new Qumeta.Vector2(x, y));
        }

        private drawPoint(point: Qumeta.Vector2) {
            if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
                this.putPixel(point.x, point.y, new Qumeta.Color4(1, 0, 0, 1));
            }
        }

        private drawLine(point0: Qumeta.Vector2, point1: Qumeta.Vector2) {
            var dist = point1.subtract(point0).length();
            if(dist < 2) {
                return;
            }
            var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
            this.drawPoint(middlePoint);
            this.drawLine(point0, middlePoint);
            this.drawLine(middlePoint, point1);
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
                for(var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
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
    }
}
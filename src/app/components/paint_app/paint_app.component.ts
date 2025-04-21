import { Component, ViewChild, ElementRef, ChangeDetectorRef } from "@angular/core";
import { ImageCroppedEvent } from "ngx-image-cropper";
import 'HammerJS'

@Component({
    selector: "app-paint-app",
    templateUrl: "./paint_app.component.html",
    styleUrls: ["./paint_app.component.scss"],
})

export class PaintAppComponent {
    @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    private ctx!: CanvasRenderingContext2D;
    private image = new Image();
    imageChangedEvent: any = '';
    croppedImage: any = '';
    showCropper: boolean = false;
    imageWidth: number | null = null;
    imageHeight: number | null = null;
    private currentRotation: number = 0;
    cropperPosition: {x1: number, y1: number, x2: number, y2: number} | null = null;
    selectedAspectRatio: string = 'free';
    maintainAspectRatio: boolean = true;
    aspectRatio: number = 4 / 3;
    
    constructor(private cdr: ChangeDetectorRef) {}

    ngAfterViewInit() {
        this.ctx = this.canvas.nativeElement.getContext('2d')!;
    }

    openFileInput() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (!file.type.startsWith('image/')) {
                alert('Vui lòng chọn một file ảnh hợp lệ (jpg, png, etc.)');
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.image.src = e.target!.result as string;
                this.image.onload = () => {
                this.canvas.nativeElement.width = this.image.width;
                this.canvas.nativeElement.height = this.image.height;
                this.ctx.drawImage(this.image, 0, 0);
                this.imageWidth = this.image.width;
                this.imageHeight = this.image.height;
                this.currentRotation = 0;
                };
            };
            reader.readAsDataURL(input.files[0]);
            this.imageChangedEvent = event; 
        }
    }

    cropImage() {
        if (this.image.src) {
            if (this.imageWidth! > 4096 || this.imageHeight! > 4096) {
                alert('Ảnh quá lớn (vượt quá 4096x4096 pixel). Vui lòng chọn ảnh nhỏ hơn.');
                return;
            }
            this.showCropper = true;
        } else {
            alert('Vui lòng chọn một ảnh trước khi cắt.');
        }
    }

    imageCropped(event: ImageCroppedEvent) {
        this.croppedImage = event.base64;

        this.cropperPosition = {
            x1: event.cropperPosition?.x1 ||0,
            y1: event.cropperPosition?.y1 ||0,
            x2: event.cropperPosition?.x2 ||0,
            y2: event.cropperPosition?.y2 ||0
        }
        console.log('Cropper position:', this.cropperPosition);
        this.cdr.detectChanges();
    }

    cropperChange(event: any) {
        if (event) {
            this.cropperPosition = {
                x1: event.x1 || 0,
                y1: event.y1 || 0,
                x2: event.x2 || 0,
                y2: event.y2 || 0
            };
        }
        this.cdr.detectChanges();
    }
    
    applyCrop() {
        this.image.src = this.croppedImage;
        this.image.onload = () => {
            this.canvas.nativeElement.width = this.image.width;
            this.canvas.nativeElement.height = this.image.height;
            this.ctx.drawImage(this.image, 0, 0);
            this.imageWidth = this.image.width;
            this.imageHeight = this.image.height;
            this.currentRotation = 0;
        };
        this.showCropper = false;
        this.cropperPosition = null;
    }

    cancelCrop() {
        this.showCropper = false;
        this.cropperPosition = null;
    }

    rotateImage(degrees: number) {
        if (!this.image.src) {
            alert('Vui lòng chọn một ảnh trước khi xoay.');
            return;
        }

        if (this.imageWidth! > 4096 || this.imageHeight! > 4096) {
            alert('Ảnh quá lớn (vượt quá 4096x4096 pixel). Vui lòng chọn ảnh nhỏ hơn.');
            return;
        }

        const canvas = this.canvas.nativeElement;
        const ctx = this.ctx;
        this.currentRotation += (degrees * Math.PI) / 180;

        const absRotation = Math.abs(this.currentRotation % (2 * Math.PI));
        const isVertical = absRotation % Math.PI !== 0;
        const newWidth = isVertical ? this.image.height : this.image.width;
        const newHeight = isVertical ? this.image.width : this.image.height;

        canvas.width = newWidth;
        canvas.height = newHeight;
        this.imageWidth = newWidth;
        this.imageHeight = newHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(this.currentRotation);
        ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
        ctx.restore();
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = this.canvas.nativeElement.toDataURL();
        link.click();
    }

    updateAspectRatio() {
        if (this.selectedAspectRatio === 'free') {
            this.maintainAspectRatio = false;
        } else {
            this.maintainAspectRatio = true;
            switch (this.selectedAspectRatio) {
                case '4/3':
                    this.aspectRatio = 4 / 3;
                    break;
                case '16/9':
                    this.aspectRatio = 16 / 9;
                    break;
                default:
                    this.aspectRatio = 4 / 3;
            }
        }
    }

    imageLoaded() {}
    cropperReady() {}
    loadImageFailed() {
        alert('Tải ảnh thất bại. Vui lòng thử lại với một file ảnh hợp lệ.');
    }
}
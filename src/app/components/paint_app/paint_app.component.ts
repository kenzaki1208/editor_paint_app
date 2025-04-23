import { Component, ViewChild, ElementRef, ChangeDetectorRef, HostListener, ChangeDetectionStrategy } from "@angular/core";
import { ImageCroppedEvent } from "ngx-image-cropper";

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
    maintainAspectRatio: boolean = false;
    aspectRatio: number = 4 / 3;
    isLoading: boolean = false;
    isDarkMode: boolean = false;
    private history: string[] = [];
    private historyIndex: number = -1;
    hasImage: boolean = false;
    
    brightness: number = 100;
    contrast: number = 100;
    saturation: number =100;
    hue: number = 0;
    sharpness: number = 0;

    showAdjustModal: boolean = false;
    adjustModalType: string = '';
    adjustModalTitle: string = '';
    adjustModalLabel: string = '';
    adjustModalValue: number = 0;
    adjustModalMin: number = 0;
    adjustModalMax: number = 0;
    private originalValue: number = 0;

    showRotateModal: boolean = false;
    private tempRotation: number = 0; 
    private originalRotation: number = 0;

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnInit() {
        this.loadInitialState();
    }

    ngAfterViewInit() {
        this.ctx = this.canvas.nativeElement.getContext('2d')!;
        this.adjustCanvasSize();
    }

    adjustCanvasSize() {
        if (this.showCropper) return;
        const canvas = this.canvas.nativeElement;
        const parent = canvas.parentElement!;
        const maxWidth = parent.clientWidth;
        const maxHeight = parent.clientHeight;

        if (this.imageWidth && this.imageHeight) {
            const ratio = Math.min(maxWidth / this.imageWidth, maxHeight / this.imageHeight, 1);
            canvas.width = this.imageWidth * ratio;
            canvas.height = this.imageHeight * ratio;
            canvas.classList.add('responsive'); 
        } else {
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            canvas.classList.remove('responsive'); 
        }

        if (this.image.src) {
            this.ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: Event) {
        this.adjustCanvasSize();
    }

    loadInitialState() {
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.toggleDarkModeClass();
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode.toString());
        this.toggleDarkModeClass();
    }

    toggleDarkModeClass() {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            if (this.isDarkMode) {
                appContainer.classList.add('dark-mode');
            } else {
                appContainer.classList.remove('dark-mode');
            }
        }
    }

    saveState() {
        const canvasData = this.canvas.nativeElement.toDataURL();
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(canvasData);
        this.historyIndex++;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadState();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadState();
        }
    }

    loadState() {
        const img = new Image();
        img.src = this.history[this.historyIndex];
        img.onload = () => {
            this.imageWidth = img.width;
            this.imageHeight = img.height;
            this.adjustCanvasSize();
            this.ctx.drawImage(img, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
            this.cdr.detectChanges();
        };
    }

    get canUndo(): boolean {
        return this.historyIndex > 0;
    }

    get canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
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
                    this.isLoading = false;
                    this.hasImage = true;
                    this.saveState(); 
                    this.cdr.detectChanges();
                    this.adjustCanvasSize();
                };
            };
            reader.onerror = () => {
                this.isLoading = false;
                this.hasImage = false;
                alert('Không thể đọc file ảnh. Vui lòng thử lại.');
                this.cdr.detectChanges();
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
        this.imageWidth = this.cropperPosition ? this.cropperPosition.x2 - this.cropperPosition.x1 : null;
        this.imageHeight = this.cropperPosition ? this.cropperPosition.y2 - this.cropperPosition.y1 : null;
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
        this.isLoading = true;
        this.image.src = this.croppedImage;
        this.image.onload = () => {
            this.imageWidth = this.image.width;
            this.imageHeight = this.image.height;
            this.currentRotation = 0;
            this.adjustCanvasSize();
            this.isLoading = false;
            this.showCropper = false;
            this.cropperPosition = null;
            this.hasImage = true;
            this.saveState();
            alert('Đã áp dụng cắt ảnh thành công!');
            this.cdr.detectChanges();
        };
        this.showCropper = false;
        this.cropperPosition = null;
    }

    cancelCrop() {
        this.showCropper = false;
        this.cropperPosition = null;
    }

    openRotateModal() {
        this.showRotateModal = true;
        this.tempRotation = this.currentRotation;
        this.originalRotation = this.currentRotation;
        this.cdr.detectChanges();
    }

    previewRotate(degrees: number) {
        if (!this.image.src) {
            alert('Vui lòng chọn một ảnh trước khi xoay.');
            return;
        }
    
        if (this.imageWidth! > 4096 || this.imageHeight! > 4096) {
            alert('Ảnh quá lớn (vượt quá 4096x4096 pixel). Vui lòng chọn ảnh nhỏ hơn.');
            return;
        }
    
        this.isLoading = true;
        const canvas = this.canvas.nativeElement;
        const ctx = this.ctx;
        this.currentRotation += (degrees * Math.PI) / 180;
    
        const absRotation = Math.abs(this.currentRotation % (2 * Math.PI));
        const sin = Math.abs(Math.sin(this.currentRotation));
        const cos = Math.abs(Math.cos(this.currentRotation));
        
        const newWidth = Math.round(this.image.width * cos + this.image.height * sin);
        const newHeight = Math.round(this.image.width * sin + this.image.height * cos);
    
        canvas.width = newWidth;
        canvas.height = newHeight;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(this.currentRotation);
        ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
        ctx.restore();
    
        this.imageWidth = newWidth;
        this.imageHeight = newHeight;
        this.isLoading = false;
        this.saveState();
        this.cdr.detectChanges();
    }

    applyRotate() {
        this.currentRotation = this.tempRotation; 
        this.saveState();
        this.showRotateModal = false;
        this.cdr.detectChanges();
    }

    cancelRotate() {
        this.currentRotation = this.originalRotation; 
        this.rotateImage(0); 
        this.showRotateModal = false;
        this.cdr.detectChanges();
    }

    rotateImage(degrees: number) {
        if (!this.image.src) return;

        const canvas = this.canvas.nativeElement;
        const ctx = this.ctx;
        this.currentRotation = degrees * Math.PI / 180; 

        const absRotation = Math.abs(this.currentRotation % (2 * Math.PI));
        const sin = Math.abs(Math.sin(this.currentRotation));
        const cos = Math.abs(Math.cos(this.currentRotation));
        
        const newWidth = Math.round(this.image.width * cos + this.image.height * sin);
        const newHeight = Math.round(this.image.width * sin + this.image.height * cos);
    
        canvas.width = newWidth;
        canvas.height = newHeight;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(this.currentRotation);
        ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
        ctx.restore();
    
        this.imageWidth = newWidth;
        this.imageHeight = newHeight;
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = this.canvas.nativeElement.toDataURL();
        link.click();
        alert('Đã lưu ảnh thành công!');
    }

    updateAspectRatio() {
        if (this.selectedAspectRatio === 'free') {
            this.maintainAspectRatio = false;
        } else {
            this.maintainAspectRatio = false;
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

    imageLoaded() {
        this.isLoading = false;
    }
    cropperReady() {
        this.isLoading = false;
    }
    loadImageFailed() {
        this.isLoading = false;
        alert('Tải ảnh thất bại. Vui lòng thử lại với một file ảnh hợp lệ.');
    }

    applyFilters() {
        if (!this.image.src) return;

        this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        this.ctx.filter = `
            brightness(${this.brightness}%)
            contrast(${this.contrast}%)
            saturate(${this.saturation}%)
            hue-rotate(${this.hue}deg)
        `;
        this.ctx.drawImage(this.image, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        this.ctx.filter = 'none';
    }

    adjustBrightness(step: number) {
        this.brightness = Math.max(0, Math.min(200, this.brightness + step));
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    adjustContrast(step: number) {
        this.contrast = Math.max(0, Math.min(200, this.contrast + step));
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    adjustSaturation(step: number) {
        this.saturation = Math.max(0, Math.min(200, this.saturation + step));
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    adjustHue(step: number) {
        this.hue = Math.max(0, Math.min(360, this.hue + step));
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    onFilterChange() {
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    resetFilters() {
        this.brightness = 100;
        this.contrast = 100;
        this.saturation = 100;
        this.hue = 0;
        this.sharpness = 0;
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        
        this.image.src = '';
        this.imageWidth = null;
        this.imageHeight = null;
        this.hasImage = false;
        this.currentRotation = 0;
        this.cropperPosition = null;
        this.showCropper = false;
        this.croppedImage = '';
        this.imageChangedEvent = '';
        
        this.brightness = 100;
        this.contrast = 100;
        this.saturation = 100;
        this.hue = 0;
        this.sharpness = 0;
        
        this.history = [];
        this.historyIndex = -1;
        
        this.adjustCanvasSize();
        
        this.cdr.detectChanges();
    }

    openAdjustModal(type: string) {
        this.showAdjustModal = true;
        this.adjustModalType = type;

        switch (type) {
            case 'brightness':
                this.adjustModalTitle = 'Điều chỉnh Độ sáng';
                this.adjustModalLabel = 'Brightness';
                this.adjustModalValue = this.brightness;
                this.adjustModalMin = 0;
                this.adjustModalMax = 200;
                this.originalValue = this.brightness;
                break;
            case 'contrast':
                this.adjustModalTitle = 'Điều chỉnh Độ tương phản';
                this.adjustModalLabel = 'Contrast';
                this.adjustModalValue = this.contrast;
                this.adjustModalMin = 0;
                this.adjustModalMax = 200;
                this.originalValue = this.contrast;
                break;
            case 'saturation':
                this.adjustModalTitle = 'Điều chỉnh Độ bão hòa';
                this.adjustModalLabel = 'Saturation';
                this.adjustModalValue = this.saturation;
                this.adjustModalMin = 0;
                this.adjustModalMax = 200;
                this.originalValue = this.saturation;
                break;
            case 'hue':
                this.adjustModalTitle = 'Điều chỉnh Sắc độ';
                this.adjustModalLabel = 'Hue';
                this.adjustModalValue = this.hue;
                this.adjustModalMin = 0;
                this.adjustModalMax = 360;
                this.originalValue = this.hue;
                break;
        }
        this.cdr.detectChanges();
    }

    updateAdjustValue() {
        switch (this.adjustModalType) {
            case 'brightness':
                this.brightness = this.adjustModalValue;
                break;
            case 'contrast':
                this.contrast = this.adjustModalValue;
                break;
            case 'saturation':
                this.saturation = this.adjustModalValue;
                break;
            case 'hue':
                this.hue = this.adjustModalValue;
                break;
        }
        this.applyFilters();
        this.cdr.detectChanges();
    }

    applyAdjust() {
        this.saveState();
        this.showAdjustModal = false;
        this.cdr.detectChanges();
    }

    cancelAdjust() {
        switch (this.adjustModalType) {
            case 'brightness':
                this.brightness = this.originalValue;
                break;
            case 'contrast':
                this.contrast = this.originalValue;
                break;
            case 'saturation':
                this.saturation = this.originalValue;
                break;
            case 'hue':
                this.hue = this.originalValue;
                break;
        }
        this.applyFilters();
        this.showAdjustModal = false;
        this.cdr.detectChanges();
    }
}

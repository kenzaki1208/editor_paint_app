import { Component, ViewChild, ElementRef, ChangeDetectorRef, HostListener, ChangeDetectionStrategy, Renderer2 } from "@angular/core";
import { ImageCroppedEvent } from "ngx-image-cropper";
import interact from 'interactjs';

@Component({
    selector: "app-paint-app",
    templateUrl: "./paint_app.component.html",
    styleUrls: ["./paint_app.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
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
    canvasWidth: number = 0; 
    canvasHeight: number = 0;
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
    showRotateControls: boolean = false;
    
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

    isRotateMode: boolean = false;
    isBrushMode: boolean = false; 
    isFilterAdjustMode: boolean = false;

    showFlipModal: boolean = false;
    private flipHorizontal: boolean = false;
    private flipVertical: boolean = false;
    private tempFlipHorizontal: boolean = false;
    private tempFlipVertical: boolean = false;

    private isDrawing = false;
    brushSize = 5;
    brushColor = '#000000';
    showBrushModal: boolean = false;
    isDrawingMode: boolean = false;
    public drawings: Array<{
        points: { x: number; y: number }[];
        color: string;
        size: number;
    }> = [];
    public brushStrokes: Array<{
        points: { x: number; y: number }[];
        color: string;
        size: number;
    }> = [];
    private currentDrawing: { points: { x: number; y: number }[]; color: string; size: number } | null = null;

    showSaveModal: boolean = false;
    saveFormat: string = 'png'; 
    saveQuality: number = 1;

    textToolState: 'inactive' | 'placing' | 'editing' = 'inactive';
    textContent: string = '';
    textFont: string = 'Arial';
    textSize: number = 20;
    textColor: string = '#000000';
    showTextModal: boolean = false;
    showTextFrame: boolean = false;
    textFramePosition: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 200, height: 100 };
    private scale: number = 1;
    private debounceTimeout: any;

    private texts: Array<{
        content: string;
        x: number;
        y: number;
        width: number;
        height: number;
        font: string;
        size: number;
        color: string;
    }> = [];

    showPresetFilterModal: boolean = false;
    selectedPresetFilter: string = 'vintage'; 

    showToast: boolean = false; 
    toastMessage: string = '';
    toastType: string = 'success'; 
    private toastTimeout: any = null;
    private originalImageSrc: string | null = null;
    private originalImage: HTMLImageElement | null = null;

    points: { x: number, y: number }[] = [];
    isAddPointMode: boolean = false;
    draggingPoint: { x: number, y: number } | null = null;
    dragOffset: { x: number, y: number } | null = null;
    private animationFrameId: number | null = null;

    constructor(private cdr: ChangeDetectorRef, private renderer: Renderer2) {}

    // Initialization and Setup
    ngOnInit() {
        this.loadInitialState();
    }

    ngAfterViewInit() {
        this.ctx = this.canvas.nativeElement.getContext('2d')!;
        this.adjustCanvasSize();
        this.adjustCropperContainerSize();
    }

    loadInitialState() {
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.toggleDarkModeClass();
    }

    // Dark Mode
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

    // Canvas Size Adjustment
    adjustCanvasSize() {
        if (this.showCropper) return;
    
        const canvas = this.canvas.nativeElement;
        const parent = canvas.parentElement!;
        const maxWidth = parent.clientWidth;
        const maxHeight = parent.clientHeight;
    
        if (this.imageWidth && this.imageHeight && this.image.src && this.image.complete) {
            const ratio = Math.min(maxWidth / this.imageWidth, maxHeight / this.imageHeight, 1);
            this.scale = ratio;

            canvas.width = this.imageWidth * ratio;
            canvas.height = this.imageHeight * ratio;
            canvas.classList.add('responsive');

            this.canvasWidth = canvas.width;
            this.canvasHeight = canvas.height;

            this.ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.ctx.drawImage(this.image, 0, 0, this.imageWidth * ratio, this.imageHeight * ratio);

            this.redrawCanvas();
        } else {
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            canvas.classList.remove('responsive');
            this.canvasWidth = maxWidth;
            this.canvasHeight = maxHeight;
            this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: Event) {
        this.adjustCanvasSize();
        this.adjustCropperContainerSize();
        this.redrawCanvas();
    }

    // History Management
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

    // Keyboard Events
    @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === 'z') {
            this.undo();
        }
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.saveImage();
        }
    }

    @HostListener('keydown.enter', ['$event'])
    onEnterKey(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if (target.classList.contains('toolbar-btn')) {
            target.click();
        }
    }

    // Open Image (File Input)
    openFileInput() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (!file.type.startsWith('image/')) {
                this.showToastNotification('Vui lòng chọn một file ảnh hợp lệ (jpg, png, etc.)');
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.image.src = e.target!.result as string;
                this.image.onload = () => {
                    this.originalImage = new Image();
                    this.originalImage.src = this.image.src;
                    this.originalImage.onload = () => {
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
            };
            reader.onerror = () => {
                this.isLoading = false;
                this.hasImage = false;
                this.showToastNotification('Không thể đọc file ảnh. Vui lòng thử lại.');
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(input.files[0]);
            this.imageChangedEvent = event; 
        }
    }

    imageLoaded() {
        this.isLoading = false;
    }

    loadImageFailed() {
        this.isLoading = false;
        this.showToastNotification('Tải ảnh thất bại. Vui lòng thử lại với một file ảnh hợp lệ.');
    }

    // Crop Image
    adjustCropperContainerSize() {
        if (this.showCropper && this.canvas && this.canvas.nativeElement) {
            const cropperContainer = document.querySelector('.cropper-container') as HTMLElement;
            if (cropperContainer && this.imageWidth && this.imageHeight) {
                // cropperContainer.style.width = `${this.imageWidth}px`;
                // cropperContainer.style.height = `${this.imageHeight}px`;
    
                const cropper = cropperContainer.querySelector('image-cropper');
                if (cropper) {
                    cropper.setAttribute('resizeToWidth', '0');
                    cropper.setAttribute('resizeToHeight', '0');
                }
    
                this.cdr.detectChanges();
            }
        }
    }

    cropImage() {
    if (this.image.src) {
        if (this.imageWidth! > 4096 || this.imageHeight! > 4096) {
            this.showToastNotification('Ảnh quá lớn (vượt quá 4096x4096 pixel). Vui lòng chọn ảnh nhỏ hơn.');
            return;
        }
        this.originalImageSrc = this.image.src;
        this.showCropper = true;
        this.isLoading = true;

        this.updateAspectRatio();

        const mainArea = document.querySelector('.main-area') as HTMLElement;
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        if (mainArea) {
            mainArea.scrollTop = 0;
            mainArea.scrollLeft = 0;
        }
        if (canvasContainer) {
            canvasContainer.scrollTop = 0;
            canvasContainer.scrollLeft = 0;
        }

        this.lockScroll();

        this.imageChangedEvent = {
            target: {
                files: [
                    new File([this.dataURLtoBlob(this.image.src)], 'image.jpg', { type: 'image/jpg' })
                ]
            }
        };
        this.cdr.detectChanges();
        setTimeout(() => {
            this.adjustCropperContainerSize();
        }, 0);
        } else {
            this.showToastNotification('Vui lòng chọn một ảnh trước khi cắt.');
        }
    }

    dataURLtoBlob(dataURL: string): Blob {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    imageCropped(event: ImageCroppedEvent) {
        this.croppedImage = event.base64;
        this.cropperPosition = {
            x1: event.cropperPosition?.x1 ||0,
            y1: event.cropperPosition?.y1 ||0,
            x2: event.cropperPosition?.x2 ||0,
            y2: event.cropperPosition?.y2 ||0
        }
        this.imageWidth = event.width || (this.cropperPosition.x2 - this.cropperPosition.x1);
    this.imageHeight = event.height || (this.cropperPosition.y2 - this.cropperPosition.y1);
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
        if (!this.croppedImage) {
            this.showToastNotification('Không có dữ liệu ảnh crop. Vui lòng thử lại.', 'error');
            this.isLoading = false;
            this.showCropper = false;
            this.unlockScroll();
            this.cdr.detectChanges();
            return;
        }
    
        this.isLoading = true;
        this.showCropper = false;
        this.unlockScroll();
    
        const croppedImg = new Image();
        croppedImg.src = this.croppedImage;
    
        croppedImg.onload = () => {
            console.log('croppedImg loaded:', croppedImg.width, croppedImg.height);

            const canvasContainer = this.canvas.nativeElement.parentElement!;
            const maxWidth = canvasContainer.clientWidth;
            const maxHeight = canvasContainer.clientHeight;

            const ratio = Math.min(maxWidth / croppedImg.width, maxHeight / croppedImg.height, 1);
            const scaledWidth = croppedImg.width * ratio;
            const scaledHeight = croppedImg.height * ratio;

            this.canvas.nativeElement.width = scaledWidth;
            this.canvas.nativeElement.height = scaledHeight;
            this.imageWidth = scaledWidth;
            this.imageHeight = scaledHeight;

            this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
            this.ctx.drawImage(croppedImg, 0, 0, scaledWidth, scaledHeight);
    
            this.image = croppedImg;
    
            this.currentRotation = 0;
            this.cropperPosition = null;
            this.originalImageSrc = null;
            this.hasImage = true;
    
            this.saveState();
            this.adjustCanvasSize();
            this.showToastNotification('Đã áp dụng cắt ảnh thành công!');
            this.isLoading = false;
            this.cdr.detectChanges();
    
            setTimeout(() => {
                this.adjustCanvasSize();
                this.adjustCropperContainerSize();
            }, 0);
        };
    
        croppedImg.onerror = () => {
            console.error('Lỗi khi tải ảnh crop:', this.croppedImage);
            this.isLoading = false;
            this.showToastNotification('Lỗi khi áp dụng cắt ảnh. Vui lòng thử lại.', 'error');
            this.cdr.detectChanges();
        };
    }

    cancelCrop() {
        if (this.originalImageSrc) {
            console.log('Restoring original image:', this.originalImageSrc);
            const originalImg = new Image();
            originalImg.src = this.originalImageSrc;
    
            originalImg.onload = () => {
                this.image = originalImg;
                this.imageWidth = originalImg.width;
                this.imageHeight = originalImg.height;
    
                this.canvas.nativeElement.width = this.imageWidth;
                this.canvas.nativeElement.height = this.imageHeight;
    
                this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
                this.ctx.drawImage(originalImg, 0, 0, this.imageWidth, this.imageHeight);
    
                this.showCropper = false;
                this.cropperPosition = null;
                this.croppedImage = '';
                this.originalImageSrc = null;
                this.unlockScroll();
                this.cdr.detectChanges();
    
                setTimeout(() => {
                    this.adjustCanvasSize();
                    this.adjustCropperContainerSize();
                }, 0);
            };
    
            originalImg.onerror = () => {
                console.error('Lỗi khi tải ảnh gốc:', this.originalImageSrc);
                this.showToastNotification('Lỗi khi khôi phục ảnh gốc. Vui lòng thử lại.', 'error');
                this.cdr.detectChanges();
            };
        } else {
            this.showCropper = false;
            this.cropperPosition = null;
            this.croppedImage = '';
            this.unlockScroll();
            this.cdr.detectChanges();
        }
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
        this.cdr.detectChanges();
    }

    cropperReady() {
        this.isLoading = false;
    }

    lockScroll() {
        const mainArea = document.querySelector('.main-area') as HTMLElement;
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        if (mainArea) mainArea.classList.add('no-scroll');
        if (canvasContainer) canvasContainer.classList.add('no-scroll');
        document.body.style.overflow = 'hidden'; // Khóa cuộn trên toàn bộ body
    }

    unlockScroll() {
        const mainArea = document.querySelector('.main-area') as HTMLElement;
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        if (mainArea) mainArea.classList.remove('no-scroll');
        if (canvasContainer) canvasContainer.classList.remove('no-scroll');
        document.body.style.overflow = ''; // Mở khóa cuộn trên toàn bộ body
    }

    // Rotate Image
    openRotateModal() {
        this.isRotateMode = true;
        this.showRotateModal = true;
        this.tempRotation = this.currentRotation;
        this.originalRotation = this.currentRotation;
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

        this.redrawCanvas();
        this.adjustCanvasSize();
        this.cdr.detectChanges();
    }

    previewRotate(degrees: number) {
        if (!this.image.src) {
            this.showToastNotification('Vui lòng chọn một ảnh trước khi xoay.');
            return;
        }
    
        if (this.imageWidth! > 4096 || this.imageHeight! > 4096) {
            this.showToastNotification('Ảnh quá lớn (vượt quá 4096x4096 pixel). Vui lòng chọn ảnh nhỏ hơn.');
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
        this.redrawCanvas();
        this.saveState();
        this.cdr.detectChanges();
    }

    applyRotate() {
        this.currentRotation = this.tempRotation; 
        this.saveState();
        const rotateModal = document.querySelector('.rotate-modal');
        if (rotateModal) {
            this.renderer.removeClass(rotateModal, 'show');
        }
        this.showRotateModal = false;
        this.cdr.detectChanges();
    }

    cancelRotate() {
        this.currentRotation = this.originalRotation; 
        this.rotateImage(0); 
        const rotateModal = document.querySelector('.rotate-modal');
        if (rotateModal) {
            this.renderer.removeClass(rotateModal, 'show');
        }
        this.showRotateModal = false;
        this.isRotateMode = false;
        this.cdr.detectChanges();
    }

    // Flip Image
    openFlipModal() {
        if (!this.hasImage) {
            this.showToastNotification('Vui lòng tải ảnh trước khi lật.');
            return;
        }
        this.showFlipModal = true;
        this.tempFlipHorizontal = this.flipHorizontal;
        this.tempFlipVertical = this.flipVertical;
        this.cdr.detectChanges();
    }

    flipImage(type: 'horizontal' | 'vertical') {
        if (!this.image.src) return;
    
        this.isLoading = true;
        
        if (type === 'horizontal') {
            this.tempFlipHorizontal = !this.tempFlipHorizontal;
        } else {
            this.tempFlipVertical = !this.tempFlipVertical;
        }
    
        this.redrawCanvas();
        this.isLoading = false;
        this.cdr.detectChanges();
    }

    applyFlip() {
        this.flipHorizontal = this.tempFlipHorizontal;
        this.flipVertical = this.tempFlipVertical;
        this.saveState();
        this.showFlipModal = false;
        this.redrawCanvas();
        this.cdr.detectChanges();
    }
    
    cancelFlip() {
        this.tempFlipHorizontal = this.flipHorizontal;
        this.tempFlipVertical = this.flipVertical;
        this.showFlipModal = false;
        this.redrawCanvas();
        this.cdr.detectChanges();
    }

    // Save Image
    openSaveModal() {
        this.showSaveModal = true;
        this.saveFormat = 'png'; 
        this.saveQuality = 1;
        this.cdr.detectChanges();
    }

    saveImage(format: string = 'png', quality: number = 1) {
        const mimeType = `image/${format}`;
        const link = document.createElement('a');
        link.download = `edited-image.${format}`;
        link.href = this.canvas.nativeElement.toDataURL(mimeType, quality);
        link.click();
        this.showToastNotification('Đã lưu ảnh thành công!');
    }

    applySave() {
        this.saveImage(this.saveFormat, this.saveQuality);
        this.showSaveModal = false;
        this.cdr.detectChanges();
    }

    cancelSave() {
        this.showSaveModal = false;
        this.cdr.detectChanges();
    }

    // Filters
    applyFilters() {
        this.redrawCanvas();
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
        this.currentRotation = 0;
        this.flipHorizontal = false;
        this.flipVertical = false;
        this.tempFlipHorizontal = false;
        this.tempFlipVertical = false;
        this.drawings = [];
        this.brushStrokes = [];
        this.texts = [];
        this.points = [];
        this.applyFilters();
        this.saveState();
        if (this.originalImage) {
            this.image = new Image();
            this.image.src = this.originalImage.src;
            this.image.onload = () => {
                this.imageWidth = this.image.width;
                this.imageHeight = this.image.height;
                this.canvas.nativeElement.width = this.imageWidth;
                this.canvas.nativeElement.height = this.imageHeight;
                this.applyFilters();
                this.saveState();
                this.adjustCanvasSize();
                this.cdr.detectChanges();
            };
        } else {
            this.applyFilters();
            this.saveState();
            this.cdr.detectChanges();
        }
    }

    applyPresetFilter(preset: string) {
        switch (preset) {
            case 'vintage':
                this.brightness = 90;
                this.contrast = 120;
                this.saturation = 80;
                this.hue = 20;
                break;
            case 'black-and-white':
                this.saturation = 0;
                break;
            case 'sepia':
                this.brightness = 100;
                this.contrast = 90;
                this.saturation = 50;
                this.hue = 30;
                break;
        }
        this.applyFilters();
        this.saveState();
        this.cdr.detectChanges();
    }

    openPresetFilterModal() {
        this.closeTextFrame();
        this.showAdjustModal = false; 
        this.showBrushModal = false;
        this.showPresetFilterModal = true;
        this.selectedPresetFilter = 'vintage'; 
        this.cdr.detectChanges();
    }

    applyPresetFilterModal() {
        this.applyPresetFilter(this.selectedPresetFilter); 
        this.showPresetFilterModal = false;
        this.redrawCanvas();
        this.cdr.detectChanges();
    }

    cancelPresetFilterModal() {
        this.showPresetFilterModal = false;
        this.cdr.detectChanges();
    }

    // Adjust Modal
    openAdjustModal(type: string) {
        this.closeTextFrame(); 
        this.showBrushModal = false; 
        this.showPresetFilterModal = false;
        this.isFilterAdjustMode = true;
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
        this.redrawCanvas();
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

    // Brush (Drawing)
    openBrushModal() {
        // if(this.isBrushMode == true) this.saveImage()
        this.isBrushMode = true;
        this.closeTextFrame(); 
        this.showAdjustModal = false; 
        this.showPresetFilterModal = false;
        this.showBrushModal = true;
        this.cdr.detectChanges();
    }

    applyBrush() {
        this.isDrawingMode = true;
        // this.redrawCanvas();
        const brushModal = document.querySelector('.brush-modal');
        if (brushModal) {
            this.renderer.removeClass(brushModal, 'show');
        }
        this.showBrushModal = true;
        this.showToastNotification('Cọ vẽ đã được thiết lập. Bạn có thể vẽ trên ảnh!');
        this.cdr.detectChanges();
    }

    cancelBrush() {
        const brushModal = document.querySelector('.brush-modal');
        if (brushModal) {
            this.renderer.removeClass(brushModal, 'show');
        }
        this.showBrushModal = false;
        this.isFilterAdjustMode = false;
        this.cdr.detectChanges();
    }

    saveBrushDrawing() {
        if (this.drawings.length === 0) {
          this.showToastNotification('Không có nét vẽ nào để lưu.');
          return;
        }
      
        this.drawings.forEach(drawing => {
            this.ctx.beginPath();
            this.ctx.lineWidth = drawing.size;
            this.ctx.strokeStyle = drawing.color;
            drawing.points.forEach((point, index) => {
                if (index === 0) this.ctx.moveTo(point.x, point.y);
                else this.ctx.lineTo(point.x, point.y);
            });
            this.ctx.stroke();
        });
      
        this.saveState();
      
        this.drawings = [];
      
        const saveButton = document.querySelector('.brush-modal .save-button');
        if (saveButton) {
            this.renderer.removeClass(saveButton, 'show');
        }
        this.showToastNotification('Nét vẽ đã được lưu thành công!');
        this.cdr.detectChanges();
    }

    startDrawing(event: MouseEvent) {
        this.isBrushMode = true;
        if (!this.hasImage) {
            this.showToastNotification('Vui lòng tải ảnh trước khi vẽ.');
            return;
        }
        if (this.isDrawingMode && !this.showTextFrame) {
            this.isDrawing = true;
            this.ctx.beginPath();
            this.ctx.lineWidth = this.brushSize;
            this.ctx.strokeStyle = this.brushColor;
            const { x, y } = this.getCanvasCoordinates(event);
            this.ctx.moveTo(x, y);
            this.currentDrawing = {
                points: [{ x, y }],
                color: this.brushColor,
                size: this.brushSize
            };
        }
    }
    
    draw(event: MouseEvent) {
        if (!this.hasImage) return;
        if (this.isDrawingMode && this.isDrawing && !this.showTextFrame) {
            const { x, y } = this.getCanvasCoordinates(event);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.currentDrawing!.points.push({ x, y });
        }
    }
    
    stopDrawing(event: MouseEvent) {
        if (!this.hasImage) return;
        if (this.isDrawingMode && this.isDrawing && !this.showTextFrame) {
            this.isDrawing = false;
            this.brushStrokes.push(this.currentDrawing!);
            this.currentDrawing = null;
            this.saveState();
        }
    }

    redrawCanvas() {
        const canvas = this.canvas.nativeElement;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        if (this.image.src) {
            this.ctx.save();
            this.ctx.translate(canvas.width / 2, canvas.height / 2);
            this.ctx.rotate(this.currentRotation);
            
            const scaleX = this.tempFlipHorizontal ? -1 : 1;
            const scaleY = this.tempFlipVertical ? -1 : 1;
            this.ctx.scale(scaleX, scaleY);
            
            this.ctx.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%) saturate(${this.saturation}%) hue-rotate(${this.hue}deg)`;
            this.ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2, this.image.width, this.image.height);
            this.ctx.filter = 'none';
            
            this.brushStrokes.forEach(stroke => {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.lineWidth = stroke.size;
                this.ctx.strokeStyle = stroke.color;
    
                stroke.points.forEach((point, index) => {
                    let adjustedX = point.x - this.image.width / 2;
                    let adjustedY = point.y - this.image.height / 2;

                    adjustedX = adjustedX * scaleX;
                    adjustedY = adjustedY * scaleY;
    
                    if (index === 0) {
                        this.ctx.moveTo(adjustedX, adjustedY);
                    } else {
                        this.ctx.lineTo(adjustedX, adjustedY);
                    }
                });
                this.ctx.stroke();
                this.ctx.restore();
            });

            this.texts.forEach(text => {
                this.ctx.save();
                let adjustedX = text.x - this.image.width / 2;
                let adjustedY = text.y - this.image.height / 2;
                const adjustedWidth = text.width;
                const adjustedHeight = text.height;
                const adjustedSize = text.size;

                adjustedX = adjustedX * scaleX;
                adjustedY = adjustedY * scaleY;

                if (this.tempFlipHorizontal) {
                    const textWidth = this.ctx.measureText(text.content).width;
                    adjustedX -= textWidth;
                }
                if (this.tempFlipVertical) {
                    adjustedY -= adjustedSize;
                }
                
                this.ctx.font = `${adjustedSize}px ${text.font}`;
                this.ctx.fillStyle = text.color;
                this.ctx.textBaseline = 'top';
        
                const words = text.content.split(' ');
                let line = '';
                const lineHeight = adjustedSize * 1.2;
                let currentY = adjustedY;
        
                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + ' ';
                    const metrics = this.ctx.measureText(testLine);
                    const testWidth = metrics.width;
        
                    if (testWidth > adjustedWidth && i > 0) {
                        this.ctx.fillText(line, adjustedX, currentY);
                        line = words[i] + ' ';
                        currentY += lineHeight;
                    } else {
                        line = testLine;
                    }
        
                    if (currentY + lineHeight > adjustedY + adjustedHeight) break;
                }
                this.ctx.fillText(line, adjustedX, currentY);
                this.ctx.restore();
            });
            this.ctx.restore();
        }
        this.cdr.detectChanges();
    }

    //Text tool
    getCanvasCoordinates(event: MouseEvent): { x: number; y: number } {
        const canvas = this.canvas.nativeElement;
        const rect = canvas.getBoundingClientRect();
        const scale = this.scale;
        const x = (event.clientX - rect.left) / scale;
        const y = (event.clientY - rect.top) / scale;
        if (this.currentRotation !== 0) {
            const cosA = Math.cos(this.currentRotation);
            const sinA = Math.sin(this.currentRotation);
            const centerX = this.imageWidth! / 2;
            const centerY = this.imageHeight! / 2;
            const dx = x - centerX;
            const dy = y - centerY;
            return {
                x: centerX + (dx * cosA - dy * sinA),
                y: centerY + (dx * sinA + dy * cosA)
            };
        }
        return { 
            x: Math.max(0, Math.min(x, this.imageWidth!)), 
            y: Math.max(0, Math.min(y, this.imageHeight!)) 
        };
    }

    public previewText() {
        if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.redrawCanvas();
    
            if (!this.showTextFrame || !this.textContent.trim()) return;
    
            const canvasWidth = this.canvas.nativeElement.width;
            const canvasHeight = this.canvas.nativeElement.height;
            const imageWidth = this.imageWidth || canvasWidth;
            const imageHeight = this.imageHeight || canvasHeight;
    
            const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
    
            const x = this.textFramePosition.x;
            const y = this.textFramePosition.y;
            const width = this.textFramePosition.width;
            const height = this.textFramePosition.height;
            const adjustedTextSize = this.textSize;
    
            this.ctx.save();
            this.ctx.font = `${adjustedTextSize}px ${this.textFont}`;
            this.ctx.fillStyle = this.textColor;
            this.ctx.textBaseline = 'top';
    
            const words = this.textContent.split(' ');
            let line = '';
            const lineHeight = adjustedTextSize * 1.2;
            let currentY = y;
    
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = this.ctx.measureText(testLine);
                const testWidth = metrics.width;
    
                if (testWidth > width && i > 0) {
                    this.ctx.fillText(line, x, currentY);
                    line = words[i] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
    
                if (currentY + lineHeight > y + height) break;
            }
    
            this.ctx.fillText(line, x, currentY);
            this.ctx.restore();
        }, 100);
    }

    openTextModal() {
        if (!this.hasImage) {
            this.showToastNotification('Vui lòng tải ảnh trước khi thêm văn bản.');
            return;
        }
        // console.log('Opening text modal, current state:', this.textToolState, this.showTextFrame, this.showTextModal);
        this.textToolState = 'placing';
        this.cdr.detectChanges();
    }

    onCanvasClick(event: MouseEvent) {
        if (this.textToolState === 'placing') {
            const { x, y } = this.getCanvasCoordinates(event);
            this.textFramePosition = { x, y, width: 200, height: 100 };
            this.textContent = '';
            this.showTextFrame = true;
            // this.showTextModal = true;
            this.textToolState = 'editing';
            this.cdr.detectChanges();
            setTimeout(() => {
                interact('.text-frame')
                    .draggable({
                        onmove: (event) => {
                            const { x, y } = this.getCanvasCoordinates(event);
                            this.textFramePosition.x = x;
                            this.textFramePosition.y = y;
                            this.cdr.detectChanges();
                        }
                    })
                    .resizable({
                        edges: { left: true, right: true, bottom: true, top: true },
                        onmove: (event) => {
                            const rect = this.canvas.nativeElement.getBoundingClientRect();
                            this.textFramePosition.width = event.rect.width / this.scale;
                            this.textFramePosition.height = event.rect.height / this.scale;
                            this.textFramePosition.x = (event.rect.left - rect.left) / this.scale;
                            this.textFramePosition.y = (event.rect.top - rect.top) / this.scale;
                            this.cdr.detectChanges();
                        }
                    });
            }, 0);

            setTimeout(() => {
                const textInput = document.querySelector('.text-input') as HTMLElement;
                if (textInput) {
                    textInput.focus();
                    if (textInput) {
                        textInput.focus();
                        textInput.innerHTML = '';
                    }
                }
            }, 0);
        }
    }

    updateTextContent(event: Event) {
        const target = event.target as HTMLElement;
        this.textContent = target.innerText.trim();
        // this.redrawCanvas();
        this.previewText();
        this.cdr.detectChanges();
    }

    applyText() {
        if (!this.textContent.trim()) {
            this.showToastNotification('Vui lòng nhập văn bản.');
            return;
        }
        this.texts.push({
            content: this.textContent,
            x: this.textFramePosition.x, 
            y: this.textFramePosition.y,
            width: this.textFramePosition.width,
            height: this.textFramePosition.height,
            font: this.textFont,
            size: this.textSize,
            color: this.textColor
        });
        this.redrawCanvas();
        this.saveState();
        this.closeTextFrame();
    }

    cancelText() {
        this.closeTextFrame();
    }

    closeTextFrame() {
        console.log('Closing text frame, resetting state...');
        this.textToolState = 'inactive';
        this.showTextFrame = false;
        this.showTextModal = false;
        this.textContent = '';
        this.textFont = 'Arial';
        this.textSize = 20;
        this.textColor = '#000000';
        this.textFramePosition = { x: 0, y: 0, width: 200, height: 100 };
        interact('.text-frame').unset();
        this.redrawCanvas();
        this.cdr.detectChanges();
        console.log('Text frame closed, new state:', this.textToolState, this.showTextFrame, this.showTextModal);
    }

    //point marker
    toggleAddPointMode() {
        if (!this.hasImage) {
            this.showToastNotification('Vui lòng tải ảnh trước khi thêm điểm ảnh.', 'error');
            return;
        }
        this.isAddPointMode = !this.isAddPointMode;
        console.log('Add Point Mode:', this.isAddPointMode);
        if (this.isAddPointMode) {
            this.canvas.nativeElement.addEventListener('click', this.handleCanvasClick.bind(this));
        } else {
            this.canvas.nativeElement.removeEventListener('click', this.handleCanvasClick.bind(this));
        }
    }

    handleCanvasClick(event: MouseEvent) {
        if (!this.isAddPointMode || !this.image.src) return;

        const rect = this.canvas.nativeElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const maxX = this.image.width;
        const maxY = this.image.height;
        const newX = Math.max(0, Math.min(x, maxX - 20)); 
        const newY = Math.max(0, Math.min(y, maxY - 20));

        this.points.push({ x: newX, y: newY });
        this.redrawCanvas(); 
        console.log('Added point at:', { x: newX, y: newY });
    }

    startDragging(event: MouseEvent | TouchEvent, point: { x: number, y: number }) {
        event.preventDefault();
        event.stopPropagation();
        this.draggingPoint = point;

        const rect = this.canvas.nativeElement.getBoundingClientRect();
        if (event instanceof MouseEvent) {
            this.dragOffset = {
                x: event.clientX - rect.left - point.x,
                y: event.clientY - rect.top - point.y
            };
            window.addEventListener('mousemove', this.handleDragging.bind(this));
            window.addEventListener('mouseup', this.stopDragging.bind(this), { once: true });
        } else if (event instanceof TouchEvent) {
            this.dragOffset = {
                x: event.touches[0].clientX - rect.left - point.x,
                y: event.touches[0].clientY - rect.top - point.y
            };
            window.addEventListener('touchmove', this.handleDragging.bind(this));
            window.addEventListener('touchend', this.stopDragging.bind(this), { once: true });
        }
    }

    handleDragging(event: MouseEvent | TouchEvent) {
        if (!this.draggingPoint || !this.dragOffset || !this.image.src) return;

        event.preventDefault();
        const rect = this.canvas.nativeElement.getBoundingClientRect();
        let newX, newY;

        if (event instanceof MouseEvent) {
            newX = event.clientX - rect.left - this.dragOffset.x;
            newY = event.clientY - rect.top - this.dragOffset.y;
        } else if (event instanceof TouchEvent) {
            newX = event.touches[0].clientX - rect.left - this.dragOffset.x;
            newY = event.touches[0].clientY - rect.top - this.dragOffset.y;
        }

        const maxX = this.image.width - 20; 
        const maxY = this.image.height - 20;
        newX = Math.max(0, Math.min(newX!, maxX));
        newY = Math.max(0, Math.min(newY!, maxY));

        this.draggingPoint.x = newX;
        this.draggingPoint.y = newY;
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(() => {
                this.redrawCanvas();
                this.animationFrameId = null;
            });
        } 
    }

    stopDragging(event?: MouseEvent | TouchEvent) {
        if (event) {
            event.preventDefault();
            event.stopPropagation(); 
        }

        console.log('Stopping drag:', this.draggingPoint);

        this.draggingPoint = null;
        this.dragOffset = null;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        window.removeEventListener('mousemove', this.handleDragging.bind(this));
        window.removeEventListener('touchmove', this.handleDragging.bind(this));
        window.removeEventListener('mouseup', this.stopDragging.bind(this));
        window.removeEventListener('touchend', this.stopDragging.bind(this));
        window.removeEventListener('mouseleave', this.stopDragging.bind(this));
        window.removeEventListener('touchcancel', this.stopDragging.bind(this));

        this.redrawCanvas(); 
        this.cdr.detectChanges();
    }

    //showToastNotification
    showToastNotification(message: string, type: string = 'success', duration: number = 3000) {
        this.toastMessage = message;
        this.toastType = type;
        this.showToast = true;
    
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
    
        this.toastTimeout = setTimeout(() => {
            this.showToast = false;
            this.toastMessage = '';
            this.cdr.detectChanges();
        }, duration);
    
        this.cdr.detectChanges();
    }

    closeToast() {
        this.showToast = false;
        this.toastMessage = '';
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        this.cdr.detectChanges();
    }

    // Clear Canvas
    clearCanvas() {
        // this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
        
        this.image.src = '';
        this.originalImage = null;
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

        this.texts = [];
        this.points = [];

        if (this.fileInput) {
            this.fileInput.nativeElement.value = ''; 
        }
        
        this.adjustCanvasSize();
        
        this.cdr.detectChanges();
    }
}
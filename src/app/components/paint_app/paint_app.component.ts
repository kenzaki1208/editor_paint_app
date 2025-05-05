import { Component, ViewChild, ElementRef, ChangeDetectorRef, HostListener, ChangeDetectionStrategy, Renderer2 } from "@angular/core";
import { ImageCroppedEvent } from "ngx-image-cropper";
import interact from 'interactjs';

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

    private isDrawing = false;
    brushSize = 5;
    brushColor = '#000000';
    showBrushModal: boolean = false;
    isDrawingMode: boolean = false;

    showSaveModal: boolean = false;
    saveFormat: string = 'png'; 
    saveQuality: number = 1;

    showTextModal: boolean = false;
    textContent: string = '';
    textFont: string = 'Arial';
    textSize: number = 20;
    textColor: string = '#000000';
    isTextMode: boolean = false;
    showTextFrame: boolean = false;
    textFramePosition: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 200, height: 100 };
    textModalPosition: { x: number, y: number } = { x: 0, y: 0 };
    private scale: number = 1;
    private startMousePosition = { x: 0, y: 0 }; 
    private startMarkerPosition = { x: 0, y: 0 }; 
    private startTextFramePosition = { x: 0, y: 0 };
    private isDraggingMarker = false;
    private isDraggingTextFrame = false;

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

    public markerPosition: { x: number, y: number } = { x: 0, y: 0 }; 
    public showMarker: boolean = false; 

    showPresetFilterModal: boolean = false;
    selectedPresetFilter: string = 'vintage'; 

    showToast: boolean = false; 
    toastMessage: string = '';
    toastType: string = 'success'; 
    private toastTimeout: any = null;
    private originalImageSrc: string | null = null;
    private originalImage: HTMLImageElement | null = null;

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
            const canvas = this.canvas.nativeElement;
            const cropperContainer = document.querySelector('.cropper-container') as HTMLElement;
            if (cropperContainer) {
                cropperContainer.style.width = `${canvas.width}px`;
                cropperContainer.style.height = `${canvas.height}px`;
    
                const cropper = cropperContainer.querySelector('image-cropper');
                if (cropper) {
                    cropper.setAttribute('resizeToWidth', canvas.width.toString());
                    cropper.setAttribute('resizeToHeight', canvas.height.toString());
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

        this.imageChangedEvent = {
            target: {
                files: [
                    new File([this.dataURLtoBlob(this.image.src)], 'image.jpg', { type: 'image/jpeg' })
                ]
            }
        };
        this.cdr.detectChanges();
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
            this.cdr.detectChanges();
            return;
        }
    
        this.isLoading = true;
        this.showCropper = false;
    
        const croppedImg = new Image();
        croppedImg.src = this.croppedImage;
    
        croppedImg.onload = () => {
            console.log('croppedImg loaded:', croppedImg.width, croppedImg.height);
    
            this.canvas.nativeElement.width = croppedImg.width;
            this.canvas.nativeElement.height = croppedImg.height;
            this.imageWidth = croppedImg.width;
            this.imageHeight = croppedImg.height;
    
            this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
            this.ctx.drawImage(croppedImg, 0, 0, croppedImg.width, croppedImg.height);
    
            this.image = croppedImg;
    
            this.currentRotation = 0;
            this.cropperPosition = null;
            this.originalImageSrc = null;
            this.hasImage = true;
    
            this.saveState();
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
            this.cdr.detectChanges();
        }
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

    cropperReady() {
        this.isLoading = false;
    }

    // Rotate Image
    openRotateModal() {
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
        this.texts = [];
        this.isDraggingMarker = false; 
        this.isDraggingTextFrame = false; 
        this.startMousePosition = { x: 0, y: 0 };
        this.startMarkerPosition = { x: 0, y: 0 }; 
        this.startTextFramePosition = { x: 0, y: 0 };
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
        this.showPresetFilterModal = true;
        this.selectedPresetFilter = 'vintage'; 
        this.cdr.detectChanges();
    }

    applyPresetFilterModal() {
        this.applyPresetFilter(this.selectedPresetFilter); 
        this.showPresetFilterModal = false;
        this.cdr.detectChanges();
    }

    cancelPresetFilterModal() {
        this.showPresetFilterModal = false;
        this.cdr.detectChanges();
    }

    // Adjust Modal
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

    // Brush (Drawing)
    openBrushModal() {
        this.showBrushModal = true;
        this.cdr.detectChanges();
    }

    applyBrush() {
        this.isDrawingMode = true;
        this.isTextMode = false;
        this.redrawCanvas();
        const brushModal = document.querySelector('.brush-modal');
        if (brushModal) {
            this.renderer.removeClass(brushModal, 'show');
        }
        this.showBrushModal = false;
        this.showToastNotification('Cọ vẽ đã được thiết lập. Bạn có thể vẽ trên ảnh!');
        this.cdr.detectChanges();
    }

    cancelBrush() {
        const brushModal = document.querySelector('.brush-modal');
        if (brushModal) {
            this.renderer.removeClass(brushModal, 'show');
        }
        this.showBrushModal = false;
        this.cdr.detectChanges();
    }

    startDrawing(event: MouseEvent) {
        if (!this.hasImage) {
            this.showToastNotification('Vui lòng tải ảnh trước khi vẽ.');
            return;
        }
        if (this.isDrawingMode) {
            this.isDrawing = true;
            this.ctx.beginPath();
            this.ctx.lineWidth = this.brushSize;
            this.ctx.strokeStyle = this.brushColor;
            const rect = this.canvas.nativeElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.ctx.moveTo(x, y);
        }
    }
    
    draw(event: MouseEvent) {
        if (this.isDrawingMode && this.isDrawing) {
            const rect = this.canvas.nativeElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
    }
    
    stopDrawing(event: MouseEvent) {
        if (this.isDrawingMode && this.isDrawing) {
            this.isDrawing = false;
            this.saveState();
        }
    }

    redrawCanvas() {
        const canvasWidth = this.canvas.nativeElement.width;
        const canvasHeight = this.canvas.nativeElement.height;
    
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
        if (this.image && this.image.src && this.image.complete) {
            this.ctx.filter = `
                brightness(${this.brightness}%)
                contrast(${this.contrast}%)
                saturate(${this.saturation}%)
                hue-rotate(${this.hue}deg)
            `;
            this.ctx.drawImage(this.image, 0, 0, canvasWidth, canvasHeight);
            this.ctx.filter = 'none';
        } else {
            console.warn('No image to redraw or image not loaded:', this.image);
        }
    
        this.texts.forEach(text => {
            this.ctx.save();
            this.ctx.font = `${text.size}px ${text.font}`;
            this.ctx.fillStyle = text.color;
            this.ctx.textBaseline = 'top';
    
            const words = text.content.split(' ');
            let line = '';
            const lineHeight = text.size * 1.2;
            let currentY = text.y;
    
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = this.ctx.measureText(testLine);
                const testWidth = metrics.width;
    
                if (testWidth > text.width && i > 0) {
                    this.ctx.fillText(line, text.x, currentY);
                    line = words[i] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
    
                if (currentY + lineHeight > text.y + text.height) break;
            }
    
            this.ctx.fillText(line, text.x, currentY);
            this.ctx.restore();
        });
    }

    //Text tool
    public previewText() {
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
    }

    openTextModal() {
        if (!this.hasImage) {
            this.showToastNotification('Vui lòng tải ảnh trước khi thêm văn bản.');
            return;
        }
        this.isTextMode = true;
        this.isDrawingMode = false;
        this.textContent = '';
        this.textFont = 'Arial';
        this.textSize = 20;
        this.textColor = '#000000';
        this.showTextFrame = true;
        this.showTextModal = true;
        this.showMarker = true;

        this.markerPosition = { x: 10, y: 10 };

        const frameWidth = 200;
        const frameHeight = 100;
        this.textFramePosition = {
            x: this.markerPosition.x,
            y: this.markerPosition.y,
            width: frameWidth,
            height: frameHeight
        };

        const offsetY = 10; 
        this.textModalPosition = {
            x: this.textFramePosition.x,
            y: this.textFramePosition.y + this.textFramePosition.height + offsetY
        };

        setTimeout(() => {
            const marker = document.querySelector('.marker');
            if (marker) {
                interact('.marker')
                    .draggable({
                        onstart: (event) => {
                            this.isDraggingMarker = true;
                            this.startMousePosition.x = event.clientX;
                            this.startMousePosition.y = event.clientY;
                            this.startMarkerPosition.x = this.markerPosition.x;
                            this.startMarkerPosition.y = this.markerPosition.y;
                        },
                        onmove: (event) => {
                            if (!this.isDraggingMarker) return;
                            const scale = Math.min(this.canvas.nativeElement.width / this.imageWidth!, this.canvas.nativeElement.height / this.imageHeight!);
                            const deltaX = (event.clientX - this.startMousePosition.x) / scale;
                            const deltaY = (event.clientY - this.startMousePosition.y) / scale;
                            this.markerPosition.x = this.startMarkerPosition.x + deltaX;
                            this.markerPosition.y = this.startMarkerPosition.y + deltaY;
                            this.markerPosition.x = Math.max(0, Math.min(this.markerPosition.x, this.imageWidth! - 10));
                            this.markerPosition.y = Math.max(0, Math.min(this.markerPosition.y, this.imageHeight! - 10));
                            this.textFramePosition.x = this.markerPosition.x + 10;
                            this.textFramePosition.y = this.markerPosition.y + 10;
                            // this.updateTextModalPosition();
                            this.cdr.detectChanges();
                        },
                        onend: () => {
                            this.isDraggingMarker = false;
                        },
                        modifiers: [
                            interact.modifiers.restrictRect({
                                endOnly: false
                            })
                        ],
                    });
            }

            const textFrame = document.querySelector('.text-frame');
            if (textFrame) {
                this.renderer.addClass(textFrame, 'show');
                interact('.text-frame')
                    .draggable({
                        onstart: (event) => {
                            this.isDraggingTextFrame = true;
                            this.startMousePosition.x = event.clientX;
                            this.startMousePosition.y = event.clientY;
                            this.startTextFramePosition.x = this.textFramePosition.x;
                            this.startTextFramePosition.y = this.textFramePosition.y;
                        },
                        onmove: (event) => {
                            if (!this.isDraggingTextFrame) return;
                            const scale = Math.min(this.canvas.nativeElement.width / this.imageWidth!, this.canvas.nativeElement.height / this.imageHeight!);
                            const deltaX = (event.clientX - this.startMousePosition.x) / scale;
                            const deltaY = (event.clientY - this.startMousePosition.y) / scale;
                            this.textFramePosition.x = this.startTextFramePosition.x + deltaX;
                            this.textFramePosition.y = this.startTextFramePosition.y + deltaY;
                            this.textFramePosition.x = Math.max(0, Math.min(this.textFramePosition.x, this.imageWidth! - this.textFramePosition.width));
                            this.textFramePosition.y = Math.max(0, Math.min(this.textFramePosition.y, this.imageHeight! - this.textFramePosition.height));
                            this.markerPosition.x = this.textFramePosition.x - 10;
                            this.markerPosition.y = this.textFramePosition.y - 10;
                            // this.updateTextModalPosition();
                            this.previewText();
                            this.cdr.detectChanges();
                        },
                        onend: () => {
                            this.isDraggingTextFrame = false;
                        },
                        modifiers: [
                            interact.modifiers.restrictRect({
                                endOnly: false
                            })
                        ],
                        inertia: false,
                        autoScroll: false,
                    })
                    .resizable({
                        edges: { left: true, right: true, bottom: true, top: true },
                        onmove: (event) => {
                            this.textFramePosition.width = event.rect.width; 
                            this.textFramePosition.height = event.rect.height; 
                            this.textFramePosition.x = (event.rect.left - (this.canvas.nativeElement.getBoundingClientRect().left)) 
                            this.textFramePosition.y = (event.rect.top - (this.canvas.nativeElement.getBoundingClientRect().top)) 
                            this.textFramePosition.x = Math.max(0, Math.min(this.textFramePosition.x, this.imageWidth! - this.textFramePosition.width));
                            this.textFramePosition.y = Math.max(0, Math.min(this.textFramePosition.y, this.imageHeight! - this.textFramePosition.height));
                            this.markerPosition.x = this.textFramePosition.x - 10;
                            this.markerPosition.y = this.textFramePosition.y - 10;
                            // this.updateTextModalPosition();
                            this.previewText();
                            this.cdr.detectChanges();
                        },
                        modifiers: [
                            interact.modifiers.restrictSize({
                                min: { width: 50, height: 50 }
                            }),
                            interact.modifiers.restrictRect({
                            })
                        ],
                        inertia: false,
                        preserveAspectRatio: false
                    });
            }
            const textModal = document.querySelector('.text-modal') as HTMLElement;
            if (textModal) {
                this.renderer.addClass(textModal, 'show');
                this.renderer.setAttribute(textModal, 'tabindex', '0');
                textModal.focus();
            }
        }, 0);
        this.cdr.detectChanges();
    }

    // updateTextModalPosition() {
    //     const offsetY = 10;
      
    //     const frame = document.querySelector('.text-frame') as HTMLElement;
    //     if (!frame) return;
      
    //     const rect = frame.getBoundingClientRect();
    //     const canvasRect = this.canvas.nativeElement.getBoundingClientRect();
      
    //     const modalX = rect.left - canvasRect.left;
    //     const modalY = rect.bottom - canvasRect.top + offsetY;
      
    //     this.textModalPosition = {
    //       x: modalX,
    //       y: modalY
    //     };
      
    //     this.textModalPosition.x = Math.max(0, Math.min(this.textModalPosition.x, this.canvasWidth!));
    //     this.textModalPosition.y = Math.max(0, Math.min(this.textModalPosition.y, this.canvasHeight!));
    // }

    applyText() {
        if (!this.textContent.trim() || !this.textFramePosition) {
            this.showToastNotification('Vui lòng nhập văn bản trước khi áp dụng.');
            return;
        }
    
        this.adjustCanvasSize();
    
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
    
        if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            console.warn('Vị trí văn bản nằm ngoài ranh giới canvas:', { x, y });
            return;
        }
    
        this.texts.push({
            content: this.textContent,
            x: x,
            y: y,
            width: width,
            height: height,
            font: this.textFont,
            size: adjustedTextSize,
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
        this.isTextMode = false;
        this.showTextFrame = false;
        this.showTextModal = false;
        this.showMarker = false; 
        this.textFramePosition = { x: 0, y: 0, width: 200, height: 100 };
        this.textModalPosition = { x: 0, y: 0 };
        this.markerPosition = { x: 0, y: 0 }; 
        this.isDraggingMarker = false; 
        this.isDraggingTextFrame = false; 
        this.startMousePosition = { x: 0, y: 0 };
        this.startMarkerPosition = { x: 0, y: 0 }; 
        this.startTextFramePosition = { x: 0, y: 0 };
        const textFrame = document.querySelector('.text-frame');
        if (textFrame) {
            this.renderer.removeClass(textFrame, 'show');
        }
        const textModal = document.querySelector('.text-modal');
        if (textModal) {
            this.renderer.removeClass(textModal, 'show');
        }
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

        if (this.fileInput) {
            this.fileInput.nativeElement.value = ''; 
        }
        
        this.adjustCanvasSize();
        
        this.cdr.detectChanges();
    }
}
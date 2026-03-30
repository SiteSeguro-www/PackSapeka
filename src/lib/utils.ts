import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const compressImage = (file: File, maxSizeMB: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let minQ = 0.1;
        let maxQ = 1.0;
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        const maxBytes = maxSizeMB * 1024 * 1024;
        
        if (dataUrl.length * 0.75 <= maxBytes) {
           resolve(dataUrl);
           return;
        }

        let attempts = 0;
        while (attempts < 5) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          const size = dataUrl.length * 0.75;
          
          if (size > maxBytes) {
            maxQ = quality;
            quality = (minQ + maxQ) / 2;
          } else if (size < maxBytes * 0.9) {
            minQ = quality;
            quality = (minQ + maxQ) / 2;
          } else {
            break;
          }
          attempts++;
        }
        
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

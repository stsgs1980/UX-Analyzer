"use client";

import { Button } from "@/components/ui/button";
import { X, ImagePlus } from "lucide-react";
import { useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Image upload trigger button + hidden file input                   */
/* ------------------------------------------------------------------ */

interface ImageUploadButtonProps {
  isAnalyzing: boolean;
  hasUrls: boolean;
  onAddImage: (base64: string, fileName: string) => void;
}

export function ImageUploadButton({
  isAnalyzing,
  hasUrls,
  onAddImage,
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onAddImage(base64, file.name);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [onAddImage]
  );

  return (
    <>
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isAnalyzing || hasUrls}
        variant="outline"
        className="h-12 px-4 border-white/8 hover:bg-transparent hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300 text-muted-foreground"
        title="Загрузить изображение для VLM-анализа"
      >
        <ImagePlus className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Изображение</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Image preview card (shown after a file is selected)               */
/* ------------------------------------------------------------------ */

interface ImageUploadPreviewProps {
  isAnalyzing: boolean;
  imageBase64: string | null;
  imageFileName: string | null;
  onRemoveImage: () => void;
}

export function ImageUploadPreview({
  isAnalyzing,
  imageBase64,
  imageFileName,
  onRemoveImage,
}: ImageUploadPreviewProps) {
  return (
    <AnimatePresence>
      {imageBase64 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border border-emerald-500/20 p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium truncate max-w-[300px]">
                {imageFileName || "Изображение"}
              </span>
            </div>
            {!isAnalyzing && (
              <button
                onClick={onRemoveImage}
                className="hover:text-red-400 transition-colors text-muted-foreground"
                aria-label="Удалить изображение"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <img
              src={imageBase64}
              alt="Preview"
              width={80}
              height={80}
              className="h-20 w-20 object-cover border border-white/8 shrink-0"
            />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <p>VLM-анализ извлечёт палитру, типографику, компоненты и сгенерирует DESIGN.md</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

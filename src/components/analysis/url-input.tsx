"use client";

import { useAnalysisStore } from "@/store/analysis-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Link, Loader2, Sparkles, ImagePlus } from "lucide-react";
import { useCallback, useRef, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function UrlInput() {
  const {
    urls,
    inputUrl,
    addUrl,
    removeUrl,
    clearUrls,
    setInputUrl,
    isAnalyzing,
    startAnalysis,
    imageBase64,
    imageFileName,
    addImage,
    removeImage,
  } = useAnalysisStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addUrl(inputUrl);
      }
    },
    [inputUrl, addUrl]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        addImage(base64, file.name);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [addImage]
  );

  const hasInput = urls.length > 0 || !!imageBase64;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-400 transition-colors" />
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Вставьте URL продукта или Pinterest пин..."
            className="pl-10 h-12 text-base bg-transparent border-white/8 focus:border-emerald-500/40 focus:ring-emerald-500/10 placeholder:text-muted-foreground/30 font-mono"
            disabled={isAnalyzing || !!imageBase64}
          />
        </div>
        <Button
          onClick={() => addUrl(inputUrl)}
          disabled={isAnalyzing || urls.length >= 10 || !!imageBase64}
          variant="outline"
          className="h-12 px-4 border-white/8 hover:bg-transparent hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300 text-muted-foreground"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Добавить</span>
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing || urls.length > 0}
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
      </div>

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
                  onClick={removeImage}
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
                className="h-20 w-20 object-cover border border-white/8 shrink-0"
              />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>VLM-анализ извлечёт палитру, типографику, компоненты и сгенерирует DESIGN.md</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {urls.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 overflow-hidden"
          >
            {urls.map((url, i) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scaleX: 0.8 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0.8 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 px-3 py-1 text-sm max-w-[400px] border-emerald-500/20 text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-300 bg-transparent"
                >
                  <span className="truncate">{url}</span>
                  {!isAnalyzing && (
                    <button
                      onClick={() => removeUrl(i)}
                      className="ml-1 hover:text-red-400 hover:rotate-90 p-0.5 transition-all duration-300 text-emerald-400/60"
                      aria-label={`Удалить ${url}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              </motion.div>
            ))}
            {!isAnalyzing && urls.length > 1 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={clearUrls}
                className="text-xs text-muted-foreground hover:text-red-400 hover:underline decoration-red-400/30 underline-offset-2 transition-all duration-300 py-1.5 px-2"
              >
                Очистить все
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground/60 font-mono">
          {imageBase64 ? (
            <span className="text-emerald-400/80">
              <ImagePlus className="h-3 w-3 inline mr-1" />
              {imageFileName || "Изображение загружено"}
            </span>
          ) : urls.length === 0 ? (
            "URL или загрузите изображение"
          ) : (
            <span>
              <span className="text-emerald-400/80 font-semibold">{urls.length}</span>{" "}
              <span className="text-muted-foreground/40">/ 10 URL</span>
            </span>
          )}
        </p>
        <Button
          onClick={startAnalysis}
          disabled={isAnalyzing || !hasInput}
          size="lg"
          className="min-w-[220px] bg-transparent border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/8 hover:border-emerald-500/50 hover:text-emerald-300 shadow-none transition-all duration-300 uppercase tracking-widest text-xs font-semibold"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Анализирую
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Запустить анализ
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

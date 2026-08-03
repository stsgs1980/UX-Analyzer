"use client";

import { useAnalysisStore } from "@/store/analysis-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Link, Loader2, Sparkles, ImagePlus } from "lucide-react";
import { useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUploadButton, ImageUploadPreview } from "@/components/analysis/image-upload-section";
import { AnalysisOptions } from "@/components/analysis/analysis-options";

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
    generateReferenceCode,
    setGenerateReferenceCode,
    extractRscPayload,
    setExtractRscPayload,
  } = useAnalysisStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addUrl(e.currentTarget.value);
      }
    },
    [addUrl]
  );

  const hasInput = urls.length > 0 || !!imageBase64;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <label htmlFor="url-input" className="sr-only">URL продукта</label>
          <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-400 transition-colors" aria-hidden="true" />
          <Input
            id="url-input"
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
        <ImageUploadButton
          isAnalyzing={isAnalyzing}
          hasUrls={urls.length > 0}
          onAddImage={addImage}
        />
      </div>

      <ImageUploadPreview
        isAnalyzing={isAnalyzing}
        imageBase64={imageBase64}
        imageFileName={imageFileName}
        onRemoveImage={removeImage}
      />

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
        <div className="flex items-center gap-4">
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
          <AnalysisOptions
            isAnalyzing={isAnalyzing}
            generateReferenceCode={generateReferenceCode}
            onSetGenerateReferenceCode={setGenerateReferenceCode}
            extractRscPayload={extractRscPayload}
            onSetExtractRscPayload={setExtractRscPayload}
          />
        </div>
        <Button
          onClick={() => startAnalysis()}
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

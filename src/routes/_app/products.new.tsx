import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { ProductForm, emptyForm } from "@/components/ProductForm";
import { createProduct, uploadProductLabel } from "@/lib/supabaseQueries";
import { extractNutritionFromImage } from "@/lib/vision/extractNutrition.functions";
import { Camera, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products/new")({
  component: NewProductPage,
});

type Step = "choose" | "manual" | "photo";

function NewProductPage() {
  const [step, setStep] = useState<Step>("choose");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const extractFn = useServerFn(extractNutritionFromImage);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadProductLabel(file);
      setImageUrl(url);
      setStep("photo");
      setAnalyzing(true);
      try {
        const extracted = await extractFn({ data: { imageUrl: url } });
        if (extracted) {
          setInitial({
            ...emptyForm(),
            name: extracted.name ?? "",
            brand: extracted.brand ?? "",
            calories_per_100g: extracted.calories_per_100g ?? 0,
            protein_per_100g: extracted.protein_per_100g ?? 0,
            carbs_per_100g: extracted.carbs_per_100g ?? 0,
            fat_per_100g: extracted.fat_per_100g ?? 0,
          });
          toast.success("Nutrition extracted — review and save");
        } else {
          toast.message("Couldn't read the label — fill in manually");
        }
      } catch (e: any) {
        toast.error(e.message ?? "Vision analysis failed");
      } finally {
        setAnalyzing(false);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save(values: any, sourceType: "manual" | "photo") {
    try {
      await createProduct({
        name: values.name.trim(),
        brand: values.brand.trim() || null,
        calories_per_100g: values.calories_per_100g,
        protein_per_100g: values.protein_per_100g,
        carbs_per_100g: values.carbs_per_100g,
        fat_per_100g: values.fat_per_100g,
        source_type: sourceType,
        source_image_url: sourceType === "photo" ? imageUrl : null,
        notes: values.notes.trim() || null,
      });
      toast.success("Product saved");
      nav({ to: "/products" });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  }

  return (
    <AppShell title="Add product">
      {step === "choose" && (
        <div className="space-y-3">
          <button
            onClick={() => setStep("manual")}
            className="w-full rounded-2xl border border-border bg-card p-5 text-left flex gap-4 items-center hover:border-primary/50"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Pencil className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">Enter manually</p>
              <p className="text-xs text-muted-foreground">Type the nutrition values yourself.</p>
            </div>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-2xl border border-border bg-card p-5 text-left flex gap-4 items-center hover:border-primary/50 disabled:opacity-60"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">{uploading ? "Uploading…" : "Take or upload photo"}</p>
              <p className="text-xs text-muted-foreground">Save the label image, then fill values.</p>
            </div>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {step === "manual" && (
        <ProductForm onSubmit={(v) => save(v, "manual")} submitLabel="Save product" />
      )}

      {step === "photo" && (
        <ProductForm
          initial={initial}
          imagePreviewUrl={imageUrl}
          onSubmit={(v) => save(v, "photo")}
          submitLabel="Save product"
        />
      )}
    </AppShell>
  );
}

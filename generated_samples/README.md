# Generated Samples — Pearl Jewelry Test

This folder contains 8 AI-generated product images from the pearl jewelry test image provided in the assignment.

## Image Themes

| Slot | Filename | Theme | Scene Description |
|------|----------|-------|-------------------|
| 1 | `01_white_bg.png` | White Background | Clean e-commerce on pure white, professional studio lighting |
| 2 | `02_marble_theme.png` | Marble Luxury | Elegant white Carrara marble surface, soft diffused light |
| 3 | `03_velvet_theme.png` | Velvet Editorial | Deep navy velvet backdrop, moody jewellery photography |
| 4 | `04_beach_lifestyle.png` | Beach Lifestyle | Fine sand, golden hour ocean, travel magazine aesthetic |
| 5 | `05_studio_lifestyle.png` | Studio Lifestyle | Minimalist Scandinavian interior, natural window light |
| 6 | `06_model_front.png` | Model — Front | Professional model wearing, clean white backdrop |
| 7 | `07_model_side.png` | Model — Side 45° | Professional model, 45-degree angle, catalogue photography |
| 8 | `08_model_closeup.png` | Model — Close-up | Macro detail shot, beautiful bokeh, beauty editorial |

## AI Consistency Notes

All 8 images were generated with:
- **Same fixed seed** for reproducibility
- **Same IP-Adapter reference** (bg-removed pearl jewelry)
- **Same product descriptor** extracted by GPT-4o:
  > *"A delicate freshwater pearl drop earring with gleaming gold hardware, featuring lustrous 8-10mm round pearls in creamy white, with an elegant teardrop silhouette and subtle metallic sheen."*

## Prompt Template Used

```
8k professional product photography, {product_descriptor}, {scene_description}, 
award-winning commercial photograph
```

## Notes on Consistency

The product (pearl earrings) maintains consistent:
- **Color**: Creamy white pearls + gold hardware
- **Shape**: Teardrop drop silhouette
- **Scale**: Relative to scene elements
- **Material**: Lustrous pearl finish

Minor variations in exact pearl orientation are expected with IP-Adapter (not LoRA-level consistency). For absolute pixel-perfect consistency, training a product LoRA would be the next step.

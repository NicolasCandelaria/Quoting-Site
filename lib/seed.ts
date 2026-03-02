import type { Project, Item } from "./models";
import { createProject, getProjects, saveProject } from "./storage";

const DEMO_FLAG = "__demoSeeded";

export function seedDemoProject(): Project {
  const existing = getProjects();
  const already = existing.find((p) => p.notes?.includes(DEMO_FLAG));
  if (already) return already;

  const project = createProject({
    name: "Spring Launch Gifting",
    client: "Mondelez (Demo)",
    notes: `Sample project for client-facing quote sheets.\n\n${DEMO_FLAG}`,
  });

  const items: Item[] = [
    {
      id: crypto.randomUUID(),
      name: "Premium Branded Tote Bag",
      shortDescription:
        "Heavyweight canvas tote with full-color logo print and reinforced handles.",
      imageBase64:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmOGZhZmYiLz48cmVjdCB4PSI1MCIgeT0iNjAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTgwIiByeD0iMjQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2Q0ZDFkNyIvPjxwYXRoIGQ9Ik0xNTAuNSAxMjBjMC02LjYgNS4zLTEyIDEyLTEyaDEyMGM2LjcgMCAxMiA1LjQgMTIgMTJ2NDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2Q0ZDFkNyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHRleHQgeD0iMjAwIiB5PSIxNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgU3lzdGVtIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNTE2MmY1Ij5EZW1vIFByb2R1Y3Q8L3RleHQ+PC9zdmc+",
      material: "12oz cotton canvas",
      size: "16\" W x 14\" H x 4\" D",
      logo: "Front center, max 8\" x 8\" full-color silkscreen",
      preProductionSampleTime: "7–10 business days",
      preProductionSampleFee: "$150 (credited on 1st PO over 250 units)",
      packingDetails:
        "Bulk packed, 50 units per carton. Carton size: 20\" x 16\" x 14\".",
      priceTiers: [
        {
          qty: 250,
          pricePerUnitDDP: 11.5,
          productionPlusTransitTime: "20–25 business days after approval",
        },
        {
          qty: 500,
          pricePerUnitDDP: 9.9,
          productionPlusTransitTime: "20–25 business days after approval",
        },
        {
          qty: 1000,
          pricePerUnitDDP: 8.6,
          productionPlusTransitTime: "25–30 business days after approval",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Double-Wall Insulated Tumbler",
      shortDescription:
        "Stainless steel tumbler with spill-resistant lid and laser-etched logo.",
      imageBase64:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZjBmNGZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTFlM2Y3Ii8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0idXJsKCNnKSIvPjxwb2x5Z29uIHBvaW50cz0iMTIwIDQwIDI4MCA0MCAyNjAgODAgMTQwIDgwIiBmaWxsPSIjZTVlOGZkIi8+PHJlY3QgeD0iMTQwIiB5PSI4MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIyMDAiIHJ4PSIyNCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjY2NjZmRkIi8+PHRleHQgeD0iMjAwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgU3lzdGVtIiBmb250LXNpemU9IjIyIiBmaWxsPSIjNTE2MmY1Ij5EZW1vIFR1bWJsZXI8L3RleHQ+PC9zdmc+",
      material: "18/8 stainless steel, BPA-free lid",
      size: "20 oz",
      logo: "Laser-etched, 2.5\" x 2.5\" max",
      preProductionSampleTime: "5–7 business days",
      preProductionSampleFee: "$95 (credited on 1st PO over 144 units)",
      packingDetails:
        "Individual gift box, 25 units per master carton. Carton weight: 32 lbs.",
      priceTiers: [
        {
          qty: 144,
          pricePerUnitDDP: 14.95,
          productionPlusTransitTime: "15–20 business days after approval",
        },
        {
          qty: 288,
          pricePerUnitDDP: 13.25,
          productionPlusTransitTime: "15–20 business days after approval",
        },
        {
          qty: 576,
          pricePerUnitDDP: 11.9,
          productionPlusTransitTime: "20–25 business days after approval",
        },
      ],
    },
  ];

  const seeded = saveProject({ ...project, items });
  return seeded;
}

